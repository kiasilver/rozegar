/**
 * Helper functions for tracking AI token usage
 */

import { prisma } from '@/lib/core/prisma';

export interface TokenUsageData {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  operation: string;
  newsId?: number;
}

/**
 * Calculate cost based on provider and model
 * Note: Backboard.io has markup (approximately 8.5x for Gemini models)
 */
export function calculateTokenCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // اگر provider Backboard است، از نرخ‌های Backboard استفاده می‌کنیم (با markup)
  if (provider.toLowerCase() === 'backboard') {
    // Backboard pricing per 1M tokens (با markup)
    // بر اساس داده‌های واقعی: gemini-2.5-flash با 1,798 input + 2,766 output = $0.008200
    // محاسبه: (1,798 / 1M) * X + (2,766 / 1M) * Y = $0.008200
    // با فرض نسبت 1:4 برای input:output (مثل Google)، X ≈ $0.64, Y ≈ $2.55
    const backboardPricing: Record<string, { input: number; output: number }> = {
      // Gemini models (قیمت‌های واقعی Backboard)
      'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
      'gemini-2.5-flash': { input: 0.30, output: 2.50 },
      'gemini-2.5-pro': { input: 10.63, output: 42.50 },
      'gemini-3-flash': { input: 0.30, output: 2.50 },
      'gemini-3-pro': { input: 10.63, output: 42.50 },
      
      // GPT models (با markup Backboard)
      'gpt-3.5-turbo': { input: 4.25, output: 12.75 }, // تقریباً 8.5x markup
      'gpt-4': { input: 255.00, output: 510.00 },
      'gpt-4-turbo': { input: 85.00, output: 255.00 },
      'gpt-4o': { input: 21.25, output: 85.00 },
      'gpt-4o-mini': { input: 1.28, output: 5.10 },
      
      // Claude models (با markup Backboard)
      'claude-3-5-haiku': { input: 0.85, output: 4.25 },
      'claude-3-haiku': { input: 0.85, output: 4.25 },
    };

    const modelPricing = backboardPricing[model.toLowerCase()];
    if (modelPricing) {
      const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
      const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
      return inputCost + outputCost;
    }
    
    // اگر مدل مشخصی پیدا نشد، از نرخ پیش‌فرض Backboard استفاده می‌کنیم
    // (تقریباً 8.5x markup نسبت به Google)
    return (inputTokens / 1_000_000) * 0.64 + (outputTokens / 1_000_000) * 2.55;
  }

  // Pricing per 1M tokens (as of 2024) - برای provider های دیگر
  const pricing: Record<string, { input: number; output: number }> = {
    // Gemini 2.5 Flash
    'gemini-2.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.5-pro': { input: 1.25, output: 5.00 },
    'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
    'gemini-3-pro': { input: 1.25, output: 5.00 },
    
    // OpenAI
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    
    // Cursor (uses OpenAI pricing)
    'auto': { input: 0.50, output: 1.50 },
  };

  const modelPricing = pricing[model.toLowerCase()];
  if (!modelPricing) {
    // Default to Gemini 2.5 Flash pricing if unknown
    return (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
  }

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
  
  return inputCost + outputCost;
}

/**
 * Track token usage in database
 */
export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    const totalTokens = data.inputTokens + data.outputTokens;
    const cost = calculateTokenCost(
      data.provider,
      data.model,
      data.inputTokens,
      data.outputTokens
    );

    await prisma.tokenUsage.create({
      data: {
        provider: data.provider,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens,
        cost,
        operation: data.operation,
        newsId: data.newsId || null,
      },
    });

    // Clean logging - token usage tracked
  } catch (error: any) {
    // Don't throw - tracking should not break the main flow
    console.error(`[TokenTracker] ERROR: Failed to track token usage:`, error.message);
  }
}

/**
 * Extract token usage from OpenAI API response
 */
export function extractOpenAITokenUsage(response: any): { inputTokens: number; outputTokens: number } {
  const usage = response.usage || {};
  return {
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
  };
}

/**
 * Extract token usage from Gemini API response
 */
export function extractGeminiTokenUsage(response: any): { inputTokens: number; outputTokens: number } {
  const usage = response.usageMetadata || {};
  return {
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}

/**
 * Estimate tokens from text (rough approximation: 1 token ≈ 4 characters for Persian)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

