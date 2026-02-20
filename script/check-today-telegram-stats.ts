/**
 * Script برای بررسی آمار خبرهای ارسال شده امروز
 * اجرا: npx tsx script/check-today-telegram-stats.ts
 */

import { prisma } from '../src/lib/prisma';
import { getTodayStartIran } from '../src/lib/telegram/rss-date-utils';

async function checkTodayStats() {
  try {
    const todayStart = getTodayStartIran();
    const now = new Date();

    console.log('\n📊 آمار خبرهای ارسال شده امروز');
    console.log('='.repeat(60));
    console.log(`از: ${todayStart.toISOString()}`);
    console.log(`تا: ${now.toISOString()}`);
    console.log('='.repeat(60));

    // شمارش کل خبرهای ارسال شده امروز
    const totalSentToday = await prisma.telegramLog.count({
      where: {
        status: 'success',
        sent_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // شمارش خبرهای RSS
    const rssSentToday = await prisma.telegramLog.count({
      where: {
        status: 'success',
        sent_at: {
          gte: todayStart,
          lte: now,
        },
        OR: [
          {
            error_message: {
              startsWith: 'RSS_TITLE:',
            },
          },
          {
            error_message: {
              startsWith: 'RSS_URL:',
            },
          },
        ],
      },
    });

    // شمارش خبرهای manual
    const manualSentToday = await prisma.telegramLog.count({
      where: {
        status: 'success',
        blog_id: { not: null },
        sent_at: {
          gte: todayStart,
          lte: now,
        },
        NOT: {
          OR: [
            {
              error_message: {
                startsWith: 'RSS_TITLE:',
              },
            },
            {
              error_message: {
                startsWith: 'RSS_URL:',
              },
            },
            {
              error_message: 'DAILY_PRICES_AUTO',
            },
          ],
        },
      },
    });

    // شمارش قیمت‌های روز
    const dailyPricesSentToday = await prisma.telegramLog.count({
      where: {
        status: 'success',
        error_message: 'DAILY_PRICES_AUTO',
        sent_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // شمارش خطاها
    const errorsToday = await prisma.telegramLog.count({
      where: {
        status: 'error',
        sent_at: {
          gte: todayStart,
          lte: now,
        },
      },
    });

    // محاسبه هزینه تقریبی
    const estimatedCostPerRSS = 0.12; // $0.12 برای هر خبر RSS
    const estimatedCostPerManual = 0.07; // $0.07 برای هر خبر manual
    const estimatedCostPerDailyPrice = 0.01; // $0.01 برای هر قیمت روز

    const estimatedCost = 
      (rssSentToday * estimatedCostPerRSS) +
      (manualSentToday * estimatedCostPerManual) +
      (dailyPricesSentToday * estimatedCostPerDailyPrice);

    console.log('\n📈 خلاصه آمار:');
    console.log(`   کل خبرهای ارسال شده: ${totalSentToday}`);
    console.log(`   - RSS Auto: ${rssSentToday}`);
    console.log(`   - Manual: ${manualSentToday}`);
    console.log(`   - قیمت روز: ${dailyPricesSentToday}`);
    console.log(`   - خطاها: ${errorsToday}`);

    console.log('\n💰 هزینه تقریبی:');
    console.log(`   RSS Auto: $${(rssSentToday * estimatedCostPerRSS).toFixed(2)} (${rssSentToday} × $${estimatedCostPerRSS})`);
    console.log(`   Manual: $${(manualSentToday * estimatedCostPerManual).toFixed(2)} (${manualSentToday} × $${estimatedCostPerManual})`);
    console.log(`   قیمت روز: $${(dailyPricesSentToday * estimatedCostPerDailyPrice).toFixed(2)} (${dailyPricesSentToday} × $${estimatedCostPerDailyPrice})`);
    console.log(`   ─────────────────────────`);
    console.log(`   کل هزینه: $${estimatedCost.toFixed(2)}`);

    // گروه‌بندی بر اساس ساعت
    const logsToday = await prisma.telegramLog.findMany({
      where: {
        status: 'success',
        sent_at: {
          gte: todayStart,
          lte: now,
        },
      },
      select: {
        sent_at: true,
        error_message: true,
      },
      orderBy: {
        sent_at: 'asc',
      },
    });

    const hourlyStats: Record<number, number> = {};
    logsToday.forEach(log => {
      const hour = new Date(log.sent_at).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    console.log('\n⏰ توزیع بر اساس ساعت:');
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyStats[hour]) {
        console.log(`   ${String(hour).padStart(2, '0')}:00 - ${hourlyStats[hour]} خبر`);
      }
    }

    // آخرین خبر ارسال شده
    const lastSent = logsToday.length > 0 ? logsToday[logsToday.length - 1] : null;
    if (lastSent) {
      console.log('\n🕐 آخرین خبر ارسال شده:');
      console.log(`   زمان: ${new Date(lastSent.sent_at).toISOString()}`);
      console.log(`   نوع: ${lastSent.error_message === 'DAILY_PRICES_AUTO' ? 'قیمت روز' : (lastSent.error_message?.startsWith('RSS_') ? 'RSS' : 'Manual')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ بررسی کامل شد\n');

  } catch (error: any) {
    console.error('❌ خطا:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkTodayStats();

