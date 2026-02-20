/**
 * Route برای redirect لینک کوتاه در سطح root
 * مثال: localhost:3000/98314761
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // بررسی اینکه code یک عدد 8 رقمی است
    if (!/^\d{8}$/.test(code)) {
      // اگر عدد 8 رقمی نیست، 404 برگردان
      return NextResponse.json({ error: "لینک پیدا نشد" }, { status: 404 });
    }

    // پیدا کردن بلاگ با short_link
    const blog = await prisma.blog.findFirst({
      where: {
        short_link: code,
      },
      include: {
        translations: {
          where: { lang: "FA" },
        },
        blogcategory: {
          include: {
            translations: {
              where: { lang: "FA" },
            },
          },
        },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: "لینک پیدا نشد" }, { status: 404 });
    }

    const translation = blog.translations[0];
    if (!translation) {
      return NextResponse.json({ error: "ترجمه پیدا نشد" }, { status: 404 });
    }

    // ساخت URL صحیح با دسته‌بندی
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    let blogUrl = `${baseUrl}/اخبار/${translation.slug || blog.slug}`;
    
    // اگر دسته‌بندی وجود دارد، آن را به URL اضافه کن
    if (blog.blogcategory && blog.blogcategory.length > 0) {
      const category = blog.blogcategory[0];
      const categoryTranslation = category.translations[0];
      if (categoryTranslation) {
        blogUrl = `${baseUrl}/اخبار/${categoryTranslation.slug}/${translation.slug || blog.slug}`;
      }
    }

    return NextResponse.redirect(blogUrl, { status: 301 });
  } catch (error) {
    console.error("Error redirecting short link:", error);
    return NextResponse.json({ error: "خطا در redirect" }, { status: 500 });
  }
}

