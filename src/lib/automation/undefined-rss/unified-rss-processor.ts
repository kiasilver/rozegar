
/**
 * Unified RSS Processor
 * Main Orchestrator for Unified RSS Processing
 * Extract → Duplicate Check → Generate → Save (Telegram + Website)
 */

import { prisma } from '@/lib/core/prisma';
import type { UnifiedRSSSettings } from '@prisma/client';
import { extractContentOnce, type RSSItem, type ExtractedContent } from '@/lib/shared/unified-content-extractor';
import { isDuplicateTitle } from '@/lib/automation/telegram/rss-duplicate-checker';
import { generateWebsiteContent, validateWebsiteContentOptions } from '@/lib/content/blog/website-content-agent';
import { createBlogFromRSS } from '@/lib/content/blog/blog-creator';
import { generateContent } from '@/lib/ai/ai-generator';
import { DEFAULT_TELEGRAM_PROMPT, DEFAULT_WEBSITE_PROMPT, DEFAULT_COMBINED_PROMPT } from '@/lib/automation/undefined-rss/improved-prompts';
import { sendNewsToTelegram } from '@/lib/automation/telegram/news-processor';
import { SharedImageManager } from '@/lib/shared/image-manager';

/**
 * پاک کردن HTML اضافی از محتوای وبسایت
 * فقط تگ‌های مجاز را نگه می‌دارد: h2, h3, p, b, strong, i, em, ul, ol, li, br
 */
function cleanWebsiteHTML(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleaned = content.trim();

  // حذف تگ‌های markdown code blocks (```html ... ```)
  cleaned = cleaned.replace(/^```html\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/g, '');

  // حذف تگ‌های html و str... از ابتدای محتوا (که AI گاهی اضافه می‌کند)
  cleaned = cleaned.replace(/^html\s*/i, '');
  cleaned = cleaned.replace(/^<html[^>]*>/i, '');
  cleaned = cleaned.replace(/<\/html>$/i, '');
  cleaned = cleaned.replace(/^str\.\.\./i, '');
  cleaned = cleaned.replace(/^<str[^>]*>/i, '');
  cleaned = cleaned.replace(/<\/str>/gi, '');

  // حذف تگ‌های script, style, iframe و سایر تگ‌های خطرناک (با محتوا)
  cleaned = cleaned.replace(/<(script|style|iframe|object|embed|form|input|button|select|textarea|noscript)[^>]*>.*?<\/\1>/gis, '');
  cleaned = cleaned.replace(/<(script|style|iframe|object|embed|form|input|button|select|textarea|noscript)[^>]*\/?>/gi, '');

  // حذف تگ‌های div, span و تبدیل به p
  cleaned = cleaned.replace(/<div[^>]*>/gi, '<p>');
  cleaned = cleaned.replace(/<\/div>/gi, '</p>');
  cleaned = cleaned.replace(/<span[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/span>/gi, '');

  // حذف تگ‌های h1 (سیستم خودش اضافه می‌کند)
  cleaned = cleaned.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
  cleaned = cleaned.replace(/<h1[^>]*\/?>/gi, '');

  // لیست تگ‌های مجاز
  const allowedTags = ['h2', 'h3', 'p', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'hr'];
  const allowedTagsPattern = allowedTags.join('|');

  // حذف تمام تگ‌های غیرمجاز (باز و بسته)
  // ابتدا تگ‌های بسته غیرمجاز را حذف کن
  cleaned = cleaned.replace(new RegExp(`</(?!(${allowedTagsPattern})\\b)[a-z][a-z0-9]*>`, 'gi'), '');

  // سپس تگ‌های باز غیرمجاز را حذف کن (به جز تگ‌های مجاز)
  cleaned = cleaned.replace(new RegExp(`<(?!(${allowedTagsPattern})\\b|/)[a-z][a-z0-9]*[^>]*>`, 'gi'), '');

  // حذف attribute های اضافی از تگ‌های مجاز (فقط id و class را نگه دار)
  cleaned = cleaned.replace(new RegExp(`<(${allowedTagsPattern})([^>]*)>`, 'gi'), (match, tagName, attributes) => {
    // استخراج id و class
    const idMatch = attributes.match(/id=["']([^"']+)["']/i);
    const classMatch = attributes.match(/class=["']([^"']+)["']/i);

    let newTag = `<${tagName}`;
    if (idMatch) newTag += ` id="${idMatch[1]}"`;
    if (classMatch) newTag += ` class="${classMatch[1]}"`;
    newTag += '>';
    return newTag;
  });

  // حذف تگ‌های self-closing غیرمجاز
  cleaned = cleaned.replace(new RegExp(`<(?!(${allowedTagsPattern})\\b)[a-z][a-z0-9]*[^>]*\\s*/>`, 'gi'), '');

  // پاک کردن entity های HTML اضافی (اما &nbsp; را نگه دار برای فاصله‌ها)
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&#x27;/g, "'");
  cleaned = cleaned.replace(/&#x2F;/g, '/');

  // بهبود فاصله‌گذاری پاراگراف‌ها
  // اطمینان از اینکه هر پاراگراف با <p> شروع می‌شود و فاصله مناسب دارد
  cleaned = cleaned.replace(/\n\s*\n/g, '\n'); // حذف خطوط خالی اضافی
  cleaned = cleaned.replace(/(<\/p>)\s*(<p[^>]*>)/gi, '$1\n$2'); // فاصله بین پاراگراف‌ها
  cleaned = cleaned.replace(/(<\/h[2-3]>)\s*(<p[^>]*>)/gi, '$1\n$2'); // فاصله بعد از هدینگ

  // حذف فضاهای اضافی (اما خطوط جدید را نگه دار)
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // چند فاصله به یک فاصله
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // بیش از 2 خط جدید به 2 خط

  // اطمینان از اینکه محتوا با تگ مناسب شروع می‌شود
  if (!cleaned.match(/^<(h[2-3]|p)/i)) {
    // اگر محتوا با تگ شروع نمی‌شود، آن را در <p> بگذار
    cleaned = `<p>${cleaned}</p>`;
  }

  cleaned = cleaned.trim();

  // اطمینان از اینکه تگ‌های باز و بسته جفت هستند
  // حذف تگ‌های باز بدون بسته (به جز br, hr)
  const selfClosingTags = ['br', 'hr'];
  allowedTags.forEach(tag => {
    if (!selfClosingTags.includes(tag)) {
      // شمارش تگ‌های باز و بسته
      const openMatches = cleaned.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || [];
      const closeMatches = cleaned.match(new RegExp(`</${tag}>`, 'gi')) || [];

      // اگر تعداد تگ‌های باز بیشتر از بسته باشد، تگ‌های اضافی را حذف کن
      if (openMatches.length > closeMatches.length) {
        const diff = openMatches.length - closeMatches.length;
        // حذف آخرین تگ‌های باز اضافی
        for (let i = 0; i < diff; i++) {
          cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>(?![^<]*</${tag}>)`, 'gi'), '');
        }
      }
    }
  });

  return cleaned;
}

