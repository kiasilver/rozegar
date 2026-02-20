/**
 * Telegram Auto Start/Stop API
 * POST: Start/Stop Telegram auto processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // 'start' or 'stop'
    
    const settings = await prisma.unifiedRSSSettings.findFirst();
    
    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings not found' },
        { status: 404 }
      );
    }
    
    await prisma.unifiedRSSSettings.update({
      where: { id: settings.id },
      data: {
        telegram_auto_start: action === 'start',
        updated_at: new Date(),
      },
    });
    
    // TODO: Actually start/stop the scheduler
    // const { startRSSScheduler, stopRSSScheduler } = await import('@/lib/rss/rss-scheduler');
    // if (action === 'start') {
    //   await startRSSScheduler('telegram');
    // } else {
    //   await stopRSSScheduler('telegram');
    // }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
