/**
 * توابع کمکی برای کار با تایم ایران (UTC+3:30)
 * این فایل برای بررسی تاریخ‌های RSS feed با timezone +0330 استفاده می‌شود
 */

const IRAN_TIMEZONE_OFFSET_MS = 3.5 * 60 * 60 * 1000; // UTC+3:30 به میلی‌ثانیه

/**
 * دریافت شروع روز امروز در تایم ایران (00:00:00)
 * ⚠️ این تابع شروع امروز را بر اساس تاریخ برمی‌گرداند (فقط سال، ماه، روز)
 * این تابع یک Date object برمی‌گرداند که نمایانگر 00:00:00 امروز در تایم ایران است
 */
export function getTodayStartIran(): Date {
  const now = new Date();
  
  // تبدیل به تایم ایران
  const iranTimeMs = now.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const iranDate = new Date(iranTimeMs);
  
  // استخراج سال، ماه، روز در تایم ایران
  const year = iranDate.getUTCFullYear();
  const month = iranDate.getUTCMonth();
  const day = iranDate.getUTCDate();
  
  // ساخت Date برای 00:00:00 امروز در تایم ایران (در UTC)
  // 00:00:00 ایران = 20:30:00 UTC (روز قبل)
  const startOfDayIranUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  
  // تبدیل به UTC: کم کردن offset ایران
  return new Date(startOfDayIranUTC.getTime() - IRAN_TIMEZONE_OFFSET_MS);
}

/**
 * دریافت پایان روز امروز در تایم ایران (23:59:59.999)
 * ⚠️ این تابع پایان امروز را بر اساس تاریخ برمی‌گرداند (فقط سال، ماه، روز)
 */
