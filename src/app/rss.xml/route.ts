import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'سایت خبری';

    // Get latest published articles
    const blogs = await prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        is_active: true,
        published_at: { not: null },
      },
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
      orderBy: { published_at: 'desc' },
      take: 50,
    });

    const items = blogs
      .filter((blog) => blog.translations[0])
      .map((blog) => {
        const translation = blog.translations[0]!;
        const pubDate = blog.published_at || blog.created_at;
        
        return `
    <item>
      <title><![CDATA[${translation.title}]]></title>
      <link>${baseUrl}/news/${translation.slug}</link>
      <guid>${baseUrl}/news/${translation.slug}</guid>
      <description><![CDATA[${translation.excerpt || translation.title}]]></description>
      <pubDate>${pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString()}</pubDate>
      <author>${blog.User?.name || 'ناشناس'}</author>
    </item>`;
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${siteName}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[آخرین اخبار و مقالات]]></description>
    <language>fa-IR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Next.js CMS</generator>
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

