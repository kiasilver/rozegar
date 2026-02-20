/**
 * API endpoint to restart RSS Scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { restartUnifiedRSSScheduler } from '@/lib/automation/undefined-rss/unified-rss-scheduler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await restartUnifiedRSSScheduler();
    return NextResponse.json({ 
      success: true, 
      message: 'Scheduler restarted successfully' 
    });
  } catch (error: any) {
    console.error('[RSS Scheduler] Error restarting:', error.message);
    return NextResponse.json(
      { success: false, error: 'خطا در restart کردن scheduler' },
      { status: 500 }
    );
  }
}



