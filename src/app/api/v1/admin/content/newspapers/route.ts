/**
 * API ???? ?????? ??????? ??????? ?????? ???
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/core/prisma';
import { jwtVerify } from 'jose';

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * GET: ?????? ??????? ???????
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyJWT(token);

    // ?????? ???????
    const enabledSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_rss_enabled' },
    });

    const urlSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_rss_url' },
    });

    const downloadTimeSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_download_time' },
    });

    const archiveDaysSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_archive_days' },
    });

    return NextResponse.json({
      enabled: enabledSetting?.value === 'true',
      rssUrl: urlSetting?.value || 'https://www.pishkhan.com',
      downloadTime: downloadTimeSetting?.value || '07:30',
      archiveDays: archiveDaysSetting?.value ? parseInt(archiveDaysSetting.value) : 15,
    });
  } catch (error: any) {
    console.error('Error fetching newspaper settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: ??????????? ??????? ???????
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyJWT(token);

    const body = await req.json();
    const { enabled, rssUrl, downloadTime, archiveDays } = body;

    console.log('?? ?????? ??????? ???? ?????:', { enabled, rssUrl, downloadTime, archiveDays });

    // ??????????? ?? ????? ???????
    if (typeof enabled === 'boolean') {
      const enabledValue = enabled ? 'true' : 'false';
      await prisma.siteSetting.upsert({
        where: { key: 'newspaper_rss_enabled' },
        update: { value: enabledValue },
        create: {
          key: 'newspaper_rss_enabled',
          value: enabledValue,
          group_name: 'newspaper',
        },
      });
      console.log('? enabled ????? ??:', enabledValue);
    }

    if (rssUrl && typeof rssUrl === 'string') {
      const saved = await prisma.siteSetting.upsert({
        where: { key: 'newspaper_rss_url' },
        update: { value: rssUrl },
        create: {
          key: 'newspaper_rss_url',
          value: rssUrl,
          group_name: 'newspaper',
        },
      });
      console.log('? rssUrl ????? ??:', saved.value);
    }

    if (downloadTime && typeof downloadTime === 'string') {
      // ????? ???? ???? (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timeRegex.test(downloadTime)) {
        await prisma.siteSetting.upsert({
          where: { key: 'newspaper_download_time' },
          update: { value: downloadTime },
          create: {
            key: 'newspaper_download_time',
            value: downloadTime,
            group_name: 'newspaper',
          },
        });
        console.log('? downloadTime ????? ??:', downloadTime);
      } else {
        console.warn('?? ???? ???? ???????:', downloadTime);
      }
    }

    if (archiveDays !== undefined && typeof archiveDays === 'number' && archiveDays > 0) {
      await prisma.siteSetting.upsert({
        where: { key: 'newspaper_archive_days' },
        update: { value: archiveDays.toString() },
        create: {
          key: 'newspaper_archive_days',
          value: archiveDays.toString(),
          group_name: 'newspaper',
        },
      });
      console.log('? archiveDays ????? ??:', archiveDays);
    }

    return NextResponse.json({
      success: true,
      message: '??????? ?? ?????? ??????????? ??',
    });
  } catch (error: any) {
    console.error('Error updating newspaper settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

