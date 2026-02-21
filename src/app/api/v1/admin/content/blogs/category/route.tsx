// app/api/admin/category/route.tsx
import { prisma } from '@/lib/core/prisma';

import { NextResponse } from 'next/server';
import { z } from "zod";
import { generateSEO as generateAISEO } from "@/lib/content/seo/seo-ai";
import { getAISettings } from "@/lib/ai/ai-settings";
import { slugifyPersian } from "@/lib/utils/slugify-fa";
import slugify from "slugify";
import { isPersian } from "@/lib/utils/ispersian";

const blogCategorySchema = z.object({
  name: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  slug: z.string().min(3).optional(),
  lang: z.string().default("fa"),
  parent_id: z.union([z.number(), z.string().transform(val => val ? Number(val) : null)]).nullable().optional(),
  image: z.any().optional(),

  // SEO fields
  metaTitle: z.string().optional(),
  metaKeywords: z.string().optional(),
  metaDescription: z.string().optional(),
  canonical_url: z.string().optional(),
  robots: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
});
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, parent_id, order } = z.object({
      id: z.number(),
      parent_id: z.number().nullable().optional(),
      order: z.number().optional(),
    }).parse(body);

    const updateData: { parent_id?: number | null; order?: number } = {};
    if (parent_id !== undefined) {
      updateData.parent_id = parent_id ?? null;
    }
    if (order !== undefined) {
      updateData.order = order;
    }

    const updated = await prisma.blogCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, updated }, { status: 200 });
  } catch (err) {
    console.error("❌ Error in PATCH /api/admin/category:", err);
    const message = err instanceof Error ? err.message : 'خطایی رخ داد';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
 
  const categories = await prisma.blogCategory.findMany({
    include: {
      parent: true,
      children: { // ✅ ایـن خط اضافه بشه
        include: {
          children: true, // برای سطح‌های بعدی
          translations: true,
        }
      },
      translations: true,
    },
    orderBy: [
      { order: 'asc' },
      { id: 'asc' }, // fallback to id if order is null
    ],
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 Body received:", body);
    const parsed = blogCategorySchema.parse(body);

    const {
      name,
      slug,
      lang = "FA",
      parent_id,
      metaTitle,
      metaKeywords,
      metaDescription,

    
      og_title,
      og_description,
     
      twitter_title,
      twitter_description,
  
    } = parsed;

    // تبدیل parent_id به number یا null
    const finalParentId = parent_id ? (typeof parent_id === 'string' ? Number(parent_id) : parent_id) : null;

    let seoData: {
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
    };

    if (!metaTitle || !metaDescription || !metaKeywords) {
      const generated = await generateAISEO(name, parsed.metaDescription || name, [], {
        language: lang === "FA" ? "fa" : "en",
      });
      seoData = {
        metaTitle: generated.meta_title,
        metaDescription: generated.meta_description,
        metaKeywords: generated.meta_keywords,
      };
    } else {
      seoData = {
        metaTitle,
        metaDescription,
        metaKeywords,
      };
    }

      const createdCategory = await prisma.blogCategory.create({
        data: {
          parent_id: finalParentId,
        },
      });
      console.log("✅ Created CategoryTranslation:", createdCategory);
      const createdSEO = await prisma.sEO.create({
        data: {
          meta_title: seoData.metaTitle || "",
          meta_description: seoData.metaDescription || "",
          meta_keywords: seoData.metaKeywords || "" ,
          canonical_url: slug ,
          robots: "index",
          og_title: og_title ?? seoData.metaTitle,
          og_description: og_description ?? seoData.metaDescription,
        
          twitter_title: twitter_title ?? seoData.metaTitle,
          twitter_description: twitter_description ?? seoData.metaDescription,
        
          locale: lang || "FA",
     
        // structured_data: JSON.stringify({
        //   "@context": "https://schema.org",
        //   "@type": "Article",
        //   "headline": seo.metaTitle,
        //   "description": seo.metaDescription,
        //   "author": {
        //     "@type": "Person",
        //     "name": parsed.author_name || "Unknown Author"  // اگر نویسنده وجود نداشت، مقدار پیش‌فرض قرار می‌دهید
        //   },
        //   "datePublished": blog.created_at,
        //   "dateModified": blog.updated_at,
        //   "image": parsed.og_image || parsed.image || "",  // تصویر اصلی مقاله
        //   "publisher": {
        //     "@type": "Organization",
        //     "name": "Your Website Name",  // نام سایت شما
        //     "logo": {
        //       "@type": "ImageObject",
        //       "url": "https://example.com/logo.png"  // لینک به لوگو سایت
        //     }
        //   }
        // }),
        
      },
      
    });
    console.log("✅ Created CategoryTranslation:", createdSEO);
    
    // تولید slug فارسی برای دسته‌بندی
    const textToSlug = (slug?.trim() || name).trim();
    const categorySlug = isPersian(textToSlug)
      ? slugifyPersian(textToSlug)
      : slugify(textToSlug, { lower: true, strict: true });
    
    const translation = await prisma.blogCategoryTranslation.create({
      data: {
        name,
        slug: categorySlug,
        lang:"FA",
        blogCategory_id: createdCategory.id,
        seo_id: createdSEO.id,
      },
    });
    console.log("✅ Created CategoryTranslation:", translation);
    return NextResponse.json({ success: true, categoryId: createdCategory.id }, { status: 201 });

  } catch (error: unknown) {
    console.error("❌ Error creating blog category:", error);
    const errorMessage = error instanceof Error ? error.message : "خطایی رخ داد";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}