/**
 * Design Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = null;
    try {
      settings = await prisma.siteSetting.findFirst({
        where: { key: 'design_settings' },
      });
    } catch {
      // Table might not exist
    }

    const defaultSettings = {
      theme: 'light',
      primary_color: '#3b82f6',
      secondary_color: '#10b981',
      font_family: 'IRANSans',
      header_style: 'default',
      footer_style: 'default',
    };

    if (settings?.value) {
      try {
        const parsed = JSON.parse(settings.value);
        return NextResponse.json({ success: true, data: { ...defaultSettings, ...parsed } });
      } catch { }
    }

    return NextResponse.json({ success: true, data: defaultSettings });
  } catch (error: any) {
    console.error('[Design Settings] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    try {
      await prisma.siteSetting.upsert({
        where: { key: 'design_settings' },
        update: { value: JSON.stringify(body) },
        create: { key: 'design_settings', value: JSON.stringify(body) },
      });
    } catch (dbError: any) {
      console.warn('[Design Settings] Could not save to DB:', dbError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
