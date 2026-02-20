/**
 * Website Content Agent
 * تولید محتوای وبسایت با AI
 * Support: چند زبان، چند لحن، طول‌های مختلف
 */

import { generateContent } from '@/lib/ai/ai-generator';

export interface WebsiteContentOptions {
  title: string;
  rawContent: string;
  categoryName: string;
  language: 'fa' | 'en';
  tone: 'reporter' | 'reporter_analytical' | 'reporter_opinion' | 'reporter_article';
  targetLength: 'short' | 'medium' | 'long';
  keywords?: string[];
  customPrompt?: string;
}

export interface WebsiteGeneratedContent {
  content: string;
  hasAnalysis: boolean;
  needsPrefix: boolean;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  mode: 'rewrite' | 'analysis';
}

/**
 * Prompt Templates برای هر زبان و لحن
 */
const PROMPTS = {
  fa: {
    rewrite: {
      reporter: `شما یک روزنامه‌نگار حرفه‌ای هستید. این خبر را به صورت رسمی و بی‌طرفانه بازنویسی کنید.

عنوان: {title}
دسته: {category}

محتوای اصلی:
{content}

الزامات:
- بازنویسی کامل و روان به زبان فارسی
- حفظ تمام جزئیات و آمار
- لحن خبری و بی‌طرف
- بدون نظر شخصی
- طول: {targetLength}
- ساختار: مقدمه، بدنه اصلی، نتیجه‌گیری

فقط متن بازنویسی شده را برگردانید (بدون عنوان اضافی):`,

      reporter_analytical: `شما یک روزنامه‌نگار تحلیلگر هستید. این خبر را بازنویسی و تحلیل کنید.

عنوان: {title}
دسته: {category}

محتوای اصلی:
{content}

الزامات:
- بازنویسی کامل خبر
- اضافه کردن تحلیل و زمینه
- بررسی دلایل و پیامدها
- لحن تحلیلی و حرفه‌ای
- طول: {targetLength}

ساختار مورد نیاز:
1. بازنویسی خبر (2-3 پاراگراف)
2. تحلیل و بررسی (2-3 پاراگراف)
3. نتیجه‌گیری

فقط متن را برگردانید (بدون عنوان اضافی):`,

      reporter_opinion: `شما یک ستون‌نویس تحلیلی هستید. این خبر را بازنویسی و نظر تخصصی خود را بیان کنید.

عنوان: {title}
دسته: {category}

محتوای اصلی:
{content}

الزامات:
- بازنویسی خبر
- ارائه نظر تخصصی و تحلیلی
- بررسی ابعاد مختلف
- پیشنهادات و راهکارها
- لحن حرفه‌ای اما دارای دیدگاه
- طول: {targetLength}

ساختار مورد نیاز:
1. بازنویسی خبر
2. تحلیل و نظر تخصصی
3. پیشنهادات و نتیجه‌گیری

فقط متن را برگردانید:`,

      reporter_article: `شما یک نویسنده مقاله تخصصی هستید. این خبر را به یک مقاله جامع تبدیل کنید.

عنوان: {title}
دسته: {category}

محتوای اصلی:
{content}

الزامات:
- تبدیل به مقاله جامع
- بررسی عمیق موضوع
- زمینه‌سازی و تحلیل
- ارائه داده و آمار
- نتیجه‌گیری و چشم‌انداز
- طول: {targetLength}

ساختار مقاله:
1. مقدمه و زمینه
2. بدنه اصلی (چند بخش)
3. تحلیل و بررسی
4. نتیجه‌گیری و چشم‌انداز

فقط متن مقاله را برگردانید:`,
    },
    analysis: {
      reporter: `این خبر کوتاه است. آن را گسترش دهید و تحلیل اضافه کنید.

عنوان: {title}
دسته: {category}

محتوای اصلی:
{content}

الزامات:
- گسترش محتوا
- اضافه کردن زمینه و context
- تحلیل ساده
- حفظ لحن خبری
- طول: {targetLength}

فقط متن گسترش یافته را برگردانید:`,
    },
  },
  en: {
    rewrite: {
      reporter: `You are a professional journalist. Rewrite this news in formal and neutral tone.

Title: {title}
Category: {category}

Original content:
{content}

Requirements:
- Complete and fluent rewrite in English
- Preserve all details and statistics
- Journalistic and neutral tone
- No personal opinion
- Length: {targetLength}
- Structure: introduction, main body, conclusion

Return only the rewritten text (without additional title):`,
    },
    analysis: {
      reporter: `This news is short. Expand it and add analysis.

Title: {title}
Category: {category}

Original content:
{content}

Requirements:
- Expand the content
- Add context
- Simple analysis
- Maintain journalistic tone
- Length: {targetLength}

Return only the expanded text:`,
    },
  },
};

/**
 * تولید محتوای وبسایت
 */
