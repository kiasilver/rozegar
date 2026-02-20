/**
 * API endpoint ???? ?????? ??????? ????? ?????? PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';

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
 * GET: ?????? ??????? ????? ??????
 */
export async function GET(req: NextRequest) {
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

    // ?????? ??????? ????? ??????
    const lastDownloadDate = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_last_download_date' },
    });

    const lastDownloadTime = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_last_download_time' },
    });

    return NextResponse.json({
      success: true,
      lastDownloadDate: lastDownloadDate?.value || null,
      lastDownloadTime: lastDownloadTime?.value || null,
    });
  } catch (error: any) {
    console.error('? ??? ?? ?????? ??????? ????? ??????:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '??? ?? ?????? ???????',
      },
      { status: 500 }
    );
  }
}

