export function isPersian(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text); // بازه کاراکترهای فارسی
  }
  