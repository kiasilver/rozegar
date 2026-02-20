/**
 * تابع کمکی برای ساخت URL بلاگ با فرمت: /اخبار/دسته-بندی/slug-بلاگ
 */

import { prisma } from '@/lib/core/prisma';

/**
 * ساخت URL بلاگ با فرمت: /اخبار/دسته-بندی/slug-بلاگ
 * 
 * @param blogSlug - slug بلاگ (فقط title-slug، بدون category)
 * @param categorySlug - slug دسته‌بندی (اختیاری)
 * @param blogId - شناسه بلاگ (برای دریافت category از دیتابیس در صورت عدم وجود)
 * @returns URL کامل بلاگ
 */
export async function getBlogUrl(
  blogSlug: string,
  categorySlug?: string | null,
  blogId?: number
): Promise<string> {
  // اگر category slug وجود دارد، استفاده کن
  if (categorySlug) {
    return `/اخبار/${categorySlug}/${blogSlug}`;
  }
  
  // اگر blogId وجود دارد، از دیتابیس category را بگیر
  if (blogId) {
    try {
      const blog = await prisma.blog.findUnique({
        where: { id: blogId },
        include: {
          blogcategory: {
            include: {
              translations: {
                where: { lang: 'FA' },
                take: 1,
              },
            },
          },
        },
      });
      
      const firstCategory = blog?.blogcategory[0]?.translations[0];
      if (firstCategory?.slug) {
        return `/اخبار/${firstCategory.slug}/${blogSlug}`;
      }
    } catch (error) {
      console.warn('⚠️ خطا در دریافت category از دیتابیس:', error);
    }
  }
  
  // اگر category وجود ندارد، فقط blog slug را برگردان
  return `/اخبار/${blogSlug}`;
}

/**
 * استخراج blog slug از slug کامل (حذف category-slug اگر وجود دارد)
 * 
 * @param fullSlug - slug کامل (ممکن است category-slug/title-slug باشد)
 * @returns فقط title-slug
 */
export function extractBlogSlug(fullSlug: string): string {
  // اگر slug شامل / است، آخرین بخش را برگردان (title-slug)
  const parts = fullSlug.split('/');
  return parts[parts.length - 1] || fullSlug;
}

