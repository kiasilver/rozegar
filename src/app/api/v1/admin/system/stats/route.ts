/**
 * Stats API - Admin Dashboard Statistics (REAL DATA ONLY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Unified RSS Log Stats (Telegram, Website, Errors)
    const [
      telegramSentCount,
      websiteSentCount,
      telegramErrors,
      websiteErrors,
      totalUnifiedLogs
    ] = await Promise.all([
      prisma.unifiedRSSLog.count({ where: { telegram_sent: true } }),
      prisma.unifiedRSSLog.count({ where: { website_sent: true } }),
      prisma.unifiedRSSLog.count({ where: { telegram_status: 'ERROR' } }),
      prisma.unifiedRSSLog.count({ where: { website_status: 'ERROR' } }),
      prisma.unifiedRSSLog.count(),
    ]);

    const totalErrors = telegramErrors + websiteErrors;

    // 2. Blog / Article Stats (Real)
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingReviews,
      viewStats
    ] = await Promise.all([
      prisma.blog.count(),
      prisma.blog.count({ where: { status: 'PUBLISHED' } }),
      prisma.blog.count({ where: { status: 'DRAFT' } }),
      prisma.blog.count({ where: { status: 'PENDING' } }),
      prisma.blog.aggregate({ _sum: { view_count: true } }),
    ]);

    const totalViews = viewStats._sum.view_count || 0;

    // 3. User Stats (Real)
    const [totalUsers, totalAuthors] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count({
        where: {
          role: { name: { in: ['Author', 'Admin', 'author', 'admin'] } }
        }
      }),
    ]);

    // 4. Comment Stats (Real)
    const [totalComments, pendingComments, approvedComments] = await Promise.all([
      prisma.blogComment.count(),
      prisma.blogComment.count({ where: { status: 'PENDING' } }),
      prisma.blogComment.count({ where: { status: 'APPROVED' } }),
    ]);

    // 5. Category Stats (Real)
    const totalCategories = await prisma.blogCategory.count();

    // 6. Media Stats (Real Size + Count Breakdown - DB + Disk Fallback)
    let totalMediaSize = 0;
    const mediaBreakdown = {
      image: 0,
      video: 0,
      document: 0,
      other: 0
    };
    const mediaCounts = {
      image: 0,
      video: 0,
      document: 0,
      other: 0
    };
    let totalMediaFilesCount = 0;

    try {
      // Try DB first
      const dbMediaCount = await prisma.mediaFile.count();

      if (dbMediaCount >= 5) {
        // Use DB data if substantial
        const mediaGroups = await prisma.mediaFile.groupBy({
          by: ['type'],
          _sum: { size: true },
          _count: { id: true },
        });

        mediaGroups.forEach(group => {
          const size = Number(group._sum.size || 0);
          const count = group._count.id || 0;
          totalMediaSize += size;
          totalMediaFilesCount += count;
          const mime = group.type?.toLowerCase() || '';

          if (mime.startsWith('image/') || mime === 'image') {
            mediaBreakdown.image += size;
            mediaCounts.image += count;
          } else if (mime.startsWith('video/') || mime === 'video') {
            mediaBreakdown.video += size;
            mediaCounts.video += count;
          } else if (mime === 'application/pdf' || mime.includes('document') || mime.includes('text') || mime === 'document') {
            mediaBreakdown.document += size;
            mediaCounts.document += count;
          } else {
            mediaBreakdown.other += size;
            mediaCounts.other += count;
          }
        });
      } else {
        // Fallback: Scan disk for real file counts
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
        const videoExts = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.m3u8'];
        const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

        function scanDir(dir: string) {
          try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = path.join(dir, item.name);
              if (item.isDirectory()) {
                scanDir(fullPath);
              } else {
                try {
                  const stat = fs.statSync(fullPath);
                  const ext = path.extname(item.name).toLowerCase();
                  const size = stat.size;
                  totalMediaSize += size;
                  totalMediaFilesCount++;

                  if (imageExts.includes(ext)) {
                    mediaBreakdown.image += size;
                    mediaCounts.image++;
                  } else if (videoExts.includes(ext)) {
                    mediaBreakdown.video += size;
                    mediaCounts.video++;
                  } else if (docExts.includes(ext)) {
                    mediaBreakdown.document += size;
                    mediaCounts.document++;
                  } else {
                    mediaBreakdown.other += size;
                    mediaCounts.other++;
                  }
                } catch (e) { /* skip unreadable files */ }
              }
            }
          } catch (e) { /* skip unreadable dirs */ }
        }

        if (fs.existsSync(uploadsDir)) {
          scanDir(uploadsDir);
        }
      }
    } catch (e) {
      console.error('Error fetching media stats:', e);
    }


    // 7. Recent Unified RSS Logs (Real Activity)
    const recentActivity = await prisma.unifiedRSSLog.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        created_at: true,
        telegram_status: true,
        website_status: true,
        target: true,
        rss_source_url: true
      }
    });

    const formattedRecentActivity = recentActivity.map(log => ({
      id: log.id,
      title: log.title,
      status: log.telegram_status === 'SENT' || log.website_status === 'PUBLISHED' ? 'PUBLISHED' : 'PENDING',
      created_at: log.created_at,
      category: log.target || 'General',
      author: 'System',
      image: null
    }));

    // 8. Category Report (Real - sorted by post count desc)
    let categoryReport: any[] = [];
    try {
      const categories = await prisma.blogCategory.findMany({
        where: { is_active: true },
        include: {
          translations: { where: { lang: 'FA' }, select: { name: true, slug: true } },
          blog: { select: { view_count: true, status: true } }
        },
      });
      categoryReport = categories.map(cat => ({
        id: cat.id,
        name: cat.translations[0]?.name || `Category ${cat.id}`,
        slug: cat.translations[0]?.slug || '',
        totalPosts: cat.blog.length,
        publishedPosts: cat.blog.filter((b: any) => b.status === 'PUBLISHED').length,
        totalViews: cat.blog.reduce((sum: number, b: any) => sum + (b.view_count || 0), 0)
      }))
        .filter(c => c.totalPosts > 0)
        .sort((a, b) => b.totalPosts - a.totalPosts)
        .slice(0, 10);
    } catch (e) {
      console.error('Error fetching category report:', e);
    }

    // 9. Online Users (Active Sessions in last 30 min)
    let totalOnlineUsers = 0;
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      totalOnlineUsers = await prisma.userSession.count({
        where: { created_at: { gte: thirtyMinAgo } }
      });
    } catch (e) { }

    const response = {
      // Key Stats
      totalViews,
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingReviews,
      totalUsers,
      totalAuthors,
      totalComments,
      pendingComments,
      approvedComments,
      totalCategories,
      totalOnlineUsers,

      // RSS Stats
      telegramSentCount,
      websiteSentCount,
      telegramErrorsCount: telegramErrors,
      websiteErrorsCount: websiteErrors,
      totalErrors,

      // Media
      totalMediaSize,
      mediaBreakdown,
      mediaCounts,
      totalMediaFiles: totalMediaFilesCount,

      // Recent
      recentBlogs: formattedRecentActivity,

      // Real Category Report
      categoryReport,

      // Analytics (Empty - no tracking system yet)
      charts: { weekly: [], monthly: [] },
      browsers: [],
      devices: [],
      heatmapData: [],
      visitorsByDevice: { current: [], lastMonth: [] },
      trends: null
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Stats API] Error:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