/**
 * Extract JSON from text (robustly)
 * Finds the first valid { and the last valid }
 */
function extractJSON(text: string): any {
  if (!text) return null;

  let jsonString = text.trim();

  // Try parsing directly first
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Continue only if direct parse fails
  }

  // Remove markdown code blocks if present
  jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '');

  // Find first '{'
  const firstOpen = jsonString.indexOf('{');
  // Find last '}'
  const lastClose = jsonString.lastIndexOf('}');

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    const candidate = jsonString.substring(firstOpen, lastClose + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // If straightforward extraction fails, it might be more complex
      console.warn('[UnifiedProcessor] JSON extraction failed even after finding braces');
    }
  }

  throw new Error('Could not extract valid JSON from response');
}

/**
 * پاک کردن تگ‌های غیرمجاز HTML برای تلگرام
 * تبدیل تگ‌های block به معادل متنی مناسب
 */
function cleanTelegramHTML(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // حذف تگ‌های markdown code blocks
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

  // تبدیل تگ‌های Heading به Bold + Newline
  cleaned = cleaned.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n<b>$1</b>\n');

  // تبدیل پاراگراف‌ها به دو خط جدید
  cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
  cleaned = cleaned.replace(/<p[^>]*>/gi, '');

  // تبدیل لیست‌ها به بولت
  cleaned = cleaned.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
  cleaned = cleaned.replace(/<ul[^>]*>/gi, '\n');
  cleaned = cleaned.replace(/<\/ul>/gi, '\n');
  cleaned = cleaned.replace(/<ol[^>]*>/gi, '\n');
  cleaned = cleaned.replace(/<\/ol>/gi, '\n');

  // تبدیل BR به خط جدید
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // حذف تگ‌های div و span (محتوا بماند)
  cleaned = cleaned.replace(/<div[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<span[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/span>/gi, '');

  // حذف تگ‌های غیرمجاز دیگر ولی حفظ محتوا (مثل table, tr, td و غیره)
  // تلگرام فقط از اینها پشتیبانی می‌کند: b, strong, i, em, u, ins, s, strike, del, a, code, pre, blockquote, tg-spoiler
  // ما فعلاً فرض می‌کنیم AI فقط تگ‌های اصلی را تولید می‌کند.
  // برای اطمینان، تگ‌های style و script را کامل حذف می‌کنیم (با محتوا)
  cleaned = cleaned.replace(/<(script|style)[^>]*>.*?<\/\1>/gis, '');

  // تمیزکاری فاصله‌ها
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // حداکثر 2 خط خالی پشت سر هم
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * ساخت prompt dynamic بر اساس تنظیمات
 */
function buildWebsitePrompt(
  basePrompt: string,
  settings: UnifiedRSSSettings,
  extracted: ExtractedContent
): string {
  let prompt = basePrompt;

  // اگر SEO غیرفعال باشد، بخش SEO را از prompt حذف کن
  if (!settings.website_force_seo) {
    // حذف بخش تکمیل SEO
    prompt = prompt.replace(/5\.\s*\*\*تکمیل SEO.*?کلمات کلیدی را طبیعی در متن بگنجان\.\s*/s, '');
    prompt = prompt.replace(/5\.\s*\*\*SEO.*?کلمات کلیدی را طبیعی در متن بگنجان\.\s*/s, '');
    // اگر بخش 6 وجود دارد، شماره آن را به 5 تغییر بده
    prompt = prompt.replace(/6\.\s*\*\*ممنوعیات:/, '5. **ممنوعیات:');
    prompt = prompt.replace(/7\.\s*\*\*بازنویسی:/, '6. **بازنویسی:');
  }

  // بررسی نیاز به تقویت محتوا
  const wordCount = extracted.cleanContent.split(/\s+/).length;
  const needsContentBoost = settings.website_enhance_content && wordCount < 500;

  if (needsContentBoost) {
    // اضافه کردن دستورالعمل برای تحلیل خبرنگار
    const boostInstruction = `

**نکته مهم - تقویت محتوا:**
- محتوای دریافتی کوتاه است و برای SEO کافی نیست.
- تو به عنوان یک تحلیلگر و خبرنگار حرفه‌ای اقتصادی، باید تحلیل و بررسی خودت را اضافه کنی.
- در ابتدای تحلیل خودت بنویس: "طبق تحلیل خبرنگار روزمرگی..."
- سپس تحلیل اقتصادی، بررسی دلایل، پیامدها و زمینه‌های خبر را اضافه کن.
- این تحلیل باید طبیعی و حرفه‌ای باشد و به SEO کمک کند.`;

    // اضافه کردن دستورالعمل به بخش تکمیل SEO یا ایجاد بخش جدید
    if (settings.website_force_seo) {
      prompt = prompt.replace(
        /5\.\s*\*\*تکمیل SEO.*?کلمات کلیدی را طبیعی در متن بگنجان\.\s*/s,
        `5. **تکمیل SEO (مهم):**
   - محتوای دریافتی کوتاه است و برای SEO کافی نیست.
   - تو به عنوان یک تحلیلگر و خبرنگار حرفه‌ای اقتصادی، باید تحلیل و بررسی خودت را اضافه کنی.
   - در ابتدای تحلیل خودت بنویس: "طبق تحلیل خبرنگار روزمرگی..."
   - سپس تحلیل اقتصادی، بررسی دلایل، پیامدها و زمینه‌های خبر را اضافه کن.
   - این تحلیل باید طبیعی و حرفه‌ای باشد و به SEO کمک کند.
   - کلمات کلیدی را طبیعی در متن بگنجان.
`
      );
    } else {
      // اگر SEO غیرفعال است، دستورالعمل را به بخش فرمت‌دهی اضافه کن
      prompt = prompt.replace(
        /4\.\s*\*\*فرمت‌دهی:.*?پاراگراف‌بندی منطقی با زیرعنوان‌های مناسب\.\s*/s,
        `4. **فرمت‌دهی:**
   - از تگ‌های HTML (h2, p) استفاده کن.
   - **کلمات کلیدی** و **اعداد مهم** را بولد کن (تگ <b> یا <strong>).
   - پاراگراف‌بندی منطقی با زیرعنوان‌های مناسب.
   - محتوای دریافتی کوتاه است، پس تحلیل و بررسی خودت را اضافه کن.
   - در ابتدای تحلیل خودت بنویس: "طبق تحلیل خبرنگار روزمرگی..."
   - سپس تحلیل اقتصادی، بررسی دلایل، پیامدها و زمینه‌های خبر را اضافه کن.
`
      );
    }
  }

  return prompt;
}

export interface ProcessingTargets {
  telegram: boolean;
  website: boolean;
  customPrompt?: string;
  skipDuplicateCheck?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  telegram?: {
    success: boolean;
    messageId?: number;
    error?: string;
    tokensIn?: number;
    tokensOut?: number;
    cost?: number;
  };
  website?: {
    success: boolean;
    blogId?: number;
    slug?: string;
    shortLink?: string;
    error?: string;
    tokensIn?: number;
    tokensOut?: number;
    cost?: number;
  };
  extracted: boolean;
  logId?: number;
  error?: string;
}

/**
 * Unified RSS Item Processing
 */
export async function processRSSItemUnified(
  rssItem: RSSItem,
  rssSourceUrl: string,
  categoryId: number,
  categoryName: string,
  targets: ProcessingTargets,
  settings: UnifiedRSSSettings
): Promise<ProcessingResult> {
  const startTime = Date.now();

  console.log(`\n[UnifiedProcessor] 🚀 Starting unified processing...`);
  console.log(`[UnifiedProcessor] 📰 Title: ${rssItem.title.substring(0, 60)}...`);
  console.log(`[UnifiedProcessor] 🎯 Targets: Telegram=${targets.telegram}, Website=${targets.website}`);

  let telegramResult: ProcessingResult['telegram'];
  let websiteResult: ProcessingResult['website'];

  try {
    // 1. Extract content once
    console.log(`[UnifiedProcessor] 📥 Step 1: Extracting content...`);

    const extracted = await extractContentOnce(
      rssItem,
      categoryId,
      categoryName,
      rssSourceUrl
    );

    if (!extracted || !extracted.cleanContent) {
      throw new Error('Failed to extract content');
    }

    console.log(`[UnifiedProcessor] ✅ Extracted: ${extracted.wordCount} words`);
    if (extracted.imageUrl) console.log(`[UnifiedProcessor] 🖼️ Extracted Image: ${extracted.imageUrl}`);
    if (extracted.videoUrl) console.log(`[UnifiedProcessor] 🎥 Extracted Video: ${extracted.videoUrl}`);

    // 1.5. Image Required Check — STOP if no image found
    if (!extracted.imageUrl) {
      console.log(`[UnifiedProcessor] ❌ No image found — stopping processing`);
      await saveUnifiedLog({
        title: extracted.title,
        rssSourceUrl: extracted.rssSourceUrl,
        originalUrl: extracted.sourceUrl,
        categoryId,
        target: targets.telegram ? 'telegram' : 'website',
        telegramStatus: 'no_image',
        telegramError: 'No image found in news article',
        extractedContent: extracted.cleanContent,
      });
      return {
        success: false,
        extracted: true,
        error: 'No image found — processing stopped',
      };
    }

    // 2. Duplicate Check (for Telegram) — skip if manual send
    if (targets.telegram && !targets.skipDuplicateCheck) {
      console.log(`[UnifiedProcessor] 🔍 Step 2: Checking duplicates for Telegram...`);

      const isDuplicate = await isDuplicateTitle(
        extracted.title,
        extracted.sourceUrl,
        extracted.rssSourceUrl
      );

      if (isDuplicate) {
        console.log(`[UnifiedProcessor] ⚠️ Duplicate detected for Telegram, skipping...`);

        // Save log
        await saveUnifiedLog({
          title: extracted.title,
          rssSourceUrl: extracted.rssSourceUrl,
          originalUrl: extracted.sourceUrl,
          categoryId,
          target: 'telegram',
          telegramStatus: 'duplicate',
          telegramError: 'Duplicate news detected',
          extractedContent: extracted.cleanContent,
        });

        return {
          success: false,
          extracted: true,
          error: 'Duplicate for Telegram',
        };
      }
    }

    // 2.5. Process image once for both Telegram and Website (if enabled)
    // نکته: یک عکس برای یک خبر - چه در وبسایت چه در تلگرام استفاده می‌شود
    // برای وبسایت watermark اعمال می‌شود، برای تلگرام watermark در news-processor.ts اعمال می‌شود
    let processedImageUrl: string | null = null;
    if ((targets.website || targets.telegram) && extracted.imageUrl) {
      console.log(`[UnifiedProcessor] 🖼️ Processing image once for both targets...`);
      console.log(`[UnifiedProcessor] 📋 Watermark settings: enabled=${settings.website_enable_watermark}, path=${settings.watermark_logo_path || 'not set'}`);
      try {
        // پردازش تصویر یک بار برای هر دو (watermark برای وبسایت)
        processedImageUrl = await SharedImageManager.processImage(
          extracted.imageUrl,
          {
            enableWatermark: settings.website_enable_watermark || false,
            watermarkPath: settings.watermark_logo_path || undefined,
            targetFolder: 'blog-images',
            maxWidth: 1200,
            maxHeight: 800,
            quality: 85,
          }
        );

        if (processedImageUrl) {
          console.log(`[UnifiedProcessor] ✅ Image processed: ${processedImageUrl}${settings.website_enable_watermark ? ' (with watermark)' : ' (no watermark)'}`);
          // استفاده از تصویر پردازش شده برای هر دو (وبسایت و تلگرام)
          // برای تلگرام watermark در news-processor.ts اعمال می‌شود
          extracted.imageUrl = processedImageUrl; // به‌روزرسانی URL برای استفاده مشترک
        } else {
          console.error(`[UnifiedProcessor] ❌ Image download failed - cannot proceed without image`);
          // اگر عکس دانلود نشد، پردازش را متوقف کن
          return {
            success: false,
            extracted: true,
            error: 'Image download failed - cannot process content without image',
          };
        }
      } catch (error: any) {
        console.error(`[UnifiedProcessor] ❌ Image processing failed:`, error.message);
        // اگر عکس دانلود نشد، پردازش را متوقف کن
        return {
          success: false,
          extracted: true,
          error: `Image processing failed: ${error.message}`,
        };
      }
    }

    // Check for Combined Processing (Optimization)
    // Add artificial delay for system stability as requested by user
    console.log(`[UnifiedProcessor] ⏳ Waiting 3s for system stability...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // If both enabled, no custom prompt, and settings allow (implicit and explicit)
    const useCombined = targets.telegram &&
      targets.website &&
      !targets.customPrompt &&
      !settings.website_prompt_rewrite &&
      (settings.enable_combined_processing ?? true);

    if (useCombined) {
      console.log(`[UnifiedProcessor] 🚀 Using Combined Processing Strategy (Single Call)...`);
      try {
        const combinedResult = await processCombinedContent(
          extracted,
          settings,
          categoryName,
          categoryId
        );
        telegramResult = combinedResult.telegram;
        websiteResult = combinedResult.website;
      } catch (error: any) {
        console.error(`[UnifiedProcessor] ❌ Combined processing failed, falling back to separate:`, error.message);
        // Fallback to separate processing if combined fails
        // We will just let it fall through to the separate logic if we unset useCombined, but here we are in if block.
        // Actually, let's just re-throw for now as debugging aid, or better:
        // Force separate processing by setting flags? No, let's just proceed to separate.
        // Re-implement fallback:
        // We can't easily fallback structure-wise without refactoring. 
        // Let's just treat combined failure as Error to be safe and visible.
        throw error;
      }
    } else {
      // 3. Process Telegram (Separate)
      // بررسی: اگر عکس دانلود نشد، نباید به agent content بفرستیم
      if (targets.telegram) {
        // اگر عکس دانلود نشد (processedImageUrl null است و extracted.imageUrl هم null است)، متوقف کن
        if (!extracted.imageUrl) {
          console.error(`[UnifiedProcessor] ❌ No image URL - cannot process Telegram without image`);
          return {
            success: false,
            extracted: true,
            error: 'No image URL - cannot process Telegram without image',
          };
        }

        console.log(`[UnifiedProcessor] 📱 Step 3: Processing for Telegram...`);

        try {
          telegramResult = await processTelegramContent(
            extracted,
            settings,
            categoryName,
            targets.customPrompt
          );

          console.log(`[UnifiedProcessor] ${telegramResult.success ? '✅' : '❌'} Telegram: ${telegramResult.success ? 'Success' : telegramResult.error}`);
        } catch (error: any) {
          console.error(`[UnifiedProcessor] ❌ Telegram error:`, error.message);
          telegramResult = {
            success: false,
            error: error.message,
          };
        }
      }

      // 4. Process Website (Separate)
      // بررسی: اگر عکس دانلود نشد، نباید به agent content بفرستیم
      if (targets.website) {
        // اگر عکس دانلود نشد (processedImageUrl null است)، متوقف کن
        if (!processedImageUrl && !extracted.imageUrl) {
          console.error(`[UnifiedProcessor] ❌ No image - cannot process Website without image`);
          return {
            success: false,
            extracted: true,
            error: 'No image - cannot process Website without image',
          };
        }

        console.log(`[UnifiedProcessor] 🌐 Step 4: Processing for Website...`);

        try {
          websiteResult = await processWebsiteContent(
            extracted,
            settings,
            categoryId,
            categoryName,
            undefined, // contentOverride
            processedImageUrl // preProcessedImageUrl
          );

          console.log(`[UnifiedProcessor] ${websiteResult.success ? '✅' : '❌'} Website: ${websiteResult.success ? 'Success' : websiteResult.error}`);
        } catch (error: any) {
          console.error(`[UnifiedProcessor] ❌ Website error:`, error.message);
          websiteResult = {
            success: false,
            error: error.message,
          };
        }
      }
    }

    // 5. Save unified log
    const log = await saveUnifiedLog({
      title: extracted.title,
      rssSourceUrl: extracted.rssSourceUrl,
      originalUrl: extracted.sourceUrl,
      categoryId,
      target: targets.telegram && targets.website ? 'both' : targets.telegram ? 'telegram' : 'website',
      telegramSent: telegramResult?.success || false,
      telegramMessageId: telegramResult?.messageId,
      telegramStatus: telegramResult?.success ? 'success' : telegramResult?.error ? 'error' : undefined,
      telegramError: telegramResult?.error,
      telegramTokensIn: telegramResult?.tokensIn,
      telegramTokensOut: telegramResult?.tokensOut,
      telegramCost: telegramResult?.cost,
      websiteSent: websiteResult?.success || false,
      websiteBlogId: websiteResult?.blogId,
      websiteStatus: websiteResult?.success ? 'success' : websiteResult?.error ? 'error' : undefined,
      websiteError: websiteResult?.error,
      websiteSlug: websiteResult?.slug,
      websiteTokensIn: websiteResult?.tokensIn,
      websiteTokensOut: websiteResult?.tokensOut,
      websiteCost: websiteResult?.cost,
      extractedContent: extracted.cleanContent,
    });

    const duration = Date.now() - startTime;
    const success = (targets.telegram ? (telegramResult?.success ?? false) : true) &&
      (targets.website ? (websiteResult?.success ?? false) : true);

    console.log(`[UnifiedProcessor] ${success ? '🎉' : '⚠️'} Completed in ${duration}ms`);

    return {
      success,
      telegram: telegramResult,
      website: websiteResult,
      extracted: true,
      logId: log.id,
    };

  } catch (error: any) {
    console.error(`[UnifiedProcessor] ❌ Fatal error:`, error.message);

    return {
      success: false,
      extracted: false,
      error: error.message,
    };
  }
}

/**
 * Process content for Telegram
 */
async function processTelegramContent(
  extracted: ExtractedContent,
  settings: UnifiedRSSSettings,
  categoryName: string,
  customPrompt?: string,
  contentOverride?: { content: string, tokensIn: number, tokensOut: number, cost: number }
): Promise<NonNullable<ProcessingResult['telegram']>> {
  try {


    let content: string;
    let tokensIn = 0;
    let tokensOut = 0;
    let cost = 0;

    if (contentOverride) {
      content = contentOverride.content;
      tokensIn = contentOverride.tokensIn;
      tokensOut = contentOverride.tokensOut;
      cost = contentOverride.cost;
    } else {
      // Generate Telegram content
      const prompt = buildTelegramPrompt(
        extracted.title,
        extracted.cleanContent,
        categoryName,
        settings.telegram_language,
        settings.telegram_content_length,
        settings.telegram_tone,
        customPrompt || settings.telegram_prompt
      );

      const generated = await generateContent(
        prompt,
        undefined, // System prompt included in prompt or separate?
        // We pass prompt as user message. The prompt template includes system-like instructions.
        { temperature: 0.7 }
      );

      if (!generated.content) {
        throw new Error('Empty content generated');
      }
      // Calculate stats from generic result
      content = generated.content;

      // Clean markdown code blocks if present (AI often wraps HTML in ```html ... ```)
      content = content.replace(/^```html\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');

      tokensIn = generated.usage?.inputTokens || 0;
      tokensOut = generated.usage?.outputTokens || 0;
      cost = 0; // Cost calculation requires model pricing, maybe later
    }

    // Attempt to parse JSON if the content looks like JSON (e.g. if the wrong prompt was used)
    if (content.trim().startsWith('{') || content.includes('"telegram_summary"')) {
      try {
        let jsonContent = content;
        // Clean markdown code blocks
        jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        const json = JSON.parse(jsonContent);
        if (json.telegram_summary) {
          console.log('[UnifiedProcessor] ⚠️ Detected JSON in Telegram content, extracting telegram_summary...');
          content = json.telegram_summary;
        }
      } catch (e) {
        // Ignore JSON parse error, assume it's text
      }
    }

    // 4. Try to extract JSON if content looks like JSON or if we came from a combined prompt
    let finalContent = content;

    // Always try to extract JSON first, just in case
    try {
      const json = extractJSON(content);
      if (json && json.telegram_summary) {
        console.log('[UnifiedProcessor] ✅ Successfully extracted telegram_summary from JSON');
        finalContent = json.telegram_summary;
      }
    } catch (e) {
      // Not JSON, continue treating as plain text
    }

    // Clean markdown code blocks (just in case it's still wrapped)
    finalContent = finalContent.replace(/^```json\s*/i, '')
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '');

    // Clean Telegram HTML tags
    finalContent = cleanTelegramHTML(finalContent);
    const sent = await sendNewsToTelegram({
      botToken: settings.telegram_bot_token!,
      channelId: settings.telegram_channel_id!,
      content: finalContent,
      imageUrl: extracted.imageUrl,
      videoUrl: extracted.videoUrl, // Add video URL
      sourceUrl: extracted.sourceUrl,
      enableWatermark: (extracted.imageUrl && extracted.imageUrl.startsWith('/images/')) ? false : settings.telegram_enable_watermark,
      watermarkPath: settings.watermark_logo_path || undefined,
      categoryName: categoryName, // پاس دادن categoryName برای اضافه کردن هشتگ‌ها
    });

    if (!sent.success) {
      throw new Error(sent.error || 'Failed to send to Telegram');
    }

    return {
      success: true,
      messageId: sent.messageId,
      tokensIn,
      tokensOut,
      cost,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process content for Website
 */
async function processWebsiteContent(
  extracted: ExtractedContent,
  settings: UnifiedRSSSettings,
  categoryId: number,
  categoryName: string,
  contentOverride?: { content: string, keywords: string[], tokensIn: number, tokensOut: number, cost: number },
  preProcessedImageUrl?: string | null
): Promise<NonNullable<ProcessingResult['website']>> {
  try {
    // Generate Website content (if not overridden)
    let content: string;
    let keywords: string[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    let cost = 0;

    if (contentOverride) {
      // پاک کردن HTML اضافی از محتوای override شده
      const originalLength = contentOverride.content.length;
      content = cleanWebsiteHTML(contentOverride.content);
      const cleanedLength = content.length;
      console.log(`[UnifiedProcessor] 🧹 HTML cleaned (override): ${originalLength} → ${cleanedLength} chars`);
      keywords = contentOverride.keywords;
      tokensIn = contentOverride.tokensIn;
      tokensOut = contentOverride.tokensOut;
      cost = contentOverride.cost;
    } else {
      // ساخت prompt dynamic بر اساس تنظیمات
      const basePrompt = settings.website_prompt_rewrite || DEFAULT_WEBSITE_PROMPT;
      const dynamicPrompt = buildWebsitePrompt(basePrompt, settings, extracted);

      const websiteOptions = {
        title: extracted.title,
        rawContent: extracted.cleanContent,
        categoryName,
        language: settings.website_language as 'fa' | 'en',
        tone: settings.website_tone as any,
        targetLength: settings.website_content_length as 'short' | 'medium' | 'long',
        keywords: extractKeywords(extracted.title, extracted.cleanContent),
        customPrompt: dynamicPrompt,
      };

      validateWebsiteContentOptions(websiteOptions);

      const generated = await generateWebsiteContent(websiteOptions);

      if (!generated.content) {
        throw new Error('Empty content generated');
      }

      // پاک کردن HTML اضافی از محتوا
      const originalLength = generated.content.length;
      content = cleanWebsiteHTML(generated.content);
      const cleanedLength = content.length;
      console.log(`[UnifiedProcessor] 🧹 HTML cleaned: ${originalLength} → ${cleanedLength} chars`);
      keywords = websiteOptions.keywords;
      tokensIn = generated.tokensIn;
      tokensOut = generated.tokensOut;
      cost = generated.cost;
    }

    // Create excerpt
    const excerpt = content.substring(0, 200) + '...';

    // Create Blog
    // استفاده از تصویر پردازش شده برای وبسایت (اگر پردازش شده باشد)
    const finalImageUrl = preProcessedImageUrl || extracted.imageUrl;
    const imageAlreadyProcessed = finalImageUrl?.startsWith('/images/');
    const blogResult = await createBlogFromRSS({
      title: extracted.title,
      content: content,
      excerpt,
      sourceUrl: extracted.sourceUrl,
      imageUrl: finalImageUrl,
      videoUrl: extracted.videoUrl,
      categoryId,
      keywords: keywords,
      language: settings.website_language as 'fa' | 'en',
      enableSEO: settings.website_force_seo,
      // اگر عکس قبلاً پردازش شده (با watermark)، دیگر watermark اعمال نکن
      enableWatermark: imageAlreadyProcessed ? false : (settings.website_enable_watermark || false),
      watermarkPath: imageAlreadyProcessed ? undefined : (settings.watermark_logo_path || undefined),
      siteUrl: settings.site_url || undefined,
    });

    if (!blogResult.success) {
      throw new Error(blogResult.error || 'Failed to create blog');
    }

    return {
      success: true,
      blogId: blogResult.blogId,
      slug: blogResult.slug,
      shortLink: blogResult.shortLink,
      tokensIn,
      tokensOut,
      cost,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * پردازش ترکیبی (Combined Processing)
 * تولید محتوای تلگرام و وبسایت در یک درخواست
 */
async function processCombinedContent(
  extracted: ExtractedContent,
  settings: UnifiedRSSSettings,
  categoryName: string,
  categoryId: number
): Promise<{ telegram: ProcessingResult['telegram'], website: ProcessingResult['website'] }> {
  console.log(`[UnifiedProcessor] 🔄 Generating combined content (Optimization Mode)...`);

  const telegramLimit = getLengthRange(settings.telegram_content_length);
  // Website usually needs full content, but we can hint length if needed. 
  // For website, 'short' might mean concise article, 'long' means detailed.
  const websiteLimitInstruction = settings.website_content_length === 'short' ? 'Concise (approx 500 words)' :
    settings.website_content_length === 'long' ? 'Comprehensive and detailed (over 1000 words)' :
      'Standard (approx 700 words)';

  // 1. Fetch custom prompt from DB
  const customPromptObj = await prisma.aIPrompt.findFirst({
    where: { target: 'combined', is_active: true },
  });

  let promptTemplate = customPromptObj?.content;

  if (!promptTemplate) {
    promptTemplate = DEFAULT_COMBINED_PROMPT;
  }

  // 2. Replace placeholders
  const prompt = promptTemplate
    .replace(/{title}/g, extracted.title)
    .replace(/{content}/g, extracted.cleanContent)
    .replace(/{telegramLimit}/g, telegramLimit)
    .replace(/{websiteLimitInstruction}/g, websiteLimitInstruction);

  // استفاده از provider از تنظیمات (defaultProvider)
  const { getAISettings } = await import('@/lib/ai/ai-settings');
  const aiSettings = await getAISettings();
  const provider = aiSettings.defaultProvider || 'openai';
  
  console.log(`[UnifiedProcessor] 🔄 Using provider: ${provider} for combined processing`);
  
  const generated = await generateContent(prompt, undefined, {
    temperature: 0.7,
    preferredProvider: provider // استفاده از provider از تنظیمات
  });

  let json: any;
  try {
    json = extractJSON(generated.content);
  } catch (e) {
    console.error(`[UnifiedProcessor] ❌ Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    console.debug(`[UnifiedProcessor] Raw content: ${generated.content.substring(0, 200)}...`);
    throw new Error('Failed to parse combined JSON response');
  }

  if (!json.telegram_summary || !json.website_content) {
    throw new Error('Combined JSON missing required fields');
  }

  // Split costs (approximate) - 50/50
  const totalIn = generated.usage?.inputTokens || 0;
  const totalOut = generated.usage?.outputTokens || 0;
  const halfTokensIn = Math.ceil(totalIn / 2);
  const halfTokensOut = Math.ceil(totalOut / 2);
  const halfCost = 0; // Cost not available yet

  // Process Telegram with override
  console.log(`[UnifiedProcessor] 📱 Processing Telegram part...`);
  const telegramResult = await processTelegramContent(
    extracted, settings, categoryName, undefined,
    {
      content: cleanTelegramHTML(json.telegram_summary),
      tokensIn: halfTokensIn,
      tokensOut: halfTokensOut,
      cost: halfCost
    }
  );

  // Process Website with override
  console.log(`[UnifiedProcessor] 🌐 Processing Website part...`);
  // استفاده از تصویر پردازش شده (اگر قبلاً پردازش شده)
  // نکته: تصویر قبلاً در processRSSItemUnified پردازش شده و در extracted.imageUrl ذخیره شده

  // Update title if generated
  if (json.website_title) {
    extracted.title = json.website_title;
  }

  const websiteResult = await processWebsiteContent(
    extracted, settings, categoryId, categoryName,
    {
      content: json.website_content, // This must be the HTML string
      keywords: json.seo_keywords || [],
      tokensIn: halfTokensIn,
      tokensOut: halfTokensOut,
      cost: halfCost
    },
    extracted.imageUrl?.startsWith('/images/') ? extracted.imageUrl : null // استفاده از تصویر پردازش شده
  );

  return { telegram: telegramResult, website: websiteResult };
}

/**
 * ذخیره log یکپارچه
 */
async function saveUnifiedLog(data: any) {
  return await prisma.unifiedRSSLog.create({
    data: {
      title: data.title?.substring(0, 500) || '',
      rss_source_url: data.rssSourceUrl?.substring(0, 500),
      original_url: data.originalUrl?.substring(0, 500),
      category_id: data.categoryId,
      target: data.target,
      telegram_sent: data.telegramSent || false,
      telegram_message_id: data.telegramMessageId,
      telegram_status: data.telegramStatus,
      telegram_error: data.telegramError,
      telegram_tokens_in: data.telegramTokensIn,
      telegram_tokens_out: data.telegramTokensOut,
      telegram_cost: data.telegramCost,
      website_sent: data.websiteSent || false,
      website_blog_id: data.websiteBlogId,
      website_status: data.websiteStatus,
      website_error: data.websiteError,
      website_content: data.websiteContent,
      website_tokens_in: data.websiteTokensIn,
      website_tokens_out: data.websiteTokensOut,
      website_cost: data.websiteCost,
      website_slug: data.websiteSlug?.substring(0, 500),
      extracted_content: data.extractedContent,
      extracted_at: data.extractedAt || new Date(),
      processed_at: new Date(),
    },
  });
}

/**
 * دریافت تنظیمات یکپارچه
 */
export async function getUnifiedSettings(): Promise<UnifiedRSSSettings | null> {
  return await prisma.unifiedRSSSettings.findFirst({
    orderBy: { created_at: 'desc' },
  });
}

/**
 * ساخت prompt برای تلگرام
 */
function buildTelegramPrompt(
  title: string,
  content: string,
  category: string,
  language: string,
  length: string,
  tone: string,
  customPrompt?: string | null
): string {
  // Use customPrompt if provided, otherwise fallback to default
  const template = customPrompt ? customPrompt : DEFAULT_TELEGRAM_PROMPT;

  // Dynamic Length
  const lengthLimit = getLengthRange(length);

  // Replace placeholders (using global regex to replace all occurrences)
  return template
    .replace(/{title}/g, title || 'News')
    .replace(/{content}/g, content)
    .replace(/{category}/g, category)
    .replace(/{lengthLimit}/g, lengthLimit);
}

/**
 * استخراج کلمات کلیدی
 */
function extractKeywords(title: string, content: string): string[] {
  const words = (title + ' ' + content)
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 10);

  return [...new Set(words)].slice(0, 5);
}

/**
 * دریافت بازه طول متن بر اساس تنظیمات
 */
function getLengthRange(lengthSetting: string | null | undefined): string {
  switch (lengthSetting) {
    case 'short': return '300 to 500 chars';
    case 'medium': return '600 to 900 chars';
    case 'long': return '1000 to 1500 chars';
    default: return '700 to 1000 chars';
  }
}
