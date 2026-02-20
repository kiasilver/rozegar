/**
 * SEO Algorithm - الگوریتم هوشمند SEO
 * تحلیل کلمات کلیدی، بهینه‌سازی طول محتوا، تحلیل ساختار و Score SEO
 */

export interface SEOAnalysis {
  score: number; // 0-100
  keywordDensity: Record<string, number>;
  lsiKeywords: string[];
  contentLength: {
    wordCount: number;
    recommended: number;
    status: "too_short" | "good" | "too_long";
  };
  structure: {
    hasH1: boolean;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasImages: boolean;
    imageCount: number;
    hasLists: boolean;
    listCount: number;
    hasInternalLinks: boolean;
    internalLinkCount: number;
  };
  suggestions: string[];
  metaDescription: {
    length: number;
    recommended: number;
    status: "too_short" | "good" | "too_long";
  };
  title: {
    length: number;
    recommended: number;
    status: "too_short" | "good" | "too_long";
  };
}

/**
 * استخراج کلمات کلیدی از متن
 */
function extractKeywords(text: string, minLength: number = 3): string[] {
  // حذف HTML tags
  const cleanText = text.replace(/<[^>]*>/g, " ");
  
  // استخراج کلمات فارسی و انگلیسی
  const words = cleanText
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= minLength);

  // شمارش تکرار کلمات
  const wordCount: Record<string, number> = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // مرتب‌سازی بر اساس تکرار
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * محاسبه Keyword Density
 */
function calculateKeywordDensity(
  text: string,
  keywords: string[]
): Record<string, number> {
  const cleanText = text.replace(/<[^>]*>/g, " ").toLowerCase();
  const totalWords = cleanText.split(/\s+/).filter((w) => w.length > 0).length;
  const density: Record<string, number> = {};

  keywords.forEach((keyword) => {
    const regex = new RegExp(keyword.toLowerCase(), "g");
    const matches = cleanText.match(regex) || [];
    density[keyword] = totalWords > 0 ? (matches.length / totalWords) * 100 : 0;
  });

  return density;
}

/**
 * استخراج LSI Keywords (کلمات مرتبط) - بهبود یافته
 */
