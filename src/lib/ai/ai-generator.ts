import { getAISettings, getProviderConfig } from './ai-settings';
import { trackTokenUsage, extractOpenAITokenUsage, extractGeminiTokenUsage } from './token-tracker';
import type { AIProvider } from '@/types/ai';

export interface AIContentResult {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost?: number;
    };
    provider: AIProvider;
    model: string;
}

export async function generateContent(
    prompt: string,
    systemPrompt?: string,
    options: {
        temperature?: number;
        maxTokens?: number;
        preferredProvider?: AIProvider;
    } = {}
): Promise<AIContentResult> {
    const settings = await getAISettings();
    const provider = options.preferredProvider || settings.defaultProvider || 'openai';
    const config = getProviderConfig(settings, provider);

    // Determines if the provider is usable:
    // 1. Globally enabled in settings
    // 2. OR explicitly requested (preferredProvider) and has required API key (if applicable)
    const isExplicitlyRequested = options.preferredProvider === provider;
    const hasApiKey = !!config?.apiKey || provider === 'huggingface' || provider === 'cursor'; // Providers that don't enforce API key

    const isUsable = config?.enabled || (isExplicitlyRequested && hasApiKey);

    if (!config || !isUsable) {
        // If preferred is disabled/unusable, try default
        if (provider !== settings.defaultProvider) {
            console.warn(`[AI] Preferred provider ${provider} is disabled or not configured, falling back to default ${settings.defaultProvider}`);
            return generateContent(prompt, systemPrompt, { ...options, preferredProvider: settings.defaultProvider });
        }
        throw new Error(`AI Provider ${provider} is not enabled or configured (API Key missing?).`);
    }

    const result: AIContentResult = {
        content: '',
        provider,
        model: config.model || 'auto',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };

    try {
        switch (provider) {
            case 'openai':
                return await generateOpenAI(prompt, systemPrompt, config, options);
            case 'gemini':
                return await generateGemini(prompt, systemPrompt, config, options);
            case 'backboard':
                return await generateBackboard(prompt, systemPrompt, config, options);
            case 'custom':
                return await generateCustom(prompt, systemPrompt, config, options);
            case 'cursor':
                throw new Error("Cursor agent not supported in generic generator yet (requires repository context)");
            default:
                throw new Error(`Provider ${provider} not supported`);
        }
    } catch (error: any) {
        console.error(`[AI] Generation failed with ${provider}:`, error);
        
        // Fallback mechanism: اگر خطای quota یا خطای موقت بود، از provider دیگری استفاده کن
        const isQuotaError = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exceeded');
        const isTemporaryError = error.message?.includes('503') || error.message?.includes('rate limit') || error.message?.includes('temporarily');
        
        // اگر خطای quota یا موقت بود و preferredProvider مشخص شده، fallback کن
        // اما فقط اگر enableFallback به صورت صریح true باشد
        if ((isQuotaError || isTemporaryError) && options.preferredProvider && settings.enableFallback === true) {
            console.warn(`[AI] ⚠️ ${provider} quota exceeded or temporary error, trying fallback providers...`);
            
            // استفاده از fallbackProvider از تنظیمات یا fallback پیش‌فرض
            const configuredFallback = settings.fallbackProvider;
            const defaultFallbackProviders: AIProvider[] = ['backboard', 'openai', 'huggingface'];
            
            // اگر fallbackProvider در تنظیمات مشخص شده، از آن استفاده کن
            const fallbackProviders: AIProvider[] = configuredFallback 
                ? [configuredFallback, ...defaultFallbackProviders.filter(p => p !== configuredFallback)]
                : defaultFallbackProviders;
            
            for (const fallbackProvider of fallbackProviders) {
                // اگر fallback provider همان provider اصلی است، skip کن
                if (fallbackProvider === provider) continue;
                
                try {
                    const fallbackConfig = getProviderConfig(settings, fallbackProvider);
                    if (fallbackConfig?.enabled && (fallbackConfig?.apiKey || fallbackProvider === 'huggingface')) {
                        // برای Backboard، اگر مدل Gemini است، از مدل پیش‌فرض استفاده کن
                        let displayModel = fallbackConfig?.model || 'default';
                        if (fallbackProvider === 'backboard' && displayModel?.includes('gemini')) {
                            displayModel = 'gpt-3.5-turbo';
                        }
                        console.log(`[AI] 🔄 Trying fallback provider: ${fallbackProvider} (model: ${displayModel})`);
                        // حذف preferredProvider از options برای جلوگیری از loop
                        const fallbackOptions = { ...options };
                        delete fallbackOptions.preferredProvider;
                        return await generateContent(prompt, systemPrompt, { 
                            ...fallbackOptions, 
                            preferredProvider: fallbackProvider 
                        });
                    } else {
                        console.warn(`[AI] ⚠️ Fallback provider ${fallbackProvider} is not enabled or missing API key`);
                    }
                } catch (fallbackError: any) {
                    console.warn(`[AI] ⚠️ Fallback to ${fallbackProvider} also failed:`, fallbackError.message);
                    continue;
                }
            }
            
            console.error(`[AI] ❌ All fallback providers failed. Original error: ${error.message}`);
        }
        
        throw error;
    }
}

