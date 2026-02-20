/**
 * GET: ?????? ???? ?????? ????? ??? ????? ? ????? ??????
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';
import { getTodayStartIran } from '@/lib/automation/telegram/rss-date-utils';

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * GET: ?????? ???? ?????? ????? ??? ?????
 */
export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ?????? ???? ??? ????? ?? ???? ?????
    const todayStart = getTodayStartIran();
    const now = new Date();

    // ????? ?? ?????? ????? ??? ????? (telegram_status='success')
    const totalSentToday = await prisma.unifiedRSSLog.count({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        processed_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // ????? ?????? RSS (rss_source_url ????? ??? ? blog_id ????? ???)
    const rssSentToday = await prisma.unifiedRSSLog.count({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        rss_source_url: { not: null },
        processed_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // ????? ?????? manual (website_blog_id ???? ? rss_source_url ????? ? error ???? DAILY_PRICES ????)
    const manualSentToday = await prisma.unifiedRSSLog.count({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null },
        rss_source_url: null,
        processed_at: {
          gte: todayStart,
          lte: now,
        },
        NOT: {
          telegram_error: 'DAILY_PRICES_AUTO',
        },
      },
    });

    // ????? ???????? ??? (telegram_error='DAILY_PRICES_AUTO')
    const dailyPricesSentToday = await prisma.unifiedRSSLog.count({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        telegram_error: 'DAILY_PRICES_AUTO',
        processed_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // ????? ?????
    const errorsToday = await prisma.unifiedRSSLog.count({
      where: {
        telegram_status: 'error',
        processed_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // ?????? ??????? ????? ???? ?????? ????? ??????
    const logsToday = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        processed_at: {
          gte: todayStart,
          lte: now,
        },
      },
      select: {
        id: true,
        processed_at: true,
        telegram_error: true,
        website_blog_id: true,
        rss_source_url: true,
      },
      orderBy: {
        processed_at: 'desc',
      },
    });

    // ?????? ????? ??????
    // ???: ?? ??? RSS ???? $0.10-0.15 ????? ???? (Agent summarization)
    // ?? ??? manual ???? $0.05-0.10 ????? ????
    // ?? ???? ??? ???? $0.01 ????? ???? (???? Agent)
    const estimatedCostPerRSS = 0.12; // ??????? $0.12 ???? ?? ??? RSS
    const estimatedCostPerManual = 0.07; // ??????? $0.07 ???? ?? ??? manual
    const estimatedCostPerDailyPrice = 0.01; // $0.01 ???? ?? ???? ???

    const estimatedCost = 
      (rssSentToday * estimatedCostPerRSS) +
      (manualSentToday * estimatedCostPerManual) +
      (dailyPricesSentToday * estimatedCostPerDailyPrice);

    // ????????? ?? ???? ????
    const hourlyStats: Record<number, number> = {};
    logsToday.forEach(log => {
      if (log.processed_at) {
        const hour = new Date(log.processed_at).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      }
    });

    // ????? ??? ????? ???
    const lastSent = logsToday.length > 0 ? logsToday[0] : null;

    return NextResponse.json({
      success: true,
      stats: {
        total: totalSentToday,
        rss: rssSentToday,
        manual: manualSentToday,
        dailyPrices: dailyPricesSentToday,
        errors: errorsToday,
        estimatedCost: {
          total: estimatedCost,
          rss: rssSentToday * estimatedCostPerRSS,
          manual: manualSentToday * estimatedCostPerManual,
          dailyPrices: dailyPricesSentToday * estimatedCostPerDailyPrice,
          perRSS: estimatedCostPerRSS,
          perManual: estimatedCostPerManual,
          perDailyPrice: estimatedCostPerDailyPrice,
        },
        hourlyStats,
        lastSent: lastSent ? {
          id: lastSent.id,
          sent_at: lastSent.processed_at,
          type: lastSent.telegram_error === 'DAILY_PRICES_AUTO' 
            ? 'daily_prices' 
            : (lastSent.rss_source_url ? 'rss' : 'manual'),
        } : null,
        todayStart: todayStart.toISOString(),
        now: now.toISOString(),
      },
      message: `????? ${totalSentToday} ??? ????? ??? (${rssSentToday} RSS? ${manualSentToday} ????? ${dailyPricesSentToday} ???? ???). ????? ??????: $${estimatedCost.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error('[Telegram Today Stats] Error:', error);
    return NextResponse.json(
      {
        error: error.message || '??? ?? ?????? ????',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

