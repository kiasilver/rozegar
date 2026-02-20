/**
 * Blog Creator
 * ساخت Blog از محتوای RSS با SEO خودکار
 */

import { prisma } from '@/lib/core/prisma';
import { generateBlogSlug } from '@/lib/content/blog/blog-slug';
import { generateSEO } from '@/lib/content/seo/seo-ai';
import { generateShortLink } from '@/lib/content/blog/blog-short-link';
import { SharedImageManager } from '@/lib/shared/image-manager';

/**
 * دریافت author_id معتبر
 * اولویت: کاربر Admin، سپس اولین کاربر فعال، در نهایت null
 */
async function getValidAuthorId(preferredAuthorId?: number): Promise<number | null> {
  try {
    // اگر author_id مشخص شده، بررسی وجود آن
    if (preferredAuthorId) {
      const user = await prisma.user.findUnique({
        where: { id: preferredAuthorId, is_active: true },
      });
      if (user) {
        return user.id;
      }
    }

    // جستجوی کاربر Admin
    const adminUser = await prisma.user.findFirst({
      where: {
        is_active: true,
        userrole: {
          some: {
            role: {
              name: 'Admin',
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (adminUser) {
      return adminUser.id;
    }

    // جستجوی اولین کاربر فعال
    const firstActiveUser = await prisma.user.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });

    if (firstActiveUser) {
      return firstActiveUser.id;
    }

    // اگر هیچ کاربری وجود نداشت، null برگردان (author_id nullable است)
    console.warn(`[BlogCreator] ⚠️ No active user found, setting author_id to null`);
    return null;
  } catch (error: any) {
    console.error(`[BlogCreator] ⚠️ Error getting author ID:`, error.message);
    return null;
  }
}

export interface BlogCreationData {
  title: string;
  content: string;
  excerpt: string;
  sourceUrl: string;
  imageUrl?: string;
  videoUrl?: string;
  categoryId: number;
  keywords: string[];
  authorId?: number;
  language: 'fa' | 'en';
  enableSEO?: boolean;
  enableWatermark?: boolean;
  watermarkPath?: string;
  siteUrl?: string;
}

export interface BlogCreationResult {
  success: boolean;
  blogId?: number;
  slug?: string;
  shortLink?: string;
  seoGenerated: boolean;
  imageProcessed: boolean;
  error?: string;
}

/**
 * ساخت Blog از RSS
 */
export async function createBlogFromRSS(
  data: BlogCreationData
): Promise<BlogCreationResult> {
  const startTime = Date.now();

  console.log(`[BlogCreator] 🚀 Creating blog: ${data.title.substring(0, 50)}...`);

  try {
    // 1. Generate unique slug
    const baseSlug = generateBlogSlug(data.title);
    const slug = await generateUniqueSlug(baseSlug, data.language);

    console.log(`[BlogCreator] 📝 Generated slug: ${slug}`);

    // 2. Process image (اگر موجود باشد)
    let processedImagePath: string | null = null;

    if (data.imageUrl) {
      // بررسی اینکه آیا تصویر قبلاً پردازش شده است (شروع با /images/)
      const imageAlreadyProcessed = data.imageUrl.startsWith('/images/');
      
      if (imageAlreadyProcessed) {
        // تصویر قبلاً پردازش شده است (احتمالاً با watermark)
        processedImagePath = data.imageUrl;
        console.log(`[BlogCreator] 🖼️ Image already processed (using as-is): ${processedImagePath}`);
      } else {
        // تصویر هنوز پردازش نشده است - پردازش کن
        try {
          processedImagePath = await SharedImageManager.processImage(
            data.imageUrl,
            {
              enableWatermark: data.enableWatermark || false,
              watermarkPath: data.watermarkPath,
              targetFolder: 'blog-images',
              maxWidth: 1200,
              maxHeight: 800,
              quality: 85,
            }
          );

          if (processedImagePath) {
            console.log(`[BlogCreator] 🖼️ Image processed: ${processedImagePath}${data.enableWatermark ? ' (with watermark)' : ''}`);
          }
        } catch (error: any) {
          console.error(`[BlogCreator] ⚠️ Image processing failed:`, error.message);
          // ادامه بدون تصویر
        }
      }
    }

    // 3. Generate Complete SEO
    let seoData: any = {
      meta_title: data.title,
      meta_description: data.excerpt.substring(0, 155),
      meta_keywords: data.keywords.join(', '),
      robots: 'index, follow',
      locale: data.language === 'fa' ? 'fa_IR' : 'en_US',
      og_type: 'article',
      twitter_card: 'summary_large_image',
    };

    let seoGenerated = false;

    if (data.enableSEO !== false) {
      try {
        // ساخت URL کامل
        const baseUrl = data.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://rozeghar.com';
        const fullUrl = `${baseUrl}/blog/${slug}`;
        const fullImageUrl = processedImagePath ? `${baseUrl}${processedImagePath}` : (data.imageUrl?.startsWith('http') ? data.imageUrl : `${baseUrl}${data.imageUrl || ''}`);

        // دریافت تنظیمات AI برای استفاده از provider صحیح (Backboard)
        let aiProvider: "huggingface" | "cursor" | "backboard" | "openai" | "gemini" = "backboard";
        let aiApiKey: string | undefined;
        let aiModel: string | undefined;
        
        try {
          const { getAISettings, getProviderConfig } = await import('@/lib/ai/ai-settings');
          const aiSettings = await getAISettings();
          const defaultProvider = aiSettings.defaultProvider || 'backboard';
          aiProvider = defaultProvider as any;
          
          // دریافت API key و model از provider
          const providerConfig = getProviderConfig(aiSettings, defaultProvider);
          if (providerConfig?.enabled && providerConfig?.apiKey) {
            aiApiKey = providerConfig.apiKey;
            aiModel = providerConfig.model;
            console.log(`[BlogCreator] 🤖 Using AI provider: ${defaultProvider} (model: ${aiModel})`);
          } else {
            console.warn(`[BlogCreator] ⚠️ Provider ${defaultProvider} not enabled or missing API key, falling back to algorithm`);
          }
        } catch (error) {
          console.warn(`[BlogCreator] ⚠️ Failed to get AI settings, using algorithm:`, error);
        }

        const generatedSEO = await generateSEO(
          data.title,
          data.content,
          data.keywords,
          {
            useAI: !!aiApiKey, // فقط اگر API key داریم از AI استفاده کن
            language: data.language,
            useAgentAnalysis: false,
            aiProvider: aiProvider,
            apiKey: aiApiKey,
            model: aiModel,
          }
        );

        // تولید Structured Data
        const { generateStructuredData } = await import('@/lib/content/seo/seo-ai');
        const structuredData = await generateStructuredData(
          generatedSEO.meta_title || data.title,
          generatedSEO.meta_description || data.excerpt.substring(0, 155),
          processedImagePath || data.imageUrl || '',
          fullUrl,
          new Date(),
          new Date(),
          undefined, // author
          undefined // categories
        );

        // استفاده از SEO کامل با تمام فیلدها
        seoData = {
          meta_title: generatedSEO.meta_title || data.title,
          meta_description: generatedSEO.meta_description || data.excerpt.substring(0, 155),
          meta_keywords: generatedSEO.meta_keywords || data.keywords.join(', '),
          // OG Tags
          og_title: generatedSEO.meta_title || data.title,
          og_description: generatedSEO.meta_description || data.excerpt.substring(0, 155),
          og_image: fullImageUrl,
          og_type: 'article',
          og_url: fullUrl,
          og_site_name: 'روزگار',
          // Twitter Tags
          twitter_title: generatedSEO.meta_title || data.title,
          twitter_description: generatedSEO.meta_description || data.excerpt.substring(0, 155),
          twitter_image: fullImageUrl,
          twitter_card: 'summary_large_image',
          // سایر فیلدها
          canonical_url: fullUrl,
          robots: 'index, follow',
          structured_data: JSON.stringify(structuredData),
          article_section: undefined,
          article_author: undefined,
          article_published_time: new Date(),
          article_modified_time: new Date(),
          locale: data.language === 'fa' ? 'fa_IR' : 'en_US',
        };

        seoGenerated = true;
        console.log(`[BlogCreator] 🎯 Complete SEO generated (with OG, Twitter, Structured Data)`);
      } catch (error: any) {
        console.error(`[BlogCreator] ⚠️ SEO generation failed:`, error.message);
        // ادامه با SEO پایه
      }
    }

    // 4. Get valid author ID
    const authorId = await getValidAuthorId(data.authorId);

    // 5. Create blog
    const blogData: any = {
      is_featured: false,
      status: 'PUBLISHED',
      view_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      translations: {
        create: {
          lang: data.language === 'fa' ? 'FA' : 'EN',
          title: data.title,
          slug,
          seo: {
            create: {
              meta_title: seoData.meta_title,
              meta_description: seoData.meta_description,
              meta_keywords: seoData.meta_keywords,
              // OG Tags
              og_title: seoData.og_title,
              og_description: seoData.og_description,
              og_image: seoData.og_image,
              og_type: seoData.og_type,
              og_url: seoData.og_url,
              og_site_name: seoData.og_site_name,
              // Twitter Tags
              twitter_title: seoData.twitter_title,
              twitter_description: seoData.twitter_description,
              twitter_image: seoData.twitter_image,
              twitter_card: seoData.twitter_card,
              // سایر فیلدها
              canonical_url: seoData.canonical_url,
              robots: seoData.robots,
              structured_data: seoData.structured_data,
              article_section: seoData.article_section,
              article_author: seoData.article_author,
              article_published_time: seoData.article_published_time,
              article_modified_time: seoData.article_modified_time,
              locale: seoData.locale,
            }
          },
          content: data.content,
          excerpt: data.excerpt,
        },
      },
      blogcategory: {
        connect: { id: data.categoryId },
      },
      image: processedImagePath || data.imageUrl || '',
    };

    // فقط اگر author_id معتبر پیدا شد، اضافه کن
    if (authorId !== null) {
      blogData.author_id = authorId;
    }

    const blog = await prisma.blog.create({
      data: blogData,
    });

    console.log(`[BlogCreator] ✅ Blog created: ID ${blog.id}${authorId ? ` (Author: ${authorId})` : ' (No author)'}`);

    // 6. Generate short link
    let shortLink: string | undefined;

    try {
      shortLink = await generateShortLink(
        blog.id,
        data.siteUrl || 'https://rozeghar.com'
      );
      console.log(`[BlogCreator] 🔗 Short link: ${shortLink}`);
    } catch (error: any) {
      console.error(`[BlogCreator] ⚠️ Short link generation failed:`, error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`[BlogCreator] 🎉 Done in ${duration}ms`);

    return {
      success: true,
      blogId: blog.id,
      slug,
      shortLink,
      seoGenerated,
      imageProcessed: !!processedImagePath,
    };

  } catch (error: any) {
    console.error(`[BlogCreator] ❌ Error:`, error.message);

    return {
      success: false,
      seoGenerated: false,
      imageProcessed: false,
      error: error.message,
    };
  }
}

/**
 * تولید slug یکتا
 */
async function generateUniqueSlug(
  baseSlug: string,
  language: 'fa' | 'en'
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    // بررسی وجود slug
    const existing = await prisma.blogTranslation.findFirst({
      where: {
        slug,
        lang: language === 'fa' ? 'FA' : 'EN',
      },
    });

    if (!existing) {
      return slug;
    }

    // اضافه کردن counter
    slug = `${baseSlug}-${counter}`;
    counter++;

    // محدودیت امنیتی
    if (counter > 100) {
      // اضافه کردن timestamp
      slug = `${baseSlug}-${Date.now()}`;
      return slug;
    }
  }
}

/**
 * به‌روزرسانی Blog موجود
 */
export async function updateBlogFromRSS(
  blogId: number,
  data: Partial<BlogCreationData>
): Promise<BlogCreationResult> {
  try {
    console.log(`[BlogCreator] 🔄 Updating blog ${blogId}...`);

    const updateData: any = {
      updated_at: new Date(),
    };

    // به‌روزرسانی translations
    if (data.title || data.content || data.excerpt) {
      const translationData: any = {};

      if (data.title) translationData.title = data.title;
      if (data.content) translationData.content = data.content;
      if (data.excerpt) translationData.excerpt = data.excerpt;

      // Generate SEO برای محتوای جدید
      if (data.title && data.content && data.enableSEO !== false) {
        try {
          const seo = await generateSEO(
            data.title,
            data.content,
            data.keywords || [],
            { useAI: true, language: data.language || 'fa' }
          );

          translationData.meta_title = seo.meta_title;
          translationData.meta_description = seo.meta_description;
          translationData.keywords = seo.meta_keywords;
        } catch (error: any) {
          console.error(`[BlogCreator] ⚠️ SEO update failed:`, error.message);
        }
      }

      await prisma.blogTranslation.updateMany({
        where: {
          blog_id: blogId,
          lang: data.language === 'fa' ? 'FA' : 'EN',
        },
        data: translationData,
      });
    }

    // به‌روزرسانی Blog
    await prisma.blog.update({
      where: { id: blogId },
      data: updateData,
    });

    console.log(`[BlogCreator] ✅ Blog ${blogId} updated`);

    return {
      success: true,
      blogId,
      seoGenerated: true,
      imageProcessed: false,
    };

  } catch (error: any) {
    console.error(`[BlogCreator] ❌ Update error:`, error.message);

    return {
      success: false,
      seoGenerated: false,
      imageProcessed: false,
      error: error.message,
    };
  }
}

/**
 * حذف Blog و فایل‌های مرتبط (عکس و ویدیو)
 */
export async function deleteBlog(blogId: number): Promise<boolean> {
  try {
    // دریافت اطلاعات بلاگ قبل از حذف
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: {
        translations: {
          select: {
            content: true,
          },
        },
      },
    });

    if (!blog) {
      console.log(`[BlogCreator] ⚠️ Blog ${blogId} not found`);
      return false;
    }

    // استخراج فایل‌های مرتبط
    const filesToDelete: string[] = [];

    // اضافه کردن عکس اصلی بلاگ
    if (blog.image) {
      // بررسی مسیرهای مختلف
      let imagePath = blog.image;
      
      // اگر URL کامل است، مسیر نسبی را استخراج کن
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // استخراج مسیر از URL
        try {
          const url = new URL(imagePath);
          imagePath = url.pathname;
        } catch {
          // اگر URL معتبر نیست، نادیده بگیر
          imagePath = '';
        }
      }
      
      // اگر مسیر با /images/ یا /uploads/ شروع می‌شود، اضافه کن
      if (imagePath && (imagePath.startsWith('/images/') || imagePath.startsWith('/uploads/'))) {
        filesToDelete.push(imagePath);
        console.log(`[BlogCreator] 📸 Found blog image to delete: ${imagePath}`);
      }
    }

    // استخراج فایل‌ها از محتوای ترجمه‌ها
    blog.translations.forEach(translation => {
      if (translation.content) {
        const contentFiles = extractLocalFilesFromContent(translation.content);
        filesToDelete.push(...contentFiles);
      }
    });

    // حذف از دیتابیس
    await prisma.blog.delete({
      where: { id: blogId },
    });

    // حذف فایل‌ها از سیستم فایل
    const fs = await import('fs/promises');
    const path = await import('path');
    const uniqueFiles = Array.from(new Set(filesToDelete));

    for (const filePath of uniqueFiles) {
      try {
        // تبدیل مسیر وب به مسیر فایل سیستم
        // حذف / از ابتدای مسیر اگر وجود دارد
        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        const fullPath = path.join(process.cwd(), 'public', cleanPath);
        
        // بررسی وجود فایل قبل از حذف
        try {
          await fs.access(fullPath);
          await fs.unlink(fullPath);
          console.log(`[BlogCreator] 🗑️ Deleted file: ${filePath}`);
        } catch (accessError: any) {
          if (accessError.code === 'ENOENT') {
            console.log(`[BlogCreator] ℹ️ File not found (already deleted?): ${filePath}`);
          } else {
            throw accessError;
          }
        }
      } catch (fileError: any) {
        // اگر فایل وجود نداشت، خطا نده
        if (fileError.code !== 'ENOENT') {
          console.warn(`[BlogCreator] ⚠️ Error deleting file ${filePath}:`, fileError.message);
        }
      }
    }

    console.log(`[BlogCreator] 🗑️ Blog ${blogId} deleted (${uniqueFiles.length} files removed)`);
    return true;
  } catch (error: any) {
    console.error(`[BlogCreator] ❌ Delete error:`, error.message);
    return false;
  }
}

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
    // فقط فایل‌های محلی (شروع با /images/ یا /uploads/)
    if ((src.startsWith('/images/') || src.startsWith('/uploads/')) && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  // استخراج ویدیوها از محتوا
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(content)) !== null) {
    const src = match[1];
    if ((src.startsWith('/images/') || src.startsWith('/uploads/')) && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  // استخراج از تگ source
  const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = sourceRegex.exec(content)) !== null) {
    const src = match[1];
    if ((src.startsWith('/images/') || src.startsWith('/uploads/')) && !src.startsWith('http') && !seen.has(src)) {
      files.push(src);
      seen.add(src);
    }
  }
  
  return files;
}

/**
 * بررسی وجود Blog با slug
 */
export async function blogExistsBySlug(
  slug: string,
  language: 'fa' | 'en'
): Promise<boolean> {
  const existing = await prisma.blogTranslation.findFirst({
    where: {
      slug,
      lang: language === 'fa' ? 'FA' : 'EN',
    },
  });

  return !!existing;
}

