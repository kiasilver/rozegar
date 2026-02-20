/**
 * Ad Templates & Size Suggestions
 * سیستم template و suggestion برای تبلیغات
 */

export interface AdSizeSuggestion {
  width: number;
  height: number;
  label: string;
  description: string;
  common: boolean; // آیا سایز رایج است؟
}

export interface AdTemplate {
  position: string;
  suggestedSizes: AdSizeSuggestion[];
  maxWidth?: number;
  maxHeight?: number;
  responsive?: boolean;
  description: string;
}

export const AD_POSITION_TEMPLATES: Record<string, AdTemplate> = {
  HEADER_TOP: {
    position: "HEADER_TOP",
    description: "بنر بالای هدر - معمولاً در تمام صفحات نمایش داده می‌شود",
    suggestedSizes: [
      { width: 728, height: 90, label: "Leaderboard", description: "728x90 - استاندارد IAB", common: true },
      { width: 970, height: 90, label: "Super Leaderboard", description: "970x90 - برای صفحات بزرگ", common: true },
      { width: 320, height: 50, label: "Mobile Banner", description: "320x50 - برای موبایل", common: true },
    ],
    maxWidth: 970,
    maxHeight: 90,
    responsive: true,
  },
  SIDEBAR_TOP: {
    position: "SIDEBAR_TOP",
    description: "بالای sidebar - اولین تبلیغ در sidebar",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: true },
      { width: 300, height: 600, label: "Half Page", description: "300x600 - برای sidebar های بلند", common: true },
      { width: 250, height: 250, label: "Square", description: "250x250 - مربع", common: false },
    ],
    maxWidth: 336,
    maxHeight: 600,
    responsive: true,
  },
  SIDEBAR_MIDDLE: {
    position: "SIDEBAR_MIDDLE",
    description: "وسط sidebar - بین محتوا",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: true },
      { width: 300, height: 100, label: "Banner", description: "300x100 - بنر کوچک", common: false },
    ],
    maxWidth: 336,
    maxHeight: 280,
    responsive: true,
  },
  SIDEBAR_BOTTOM: {
    position: "SIDEBAR_BOTTOM",
    description: "پایین sidebar - آخرین تبلیغ",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: true },
    ],
    maxWidth: 336,
    maxHeight: 280,
    responsive: true,
  },
  CONTENT_TOP: {
    position: "CONTENT_TOP",
    description: "بالای محتوا - قبل از شروع مقاله",
    suggestedSizes: [
      { width: 728, height: 90, label: "Leaderboard", description: "728x90 - استاندارد IAB", common: true },
      { width: 970, height: 90, label: "Super Leaderboard", description: "970x90 - برای صفحات بزرگ", common: true },
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - برای صفحات کوچک", common: true },
    ],
    maxWidth: 970,
    maxHeight: 250,
    responsive: true,
  },
  CONTENT_MIDDLE: {
    position: "CONTENT_MIDDLE",
    description: "وسط محتوا - در بین پاراگراف‌های مقاله",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: true },
      { width: 728, height: 90, label: "Leaderboard", description: "728x90 - برای صفحات بزرگ", common: false },
    ],
    maxWidth: 728,
    maxHeight: 280,
    responsive: true,
  },
  CONTENT_BOTTOM: {
    position: "CONTENT_BOTTOM",
    description: "پایین محتوا - بعد از پایان مقاله",
    suggestedSizes: [
      { width: 728, height: 90, label: "Leaderboard", description: "728x90 - استاندارد IAB", common: true },
      { width: 970, height: 90, label: "Super Leaderboard", description: "970x90 - برای صفحات بزرگ", common: true },
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - برای صفحات کوچک", common: true },
    ],
    maxWidth: 970,
    maxHeight: 250,
    responsive: true,
  },
  BANNER_BOTTOM: {
    position: "BANNER_BOTTOM",
    description: "بنر پایین صفحه - در پایین‌ترین نقطه صفحه",
    suggestedSizes: [
      { width: 970, height: 250, label: "Billboard", description: "970x250 - بنر بزرگ (پیشنهادی)", common: true },
      { width: 728, height: 90, label: "Leaderboard", description: "728x90 - استاندارد IAB", common: true },
    ],
    maxWidth: 970,
    maxHeight: 250,
    responsive: true,
  },
  BANNER_TOP_HEADER_LEFT: {
    position: "BANNER_TOP_HEADER_LEFT",
    description: "بنر بالای هدر - سمت چپ - در بالای صفحه اصلی",
    suggestedSizes: [
      { width: 300, height: 100, label: "Banner", description: "300x100 - بنر کوچک (پیشنهادی)", common: true },
      { width: 250, height: 250, label: "Square", description: "250x250 - مربع", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: false },
      { width: 320, height: 50, label: "Mobile Banner", description: "320x50 - برای موبایل", common: true },
    ],
    maxWidth: 400,
    maxHeight: 300,
    responsive: true,
  },
  BANNER_TOP_HEADER_RIGHT: {
    position: "BANNER_TOP_HEADER_RIGHT",
    description: "بنر بالای هدر - سمت راست - در بالای صفحه اصلی",
    suggestedSizes: [
      { width: 300, height: 100, label: "Banner", description: "300x100 - بنر کوچک (پیشنهادی)", common: true },
      { width: 250, height: 250, label: "Square", description: "250x250 - مربع", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: false },
      { width: 320, height: 50, label: "Mobile Banner", description: "320x50 - برای موبایل", common: true },
    ],
    maxWidth: 400,
    maxHeight: 300,
    responsive: true,
  },
  IN_ARTICLE: {
    position: "IN_ARTICLE",
    description: "داخل مقاله - بین پاراگراف‌ها",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 336, height: 280, label: "Large Rectangle", description: "336x280 - استاندارد IAB", common: true },
      { width: 300, height: 600, label: "Half Page", description: "300x600 - برای مقالات بلند", common: false },
    ],
    maxWidth: 336,
    maxHeight: 600,
    responsive: true,
  },
  POPUP: {
    position: "POPUP",
    description: "پاپ‌آپ - پنجره بازشونده",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB", common: true },
      { width: 400, height: 300, label: "Popup", description: "400x300 - سایز معمول پاپ‌آپ", common: true },
      { width: 500, height: 400, label: "Large Popup", description: "500x400 - پاپ‌آپ بزرگ", common: false },
    ],
    maxWidth: 500,
    maxHeight: 400,
    responsive: false,
  },
  STICKY_BOTTOM_RIGHT: {
    position: "STICKY_BOTTOM_RIGHT",
    description: "تبلیغ چسبنده پایین راست - ثابت در گوشه پایین راست صفحه",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 320, height: 50, label: "Mobile Banner", description: "320x50 - برای موبایل", common: true },
      { width: 250, height: 300, label: "Vertical Banner", description: "250x300 - بنر عمودی", common: false },
    ],
    maxWidth: 300,
    maxHeight: 400,
    responsive: true,
  },
  STICKY: {
    position: "STICKY",
    description: "چسبنده - هنگام اسکرول ثابت می‌ماند",
    suggestedSizes: [
      { width: 300, height: 250, label: "Medium Rectangle", description: "300x250 - استاندارد IAB (پیشنهادی)", common: true },
      { width: 320, height: 50, label: "Mobile Banner", description: "320x50 - برای موبایل", common: true },
    ],
    maxWidth: 300,
    maxHeight: 250,
    responsive: true,
  },
};

/**
 * دریافت template برای یک position
 */
export function getAdTemplate(position: string): AdTemplate | null {
  return AD_POSITION_TEMPLATES[position] || null;
}

/**
 * دریافت suggestion های سایز برای یک position
 */
export function getSizeSuggestions(position: string): AdSizeSuggestion[] {
  const template = getAdTemplate(position);
  return template?.suggestedSizes || [];
}

/**
 * بررسی اینکه آیا سایز پیشنهادی است
 */
export function isSuggestedSize(
  position: string,
  width: number,
  height: number
): boolean {
  const suggestions = getSizeSuggestions(position);
  return suggestions.some(
    (s) => s.width === width && s.height === height
  );
}

/**
 * دریافت بهترین suggestion برای یک position
 */
export function getBestSuggestion(position: string): AdSizeSuggestion | null {
  const suggestions = getSizeSuggestions(position);
  // اولویت با common: true
  const common = suggestions.filter((s) => s.common);
  return common.length > 0 ? common[0] : suggestions[0] || null;
}

