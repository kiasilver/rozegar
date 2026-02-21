/**
 * API endpoint ???? ?????? ???? PDF ??????????
 * ??? endpoint ???? ?? JWT authentication ????
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';

// افزایش timeout برای این route (5 دقیقه)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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
 * POST: ?????? ?????? PDF ??????????
 */
export async function POST(req: NextRequest) {
  try {
    // ????? authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // ????? ??? ????? (???? Admin ?? Super Admin ????)
    if (payload.role !== 'Admin' && payload.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('?? ???? ?????? ?????? PDF ?????????? ???? ?????:', payload.userId);

    // ????? ???????
    const enabledSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_rss_enabled' },
    });

    if (enabledSetting?.value !== 'true') {
      return NextResponse.json({
        success: false,
        message: '?????????? ??????? ?????',
      });
    }

    // ????? ????? ????? ??????
    const lastDownloadSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_last_download_date' },
    });

    const today = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).format(today);

    // ?????? ???? ?????????? ?? forceDownload=true ???? ?????? PDF???
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';
    console.log('?? ?? ??? ?????? ???? ?????????? ?? forceDownload=true...');
    const response = await fetch(`${baseUrl}/api/v1/public/newspapers?forceDownload=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json({
        success: false,
        message: data.message || '??? ?? ?????? ??????????',
      });
    }

    // ????? ???????????? ?? PDF ?????
    const newspapersWithPDF = data.newspapers.filter((paper: any) => paper.pdfUrl);
    
    // ????? ????? ????? ??????
    await prisma.siteSetting.upsert({
      where: { key: 'newspaper_last_download_date' },
      update: { 
        value: persianDate,
        updated_at: new Date(),
      },
      create: {
        key: 'newspaper_last_download_date',
        value: persianDate,
        group_name: 'newspaper',
      },
    });

    // ????? ????? ???? ??????
    await prisma.siteSetting.upsert({
      where: { key: 'newspaper_last_download_time' },
      update: { 
        value: new Date().toISOString(),
        updated_at: new Date(),
      },
      create: {
        key: 'newspaper_last_download_time',
        value: new Date().toISOString(),
        group_name: 'newspaper',
      },
    });

    console.log(`? ${newspapersWithPDF.length} PDF ?? ?????? ?????? ????`);

    return NextResponse.json({
      success: true,
      message: "?????? PDF ?????????? ?? ?????? ????? ??",
      result: {
        totalNewspapers: data.count,
        newspapersWithPDF: newspapersWithPDF.length,
        date: persianDate,
        downloadedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('? ??? ?? ?????? PDF ??????????:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '??? ?? ?????? PDF ??????????',
      },
      { status: 500 }
    );
  }
}

