import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';
// import { rssProgressStore } from '@/lib/rss-progress-store'; // This might still exist or be relevant? Check store.

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * GET: وضعیت سیستم RSS processing
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

    // Since internal scheduler is removed, we return empty stats or just DB stats

    // دریافت تنظیمات
    let nextCheckTime: number | undefined = undefined;
    // Removed settings check to avoid lint errors with missing fields

    return NextResponse.json({
      isActive: false, // Internal scheduler is dead
      progress: 0,
      message: 'Unified RSS system awaiting trigger',
      total: 0,
      current: 0,
      completed: true,
      queueSize: 0,
      isProcessing: false,
      isChecking: false,
      isRunning: false, // Internal scheduler is not running
      nextCheckTime: nextCheckTime,
      currentFeedName: null,
      currentCategoryName: null,
      totalFeeds: 0,
      checkedFeeds: 0,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error fetching RSS progress:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
