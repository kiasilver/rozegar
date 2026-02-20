import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/auth';
import { prisma } from '@/lib/core/prisma';

/**
 * GET: ?????? ???? RSS Feed ??? ????? ???
 */
export async function GET() {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== 'Admin' && role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch all RSS sources
    const sources = await prisma.rSSSource.findMany({
      include: {
        category: {
          include: {
            translations: {
              where: { lang: 'FA' },
            },
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    // 3. Rebuild categoryRssFeeds map
    let categoryRssFeeds: Record<number, { url: string; name: string; is_active: boolean }[]> = {};

    sources.forEach((source) => {
      const categoryId = source.category_id;
      const categoryName = source.category?.translations[0]?.name || `Category ${categoryId}`;

      if (!categoryRssFeeds[categoryId]) {
        categoryRssFeeds[categoryId] = [];
      }

      categoryRssFeeds[categoryId].push({
        url: source.rss_url,
        name: categoryName, // Or source has a specific name field? RSSSource doesn't have name, using category name.
        is_active: source.is_active,
      });
    });

    // 4. Build enhanced response with names
    const rssFeedsWithCategoryNames: Record<
      string,
      {
        category_id: number;
        category_name: string;
        feeds: { url: string; name: string; is_active: boolean }[];
      }
    > = {};

    Object.keys(categoryRssFeeds).forEach((key) => {
      const categoryId = parseInt(key);
      const feeds = categoryRssFeeds[categoryId];
      const categoryName = feeds[0]?.name || `Category ${categoryId}`;

      rssFeedsWithCategoryNames[key] = {
        category_id: categoryId,
        category_name: categoryName,
        feeds: feeds,
      };
    });

    return NextResponse.json({
      success: true,
      total_categories: Object.keys(categoryRssFeeds).length,
      total_feeds: sources.length,
      rss_feeds: categoryRssFeeds,
      rss_feeds_with_names: rssFeedsWithCategoryNames,
    });
  } catch (error: any) {
    console.error('Error fetching RSS feeds:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
