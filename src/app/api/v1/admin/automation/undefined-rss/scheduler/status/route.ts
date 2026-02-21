/**
 * API endpoint to check RSS Scheduler status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.unifiedRSSSettings.findFirst();
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        isActive: false,
        status: 'No settings found',
        message: 'تنظیمات یافت نشد'
      });
    }

    return NextResponse.json({
      success: true,
      isActive: settings.is_active || false,
      status: settings.status_message || 'Unknown',
      lastCheckAt: settings.last_check_at,
      checkInterval: settings.check_interval || 30,
      publishInterval: settings.publish_interval || 30,
      message: settings.is_active 
        ? `در حال اجرا - هر ${settings.check_interval || 30} دقیقه یک بار بررسی می‌کند`
        : 'غیرفعال'
    });
  } catch (error: any) {
    console.error('[RSS Scheduler Status] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'خطا در دریافت وضعیت scheduler' },
      { status: 500 }
    );
  }
}


