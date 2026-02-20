/**
 * API Route: /api/v1/public/blogs
 * Next.js 16.1.1 Best Practices
 * 
 * Returns list of published blogs with optimized queries
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { createDatabaseErrorResponse, safeDbOperation } from "@/lib/db/error-handler";
import { blogSelectFields, getPaginationParams } from "@/lib/db/query-helpers";

// Route segment config for Next.js 16.1.1
export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(req: Request) {
  return safeDbOperation(async () => {
    const { searchParams } = new URL(req.url);
    const { limit } = getPaginationParams(searchParams);
    const categoryName = searchParams.get("category");

    let whereClause: any = {
      is_active: true,
      status: "PUBLISHED",
    };

    // ??? category ???? ??? ????
    if (categoryName) {
      const categoryData = await prisma.blogCategoryTranslation.findFirst({
        where: {
          lang: "FA",
          OR: [
            { slug: categoryName },
            { name: categoryName },
          ],
        },
        include: { blogCategory: true },
      });

      if (categoryData) {
        whereClause.blogcategory = {
          some: { id: categoryData.blogCategory_id },
        };
      }
    }

    // Optimized query with select fields
    const posts = await prisma.blog.findMany({
      where: whereClause,
      orderBy: { published_at: "desc" },
      take: limit,
      select: {
        ...blogSelectFields,
        translations: {
          where: { lang: "FA" },
          select: {
            title: true,
            content: true,
            excerpt: true,
            slug: true,
          },
        },
        blogcategory: {
          select: {
            id: true,
            translations: {
              where: { lang: "FA" },
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // ????? ? ????? ?? ???? ???? ???
    const filteredPosts = posts
      .filter((post) => {
        // ????? ????? translation ???? ????? ????
        if (!post.translations || post.translations.length === 0) {
          console.warn(`?? Blog ${post.id}: translation ???? ?????`);
          return false;
        }

        // ????? ????? ??? ???? ????? ???? (??? ??? placeholder ????)
        if (!post.image || post.image.trim() === '') {
          console.warn(`?? Blog ${post.id}: image ???? ?????`);
          return false;
        }

        return true;
      })
      .map((post) => {
        const content = post.translations[0]?.content || "";

        // ????? ???? ????? ?? ?????
        const hasVideo =
          /<video[^>]+src=["']/i.test(content) ||
          /<iframe[^>]+src=["'][^"']*(youtube|youtu\.be|vimeo)/i.test(content) ||
          /youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\//i.test(content) ||
          /vimeo\.com\//i.test(content) ||
          /\/uploads\/videos\//i.test(content) ||
          /video-wrapper/i.test(content);

        return {
          id: post.id,
          title: post.translations[0]?.title || "???? ?????",
          link: `/news/${post.translations[0]?.slug || post.slug || post.id}`,
          pubDate: post.published_at?.toISOString() || post.created_at?.toISOString() || new Date().toISOString(),
          description: content,
          image: post.image,
          category: post.blogcategory[0]?.translations[0]?.name || null,
          hasVideo,
        };
      });

    console.log(`? [API:Blogs] ????? ???????? ????? ???: ${filteredPosts.length} ?? ${posts.length}`);

    return NextResponse.json(filteredPosts, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  });
}

