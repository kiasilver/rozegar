/**
 * Unified RSS Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get settings from UnifiedRSSSettings table
    let settings = await prisma.unifiedRSSSettings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.unifiedRSSSettings.create({
        data: {
          is_active: false,
          site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rozegar.com',
          send_interval: 30,
          telegram_enabled: false,
          telegram_auto_start: false,
          telegram_language: 'fa',
          telegram_content_length: 'short',
          telegram_tone: 'reporter',
          website_enabled: false,
          website_auto_start: false,
          website_language: 'fa',
          website_content_length: 'medium',
          website_tone: 'reporter_analytical',
          check_interval: 30, // Default 30 mins
          publish_interval: 30, // Default 30 secs
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('[RSS Settings] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'خطا در دریافت تنظیمات' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Get existing settings or create new
    let settings = await prisma.unifiedRSSSettings.findFirst();
    const oldIsActive = settings?.is_active;

    if (settings) {
      // Update existing
      settings = await prisma.unifiedRSSSettings.update({
        where: { id: settings.id },
        data: body,
      });
    } else {
      // Create new
      settings = await prisma.unifiedRSSSettings.create({
        data: body,
      });
    }

    // Restart scheduler if is_active changed or other critical settings changed
    if (oldIsActive !== settings.is_active || 
        body.check_interval !== undefined || 
        body.publish_interval !== undefined) {
      try {
        const { restartUnifiedRSSScheduler } = await import('@/lib/automation/undefined-rss/unified-rss-scheduler');
        await restartUnifiedRSSScheduler();
        console.log('[RSS Settings] Scheduler restarted after settings update');
      } catch (schedulerError: any) {
        console.error('[RSS Settings] Error restarting scheduler:', schedulerError.message);
        // Don't fail the request if scheduler restart fails
      }
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('[RSS Settings] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'خطا در ذخیره تنظیمات' },
      { status: 500 }
    );
  }
}
