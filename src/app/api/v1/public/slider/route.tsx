// app/api/v1/public/slider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const dynamic = "force-dynamic";

type Slide = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  alt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  categoryName: string | null;
  authorName: string | null;
  createdAt: string | null;
};

// ???? ???? shuffle ???? ?????
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Transform Blog to Slide format
function blogToSlide(blog: any, index: number): Slide {
  return {
    id: blog.id,
    title: blog.translations[0]?.title || '',
    imageUrl: blog.image || '',
    linkUrl: `/news/${blog.translations[0]?.slug || blog.slug || blog.id}`,
    alt: blog.translations[0]?.title || null,
    metaTitle: blog.translations[0]?.title || null,
    metaDescription: blog.translations[0]?.content ? blog.translations[0].content.substring(0, 160) : null,
    categoryName: blog.blogcategory && blog.blogcategory[0]?.translations && blog.blogcategory[0].translations[0]?.name || null,
    authorName: blog.User?.name || null,
    createdAt: blog.published_at?.toISOString() || blog.created_at?.toISOString() || null,
  };
}

export async function GET() {
  try {
    // Add timeout wrapper - 8 seconds max for query
    const queryPromise = prisma.blog.findMany({
      where: {
        is_active: true,
        status: "PUBLISHED",
        NOT: {
          image: "",
        },
      },
      orderBy: { published_at: "desc" },
      take: 20, // Reduced from 50 to 20 for better performance
      select: {
        id: true,
        image: true,
        slug: true,
        published_at: true,
        created_at: true,
        translations: {
          where: { lang: "FA" },
          select: {
            title: true,
            slug: true,
            content: true,
          },
        },
        blogcategory: {
          take: 1, // Only get first category
          select: {
            translations: {
              where: { lang: "FA" },
              select: {
                name: true,
              },
              take: 1,
            },
          },
        },
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    // Timeout after 8 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 8000)
    );

    const blogs = await Promise.race([queryPromise, timeoutPromise]);

    // Filter blogs with valid image, translation, and exclude default logo
    const blogsWithImage = blogs.filter((blog) => {
      if (!blog.image || blog.image.length === 0 || blog.translations.length === 0) return false;
      const hasLogo = blog.image.includes('/images/logo/logo.png') || blog.image.includes('logo.png') || blog.image.includes('logo.svg');
      return !hasLogo;
    });

    // Random shuffle and select top 3 for slider (to match user request of exactly 3 slides)
    const shuffled = shuffleArray(blogsWithImage);
    const slides = shuffled.slice(0, 3).map((blog, index) => blogToSlide(blog, index));

    return NextResponse.json(slides, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('❌ [Slider API] Error:', error);
    // Return empty array on error to prevent frontend crash
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30',
      },
    });
  }
}