async function generateOpenAI(prompt: string, system: string | undefined, config: any, options: any): Promise<AIContentResult> {
    const apiKey = config.apiKey;
    const model = config.model || 'gpt-3.5-turbo';

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = extractOpenAITokenUsage(data);

    await trackTokenUsage({
        provider: 'openai',
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        operation: 'generate',
    });

    return {
        content,
        provider: 'openai',
        model,
        usage: { ...usage, totalTokens: usage.inputTokens + usage.outputTokens }
    };
}

async function generateGemini(prompt: string, system: string | undefined, config: any, options: any): Promise<AIContentResult> {
    const apiKey = config.apiKey;
    const model = config.model || 'gemini-2.5-flash';

    // Gemini doesn't support system prompt in standard generateContent easily in v1beta without specific config, 
    // so we append it to prompt for valid behavior across versions.
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    maxOutputTokens: options.maxTokens || 2048,
                    temperature: options.temperature || 0.7,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = extractGeminiTokenUsage(data);

    await trackTokenUsage({
        provider: 'gemini',
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        operation: 'generate',
    });

    return {
        content,
        provider: 'gemini',
        model,
        usage: { ...usage, totalTokens: usage.inputTokens + usage.outputTokens }
    };
}

async function generateBackboard(prompt: string, system: string | undefined, config: any, options: any): Promise<AIContentResult> {
    // Dynamic import to avoid circular dependency if utilizing helper
    const { sendMessageToBackboard, getBackboardTokenUsage } = await import('@/lib/automation/telegram/backboard-helper');

    // Backboard helper expects { apiKey, endpoint, model }
    const endpoint = config.endpoint || 'https://app.backboard.io/api';
    // اگر مدل Gemini است، از مدل Backboard استفاده کن (نباید از Gemini در Backboard استفاده شود)
    let model = config.model || 'gpt-3.5-turbo';
    if (model?.includes('gemini')) {
        console.warn(`[AI] ⚠️ Backboard cannot use Gemini model (${model}), using gpt-3.5-turbo instead`);
        model = 'gpt-3.5-turbo';
    }

    const content = await sendMessageToBackboard(prompt, {
        apiKey: config.apiKey,
        endpoint,
        model,
    }, system) || "";

    const usage = getBackboardTokenUsage(content);
    const inputTokens = usage?.inputTokens || Math.ceil(prompt.length / 4);
    const outputTokens = usage?.outputTokens || Math.ceil(content.length / 4);

    await trackTokenUsage({
        provider: 'backboard',
        model,
        inputTokens,
        outputTokens,
        operation: 'generate',
    });

    return {
        content,
        provider: 'backboard',
        model,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens }
    };
}

async function generateCustom(prompt: string, system: string | undefined, config: any, options: any): Promise<AIContentResult> {
    const endpoint = config.endpoint;
    const model = config.model || 'gpt-4o-mini';

    const apiEndpoint = endpoint.endsWith('/v1') ? `${endpoint}/chat/completions` : endpoint;

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
        }),
    });

    if (!response.ok) {
        throw new Error(`Custom API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = extractOpenAITokenUsage(data);

    await trackTokenUsage({
        provider: 'custom',
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        operation: 'generate',
    });

    return {
        content,
        provider: 'custom',
        model,
        usage: { ...usage, totalTokens: usage.inputTokens + usage.outputTokens }
    };
}
