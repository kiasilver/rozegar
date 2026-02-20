/**
 * Validation Utilities - ابزارهای اعتبارسنجی
 */

import { z } from "zod";

/**
 * اعتبارسنجی URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * اعتبارسنجی Email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * اعتبارسنجی Phone (ایرانی)
 */
export function isValidIranianPhone(phone: string): boolean {
  const phoneRegex = /^09\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * اعتبارسنجی Slug
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Schema برای Blog
 */
export const blogValidationSchema = z.object({
  name: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  slug: z.string().optional(),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد"),
  categories: z.array(z.string()).min(1, "حداقل یک دسته‌بندی را انتخاب کنید"),
  metaTitle: z.string().max(60, "عنوان متا باید حداکثر ۶۰ کاراکتر باشد").optional(),
  metaDescription: z.string().max(160, "توضیحات متا باید حداکثر ۱۶۰ کاراکتر باشد").optional(),
  canonical_url: z.string().url("آدرس کاننیکال معتبر نیست").optional().or(z.literal("")),
});

/**
 * Schema برای Ad
 */
export const adValidationSchema = z.object({
  title: z.string().optional(),
  position: z.string().min(1, "موقعیت را انتخاب کنید"),
  type: z.enum(["IMAGE", "HTML", "SCRIPT"]),
  image_url: z.string().url("آدرس تصویر معتبر نیست").optional(),
  html_content: z.string().optional(),
  script_code: z.string().optional(),
  link_url: z.string().url("آدرس لینک معتبر نیست").optional().or(z.literal("")),
  width: z.number().positive("عرض باید عدد مثبت باشد").optional(),
  height: z.number().positive("ارتفاع باید عدد مثبت باشد").optional(),
});

/**
 * اعتبارسنجی SEO
 */
export function validateSEO(seo: {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (seo.metaTitle) {
    if (seo.metaTitle.length < 30) {
      errors.push("عنوان متا کوتاه است (حداقل 30 کاراکتر)");
    }
    if (seo.metaTitle.length > 60) {
      errors.push("عنوان متا طولانی است (حداکثر 60 کاراکتر)");
    }
  }

  if (seo.metaDescription) {
    if (seo.metaDescription.length < 120) {
      errors.push("توضیحات متا کوتاه است (حداقل 120 کاراکتر)");
    }
    if (seo.metaDescription.length > 160) {
      errors.push("توضیحات متا طولانی است (حداکثر 160 کاراکتر)");
    }
  }

  if (seo.metaKeywords) {
    const keywords = seo.metaKeywords.split(",").map((k) => k.trim());
    if (keywords.length > 10) {
      errors.push("تعداد کلمات کلیدی زیاد است (حداکثر 10 کلمه)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

