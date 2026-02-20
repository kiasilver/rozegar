import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '???? ????';

    // ?????? ????? ????? ??? ?? ??????
    const telegramLogs = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null },
      },
      include: {
        blog: {
          include: {
            translations: {
              where: { lang: 'FA' },
              select: {
                title: true,
                slug: true,
                excerpt: true,
              },
            },
            User: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { processed_at: 'desc' },
      take: 50,
    });

    const items = telegramLogs
      .filter((log) => log.blog && log.blog.translations[0])
      .map((log) => {
        const blog = log.blog!;
        const translation = blog.translations[0]!;
        const pubDate = blog.published_at || blog.created_at || log.processed_at;
        
        // ???? URL ???
        const imageUrl = blog.image.startsWith('http')
          ? blog.image
          : `${baseUrl}${blog.image}`;
        
        return `
    <item>
      <title><![CDATA[${translation.title}]]></title>
      <link>${baseUrl}/news/${translation.slug}</link>
      <guid>${baseUrl}/news/${translation.slug}</guid>
      <description><![CDATA[${translation.excerpt || translation.title}]]></description>
      <pubDate>${pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString()}</pubDate>
      <author>${blog.User?.name || '??????'}</author>
      ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg" />` : ''}
      ${blog.source_url ? `<source url="${blog.source_url}" />` : ''}
    </item>`;
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><![CDATA[${siteName} - ????? ??????]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[????? ????? ??? ?? ????? ??????]]></description>
    <language>fa-IR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Next.js Telegram RSS</generator>
${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('RSS generation error:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}

