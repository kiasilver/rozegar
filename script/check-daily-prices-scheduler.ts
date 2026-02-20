/**
 * اسکریپت بررسی وضعیت Daily Prices Scheduler
 * این اسکریپت وضعیت scheduler را بررسی می‌کند
 */

import { prisma } from '../src/lib/prisma';
import { getSchedulerStatus, getIranTime } from '../src/lib/telegram/daily-prices-scheduler';

async function checkSchedulerStatus() {
  console.log('='.repeat(60));
  console.log('🔍 بررسی وضعیت Daily Prices Scheduler');
  console.log('='.repeat(60));
  console.log('');

  // بررسی وضعیت scheduler
  const schedulerStatus = getSchedulerStatus();
  const iranTime = getIranTime();

  console.log('📅 زمان فعلی ایران:', iranTime);
  console.log('');

  // بررسی وضعیت اجرا
  console.log('⚙️  وضعیت Scheduler:');
  console.log(`   - در حال اجرا: ${schedulerStatus.isRunning ? '✅ بله' : '❌ خیر'}`);
  console.log(`   - آخرین دقیقه چک شده: ${schedulerStatus.lastCheckMinute >= 0 ? schedulerStatus.lastCheckMinute : 'هنوز چک نشده'}`);
  console.log('');

  // بررسی تنظیمات
  try {
    const settings = await prisma.telegramSettings.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (!settings) {
      console.log('❌ هیچ تنظیمات تلگرامی یافت نشد!');
      console.log('');
      await prisma.$disconnect();
      return;
    }

    console.log('⚙️  تنظیمات تلگرام:');
    console.log(`   - فعال است: ${settings.is_active ? '✅ بله' : '❌ خیر'}`);
    console.log(`   - Bot Token: ${settings.bot_token ? '✅ تنظیم شده' : '❌ تنظیم نشده'}`);
    console.log(`   - Channel ID: ${settings.channel_id ? '✅ تنظیم شده' : '❌ تنظیم نشده'}`);
    console.log('');

    // بررسی تنظیمات daily prices
    const dailyPricesAutoSend = (settings as any).daily_prices_auto_send || false;
    let dailyPricesSchedule: number[] = [];

    if ((settings as any).daily_prices_schedule) {
      try {
        const schedule = typeof (settings as any).daily_prices_schedule === 'string'
          ? JSON.parse((settings as any).daily_prices_schedule)
          : (settings as any).daily_prices_schedule;
        if (Array.isArray(schedule)) {
          dailyPricesSchedule = schedule;
        }
      } catch (e) {
        console.error('❌ خطا در parse کردن schedule:', e);
      }
    }

    console.log('💰 تنظیمات قیمت روز:');
    console.log(`   - ارسال خودکار فعال: ${dailyPricesAutoSend ? '✅ بله' : '❌ خیر'}`);
    console.log(`   - ساعات ارسال: ${dailyPricesSchedule.length > 0 ? dailyPricesSchedule.map(h => `${String(h).padStart(2, '0')}:00`).join(', ') : '❌ تنظیم نشده'}`);
    console.log('');

    // محاسبه زمان فعلی
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    console.log('⏰ زمان فعلی ایران:');
    console.log(`   - ساعت: ${currentHour}`);
    console.log(`   - دقیقه: ${currentMinute}`);
    console.log('');

    // بررسی اینکه آیا scheduler باید فعال باشد
    const shouldBeRunning = settings.is_active && dailyPricesAutoSend && dailyPricesSchedule.length > 0;
    
    console.log('📊 خلاصه وضعیت:');
    console.log(`   - Scheduler باید فعال باشد: ${shouldBeRunning ? '✅ بله' : '❌ خیر'}`);
    console.log(`   - Scheduler در حال اجرا است: ${schedulerStatus.isRunning ? '✅ بله' : '❌ خیر'}`);
    console.log('');

    if (shouldBeRunning && !schedulerStatus.isRunning) {
      console.log('⚠️  هشدار: Scheduler باید فعال باشد اما در حال اجرا نیست!');
      console.log('');
      console.log('💡 راه حل:');
      console.log('   1. بررسی کنید که آیا در development mode هستید (NODE_ENV=development)');
      console.log('   2. اگر در development mode هستید، scheduler به صورت خودکار غیرفعال است');
      console.log('   3. برای فعال کردن، از production mode استفاده کنید یا instrumentation.ts را تغییر دهید');
      console.log('');
    } else if (!shouldBeRunning && schedulerStatus.isRunning) {
      console.log('⚠️  هشدار: Scheduler در حال اجرا است اما نباید فعال باشد!');
      console.log('');
    } else if (shouldBeRunning && schedulerStatus.isRunning) {
      console.log('✅ همه چیز درست است! Scheduler فعال و در حال اجرا است.');
      console.log('');

      // بررسی اینکه آیا ساعت فعلی در schedule است
      if (dailyPricesSchedule.includes(currentHour) && currentMinute === 0) {
        console.log('⏰ الان زمان ارسال است! (در دقیقه 0)');
      } else if (dailyPricesSchedule.includes(currentHour)) {
        console.log(`⏰ الان ساعت ${currentHour} است که در schedule است، اما دقیقه ${currentMinute} است (باید 0 باشد)`);
      } else {
        // پیدا کردن ساعت بعدی
        const sortedSchedule = [...dailyPricesSchedule].sort((a, b) => a - b);
        const nextHour = sortedSchedule.find(h => h > currentHour) || sortedSchedule[0];
        if (nextHour > currentHour) {
          console.log(`⏰ ارسال بعدی: امروز ${String(nextHour).padStart(2, '0')}:00`);
        } else {
          console.log(`⏰ ارسال بعدی: فردا ${String(nextHour).padStart(2, '0')}:00`);
        }
      }
    } else {
      console.log('ℹ️  Scheduler غیرفعال است (طبق تنظیمات).');
    }

    // بررسی NODE_ENV
    console.log('');
    console.log('🔧 تنظیمات محیط:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   - NEXT_RUNTIME: ${process.env.NEXT_RUNTIME || 'undefined'}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('');
      console.log('⚠️  توجه: شما در development mode هستید!');
      console.log('   Scheduler به صورت خودکار در development mode غیرفعال است.');
      console.log('   برای فعال کردن scheduler، از production mode استفاده کنید.');
    }

  } catch (error: any) {
    console.error('❌ خطا در بررسی تنظیمات:', error.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log('='.repeat(60));
}

// اجرای اسکریپت
checkSchedulerStatus().catch(console.error);