function extractLSIKeywords(text: string, mainKeywords: string[]): string[] {
  const cleanText = text.replace(/<[^>]*>/g, " ");
  const words = cleanText
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  // کلمات رایج که باید نادیده گرفته شوند (لیست کامل‌تر)
  const stopWords = new Set([
    "این", "که", "از", "به", "در", "با", "برای", "یا", "هم", "همه",
    "یک", "دو", "سه", "چهار", "پنج", "است", "بود", "شد", "می", "را",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
    "can", "could", "will", "would", "should", "may", "might", "must"
  ]);

  // شمارش کلمات (بدون stop words و main keywords)
  const wordCount: Record<string, number> = {};
  words.forEach((word) => {
    if (
      !stopWords.has(word) &&
      !mainKeywords.some((kw) => word.includes(kw.toLowerCase()) || kw.toLowerCase().includes(word))
    ) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  // برگرداندن 15 کلمه پرتکرار (برای انتخاب بهتر)
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}

/**
 * تحلیل ساختار محتوا
 */
function analyzeStructure(htmlContent: string) {
  const h1Matches = htmlContent.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
  const h2Matches = htmlContent.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
  const h3Matches = htmlContent.match(/<h3[^>]*>.*?<\/h3>/gi) || [];
  const imgMatches = htmlContent.match(/<img[^>]*>/gi) || [];
  
  // بهبود regex برای تشخیص لیست‌ها (پشتیبانی از nested lists و فاصله‌های زیاد)
  // روش 1: پیدا کردن تگ‌های <ul> و <ol> (حتی اگر nested باشند)
  const listTagMatches = htmlContent.match(/<(ul|ol)[^>]*>/gi) || [];
  
  // روش 2: پیدا کردن <li> تگ‌ها (حتی اگر <ul> یا <ol> wrapper نداشته باشند)
  const listItemMatches = htmlContent.match(/<li[^>]*>/gi) || [];
  
  // اگر <ul> یا <ol> پیدا شد، از آن استفاده کن
  // اگر نه، اگر <li> پیدا شد، آن را به عنوان لیست در نظر بگیر
  const hasListTags = listTagMatches.length > 0;
  const hasListItems = listItemMatches.length > 0;
  const hasLists = hasListTags || hasListItems;
  const listCount = hasListTags ? listTagMatches.length : (hasListItems ? Math.ceil(listItemMatches.length / 2) : 0); // تقریباً هر لیست حداقل 2 item دارد
  
  const linkMatches = htmlContent.match(/<a[^>]*href[^>]*>/gi) || [];

  // تشخیص لینک‌های داخلی (شروع با / یا بدون http/https)
  const internalLinks = linkMatches.filter((link) => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return false;
    const href = hrefMatch[1];
    return href.startsWith("/") || !href.startsWith("http");
  });

  return {
    hasH1: h1Matches.length > 0,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
    hasImages: imgMatches.length > 0,
    imageCount: imgMatches.length,
    hasLists: hasLists,
    listCount: listCount,
    hasInternalLinks: internalLinks.length > 0,
    internalLinkCount: internalLinks.length,
  };
}

/**
 * شمارش کلمات در متن
 */
function countWords(text: string): number {
  const cleanText = text.replace(/<[^>]*>/g, " ");
  return cleanText.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * تحلیل SEO کامل
 */
export function analyzeSEO(
  title: string,
  content: string,
  metaDescription: string = "",
  keywords: string[] = []
): SEOAnalysis {
  const suggestions: string[] = [];
  let score = 100;

  // استخراج کلمات کلیدی
  const extractedKeywords = keywords.length > 0 
    ? keywords 
    : extractKeywords(title + " " + content, 3);
  
  const mainKeywords = extractedKeywords.slice(0, 5);

  // Keyword Density
  const keywordDensity = calculateKeywordDensity(content, mainKeywords);
  
  // بررسی Keyword Density (باید بین 1-3% باشد)
  Object.entries(keywordDensity).forEach(([keyword, density]) => {
    if (density < 1) {
      suggestions.push(`کلمه کلیدی "${keyword}" کمتر از 1% است. بهتر است بیشتر استفاده شود.`);
      score -= 2;
    } else if (density > 3) {
      suggestions.push(`کلمه کلیدی "${keyword}" بیشتر از 3% است. ممکن است keyword stuffing باشد.`);
      score -= 3;
    }
  });

  // LSI Keywords
  const lsiKeywords = extractLSIKeywords(content, mainKeywords);

  // تحلیل طول محتوا
  const wordCount = countWords(content);
  const recommendedMin = 300;
  const recommendedMax = 3000;
  let contentLengthStatus: "too_short" | "good" | "too_long" = "good";

  if (wordCount < recommendedMin) {
    contentLengthStatus = "too_short";
    suggestions.push(
      `محتوای شما ${wordCount} کلمه است. حداقل ${recommendedMin} کلمه توصیه می‌شود.`
    );
    score -= 15;
  } else if (wordCount > recommendedMax) {
    contentLengthStatus = "too_long";
    suggestions.push(
      `محتوای شما ${wordCount} کلمه است. بهتر است به ${recommendedMax} کلمه کاهش یابد.`
    );
    score -= 5;
  }

  // تحلیل ساختار
  const structure = analyzeStructure(content);
  
  // H1 در صفحه بلاگ به عنوان title نمایش داده می‌شود (در page.tsx)
  // پس نیازی به H1 در content نیست - فقط اگر H1 در content وجود دارد، warning بده
  if (structure.h1Count > 0) {
    // اگر H1 در content وجود دارد، warning بده (چون H1 در title صفحه است)
    suggestions.push("H1 در محتوا وجود دارد. H1 باید فقط در title صفحه باشد.");
    score -= 5;
  }
  // H1 در title صفحه وجود دارد (hasH1InPage = true)، پس نیازی به H1 در content نیست
  // بنابراین structure.hasH1 را true در نظر می‌گیریم (چون H1 در title است)
  const hasH1InPage = true; // H1 همیشه در title صفحه وجود دارد
  const finalStructure = {
    ...structure,
    hasH1: hasH1InPage, // H1 در title صفحه وجود دارد
  };

  if (structure.h2Count === 0) {
    suggestions.push("هیچ عنوان H2 در محتوا وجود ندارد. استفاده از H2 برای ساختار بهتر است.");
    score -= 5;
  }

  if (!structure.hasImages) {
    suggestions.push("هیچ تصویری در محتوا وجود ندارد. تصاویر به SEO کمک می‌کنند.");
    score -= 5;
  } else if (structure.imageCount < 2) {
    suggestions.push("فقط یک تصویر در محتوا وجود دارد. بهتر است حداقل 2-3 تصویر اضافه کنید.");
    score -= 2;
  }

  if (!structure.hasLists) {
    suggestions.push("هیچ لیست (bullet یا numbered) در محتوا وجود ندارد.");
    score -= 3;
  }

  if (!structure.hasInternalLinks) {
    suggestions.push("هیچ لینک داخلی در محتوا وجود ندارد. لینک‌های داخلی به SEO کمک می‌کنند.");
    score -= 5;
  } else if (structure.internalLinkCount < 2) {
    suggestions.push("فقط یک لینک داخلی وجود دارد. بهتر است 2-3 لینک داخلی اضافه کنید.");
    score -= 2;
  }

  // تحلیل عنوان
  const titleLength = title.length;
  const recommendedTitleMin = 30;
  const recommendedTitleMax = 60;
  let titleStatus: "too_short" | "good" | "too_long" = "good";

  if (titleLength < recommendedTitleMin) {
    titleStatus = "too_short";
    suggestions.push(
      `عنوان شما ${titleLength} کاراکتر است. حداقل ${recommendedTitleMin} کاراکتر توصیه می‌شود.`
    );
    score -= 5;
  } else if (titleLength > recommendedTitleMax) {
    titleStatus = "too_long";
    suggestions.push(
      `عنوان شما ${titleLength} کاراکتر است. بهتر است به ${recommendedTitleMax} کاراکتر کاهش یابد.`
    );
    score -= 3;
  }

  // بررسی وجود کلمات کلیدی در عنوان
  const titleLower = title.toLowerCase();
  const hasKeywordInTitle = mainKeywords.some((kw) =>
    titleLower.includes(kw.toLowerCase())
  );
  if (!hasKeywordInTitle) {
    suggestions.push("کلمات کلیدی در عنوان وجود ندارد. بهتر است کلمات کلیدی را در عنوان قرار دهید.");
    score -= 8;
  }

  // تحلیل Meta Description
  const metaDescLength = metaDescription.length;
  const recommendedMetaMin = 120;
  const recommendedMetaMax = 160;
  let metaDescStatus: "too_short" | "good" | "too_long" = "good";

  if (metaDescLength === 0) {
    suggestions.push("Meta Description وجود ندارد. این برای SEO بسیار مهم است.");
    score -= 10;
  } else if (metaDescLength < recommendedMetaMin) {
    metaDescStatus = "too_short";
    suggestions.push(
      `Meta Description شما ${metaDescLength} کاراکتر است. حداقل ${recommendedMetaMin} کاراکتر توصیه می‌شود.`
    );
    score -= 5;
  } else if (metaDescLength > recommendedMetaMax) {
    metaDescStatus = "too_long";
    suggestions.push(
      `Meta Description شما ${metaDescLength} کاراکتر است. بهتر است به ${recommendedMetaMax} کاراکتر کاهش یابد.`
    );
    score -= 3;
  }

  // بررسی وجود کلمات کلیدی در Meta Description
  if (metaDescription) {
    const metaDescLower = metaDescription.toLowerCase();
    const hasKeywordInMeta = mainKeywords.some((kw) =>
      metaDescLower.includes(kw.toLowerCase())
    );
    if (!hasKeywordInMeta) {
      suggestions.push("کلمات کلیدی در Meta Description وجود ندارد.");
      score -= 5;
    }
  }

  // محدود کردن score بین 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    keywordDensity,
    lsiKeywords,
    contentLength: {
      wordCount,
      recommended: recommendedMin,
      status: contentLengthStatus,
    },
    structure: finalStructure, // استفاده از finalStructure که hasH1 را از hasH1InPage می‌گیرد
    suggestions,
    metaDescription: {
      length: metaDescLength,
      recommended: recommendedMetaMin,
      status: metaDescStatus,
    },
    title: {
      length: titleLength,
      recommended: recommendedTitleMin,
      status: titleStatus,
    },
  };
}

/**
 * تولید پیشنهادات بهبود SEO
 */
export function generateSEORecommendations(analysis: SEOAnalysis): string[] {
  return analysis.suggestions;
}

/**
 * محاسبه Score SEO بر اساس معیارهای مختلف
 */
export function calculateSEOScore(analysis: SEOAnalysis): number {
  return analysis.score;
}
