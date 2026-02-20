import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/auth';
import { prisma } from '@/lib/core/prisma';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET: ?????? RSS Feed ??? ??????? ??? ?? 20 ????? ????
 */
export async function GET(request: Request) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== 'Admin' && role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '20', 10);
    const timeRange = minutes * 60 * 1000; // ????? ?? ??????????
    const startTime = Date.now() - timeRange;

    const rssFeeds = new Map<string, {
      url: string;
      categoryName?: string;
      categoryId?: number;
      feedName?: string;
      timestamp?: string;
      lastSeen?: string;
    }>();

    // ?????? ??? ???????????? ?? database
    const categoryMap = new Map<number, string>();
    try {
      const categories = await prisma.blogCategory.findMany({
        include: { translations: { where: { lang: 'FA' } } },
      });
      categories.forEach(cat => {
        const faTranslation = cat.translations.find(t => t.lang === 'FA');
        if (faTranslation) {
          categoryMap.set(cat.id, faTranslation.name);
        }
      });
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }

    // ????? log ????
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');

    if (fs.existsSync(logPath)) {
      try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n');

        let currentCategory: { name?: string; id?: number } = {};
        let currentTimestamp: number | null = null;

        // ?? ??? ?? ??? ???????
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];

          // ??????? timestamp ?? JSON logs
          const jsonMatch = line.match(/"timestamp":(\d+)/);
          if (jsonMatch) {
            const ts = parseInt(jsonMatch[1], 10);
            if (ts > startTime) {
              currentTimestamp = ts;
            } else {
              // ??? timestamp ???????? ???? ???? ????? ?????
              break;
            }
          }

          // Pattern ???? "[RSS:AutoProcessor] Processing RSS Feed: ??? (Category ID)"
          const feedMatch = line.match(/\[RSS:AutoProcessor\]\s+Processing RSS Feed:\s*([^(]+)(?:\s*\(Category\s*(\d+)\))?/i);
          if (feedMatch && currentTimestamp && currentTimestamp > startTime) {
            currentCategory.name = feedMatch[1].trim();
            if (feedMatch[2]) {
              currentCategory.id = parseInt(feedMatch[2], 10);
            }
          }

          // Pattern ???? "[RSS:AutoProcessor]   URL: ..."
          const urlLineMatch = line.match(/\[RSS:AutoProcessor\]\s+URL:\s*(https?:\/\/[^\s"')]+)/i);
          if (urlLineMatch && currentTimestamp && currentTimestamp > startTime) {
            const url = urlLineMatch[1];
            if (url && (url.includes('rss') || url.includes('feed') || url.includes('feeds'))) {
              const existing = rssFeeds.get(url);
              if (!existing) {
                rssFeeds.set(url, {
                  url,
                  categoryName: currentCategory.name || categoryMap.get(currentCategory.id || 0),
                  categoryId: currentCategory.id,
                  feedName: currentCategory.name || url,
                  timestamp: new Date(currentTimestamp).toISOString(),
                  lastSeen: new Date(currentTimestamp).toISOString(),
                });
              } else if (!existing.lastSeen || currentTimestamp > new Date(existing.lastSeen).getTime()) {
                existing.lastSeen = new Date(currentTimestamp).toISOString();
              }
              currentCategory = {};
            }
          }

          // Pattern ???? JSON logs: "url":"..." with timestamp
          if (currentTimestamp && currentTimestamp > startTime) {
            const jsonUrlMatch = line.match(/"url"\s*:\s*"(https?:\/\/[^"]+(?:rss|feed|feeds)[^"]*)"/i);
            if (jsonUrlMatch) {
              const url = jsonUrlMatch[1];
              if (url && !rssFeeds.has(url)) {
                rssFeeds.set(url, {
                  url,
                  timestamp: new Date(currentTimestamp).toISOString(),
                  lastSeen: new Date(currentTimestamp).toISOString(),
                });
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error reading log file:', error);
      }
    }

    // ?????? ?? database (RSSSource table)
    try {
      const sources = await prisma.rSSSource.findMany({
        where: { is_active: true },
        include: {
          category: {
            include: {
              translations: {
                where: { lang: 'FA' }
              }
            }
          }
        }
      });

      sources.forEach(source => {
        const categoryName = source.category?.translations?.[0]?.name;
        const existing = rssFeeds.get(source.rss_url);

        if (!existing) {
          rssFeeds.set(source.rss_url, {
            url: source.rss_url,
            categoryName: categoryName,
            categoryId: source.category_id,
            feedName: categoryName || source.rss_url,
          });
        } else {
          // Update existing info if missing
          if (!existing.categoryName && categoryName) {
            existing.categoryName = categoryName;
            existing.categoryId = source.category_id;
          }
        }
      });

    } catch (error: any) {
      console.error('Error reading RSSSource table:', error);
    }

    // ????????? ?? ???? timestamp (???????? ???)
    const feedsArray = Array.from(rssFeeds.values()).sort((a, b) => {
      if (a.lastSeen && b.lastSeen) {
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      }
      if (a.lastSeen) return -1;
      if (b.lastSeen) return 1;
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (a.timestamp) return -1;
      if (b.timestamp) return 1;
      if (a.categoryName && b.categoryName) {
        return a.categoryName.localeCompare(b.categoryName);
      }
      return a.url.localeCompare(b.url);
    });

    return NextResponse.json({
      success: true,
      time_range: {
        from: new Date(startTime).toISOString(),
        to: new Date().toISOString(),
        minutes,
      },
      total_feeds: feedsArray.length,
      feeds: feedsArray,
    });
  } catch (error: any) {
    console.error('Error fetching recent RSS feeds:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
