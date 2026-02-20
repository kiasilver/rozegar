/**
 * تبدیل متن فارسی به slug
 * حروف فارسی بدون تغییر باقی می‌مانند
 * حروف انگلیسی به lowercase تبدیل می‌شوند
 */
export function slugifyPersian(text: string): string {
  if (!text) return "";
  
  return text
    .trim()
    // حذف کاراکترهای غیرمجاز (فقط نگه داشتن فارسی، انگلیسی، عدد، فاصله و -)
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s\-]/g, "")
    // تبدیل فاصله‌های متعدد به یک -
    .replace(/\s+/g, "-")
    // تبدیل چندتا "-" پشت‌سرهم به یکی
    .replace(/\-+/g, "-")
    // حذف "-" از ابتدا و انتها
    .replace(/^\-+|\-+$/g, "")
    // فقط حروف انگلیسی را lowercase کن (حروف فارسی بدون تغییر)
    .replace(/[A-Z]/g, (char) => char.toLowerCase());
}
  