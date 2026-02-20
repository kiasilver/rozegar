/**
 * جستجوی خبر با AI Agent
 * استفاده از AI Agent برای پیدا کردن URL خبر از روی عنوان
 */

import { getAISettings, getProviderConfig } from '../../ai/ai-settings';

export interface NewsSearchResult {
  url: string;
  title: string;
  source: string; // نام منبع (مثل تسنیم، ایسنا، ...)
  confidence: number; // میزان اطمینان (0-1)
}

/**
 * جستجوی خبر با عنوان
 * @param title عنوان خبر
 * @returns URL خبر یا null
 */
export async function searchNewsByTitle(title: string): Promise<NewsSearchResult | null> {
  try {
    console.log(`🔍 [News Searcher] در حال جستجوی خبر: "${title}"`);

    // دریافت تنظیمات AI
    const aiSettings = await getAISettings();
    if (!aiSettings) {
      console.warn('⚠️ [News Searcher] تنظیمات AI یافت نشد');
      return null;
    }

    const cursorConfig = getProviderConfig(aiSettings, 'cursor');
    const apiKey = cursorConfig.apiKey;

    if (!apiKey) {
      console.warn('⚠️ [News Searcher] API Key یافت نشد');
      return null;
    }

    // استفاده از AI Agent برای جستجوی Google
    const prompt = `شما یک خبرنگار حرفه‌ای هستید. لطفاً برای عنوان خبر زیر، URL خبر را از سایت‌های خبری معتبر ایرانی پیدا کنید.

عنوان خبر: "${title}"

لطفاً:
1. جستجوی Google انجام دهید برای این عنوان
2. URL خبر را از سایت‌های خبری معتبر پیدا کنید (اولویت با: تسنیم، ایسنا، فارس، مهر، ایرنا، باشگاه خبرنگاران، خبرگزاری دانشجویان ایران)
3. فقط URL خبر را برگردانید (نه توضیح اضافی)
4. اگر خبر را پیدا نکردید، فقط "NOT_FOUND" را برگردانید

فرمت پاسخ:
URL: https://www.example.com/news/12345

یا اگر پیدا نشد:
NOT_FOUND`;

    const response = await fetch('https://api.cursor.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'auto',
        messages: [
          {
            role: 'system',
            content: 'شما یک خبرنگار حرفه‌ای هستید که URL اخبار را از سایت‌های خبری معتبر پیدا می‌کنید.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('❌ [News Searcher] خطا در ارتباط با AI Agent:', response.statusText);
      return null;
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result || result === 'NOT_FOUND' || result.includes('NOT_FOUND')) {
      console.warn(`⚠️ [News Searcher] خبر یافت نشد برای: "${title}"`);
      return null;
    }

    // استخراج URL از پاسخ
    const urlMatch = result.match(/https?:\/\/[^\s]+/i);
    if (!urlMatch) {
      console.warn(`⚠️ [News Searcher] URL در پاسخ یافت نشد: ${result.substring(0, 100)}`);
      return null;
    }

    const url = urlMatch[0].replace(/[.,;!?]+$/, ''); // حذف علائم نگارشی از انتها

    // تشخیص منبع خبر
    const source = detectNewsSource(url);

    console.log(`✅ [News Searcher] خبر پیدا شد: ${url}`);
    console.log(`   منبع: ${source}`);

    return {
      url,
      title,
      source,
      confidence: 0.8,
    };
  } catch (error: any) {
    console.error('❌ [News Searcher] خطا:', error.message);
    return null;
  }
}

/**
 * تشخیص منبع خبر از URL
 */
function detectNewsSource(url: string): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('tasnimnews.com')) return 'تسنیم';
  if (urlLower.includes('isna.ir')) return 'ایسنا';
  if (urlLower.includes('farsnews.ir') || urlLower.includes('farsnews.com')) return 'فارس';
  if (urlLower.includes('mehrnews.com')) return 'مهر';
  if (urlLower.includes('irna.ir')) return 'ایرنا';
  if (urlLower.includes('isna.ir')) return 'ایسنا';
  if (urlLower.includes('yjc.ir') || urlLower.includes('yjc.news')) return 'باشگاه خبرنگاران';
  if (urlLower.includes('isna.ir')) return 'خبرگزاری دانشجویان ایران';
  if (urlLower.includes('donya-e-eqtesad.com')) return 'دنیای اقتصاد';
  if (urlLower.includes('eghtesadonline.com')) return 'اقتصاد آنلاین';
  if (urlLower.includes('ghatreh.com')) return 'قطره';

  // استخراج دامنه
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return 'نامشخص';
  }
}

/**
 * جستجوی مستقیم در سایت‌های خبری (fallback)
 * اگر AI Agent کار نکرد، از این روش استفاده می‌شود
 */
export async function searchNewsDirectly(title: string): Promise<NewsSearchResult | null> {
  // لیست سایت‌های خبری برای جستجو
  const newsSites = [
    'https://www.tasnimnews.com',
    'https://www.isna.ir',
    'https://www.farsnews.ir',
    'https://www.mehrnews.com',
    'https://www.irna.ir',
  ];

  // این روش نیاز به API خاص دارد یا scraping
  // فعلاً فقط placeholder است
  console.log(`ℹ️ [News Searcher] جستجوی مستقیم برای: "${title}"`);

  return null;
}

