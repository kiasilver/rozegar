/**
 * Cleanup job برای حذف رکوردهای قدیمی LoginAttempt
 * این job باید روزانه اجرا شود تا جدول LoginAttempt خیلی بزرگ نشود
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: Request) {
  try {
    // بررسی authorization header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // حذف رکوردهای قدیمی‌تر از 30 روز که blocked نیستند
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // حذف رکوردهای blocked که blocked_until گذشته است
    const deletedBlocked = await prisma.loginAttempt.deleteMany({
      where: {
        blocked: true,
        blocked_until: {
          lt: now,
        },
      },
    });

    // حذف رکوردهای قدیمی که blocked نیستند
    const deletedOld = await prisma.loginAttempt.deleteMany({
      where: {
        blocked: false,
        created_at: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        blocked: deletedBlocked.count,
        old: deletedOld.count,
        total: deletedBlocked.count + deletedOld.count,
      },
      message: `Deleted ${deletedBlocked.count + deletedOld.count} old login attempt records`,
    });
  } catch (error: any) {
    console.error('❌ [CLEANUP] Error cleaning up login attempts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}


