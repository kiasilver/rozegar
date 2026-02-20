/**
 * Date Utilities - ابزارهای کار با تاریخ
 */

/**
 * فرمت تاریخ شمسی
 */
export function formatPersianDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * فرمت تاریخ کوتاه
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * فرمت زمان
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * فرمت تاریخ و زمان
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatPersianDate(d)} - ${formatTime(d)}`;
}

/**
 * محاسبه زمان نسبی (مثلاً "۲ ساعت پیش")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} روز پیش`;
  }
  if (hours > 0) {
    return `${hours} ساعت پیش`;
  }
  if (minutes > 0) {
    return `${minutes} دقیقه پیش`;
  }
  return "همین الان";
}

/**
 * بررسی اینکه آیا تاریخ در بازه زمانی است
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return d >= start && d <= end;
}

