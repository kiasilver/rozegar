import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/core/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6');
    const featured = searchParams.get('featured') === 'true';

    const blogs = await prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        is_active: true,
        // ???? featured? ??? ?? ???? view_count ???? ???????? ???? ????? is_featured
      },
      orderBy: featured 
        ? { view_count: 'desc' } 
        : { published_at: 'desc' },
      take: limit,
      select: {
        id: true,
        slug: true,
        image: true,
        published_at: true,
        view_count: true,
        translations: {
          where: { lang: 'FA' },
          select: {
            title: true,
            slug: true,
          },
          take: 1,
        },
        blogcategory: {
          select: {
            translations: {
              where: { lang: 'FA' },
              select: {
                name: true,
                slug: true,
              },
              take: 1,
            },
          },
          take: 1,
        },
      },
    });

    const articles = blogs.map((blog) => {
      const translation = blog.translations[0];
      const category = blog.blogcategory[0]?.translations[0];
      
      return {
        id: blog.id,
        title: translation?.title || '',
        slug: translation?.slug || blog.slug || '',
        image: blog.image,
        published_at: blog.published_at,
        view_count: blog.view_count,
        category: category?.name,
      };
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching latest news:', error);
    return NextResponse.json(
      { error: '??? ?? ?????? ?????' },
      { status: 500 }
    );
  }
}

