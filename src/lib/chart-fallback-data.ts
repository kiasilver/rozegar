/**
 * Fallback Data for Charts - داده‌های پیش‌فرض برای چارت‌ها
 * این داده‌ها زمانی استفاده می‌شوند که داده واقعی وجود نداشته باشد
 */

export const fallbackWeeklyChartData = [];

export const fallbackMonthlyChartData = [];

export const fallbackDailyChartData = [];

export const fallbackCategoryData = [];

export const fallbackAuthorData = [];

export const fallbackStats = {
  totalViews: 0,
  totalArticles: 0,
  publishedArticles: 0,
  pendingReviews: 0,
  draftArticles: 0,
  totalUsers: 0,
  totalAuthors: 0,
  totalComments: 0,
  pendingComments: 0,
  timeStats: {
    today: { views: 0, articles: 0 },
    week: { views: 0, articles: 0 },
    month: { views: 0, articles: 0 },
    year: { views: 0, articles: 0 },
  },
};

/**
 * بررسی می‌کند که آیا داده واقعی وجود دارد یا نه
 */
export function hasRealData(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  if (typeof data === 'object') {
    return Object.keys(data).length > 0;
  }
  if (typeof data === 'number') {
    return true;
  }
  return false;
}

/**
 * داده‌های چارت را با fallback ترکیب می‌کند
 */
export function getChartDataWithFallback<T>(
  realData: T[],
  fallbackData: T[],
  minItems: number = 1
): T[] {
  // اگر داده واقعی وجود دارد و حداقل minItems آیتم دارد، از آن استفاده کن
  if (hasRealData(realData) && realData.length >= minItems) {
    return realData;
  }
  // در غیر این صورت از fallback استفاده کن
  return fallbackData;
}

