/**
 * سیستم مرکزی ساخت Slug برای بلاگ
 * 
 * فرمت: title-slug (بدون category-slug)
 * - فارسی: عنوان-بلاگ
 * - انگلیسی: blog-title
 * 
 * توجه: category در URL به صورت جداگانه اضافه می‌شود: /اخبار/دسته-بندی/slug-بلاگ
 */

import { slugifyPersian } from "@/lib/utils/slugify-fa";
import slugify from "slugify";
import { isPersian } from "@/lib/utils/ispersian";
import { prisma } from "@/lib/core/prisma";

/**
 * ساخت slug برای عنوان
 */
function slugifyTitle(title: string, maxLength: number = 50): string {
  if (!title || !title.trim()) {
    return "";
  }

  // پاکسازی عنوان از کاراکترهای اضافی
  const cleanTitle = title
    .replace(/^###\s*/, "") // حذف ### از ابتدا
    .replace(/\.\.\./g, "") // حذف ...
    .replace(/<h1[^>]*>/gi, '') // حذف <h1> از title
    .replace(/<\/h1>/gi, '') // حذف </h1> از title
    .replace(/&lt;h1[^>]*&gt;/gi, '') // حذف &lt;h1&gt; از title
    .replace(/&lt;\/h1&gt;/gi, '') // حذف &lt;/h1&gt; از title
    .replace(/h1/gi, '') // حذف h1 از title (برای اطمینان)
    .trim();

  // کوتاه کردن اگر طولانی بود
  const shortTitle = cleanTitle.length > maxLength
    ? cleanTitle.substring(0, maxLength).trim()
    : cleanTitle;

  // ساخت slug بر اساس زبان
  if (isPersian(shortTitle)) {
    return slugifyPersian(shortTitle);
  } else {
    return slugify(shortTitle, { lower: true, strict: true });
  }
}

/**
 * ساخت slug برای دسته‌بندی
 */
function slugifyCategory(categoryName: string): string {
  if (!categoryName || !categoryName.trim()) {
    return "";
  }

  if (isPersian(categoryName)) {
    return slugifyPersian(categoryName.trim());
  } else {
    return slugify(categoryName.trim(), { lower: true, strict: true });
  }
}

/**
 * تولید slug کامل برای بلاگ
 * فرمت: category-slug/title-slug
 * 
 * @param title - عنوان بلاگ
 * @param categorySlugOrName - slug یا نام دسته‌بندی
 * @param customSlug - slug سفارشی (اختیاری)
 * @param maxLength - حداکثر طول slug (پیش‌فرض 100)
 * @returns slug کامل
 */
export function generateBlogSlug(
  title: string,
  categorySlugOrName?: string | null,
  customSlug?: string | null,
  maxLength: number = 100
): string {
  // 1. ساخت slug برای عنوان
  let titleSlug = "";

  if (customSlug && customSlug.trim()) {
    // استفاده از slug سفارشی
    titleSlug = isPersian(customSlug)
      ? slugifyPersian(customSlug.trim())
      : slugify(customSlug.trim(), { lower: true, strict: true });
  } else {
    // ساخت از عنوان
    titleSlug = slugifyTitle(title);
  }

  if (!titleSlug) {
    throw new Error("نمی‌توان slug خالی ساخت. عنوان یا slug سفارشی الزامی است.");
  }

  // 2. ساخت slug برای دسته‌بندی
  let categorySlug = "";

  if (categorySlugOrName && categorySlugOrName.trim()) {
    // اگر slug است (دارای / یا - نیست)، استفاده مستقیم
    // در غیر این صورت از نام slug می‌سازیم
    if (categorySlugOrName.includes("/") || categorySlugOrName.includes("-")) {
      categorySlug = categorySlugOrName.trim();
    } else {
      categorySlug = slugifyCategory(categorySlugOrName);
    }
  }

  // 3. فقط title slug را برگردان (بدون category)
  // category در URL به صورت جداگانه اضافه می‌شود: /اخبار/دسته-بندی/slug-بلاگ
  let finalSlug = titleSlug;

  // 4. محدود کردن طول (فقط title slug)
  if (finalSlug.length > maxLength) {
    finalSlug = titleSlug.substring(0, maxLength);
  }

  return finalSlug;
}

/**
 * تولید slug منحصر به فرد برای بلاگ (با بررسی تکراری بودن)
 * 
 * @param title - عنوان بلاگ
 * @param categorySlugOrName - slug یا نام دسته‌بندی
 * @param customSlug - slug سفارشی (اختیاری)
 * @param excludeBlogId - شناسه بلاگی که باید از بررسی حذف شود (برای ویرایش)
 * @returns slug منحصر به فرد
 */
export async function generateUniqueBlogSlug(
  title: string,
  categorySlugOrName?: string | null,
  customSlug?: string | null,
  excludeBlogId?: number
): Promise<string> {
  // ساخت slug پایه
  let baseSlug = generateBlogSlug(title, categorySlugOrName, customSlug);

  // بررسی تکراری بودن
  let finalSlug = baseSlug;
  let counter = 1;

  while (true) {
    // جستجو در Blog (slug اصلی)
    const existingBlog = await prisma.blog.findFirst({
      where: {
        slug: finalSlug,
        ...(excludeBlogId ? { id: { not: excludeBlogId } } : {}),
      },
    });

    // جستجو در BlogTranslation (slug ترجمه)
    const existingTranslation = await prisma.blogTranslation.findFirst({
      where: {
        slug: finalSlug,
        ...(excludeBlogId ? { blog_id: { not: excludeBlogId } } : {}),
      },
    });

    // اگر تکراری نیست، از این slug استفاده کن
    if (!existingBlog && !existingTranslation) {
      break;
    }

    // اضافه کردن شماره به انتهای slug
    // فرمت: base-slug-2, base-slug-3, ...
    const separator = baseSlug.includes("/") ? "-" : "-";
    finalSlug = `${baseSlug}${separator}${counter}`;
    counter++;

    // محدودیت برای جلوگیری از حلقه بی‌نهایت
    if (counter > 1000) {
      throw new Error("نمی‌توان slug منحصر به فرد ساخت. لطفاً slug یا عنوان را تغییر دهید.");
    }
  }

  return finalSlug;
}

/**
 * دریافت یا ساخت slug برای دسته‌بندی
 * 
 * @param categoryId - شناسه دسته‌بندی
 * @param lang - زبان (FA یا EN)
 * @returns slug دسته‌بندی
 */
export async function getOrCreateCategorySlug(
  categoryId: number,
  lang: "FA" | "EN" = "FA"
): Promise<string | null> {
  const category = await prisma.blogCategory.findUnique({
    where: { id: categoryId },
    include: {
      translations: {
        where: { lang },
      },
    },
  });

  if (!category || category.translations.length === 0) {
    return null;
  }

  const translation = category.translations[0];

  // اگر slug وجود دارد، برگردان
  if (translation.slug) {
    return translation.slug;
  }

  // در غیر این صورت از نام slug بساز و ذخیره کن
  if (!translation.name) {
    return null;
  }

  const categorySlug = slugifyCategory(translation.name);

  // ذخیره slug در دیتابیس
  try {
    await prisma.blogCategoryTranslation.updateMany({
      where: {
        blogCategory_id: categoryId,
        lang,
      },
      data: {
        slug: categorySlug,
      },
    });
  } catch (error) {
    console.warn("⚠️ خطا در ذخیره slug دسته‌بندی:", error);
  }

  return categorySlug;
}

