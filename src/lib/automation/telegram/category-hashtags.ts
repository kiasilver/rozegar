/**
 * Category Hashtags — Hardcoded from actual DB categories
 * 
 * Categories loaded from BlogCategory table on 2026-02-16.
 * Each category has 4 relevant hashtags.
 */

// Hashtag mapping for all active categories (from DB)
const CATEGORY_HASHTAGS: Record<string, string[]> = {
    // ID 147 — خودرو (Automotive)
    'خودرو': ['#خودرو', '#بازار_خودرو', '#قیمت_خودرو', '#صنعت_خودرو'],

    // ID 149 — اخبار اقتصادی (Economic News)
    'اخبار اقتصادی': ['#اقتصاد', '#اخبار_اقتصادی', '#بازار', '#اقتصاد_ایران'],

    // ID 159 — بنادر و دریانوردی (Ports & Maritime)
    'بنادر و دریانوردی': ['#بنادر', '#دریانوردی', '#تجارت_دریایی', '#حمل_و_نقل'],

    // ID 162 — طلا و ارز (Gold & Currency)
    'طلا و ارز': ['#طلا', '#ارز', '#قیمت_طلا', '#قیمت_دلار'],

    // ID 164 — قیمت روز (Daily Prices)
    'قیمت روز': ['#قیمت_روز', '#نرخ_روز', '#بازار', '#قیمت'],

    // ID 143 — اقتصاد جهان (World Economy)
    'اقتصاد جهان': ['#اقتصاد_جهان', '#اقتصاد_بین_الملل', '#بازار_جهانی', '#جهان'],
    'اقتصاد ایران - جهان': ['#اقتصاد_جهان', '#اقتصاد_بین_الملل', '#بازار_جهانی', '#جهان'], // EcoIran specific
    'اقتصاد ایران و جهان': ['#اقتصاد_جهان', '#اقتصاد_بین_الملل', '#بازار_جهانی', '#جهان'], // Another potential variation
    'اقتصاد بین الملل': ['#اقتصاد_جهان', '#اقتصاد_بین_الملل', '#بازار_جهانی', '#جهان'],

    // ID 136 — مسکن و شهرسازی (Housing & Urban Development)
    'مسکن و شهرسازی': ['#مسکن', '#شهرسازی', '#بازار_مسکن', '#ساختمان'],

    // ID 137 — راه‌های کشور (National Roads/Infrastructure)
    'راه‌های کشور': ['#راه_و_شهرسازی', '#حمل_و_نقل', '#زیرساخت', '#جاده'],

    // ID 120 — ارزدیجیتال (Cryptocurrency)
    'ارزدیجیتال': ['#ارز_دیجیتال', '#بیت_کوین', '#کریپتو', '#رمزارز'],

    // ID 114 — بورس (Stock Market)
    'بورس': ['#بورس', '#بازار_سرمایه', '#بورس_تهران', '#سهام'],
};

/**
 * Normalize category name for matching
 * Removes extra spaces, normalizes Persian characters, etc.
 */
function normalizeCategoryName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/[\u200C\u200D]/g, '') // Remove zero-width characters
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
        .trim();
}

/**
 * Get 4 hashtags for a category name
 */
export function getHashtagsForCategory(categoryName: string): string[] {
    if (!categoryName) {
        console.warn(`[Hashtags] Empty category name, returning default`);
        return ['#اخبار'];
    }

    const normalized = normalizeCategoryName(categoryName);
    console.log(`[Hashtags] 🔍 Processing category: "${categoryName}" → Normalized: "${normalized}"`);
    console.log(`[Hashtags] 🔍 Normalized length: ${normalized.length}, Contains 'اقتصاد': ${normalized.includes('اقتصاد')}, Contains 'جهان': ${normalized.includes('جهان')}`);

    // 1. Exact match (after normalization)
    if (CATEGORY_HASHTAGS[normalized]) {
        const hashtags = CATEGORY_HASHTAGS[normalized];
        console.log(`[Hashtags] ✅ Found exact match for "${normalized}": ${hashtags.join(' ')}`);
        return hashtags;
    }

    // 2. Try exact match with all keys (case-insensitive, but Persian doesn't have case)
    for (const key in CATEGORY_HASHTAGS) {
        const normalizedKey = normalizeCategoryName(key);
        if (normalized === normalizedKey) {
            const hashtags = CATEGORY_HASHTAGS[key];
            console.log(`[Hashtags] ✅ Found normalized exact match: "${key}" → ${hashtags.join(' ')}`);
            return hashtags;
        }
    }

    // 3. Special handling for "اقتصاد جهان" variations (قبل از partial match)
    // این باید اول چک شود چون ممکن است نام دسته‌بندی کامل نباشد
    if (normalized.includes('اقتصاد') && (normalized.includes('جهان') || normalized.includes('بین') || normalized.includes('الملل'))) {
        const hashtags = ['#اقتصاد_جهان', '#اقتصاد_بین_الملل', '#بازار_جهانی', '#جهان'];
        console.log(`[Hashtags] ✅ Found economy-world pattern in "${normalized}" → ${hashtags.join(' ')}`);
        return hashtags;
    }

    // 4. Partial match (check if normalized contains key or vice versa)
    // اولویت با کلیدهای طولانی‌تر (برای دقت بیشتر)
    const sortedKeys = Object.keys(CATEGORY_HASHTAGS).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const normalizedKey = normalizeCategoryName(key);
        // Check if either contains the other (for variations like "اقتصاد ایران - جهان" vs "اقتصاد جهان")
        if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
            // But make sure it's a meaningful match (not just a single word)
            // حداقل یکی از دو باید طولانی‌تر از 4 کاراکتر باشد
            if (normalizedKey.length >= 4 && normalized.length >= 4) {
                const hashtags = CATEGORY_HASHTAGS[key];
                console.log(`[Hashtags] ✅ Found partial match: "${key}" for input "${normalized}" → ${hashtags.join(' ')}`);
                return hashtags;
            }
        }
    }

    console.warn(`[Hashtags] ⚠️ No match found for "${normalized}", falling back to generated tags.`);

    // 5. Fallback: generate from name (Convert dashes and spaces to underscore)
    const cleanName = normalized.replace(/[-\s]+/g, '_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, '');
    const fallbackTags = [`#${cleanName}`, '#اخبار', '#ایران', '#اقتصاد'];
    console.log(`[Hashtags] 🔄 Using fallback tags: ${fallbackTags.join(' ')}`);
    return fallbackTags;
}

/**
 * Async version (same logic, kept for compatibility with telegram-bot.ts import)
 */
export async function getHashtagsForCategoryAsync(categoryName: string): Promise<string[]> {
    return getHashtagsForCategory(categoryName);
}
