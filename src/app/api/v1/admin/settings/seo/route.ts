/**
 * SEO Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = null;
    try {
      settings = await prisma.siteSetting.findFirst({
        where: { key: 'seo_settings' },
      });
    } catch {
      // Table might not exist
    }

    const defaultSettings = {
      meta_title: 'روزگار - سایت خبری',
      meta_description: 'آخرین اخبار روز ایران و جهان',
      meta_keywords: 'خبر, اخبار, روزگار, ایران',
      robots: 'index, follow',
      google_analytics: '',
      google_tag_manager: '',
    };

    if (settings?.value) {
      try {
        const parsed = JSON.parse(settings.value);
        return NextResponse.json({ success: true, data: { ...defaultSettings, ...parsed } });
      } catch { }
    }

    return NextResponse.json({ success: true, data: defaultSettings });
  } catch (error: any) {
    console.error('[SEO Settings] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    try {
      await prisma.siteSetting.upsert({
        where: { key: 'seo_settings' },
        update: { value: JSON.stringify(body) },
        create: { key: 'seo_settings', value: JSON.stringify(body) },
      });
    } catch (dbError: any) {
      console.warn('[SEO Settings] Could not save to DB:', dbError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
