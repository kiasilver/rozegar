/**
 * Unified RSS Logs API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const type = searchParams.get('type'); // 'telegram', 'website', 'rss'
    const skip = (page - 1) * limit;

    // Try to fetch logs - handle case where table may not exist
    let logs: any[] = [];
    let total = 0;

    try {
      const where: any = {};
      if (type === 'telegram') {
        where.telegram_sent = true;
      } else if (type === 'website') {
        where.website_sent = true;
      }

      [logs, total] = await Promise.all([
        prisma.unifiedRSSLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            title: true,
            target: true,
            rss_source_url: true,
            original_url: true,
            category_id: true,
            telegram_sent: true,
            telegram_status: true,
            telegram_error: true,
            website_sent: true,
            website_status: true,
            website_error: true,
            website_slug: true,
            created_at: true,
            processed_at: true,
          },
        }),
        prisma.unifiedRSSLog.count({ where }),
      ]);
    } catch (dbError: any) {
      // Table might not exist - return empty
      console.warn('[RSS Logs] DB error:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[RSS Logs] Error:', error.message);
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      await prisma.unifiedRSSLog.delete({ where: { id: parseInt(id) } });
    } else {
      // Clear all logs
      await prisma.unifiedRSSLog.deleteMany({});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[RSS Logs] Delete error:', error.message);
    return NextResponse.json({ success: true }); // Don't fail on delete errors
  }
}
