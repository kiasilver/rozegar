import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { slugifyPersian } from "@/lib/utils/slugify-fa";
import slugify from "slugify";
import { isPersian } from "@/lib/utils/ispersian";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  }

  try {
    // پیدا کردن همه بلاگ‌های این دسته‌بندی
    const blogs = await prisma.blog.findMany({
      where: {
        blogcategory: {
          some: {
            id: id,
          },
        },
      },
    });

    // حذف ارتباط بلاگ‌ها با این دسته‌بندی (نه حذف خود بلاگ‌ها)
    for (const blog of blogs) {
      await prisma.blog.update({
        where: { id: blog.id },
        data: {
          blogcategory: {
            disconnect: { id: id },
          },
        },
      });
    }

    // حذف ترجمه‌ها
    const translations = await prisma.blogCategoryTranslation.findMany({
      where: { blogCategory_id: id },
      include: { seo: true },
    });

    for (const translation of translations) {
      if (translation.seo) {
        await prisma.sEO.delete({
          where: { id: translation.seo.id },
        });
      }
    }

    // حذف خود دسته‌بندی
    await prisma.blogCategory.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: "دسته‌بندی با موفقیت حذف شد.",
      affectedBlogs: blogs.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "خطا در حذف دسته‌بندی." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (isNaN(id)) {
    return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, slug } = body;

    if (!name && !slug) {
      return NextResponse.json({ error: "نام یا مسیر باید ارسال شود." }, { status: 400 });
    }

    // پیدا کردن ترجمه فارسی
    const translation = await prisma.blogCategoryTranslation.findFirst({
      where: {
        blogCategory_id: id,
        lang: "FA",
      },
    });

    if (!translation) {
      return NextResponse.json({ error: "ترجمه فارسی پیدا نشد." }, { status: 404 });
    }

    // به‌روزرسانی نام
    let updatedName = translation.name;
    if (name) {
      updatedName = name.trim();
    }

    // به‌روزرسانی slug
    let updatedSlug = translation.slug;
    if (slug) {
      const baseText = slug.trim() || updatedName;
      updatedSlug = isPersian(baseText)
        ? slugifyPersian(baseText)
        : slugify(baseText, { lower: true, strict: true });
    }

    // بررسی یکتایی slug
    const existingSlug = await prisma.blogCategoryTranslation.findFirst({
      where: {
        slug: updatedSlug,
        blogCategory_id: { not: id },
        lang: "FA",
      },
    });

    if (existingSlug) {
      // اگر slug تکراری است، یک شماره اضافه کن
      let counter = 1;
      let uniqueSlug = `${updatedSlug}-${counter}`;
      while (
        await prisma.blogCategoryTranslation.findFirst({
          where: {
            slug: uniqueSlug,
            blogCategory_id: { not: id },
            lang: "FA",
          },
        })
      ) {
        counter++;
        uniqueSlug = `${updatedSlug}-${counter}`;
      }
      updatedSlug = uniqueSlug;
    }

    const oldSlug = translation.slug;
    const slugChanged = oldSlug !== updatedSlug;

    // به‌روزرسانی ترجمه
    await prisma.blogCategoryTranslation.update({
      where: { id: translation.id },
      data: {
        name: updatedName,
        slug: updatedSlug,
      },
    });

    // اگر slug تغییر کرده، به‌روزرسانی slug همه بلاگ‌های این دسته‌بندی
    if (slugChanged) {
      try {
        // پیدا کردن همه بلاگ‌های این دسته‌بندی
        const blogs = await prisma.blog.findMany({
          where: {
            blogcategory: {
              some: {
                id: id,
              },
            },
          },
          include: {
            translations: {
              where: { lang: "FA" },
            },
          },
        });

        // به‌روزرسانی slug هر بلاگ
        for (const blog of blogs) {
          const blogTranslation = blog.translations[0];
          if (!blogTranslation) continue;

          const currentSlug = blogTranslation.slug;
          
          // اگر slug بلاگ با فرمت category-slug/title-slug است
          if (currentSlug.includes('/')) {
            const parts = currentSlug.split('/');
            if (parts.length === 2 && parts[0] === oldSlug) {
              // به‌روزرسانی slug با category slug جدید
              const newBlogSlug = `${updatedSlug}/${parts[1]}`;
              
              // بررسی یکتایی
              const existing = await prisma.blogTranslation.findFirst({
                where: {
                  slug: newBlogSlug,
                  blog_id: { not: blog.id },
                  lang: "FA",
                },
              });

              if (!existing) {
                // به‌روزرسانی slug
                await prisma.blogTranslation.update({
                  where: { id: blogTranslation.id },
                  data: { slug: newBlogSlug },
                });
                
                // به‌روزرسانی slug در Blog هم
                await prisma.blog.update({
                  where: { id: blog.id },
                  data: { slug: newBlogSlug },
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ خطا در به‌روزرسانی slug بلاگ‌ها:", error);
        // ادامه می‌دهیم حتی اگر خطا رخ دهد
      }
    }

    return NextResponse.json({
      message: "دسته‌بندی با موفقیت به‌روزرسانی شد.",
      category: {
        id,
        name: updatedName,
        slug: updatedSlug,
      },
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی دسته‌بندی." }, { status: 500 });
  }
}