export function getTodayEndIran(): Date {
  const todayStart = getTodayStartIran();
  // اضافه کردن 24 ساعت و کم کردن 1 میلی‌ثانیه
  return new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Parse کردن تاریخ RSS feed با timezone +0330
 * فرمت ورودی: "Wed, 31 Dec 2025 10:01:00 +0330"
 */
export function parseIranDate(pubDate: string): Date | null {
  if (!pubDate || pubDate.trim() === '') {
    return null;
  }

  try {
    // تلاش برای parse کردن مستقیم
    // JavaScript Date.parse می‌تواند format های مختلف را parse کند
    // تاریخ‌های GMT مثل "Sun, 04 Jan 2026 07:29:09 GMT" را به درستی parse می‌کند
    let parsedDate = new Date(pubDate);
    
    // بررسی معتبر بودن تاریخ
    if (isNaN(parsedDate.getTime())) {
      console.warn(`[RSS:DateUtils] Invalid date format: ${pubDate}`);
      return null;
    }
    
    // لاگ برای debugging - نمایش تاریخ parse شده
    // console.log(`[RSS:DateUtils] Parsed date: ${pubDate} → ${parsedDate.toISOString()}`);
    
    // اگر تاریخ parse شد، آن را برگردان
    // Date.parse خودش timezone را در نظر می‌گیرد
    // تاریخ GMT به UTC تبدیل می‌شود که درست است
    return parsedDate;
  } catch (error) {
    console.error(`[RSS:DateUtils] Error parsing date: ${pubDate}`, error);
    return null;
  }
}

/**
 * بررسی اینکه آیا خبر امروز است یا نه (بر اساس تاریخ - فقط سال، ماه، روز)
 * ⚠️ مهم: فقط تاریخ را چک می‌کند، نه ساعت
 * @param pubDate تاریخ انتشار خبر از RSS feed
 * @returns true اگر خبر امروز باشد (بر اساس روز، نه ساعت)
 */
export function isTodayIran(pubDate: string): boolean {
  const date = parseIranDate(pubDate);
  if (!date) {
    return false;
  }

  // دریافت تاریخ امروز در تایم ایران
  const now = new Date();
  const nowIranTimeMs = now.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const nowIranDate = new Date(nowIranTimeMs);
  
  // دریافت تاریخ خبر در تایم ایران
  // ⚠️ مهم: date از parseIranDate می‌آید که قبلاً UTC است
  // پس باید offset ایران را اضافه کنیم
  const itemIranTimeMs = date.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const itemIranDate = new Date(itemIranTimeMs);
  
  // فقط سال، ماه، روز را مقایسه کن (نه ساعت)
  // این باعث می‌شود که خبر 14 دی ساعت 23:59 را به عنوان "امروز" تشخیص ندهد
  // اگر امروز 15 دی است
  const isToday = (
    nowIranDate.getUTCFullYear() === itemIranDate.getUTCFullYear() &&
    nowIranDate.getUTCMonth() === itemIranDate.getUTCMonth() &&
    nowIranDate.getUTCDate() === itemIranDate.getUTCDate()
  );
  
  return isToday;
}

/**
 * دریافت شروع روز دیروز در تایم ایران (00:00:00)
 */
export function getYesterdayStartIran(): Date {
  const todayStart = getTodayStartIran();
  // کم کردن 24 ساعت (یک روز)
  return new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * دریافت پایان روز دیروز در تایم ایران (23:59:59.999)
 */
export function getYesterdayEndIran(): Date {
  const todayStart = getTodayStartIran();
  // یک میلی‌ثانیه قبل از شروع امروز
  return new Date(todayStart.getTime() - 1);
}

/**
 * بررسی اینکه آیا خبر امروز یا دیروز است (بر اساس تایم ایران)
 * @param pubDate تاریخ انتشار خبر از RSS feed
 * @returns true اگر خبر امروز یا دیروز باشد
 */
export function isTodayOrYesterdayIran(pubDate: string): boolean {
  const date = parseIranDate(pubDate);
  if (!date) {
    return false;
  }

  // تبدیل تاریخ RSS feed به تایم ایران
  const itemIranTimeMs = date.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const itemIranDate = new Date(itemIranTimeMs);
  const itemYear = itemIranDate.getUTCFullYear();
  const itemMonth = itemIranDate.getUTCMonth();
  const itemDay = itemIranDate.getUTCDate();

  // دریافت تاریخ امروز در تایم ایران
  const now = new Date();
  const nowIranTimeMs = now.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const nowIranDate = new Date(nowIranTimeMs);
  const todayYear = nowIranDate.getUTCFullYear();
  const todayMonth = nowIranDate.getUTCMonth();
  const todayDay = nowIranDate.getUTCDate();

  // بررسی امروز
  if (itemYear === todayYear && itemMonth === todayMonth && itemDay === todayDay) {
    return true;
  }

  // بررسی دیروز
  const yesterdayDate = new Date(nowIranDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayYear = yesterdayDate.getUTCFullYear();
  const yesterdayMonth = yesterdayDate.getUTCMonth();
  const yesterdayDay = yesterdayDate.getUTCDate();

  return itemYear === yesterdayYear && itemMonth === yesterdayMonth && itemDay === yesterdayDay;
}

/**
 * دریافت شروع روز 3 روز پیش در تایم ایران (00:00:00)
 */
export function getThreeDaysAgoStartIran(): Date {
  const todayStart = getTodayStartIran();
  // کم کردن 3 روز (72 ساعت)
  return new Date(todayStart.getTime() - 3 * 24 * 60 * 60 * 1000);
}

/**
 * بررسی اینکه آیا خبر در 3 روز اخیر است (امروز، دیروز، یا 3 روز پیش) (بر اساس تایم ایران)
 * @param pubDate تاریخ انتشار خبر از RSS feed
 * @returns true اگر خبر در 3 روز اخیر باشد
 */
export function isLastThreeDaysIran(pubDate: string): boolean {
  const date = parseIranDate(pubDate);
  if (!date) {
    return false;
  }

  // تبدیل تاریخ RSS feed به تایم ایران
  const itemIranTimeMs = date.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const itemIranDate = new Date(itemIranTimeMs);

  // دریافت تاریخ امروز در تایم ایران
  const now = new Date();
  const nowIranTimeMs = now.getTime() + IRAN_TIMEZONE_OFFSET_MS;
  const nowIranDate = new Date(nowIranTimeMs);

  // محاسبه تفاوت روزها (بر اساس سال، ماه، روز نه timestamp)
  // استفاده از getTime برای محاسبه تفاوت
  const itemDayStart = new Date(Date.UTC(
    itemIranDate.getUTCFullYear(),
    itemIranDate.getUTCMonth(),
    itemIranDate.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const todayDayStart = new Date(Date.UTC(
    nowIranDate.getUTCFullYear(),
    nowIranDate.getUTCMonth(),
    nowIranDate.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const diffTime = todayDayStart.getTime() - itemDayStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // اگر تفاوت کمتر از 3 روز باشد (0, 1, 2, 3)
  return diffDays >= 0 && diffDays <= 3;
}

/**
 * دریافت تایم فعلی در تایم ایران
 */
export function getNowIran(): Date {
  const now = new Date();
  return new Date(now.getTime() + IRAN_TIMEZONE_OFFSET_MS);
}

/**
 * تبدیل Date به string در تایم ایران
 */
export function formatIranDate(date: Date): string {
  const iranDate = new Date(date.getTime() + IRAN_TIMEZONE_OFFSET_MS);
  return iranDate.toISOString().replace('T', ' ').substring(0, 19) + ' +0330';
}
