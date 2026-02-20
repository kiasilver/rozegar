/**
 * General Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = null;
    try {
      settings = await prisma.siteSetting.findFirst({
        where: { key: 'general_settings' },
      });
    } catch {
      // Table might not exist
    }

    const defaultSettings = {
      site_name: 'روزگار',
      site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rozegar.com',
      site_description: 'سایت خبری روزگار',
      contact_email: 'info@rozegar.com',
      logo: '/images/logo.png',
      favicon: '/favicon.ico',
    };

    if (settings?.value) {
      try {
        const parsed = JSON.parse(settings.value);
        return NextResponse.json({ success: true, data: { ...defaultSettings, ...parsed } });
      } catch { }
    }

    return NextResponse.json({ success: true, data: defaultSettings });
  } catch (error: any) {
    console.error('[General Settings] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    try {
      await prisma.siteSetting.upsert({
        where: { key: 'general_settings' },
        update: { value: JSON.stringify(body) },
        create: { key: 'general_settings', value: JSON.stringify(body) },
      });
    } catch (dbError: any) {
      console.warn('[General Settings] Could not save to DB:', dbError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
