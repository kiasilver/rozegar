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
    const target = searchParams.get('target'); // 'telegram', 'website', 'both', 'all'
    const status = searchParams.get('status'); // 'success', 'failed', 'all'
    const skip = (page - 1) * limit;

    // Try to fetch logs - handle case where table may not exist
    let logs: any[] = [];
    let total = 0;

    try {
      const where: any = {};
      
      // Filter by target
      if (target && target !== 'all') {
        where.target = target;
      }
      
      // Filter by status
      if (status && status !== 'all') {
        if (status === 'success') {
          where.OR = [
            { telegram_sent: true },
            { website_sent: true },
          ];
        } else if (status === 'failed') {
          where.AND = [
            { telegram_sent: false },
            { website_sent: false },
          ];
        }
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
            telegram_message_id: true,
            website_sent: true,
            website_status: true,
            website_error: true,
            website_blog_id: true,
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
    const body = await req.json().catch(() => ({}));
    const ids = body.ids;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete multiple logs by IDs
      await prisma.unifiedRSSLog.deleteMany({
        where: {
          id: { in: ids.map((id: any) => parseInt(id)) },
        },
      });
    } else {
      // If no IDs provided, don't delete anything
      return NextResponse.json({ 
        success: false, 
        error: 'شناسه‌های لاگ مشخص نشده است' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[RSS Logs] Delete error:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'خطا در حذف لاگ‌ها' 
    }, { status: 500 });
  }
}