export async function generateWebsiteContent(
  options: WebsiteContentOptions
): Promise<WebsiteGeneratedContent> {
  const { rawContent, targetLength } = options;

  // محاسبه تعداد کلمات
  const wordCount = rawContent.split(/\s+/).length;

  // تصمیم‌گیری: بازنویسی یا تحلیل؟
  let mode: 'rewrite' | 'analysis' = 'rewrite';

  if (wordCount < 500 && options.tone !== 'reporter') {
    // خبر کوتاه + لحن تحلیلی → اضافه کردن تحلیل
    mode = 'analysis';
  }

  console.log(`[WebsiteContentAgent] 📝 Generating content (${mode}) for: ${options.title.substring(0, 50)}...`);
  console.log(`[WebsiteContentAgent] 📊 Word count: ${wordCount}, Target: ${targetLength}, Tone: ${options.tone}`);

  try {
    // ساخت prompt
    const prompt = createPrompt(options, mode);

    // تولید محتوا - استفاده از Gemini با fallback به Backboard
    let generated;
    try {
      generated = await generateContent(prompt, undefined, {
        preferredProvider: 'gemini' // استفاده از Gemini برای تولید محتوای وبسایت
      });
    } catch (error: any) {
      // اگر Gemini خطا داد (quota یا خطای دیگر)، از fallback استفاده می‌شود
      // fallback در generateContent خودش انجام می‌شود
      throw error;
    }

    const result = {
      content: generated.content,
      tokensIn: generated.usage?.inputTokens || 0,
      tokensOut: generated.usage?.outputTokens || 0,
      cost: generated.usage?.cost || 0
    };

    // بررسی نتیجه
    if (!result.content || result.content.length < 100) {
      throw new Error('Generated content is too short');
    }

    const hasAnalysis = mode === 'analysis' || options.tone !== 'reporter';
    const needsPrefix = mode === 'rewrite' && wordCount > 500;

    console.log(`[WebsiteContentAgent] ✅ Generated ${result.content.length} chars (${result.tokensOut} tokens)`);

    return {
      content: result.content,
      hasAnalysis,
      needsPrefix,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cost: result.cost,
      mode,
    };

  } catch (error: any) {
    console.error(`[WebsiteContentAgent] ❌ Error:`, error.message);
    throw error;
  }
}

/**
 * ساخت prompt بر اساس زبان، لحن و mode
 */
function createPrompt(
  options: WebsiteContentOptions,
  mode: 'rewrite' | 'analysis'
): string {
  const { language, tone, title, rawContent, categoryName, targetLength, customPrompt } = options;

  // اگر custom prompt داده شده، از آن استفاده کن
  // اگر custom prompt داده شده، از آن استفاده کن
  if (customPrompt) {
    return customPrompt
      .replace(/{title}/g, title)
      .replace(/{category}/g, categoryName)
      .replace(/{content}/g, () => rawContent)
      .replace(/{targetLength}/g, getTargetLengthDescription(targetLength));
  }

  // دریافت template
  const langKey = language as keyof typeof PROMPTS;
  const templates = PROMPTS[langKey]?.[mode as keyof (typeof PROMPTS)['fa']];

  if (!templates) {
    throw new Error(`No template found for language: ${language}, mode: ${mode}`);
  }

  const template = templates[tone as keyof typeof templates] as string | undefined;

  if (!template) {
    // fallback به reporter
    const fallback = templates['reporter' as keyof typeof templates] as string | undefined;
    if (!fallback) {
      throw new Error(`No template found for tone: ${tone}`);
    }
    return fillTemplate(fallback, options);
  }

  return fillTemplate(template, options);
}

/**
 * پر کردن template با داده‌ها
 */
function fillTemplate(template: string, options: WebsiteContentOptions): string {
  return template
    .replace(/{title}/g, options.title)
    .replace(/{category}/g, options.categoryName)
    .replace(/{content}/g, options.rawContent)
    .replace(/{targetLength}/g, getTargetLengthDescription(options.targetLength));
}

/**
 * توضیح target length
 */
function getTargetLengthDescription(targetLength: 'short' | 'medium' | 'long'): string {
  switch (targetLength) {
    case 'short':
      return '300-500 کلمه (کوتاه)';
    case 'medium':
      return '500-800 کلمه (متوسط)';
    case 'long':
      return '800-1200 کلمه (بلند)';
    default:
      return '500-800 کلمه';
  }
}

/**
 * اعتبارسنجی گزینه‌ها
 */
export function validateWebsiteContentOptions(options: WebsiteContentOptions): boolean {
  if (!options.title || options.title.length < 10) {
    throw new Error('Title is required and must be at least 10 characters');
  }

  if (!options.rawContent || options.rawContent.length < 50) {
    throw new Error('Content is required and must be at least 50 characters');
  }

  if (!options.categoryName) {
    throw new Error('Category name is required');
  }

  if (!['fa', 'en'].includes(options.language)) {
    throw new Error('Language must be "fa" or "en"');
  }

  const validTones = ['reporter', 'reporter_analytical', 'reporter_opinion', 'reporter_article'];
  if (!validTones.includes(options.tone)) {
    throw new Error(`Tone must be one of: ${validTones.join(', ')}`);
  }

  const validLengths = ['short', 'medium', 'long'];
  if (!validLengths.includes(options.targetLength)) {
    throw new Error(`Target length must be one of: ${validLengths.join(', ')}`);
  }

  return true;
}

