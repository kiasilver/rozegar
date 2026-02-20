/**
 * سیستم بررسی کیفیت محتوا با Agent
 * بررسی می‌کند که محتوا طبق استراتژی تولید شده است یا نه
 */

import { getAISettings, getProviderConfig } from '@/lib/ai/ai-settings';
import type { AIProvider } from '@/types/ai';

export interface QualityCheckResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  needsRegeneration: boolean; // آیا نیاز به تولید مجدد دارد؟
}

/**
 * بررسی کیفیت محتوا با Agent
 */
export async function validateBlogQuality(
  title: string,
  content: string,
  excerpt: string,
  categoryName: string,
  language: 'fa' | 'en' = 'fa'
): Promise<QualityCheckResult> {
  try {
    const aiSettings = await getAISettings();
    const provider = (aiSettings.defaultProvider || "openai") as AIProvider;
    const providerConfig = getProviderConfig(aiSettings, provider);

    if (!providerConfig?.apiKey) {
      console.warn('⚠️ API key موجود نیست، بررسی کیفیت انجام نمی‌شود');
      return {
        isValid: true, // اگر API key نیست، به عنوان معتبر در نظر بگیر
        score: 70,
        issues: [],
        suggestions: [],
        needsRegeneration: false,
      };
    }

    const prompt = language === 'fa'
      ? `شما یک متخصص بررسی کیفیت محتوا هستید. لطفاً محتوای زیر را بررسی کنید و کیفیت آن را ارزیابی کنید.

عنوان: ${title}
دسته‌بندی: ${categoryName}
خلاصه: ${excerpt}
محتوا: ${content.substring(0, 3000)}...

⚠️ معیارهای بررسی کیفیت:

1. **ساختار محتوا** (الزامی):
   - آیا محتوا دارای H1 است؟ (باید در ابتدا باشد)
   - آیا محتوا دارای حداقل 4-6 H2 برای بخش‌های اصلی است؟
   - آیا محتوا دارای H3 برای زیربخش‌ها است؟
   - آیا پاراگراف‌ها به درستی ساختار یافته‌اند؟

2. **کیفیت نوشتاری** (الزامی):
   - آیا محتوا طبیعی و انسانی است؟ (نه رباتی)
   - آیا جملات متنوع و طبیعی هستند؟
   - آیا از تکرار بیش از حد کلمات پرهیز شده است؟
   - آیا لحن مناسب است؟

3. **محتوا و اطلاعات** (الزامی):
   - آیا محتوا کامل و جامع است؟
   - آیا اطلاعات دقیق و مفید است؟
   - آیا مقدمه جذاب است؟
   - آیا نتیجه‌گیری منطقی است؟

4. **SEO و بهینه‌سازی** (مهم):
   - آیا محتوا دارای لینک‌های داخلی است؟ (حداقل 2-3 لینک)
   - آیا محتوا دارای لیست‌ها است؟ (حداقل یک لیست)
   - آیا عکس‌ها با alt مناسب وجود دارند؟
   - آیا کلمات کلیدی به درستی استفاده شده‌اند؟

5. **طول محتوا** (مهم):
   - آیا محتوا حداقل 800 کلمه دارد؟
   - آیا محتوا خیلی کوتاه یا خیلی طولانی نیست؟

لطفاً پاسخ را به صورت JSON برگردانید:
{
  "isValid": true/false,
  "score": عدد بین 0 تا 100 (امتیاز کیفیت),
  "issues": ["مشکل 1", "مشکل 2", ...],
  "suggestions": ["پیشنهاد 1", "پیشنهاد 2", ...],
  "needsRegeneration": true/false (آیا نیاز به تولید مجدد دارد؟)
}

نکات مهم:
- اگر score کمتر از 70 است، needsRegeneration باید true باشد
- اگر محتوا فاقد H1 یا H2 کافی است، needsRegeneration باید true باشد
- اگر محتوا خیلی کوتاه است (کمتر از 500 کلمه)، needsRegeneration باید true باشد
- اگر محتوا رباتی یا تکراری است، needsRegeneration باید true باشد`
      : `You are a content quality specialist. Please review the content below and evaluate its quality.

Title: ${title}
Category: ${categoryName}
Excerpt: ${excerpt}
Content: ${content.substring(0, 3000)}...

Quality Criteria:

1. **Content Structure** (Required):
   - Does content have H1? (should be at the beginning)
   - Does content have at least 4-6 H2 for main sections?
   - Does content have H3 for subsections?
   - Are paragraphs properly structured?

2. **Writing Quality** (Required):
   - Is content natural and human-like? (not robotic)
   - Are sentences diverse and natural?
   - Is word repetition avoided?
   - Is the tone appropriate?

3. **Content and Information** (Required):
   - Is content complete and comprehensive?
   - Is information accurate and useful?
   - Is the introduction engaging?
   - Is the conclusion logical?

4. **SEO and Optimization** (Important):
   - Does content have internal links? (at least 2-3 links)
   - Does content have lists? (at least one list)
   - Do images have appropriate alt text?
   - Are keywords used correctly?

5. **Content Length** (Important):
   - Does content have at least 800 words?
   - Is content not too short or too long?

Please return the response as JSON:
{
  "isValid": true/false,
  "score": number between 0 and 100 (quality score),
  "issues": ["issue 1", "issue 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "needsRegeneration": true/false (does it need regeneration?)
}

Important notes:
- If score is less than 70, needsRegeneration should be true
- If content lacks H1 or sufficient H2, needsRegeneration should be true
- If content is too short (less than 500 words), needsRegeneration should be true
- If content is robotic or repetitive, needsRegeneration should be true`;

    let result: QualityCheckResult = {
      isValid: true,
      score: 100,
      issues: [],
      suggestions: [],
      needsRegeneration: false,
    };

    switch (provider) {
      case "openai": {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: providerConfig.apiKey });
        const completion = await openai.chat.completions.create({
          model: providerConfig.model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: language === 'fa'
                ? "شما یک متخصص بررسی کیفیت محتوا هستید. همیشه پاسخ را به صورت JSON معتبر برگردانید."
                : "You are a content quality specialist. Always return valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        try {
          const parsed = JSON.parse(responseText);
          result = {
            isValid: parsed.isValid !== false,
            score: Math.max(0, Math.min(100, parsed.score || 70)),
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            needsRegeneration: parsed.needsRegeneration === true,
          };
        } catch (parseError) {
          console.error('❌ خطا در parse کردن پاسخ کیفیت:', parseError);
        }
        break;
      }
      // Note: "claude" is not in AIProvider type - removed case
      // Use "custom" provider for Anthropic Claude API if needed
      case "cursor": {
        const response = await fetch("https://api.cursor.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${providerConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: providerConfig.model || "gpt-4o",
            messages: [
              {
                role: "system",
                content: language === 'fa'
                  ? "شما یک متخصص بررسی کیفیت محتوا هستید. همیشه پاسخ را به صورت JSON معتبر برگردانید."
                  : "You are a content quality specialist. Always return valid JSON.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || '{}';
        try {
          const parsed = JSON.parse(responseText);
          result = {
            isValid: parsed.isValid !== false,
            score: Math.max(0, Math.min(100, parsed.score || 70)),
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            needsRegeneration: parsed.needsRegeneration === true,
          };
        } catch (parseError) {
          console.error('❌ خطا در parse کردن پاسخ کیفیت:', parseError);
        }
        break;
      }
    }

    console.log(`📊 [Quality Validator] نتیجه بررسی کیفیت:`);
    console.log(`   - Score: ${result.score}/100`);
    console.log(`   - Valid: ${result.isValid ? '✅' : '❌'}`);
    console.log(`   - Needs Regeneration: ${result.needsRegeneration ? '⚠️ بله' : '✅ خیر'}`);
    if (result.issues.length > 0) {
      console.log(`   - Issues: ${result.issues.join(', ')}`);
    }
    if (result.suggestions.length > 0) {
      console.log(`   - Suggestions: ${result.suggestions.join(', ')}`);
    }

    return result;
  } catch (error) {
    console.error('❌ خطا در بررسی کیفیت محتوا:', error);
    // در صورت خطا، به عنوان معتبر در نظر بگیر (fail-safe)
    return {
      isValid: true,
      score: 70,
      issues: ['خطا در بررسی کیفیت'],
      suggestions: [],
      needsRegeneration: false,
    };
  }
}

