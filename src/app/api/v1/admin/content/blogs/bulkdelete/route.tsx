import { prisma } from "@/lib/core/prisma";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";

/**
 * استخراج فایل‌های محلی از محتوای HTML
 */
function extractLocalFilesFromContent(content: string | null): string[] {
  if (!content) return [];
  
  const files: string[] = [];
  const seen = new Set<string>();
  
  // استخراج عکس‌ها از محتوا
  const imgRegex = /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1];
    // فقط فایل‌های محلی (شروع با /uploads/)
    if (src.startsWith('/uploads/') && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  // استخراج ویدیوها از محتوا
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(content)) !== null) {
    const src = match[1];
    if (src.startsWith('/uploads/') && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  // استخراج از تگ source
  const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = sourceRegex.exec(content)) !== null) {
    const src = match[1];
    if (src.startsWith('/uploads/') && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  return files;
}

/**
 * حذف فایل از سیستم فایل
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    // تبدیل مسیر عمومی به مسیر فایل سیستم
    const fullPath = join(process.cwd(), 'public', filePath.startsWith('/') ? filePath.substring(1) : filePath);
    await unlink(fullPath);
    console.log(`✅ فایل حذف شد: ${filePath}`);
  } catch (error: any) {
    // اگر فایل وجود نداشت، خطا را ignore کن
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️ خطا در حذف فایل ${filePath}:`, error.message);
    }
  }
}

export async function DELETE(req: Request) {
  const { ids } = await req.json(); // Expecting { ids: [1, 2, 3] }

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
    return NextResponse.json({ error: "Invalid blog IDs" }, { status: 400 });
  }

  try {
    // دریافت اطلاعات بلاگ‌ها قبل از حذف (برای حذف فایل‌ها)
    const blogs = await prisma.blog.findMany({
      where: { id: { in: ids } },
      include: {
        translations: {
          select: {
            content: true,
          },
        },
      },
    });

    // استخراج فایل‌های مرتبط
    const filesToDelete: string[] = [];
    
    blogs.forEach(blog => {
      // اضافه کردن عکس اصلی بلاگ
      if (blog.image && blog.image.startsWith('/uploads/')) {
        filesToDelete.push(blog.image);
      }
      
      // استخراج فایل‌ها از محتوای ترجمه‌ها
      blog.translations.forEach(translation => {
        if (translation.content) {
          const contentFiles = extractLocalFilesFromContent(translation.content);
          filesToDelete.push(...contentFiles);
        }
      });
    });

    const blogTranslations = await prisma.blogTranslation.findMany({
      where: { blog_id: { in: ids } },
      select: { seo_id: true },
    });

    const seoIdsToDelete = blogTranslations
      .map((bt) => bt.seo_id)
      .filter((id): id is number => id !== null);

    await prisma.sEO.deleteMany({
      where: {
        id: { in: seoIdsToDelete },
      },
    });

    await prisma.blogTagMap.deleteMany({
      where: { blog_id: { in: ids } },
    });

    await Promise.all(
        ids.map((id) =>
          prisma.blog.update({
            where: { id },
            data: {
              blogcategory: {
                set: [],
              },
            },
          })
        )
      );
      

    await prisma.blog.deleteMany({
      where: { id: { in: ids } },
    });

    // حذف فایل‌ها از سیستم فایل (بعد از حذف از دیتابیس)
    const uniqueFiles = Array.from(new Set(filesToDelete));
    await Promise.all(uniqueFiles.map(file => deleteFile(file)));

    return NextResponse.json({ 
      success: true,
      deletedFiles: uniqueFiles.length 
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Server error while bulk deleting" }, { status: 500 });
  }
}
