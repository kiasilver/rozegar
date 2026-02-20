import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'newest';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Build where clause
    let whereClause: any = {
      is_active: true,
      status: 'PUBLISHED',
      OR: [
        {
          translations: {
            some: {
              title: {
                contains: query,
                mode: 'insensitive',
              },
              lang: 'FA',
            },
          },
        },
        {
          translations: {
            some: {
              content: {
                contains: query,
                mode: 'insensitive',
              },
              lang: 'FA',
            },
          },
        },
        {
          translations: {
            some: {
              excerpt: {
                contains: query,
                mode: 'insensitive',
              },
              lang: 'FA',
            },
          },
        },
      ],
    };

    // Filter by category
    if (category) {
      const categoryData = await prisma.blogCategoryTranslation.findFirst({
        where: {
          slug: category,
          lang: 'FA',
        },
        include: { blogCategory: true },
      });

      if (categoryData) {
        whereClause.blogcategory = {
          some: { id: categoryData.blogCategory_id },
        };
      }
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case 'popular':
        orderBy = { view_count: 'desc' };
        break;
      case 'oldest':
        orderBy = { published_at: 'asc' };
        break;
      default:
        orderBy = { published_at: 'desc' };
    }

    // Get total count
    const total = await prisma.blog.count({ where: whereClause });

    // Get posts
    const posts = await prisma.blog.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        translations: {
          where: { lang: 'FA' },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            content: true,
          },
        },
        blogcategory: {
          include: {
            translations: {
              where: { lang: 'FA' },
              select: { name: true, slug: true },
            },
          },
        },
        User: {
          select: {
            name: true,
            image_profile: true,
          },
        },
      },
    });

    // Highlight search terms in results
    const highlightedPosts = posts.map((post) => {
      const translation = post.translations[0];
      if (!translation) return null;

      const highlightText = (text: string, query: string) => {
        if (!text) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };

      return {
        ...post,
        translations: [
          {
            ...translation,
            title: highlightText(translation.title, query),
            excerpt: translation.excerpt
              ? highlightText(translation.excerpt, query)
              : null,
          },
        ],
      };
    }).filter(Boolean);

    return NextResponse.json({
      results: highlightedPosts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: '??? ?? ?????' },
      { status: 500 }
    );
  }
}

