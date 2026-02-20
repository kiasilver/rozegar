import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";
import { sendTelegramPhoto } from "@/lib/automation/telegram/telegram-bot";
import { fetchPricesFromDonyaEqtesad, formatPricesForTelegram } from "@/lib/automation/telegram/daily-prices";
// Force rebuild
import path from "path";
import fs from "fs/promises";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * بررسی اینکه آیا زمان فعلی در بازه زمانی مجاز برای ارسال پیام هست یا خیر
 * پیش‌فرض: همه ساعات روز (می‌توانید محدودیت اعمال کنید)
 */
function isWithinIranianTimeRange(): { allowed: boolean; currentTime: string; dateStr: string } {
  const now = new Date();
  // تبدیل به زمان تهران (UTC+3:30)
  const iranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));

  const hours = iranTime.getHours();
  const minutes = iranTime.getMinutes();
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // فرمت تاریخ شمسی/میلادی
  const dateStr = iranTime.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // شرط زمان (می‌توانید تغییر دهید)
  // مثلاً فقط بین ۸ صبح تا ۶ بعدازظهر:
  // const allowed = hours >= 8 && hours < 18;
  const allowed = true;

  return { allowed, currentTime: timeStr, dateStr };
}

/**
 * POST: ارسال قیمت‌های روز به تلگرام
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // بررسی زمان ارسال مجاز
    const timeCheck = isWithinIranianTimeRange();
    if (!timeCheck.allowed) {
      return NextResponse.json(
        { error: `ارسال پیام در این ساعت مجاز نیست. ساعت فعلی: ${timeCheck.currentTime}` },
        { status: 400 }
      );
    }

    // دریافت تنظیمات تلگرام
    const settings = await prisma.unifiedRSSSettings.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (!settings) {
      return NextResponse.json(
        { error: "تنظیمات تلگرام یافت نشد. ابتدا تنظیمات را ذخیره کنید." },
        { status: 400 }
      );
    }

    if (!settings.telegram_bot_token || !settings.telegram_channel_id) {
      return NextResponse.json(
        { error: "توکن ربات یا آیدی کانال تلگرام تنظیم نشده است." },
        { status: 400 }
      );
    }

    // Duplicate prevention: Check if prices were sent in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPriceLog = await prisma.unifiedRSSLog.findFirst({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        telegram_error: 'DAILY_PRICES',
        processed_at: { gte: fiveMinutesAgo },
      },
      orderBy: { processed_at: 'desc' },
    });

    if (recentPriceLog && recentPriceLog.processed_at) {
      const timeSinceLastSend = Date.now() - new Date(recentPriceLog.processed_at).getTime();
      const minutesAgo = Math.round(timeSinceLastSend / 60000);
      return NextResponse.json(
        { error: `قیمت‌های روز ${minutesAgo} دقیقه پیش ارسال شده است. لطفاً حداقل ۵ دقیقه صبر کنید.` },
        { status: 429 }
      );
    }

    console.log('🔄 [Daily Prices] آغاز عملیات دریافت قیمت‌ها از donya-e-eqtesad.com (بدون cache)...');

    // عملیات دریافت با تلاش مجدد - در retry ها، تاخیر هم اعمال می‌کنیم
    let prices: any[] = [];
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`🔄 [Daily Prices] Retry ${retryCount}/${maxRetries} - در حال تلاش مجدد...`);
          // مکث کوتاه قبل از retry
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        prices = await fetchPricesFromDonyaEqtesad();
        if (!prices || prices.length === 0) {
          throw new Error('هیچ قیمتی دریافت نشد');
        }

        // حداقل تعداد آیتم برای معتبر بودن (مثلاً 5 مورد)
        if (prices.length < 5) {
          throw new Error(`تعداد قیمت‌های دریافت شده کم است (${prices.length}) - احتمالاً داده‌ها ناقص است`);
        }

        console.log(`✅ [Daily Prices] ${prices.length} قیمت دریافت شد (تلاش ${retryCount + 1}/${maxRetries + 1})`);
        break; // موفق بود، از loop خارج شو
      } catch (error: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error('❌ [Daily Prices] خطا در دریافت قیمت‌ها پس از چند retry:', error.message);
          return NextResponse.json(
            { error: `خطا در دریافت قیمت‌ها: ${error.message}` },
            { status: 500 }
          );
        }
        console.warn(`⚠️ [Daily Prices] خطا در دریافت قیمت‌ها (تلاش ${retryCount}/${maxRetries + 1}):`, error.message);
      }
    }

    // فرمت متن پیام (شامل تاریخ و emoji و قیمت‌ها)
    const message = formatPricesForTelegram(prices);

    // Image Selection Logic (Fixed)
    const finalImagePath = '/images/gheymat/gheymat.jpg';
    const absolutePath = path.join(process.cwd(), 'public', finalImagePath);

    try {
      await fs.access(absolutePath);
    } catch {
      return NextResponse.json(
        { error: 'تصویر پیش‌فرض gheymat.jpg یافت نشد' },
        { status: 404 }
      );
    }

    console.log(`🖼️ [Daily Prices] Sending image: ${finalImagePath}`);

    // ارسال به تلگرام
    try {
      const result = await sendTelegramPhoto(
        settings.telegram_bot_token!,
        settings.telegram_channel_id!,
        finalImagePath,
        message,
      );

      if (!result.success) {
        throw new Error(result.error || 'خطا در ارسال به تلگرام');
      }

      console.log('✅ [Daily Prices] قیمت‌های روز با موفقیت ارسال شد');

      // ذخیره لاگ
      await prisma.unifiedRSSLog.create({
        data: {
          title: 'قیمت‌های روز - ارسال دستی',
          original_url: null,
          website_blog_id: null,
          target: 'telegram',
          telegram_sent: true,
          telegram_message_id: result.message_id || null,
          telegram_status: 'success',
          telegram_error: 'DAILY_PRICES',
          telegram_content: message,
          processed_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'قیمت‌های روز با موفقیت ارسال شد',
        data: {
          pricesCount: prices.length,
          time: timeCheck.currentTime,
          telegramMessageId: result.message_id,
        },
      });
    } catch (sendError: any) {
      console.error('❌ [Daily Prices] خطا در ارسال به تلگرام:', sendError.message);

      // ذخیره لاگ خطا
      try {
        await prisma.unifiedRSSLog.create({
          data: {
            title: 'قیمت‌های روز - ارسال دستی (خطا)',
            original_url: null,
            website_blog_id: null,
            target: 'telegram',
            telegram_sent: false,
            telegram_message_id: null,
            telegram_status: 'error',
            telegram_error: sendError.message || 'خطا در ارسال پیام عکس',
            telegram_content: null,
            processed_at: new Date(),
          },
        });
      } catch (logError: any) {
        console.error('❌ [Daily Prices] خطا در ثبت لاگ:', logError.message);
      }

      return NextResponse.json(
        { error: `خطا در ارسال به تلگرام: ${sendError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ [Daily Prices] خطای کلی:', error);
    return NextResponse.json(
      { error: error.message || "خطای ناشناخته" },
      { status: 500 }
    );
  }
}
