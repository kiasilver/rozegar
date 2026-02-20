/**
 * بررسی تکراری بودن خبرها بر اساس title و RSS source URL
 * این سیستم title و RSS source های ارسال شده را در TelegramLog ذخیره می‌کند
 * ⚠️ مهم: خبر فقط در صورتی تکراری است که از همان RSS source با همان title امروز ارسال شده باشد
 */

import { prisma } from '@/lib/core/prisma';
import { getTodayStartIran, getTodayEndIran } from './rss-date-utils';

/**
 * بررسی اینکه آیا خبر با این title از همان RSS source قبلاً امروز ارسال شده است
 * ⚠️ فقط Success Logs را چک می‌کند (نه Pending یا Error)
 * ⚠️ فقط خبرهای امروز چک می‌شوند (بر اساس تاریخ، نه زمان)
 * ⚠️ خبر فقط در صورتی تکراری است که از همان RSS source با همان title باشد
 * @param title عنوان خبر
 * @param url URL خبر (اختیاری - برای backward compatibility)
 * @param rssSourceUrl URL منبع RSS (اختیاری - اگر موجود نباشد فقط title چک می‌شود)
 * @returns true اگر تکراری باشد
 */
export async function isDuplicateTitle(title: string, url?: string, rssSourceUrl?: string): Promise<boolean> {
  if (!title || title.trim().length === 0) {
    return false;
  }

  const normalizedTitle = normalizeTitle(title);
  const normalizedRssSource = rssSourceUrl ? normalizeUrl(rssSourceUrl) : null;

  try {
    // Get today's start and end time (based on date, not time)
    const todayStart = getTodayStartIran();
    const todayEnd = getTodayEndIran();
    
    // Debug: نمایش تاریخ امروز برای بررسی
    console.log(`[RSS:DuplicateChecker] 📅 Checking duplicates for TODAY: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
    
    // ⚠️ فقط Success Logs امروز را چک می‌کنیم (بر اساس تاریخ، نه ساعت)
    // Success = ارسال شده با موفقیت → duplicate است
    // Pending = در حال پردازش → در transaction چک می‌شود (برای جلوگیری از پردازش همزمان)
    // Error = باید دوباره پردازش شود → duplicate نیست
    // فقط خبرهای امروز چک می‌شوند تا خبرهای دیروز یا قدیمی‌تر duplicate نباشند
    const existingLogs = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success', // فقط success = duplicate (ارسال شده با موفقیت)
        processed_at: {
          gte: todayStart, // از شروع امروز
          lte: todayEnd,   // تا پایان امروز (فقط امروز)
        },
        OR: [
          {
            rss_source_url: { not: null },
          },
          {
            original_url: { not: null },
          },
          {
            telegram_error: {
              startsWith: 'RSS_SOURCE:',
            },
          },
        ],
      },
      select: {
        telegram_error: true,
        telegram_status: true,
        processed_at: true, // برای دیباگ
        title: true,
        original_url: true,
        rss_source_url: true,
      },
      take: 200,
      orderBy: {
        processed_at: 'desc', // جدیدترین اول
      },
    });
    
    // Debug: لاگ تعداد لاگ‌های پیدا شده
    const logsWithRssSource = existingLogs.filter(log => 
      log.rss_source_url !== null && log.rss_source_url !== undefined
    ).length;
    
    console.log(`[RSS:DuplicateChecker] 🔍 Checking ${existingLogs.length} SUCCESS logs from TODAY (${logsWithRssSource} with RSS_SOURCE) for title="${title.substring(0, 30)}..." RSS="${rssSourceUrl?.substring(0, 40) || 'N/A'}..."`);
    
    // اگر هیچ لاگی برای امروز وجود ندارد، duplicate نیست
    if (existingLogs.length === 0) {
      console.log(`[RSS:DuplicateChecker] ✅ No success logs found for today - NOT duplicate`);
      return false;
    }
    
    // Debug: نمایش اولین لاگ برای بررسی
    if (existingLogs.length > 0) {
      const firstLog = existingLogs[0];
      console.log(`[RSS:DuplicateChecker] 📋 First log: status=${firstLog.telegram_status}, processed_at=${firstLog.processed_at?.toISOString()}, title="${firstLog.title?.substring(0, 80)}..."`);
    }

    // بررسی تکراری بودن - استفاده از فیلدهای UnifiedRSSLog
    for (const log of existingLogs) {
      // استفاده مستقیم از فیلدهای UnifiedRSSLog
      const storedTitle = log.title;
      const storedUrl = log.original_url;
      const storedRssSource = log.rss_source_url;
      
      // ⚠️ منطق جدید: بررسی بر اساس title + RSS source
      // خبر تکراری است اگر:
      // 1. title یکسان باشد
      // 2. RSS source یکسان باشد (اگر RSS source موجود باشد)
      // 3. امروز ارسال شده باشد (قبلاً فیلتر شده)
      
      if (storedTitle) {
          const normalizedStoredTitle = normalizeTitle(storedTitle);
          
          // Debug: نمایش title های normalize شده
          if (normalizedStoredTitle === normalizedTitle && normalizedStoredTitle.length > 10) {
            console.log(`[RSS:DuplicateChecker] 🔍 Title match found!`);
            console.log(`[RSS:DuplicateChecker]   Original new: "${title.substring(0, 60)}..."`);
            console.log(`[RSS:DuplicateChecker]   Original stored: "${storedTitle.substring(0, 60)}..."`);
            console.log(`[RSS:DuplicateChecker]   Normalized new: "${normalizedTitle.substring(0, 60)}..."`);
            console.log(`[RSS:DuplicateChecker]   Normalized stored: "${normalizedStoredTitle.substring(0, 60)}..."`);
          }
          
          // ⚠️ منطق جدید: اگر خبر جدید RSS source دارد، باید حتماً RSS source یکسان باشد تا duplicate باشد
          // ⚠️ مهم: فقط لاگ‌های امروز چک می‌شوند (قبلاً فیلتر شده‌اند)
          // ⚠️ مهم: اگر RSS source موجود است، باید هم title و هم RSS source یکسان باشند
          
          // اگر RSS source موجود است (برای خبر جدید)
          if (normalizedRssSource) {
            // باید لاگ قدیمی هم RSS source داشته باشد
            if (storedRssSource) {
              const normalizedStoredRssSource = normalizeUrl(storedRssSource);
              // اگر RSS source یکسان است، title را هم چک می‌کنیم
              if (normalizedStoredRssSource === normalizedRssSource) {
                // RSS source یکسان → title را چک می‌کنیم
                // ⚠️ مهم: title ممکن است truncated باشد، پس باید similarity را هم چک کنیم
                const shorterTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedStoredTitle : normalizedTitle;
                const longerTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedTitle : normalizedStoredTitle;
                
                const isTitleMatch = 
                  normalizedStoredTitle === normalizedTitle || // کاملاً یکسان
                  (shorterTitle.length > 20 && longerTitle.startsWith(shorterTitle)); // title کوتاه‌تر در ابتدای بلندتر است
                
                if (isTitleMatch && shorterTitle.length > 10) {
                  // title یکسان + RSS source یکسان = تکراری
                  if (normalizedStoredTitle !== normalizedTitle) {
                    console.log(`[RSS:DuplicateChecker] ✅ Found duplicate (truncated title match): title="${title.substring(0, 50)}..." RSS="${rssSourceUrl?.substring(0, 50)}..." (stored: "${storedTitle.substring(0, 50)}...")`);
                  } else {
                    console.log(`[RSS:DuplicateChecker] ✅ Found duplicate: title="${title.substring(0, 50)}..." RSS="${rssSourceUrl?.substring(0, 50)}..." (both title and RSS source match)`);
                  }
                  return true;
                }
                // RSS source یکسان اما title متفاوت = تکراری نیست (خبر جدید است)
                console.log(`[RSS:DuplicateChecker] ⏭️ Same RSS source but different title - NOT duplicate (new news: "${title.substring(0, 40)}..." vs stored: "${storedTitle.substring(0, 40)}...")`);
                continue;
              }
              // RSS source متفاوت = تکراری نیست (خبر از منبع دیگر)
              console.log(`[RSS:DuplicateChecker] ⏭️ Different RSS source - NOT duplicate`);
              continue;
            } else {
              // ⚠️ خبر جدید RSS source دارد اما لاگ قدیمی ندارد → چک کن title یکسان است؟
              // این برای backward compatibility با لاگ‌های قدیمی که RSS_SOURCE ندارند
              const shorterTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedStoredTitle : normalizedTitle;
              const longerTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedTitle : normalizedStoredTitle;
              
              const isTitleMatch = 
                normalizedStoredTitle === normalizedTitle || // کاملاً یکسان
                (shorterTitle.length > 20 && longerTitle.startsWith(shorterTitle)); // title کوتاه‌تر در ابتدای بلندتر است
              
              if (isTitleMatch && shorterTitle.length > 10) {
                console.log(`[RSS:DuplicateChecker] ✅ Found duplicate: title="${title.substring(0, 50)}..." (backward compat: new has RSS but stored doesn't, but title matches)`);
                return true;
              }
              console.log(`[RSS:DuplicateChecker] ⏭️ New has RSS source but stored doesn't, and title different - NOT duplicate`);
              continue;
            }
          } else {
            // اگر خبر جدید RSS source ندارد، backward compatibility: فقط title را چک می‌کنیم
            // ⚠️ این فقط برای لاگ‌های امروز است (قبلاً فیلتر شده‌اند)
            // ⚠️ اما اگر لاگ قدیمی RSS source دارد، duplicate نیست (چون خبر جدید RSS source ندارد)
            if (!storedRssSource) {
              const shorterTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedStoredTitle : normalizedTitle;
              const longerTitle = normalizedStoredTitle.length < normalizedTitle.length ? normalizedTitle : normalizedStoredTitle;
              
              const isTitleMatch = 
                normalizedStoredTitle === normalizedTitle || // کاملاً یکسان
                (shorterTitle.length > 20 && longerTitle.startsWith(shorterTitle)); // title کوتاه‌تر در ابتدای بلندتر است
              
              if (isTitleMatch && shorterTitle.length > 10) {
                // هر دو RSS source ندارند → backward compatibility: فقط title را چک می‌کنیم
                console.log(`[RSS:DuplicateChecker] ✅ Found duplicate (backward compat - TODAY only): title="${title.substring(0, 50)}..." (no RSS source in both, but both are from TODAY)`);
                return true;
              }
            } else if (storedRssSource) {
              // لاگ قدیمی RSS source دارد اما خبر جدید ندارد → تکراری نیست (خبر جدید است)
              console.log(`[RSS:DuplicateChecker] ⏭️ Stored has RSS source but new doesn't - NOT duplicate (new news)`);
              continue;
            }
          }
      }
      
      // بررسی بر اساس URL (برای backward compatibility با لاگ‌های قدیمی)
      // اگر URL یکسان باشد و RSS source موجود نباشد، تکراری است
      if (url && storedUrl && !normalizedRssSource && !storedRssSource) {
        const normalizedStoredUrl = normalizeUrl(storedUrl);
        const normalizedCurrentUrl = normalizeUrl(url);
        if (normalizedStoredUrl === normalizedCurrentUrl) {
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    console.error(`[RSS:DuplicateChecker] Error checking duplicate:`, error.message);
    // در صورت خطا، false برگردان (بهتر است خبر ارسال نشود تا تکراری شود)
    return false;
  }
}

/**
 * نرمال‌سازی URL برای مقایسه بهتر
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // حذف query parameters و hash
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.toLowerCase();
  } catch {
    // اگر URL معتبر نبود، فقط lowercase کن
    return url.toLowerCase().trim();
  }
}

/**
 * نرمال‌سازی title برای مقایسه بهتر
 * ⚠️ کمتر aggressive: فقط فاصله‌های اضافی را حذف می‌کند
 * ⚠️ مهم: اگر RSS source موجود است، duplicate check بر اساس RSS source + title است
 * پس normalizeTitle نباید خیلی aggressive باشد تا title های مختلف یکسان نشوند
 * ⚠️ مهم: فقط فاصله‌های اضافی را حذف می‌کنیم، نه کاراکترهای خاص
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';

  return title
    .trim()
    .toLowerCase()
    // فقط حذف فاصله‌های اضافی
    .replace(/\s+/g, ' ') // تبدیل فاصله‌های چندتایی به یک فاصله
    .trim();
}

/**
 * ذخیره title، URL و RSS source در TelegramLog برای بررسی تکراری در آینده
 * @param logId ID لاگ TelegramLog
 * @param title عنوان خبر
 * @param url URL خبر (اختیاری)
 * @param rssSourceUrl URL منبع RSS (اختیاری)
 */
export async function saveTitleToLog(logId: number, title: string, url?: string, rssSourceUrl?: string): Promise<void> {
  try {
    // ذخیره title، URL و RSS source در error_message
    // فرمت: "RSS_TITLE:title|RSS_URL:url|RSS_SOURCE:rssSourceUrl" یا "RSS_TITLE:title|RSS_SOURCE:rssSourceUrl" یا "RSS_TITLE:title"
    const parts: string[] = [`RSS_TITLE:${title}`];
    if (url) {
      parts.push(`RSS_URL:${url}`);
    }
    if (rssSourceUrl) {
      parts.push(`RSS_SOURCE:${rssSourceUrl}`);
    }
    const errorMessage = parts.join('|');
    
    await prisma.unifiedRSSLog.update({
      where: { id: logId },
      data: {
        telegram_error: errorMessage,
      },
    });
  } catch (error: any) {
    console.error(`[RSS:DuplicateChecker] Error saving title to log:`, error.message);
    // خطا را ignore می‌کنیم چون critical نیست
  }
}

/**
 * بررسی تکراری بودن خبر در Blog
 * چک می‌کند که آیا خبری با همین title و source_url در Blog وجود دارد
 * @param title عنوان خبر
 * @param sourceUrl URL منبع اصلی خبر
 * @param rssSourceUrl URL منبع RSS
 * @returns true اگر تکراری باشد
 */
export async function isDuplicateBlog(title: string, sourceUrl?: string, rssSourceUrl?: string): Promise<boolean> {
  if (!title || title.trim().length === 0) {
    return false;
  }

  const normalizedTitle = normalizeTitle(title);
  const normalizedSourceUrl = sourceUrl ? normalizeUrl(sourceUrl) : null;
  const normalizedRssSource = rssSourceUrl ? normalizeUrl(rssSourceUrl) : null;

  try {
    // بررسی در Blog و BlogTranslation
    const existingBlogs = await prisma.blog.findMany({
      where: {
        is_active: true,
        status: {
          in: ['PUBLISHED', 'DRAFT', 'PENDING']
        }
      },
      include: {
        translations: {
          where: {
            lang: 'FA'
          },
          select: {
            title: true
          }
        }
      },
      take: 500
    });

    // بررسی title matching
    for (const blog of existingBlogs) {
      if (blog.translations && blog.translations.length > 0) {
        const blogTitle = blog.translations[0].title;
        const normalizedBlogTitle = normalizeTitle(blogTitle);

        // منطق truncated matching مشابه Telegram
        const shorterTitle = normalizedBlogTitle.length < normalizedTitle.length ? normalizedBlogTitle : normalizedTitle;
        const longerTitle = normalizedBlogTitle.length < normalizedTitle.length ? normalizedTitle : normalizedBlogTitle;

        const isTitleMatch =
          normalizedBlogTitle === normalizedTitle || // کاملاً یکسان
          (shorterTitle.length > 20 && longerTitle.startsWith(shorterTitle)); // title کوتاه‌تر در ابتدای بلندتر است

        if (isTitleMatch) {
          // اگر source_url موجود است، باید چک کنیم
          if (normalizedSourceUrl && blog.source_url) {
            const normalizedBlogSource = normalizeUrl(blog.source_url);
            if (normalizedBlogSource === normalizedSourceUrl) {
              console.log(`[RSS:DuplicateChecker] 🔴 DUPLICATE BLOG found by title + source_url match`);
              return true;
            }
          } else {
            // اگر source_url نداریم، فقط بر اساس title
            console.log(`[RSS:DuplicateChecker] 🔴 DUPLICATE BLOG found by title match`);
            return true;
          }
        }
      }
    }

    console.log(`[RSS:DuplicateChecker] ✅ NOT duplicate in Blog`);
    return false;
  } catch (error) {
    console.error('[RSS:DuplicateChecker] ❌ Error checking blog duplicate:', error);
    return false;
  }
}

/**
 * بررسی تکراری بودن در UnifiedRSSLog
 * @param title عنوان خبر
 * @param sourceUrl URL منبع اصلی
 * @param rssSourceUrl URL منبع RSS
 * @returns true اگر تکراری باشد
 */
export async function isDuplicateUnifiedLog(title: string, sourceUrl?: string, rssSourceUrl?: string): Promise<boolean> {
  if (!title || title.trim().length === 0) {
    return false;
  }

  const normalizedTitle = normalizeTitle(title);
  const normalizedRssSource = rssSourceUrl ? normalizeUrl(rssSourceUrl) : null;

  try {
    // Get today's start and end
    const todayStart = getTodayStartIran();
    const todayEnd = getTodayEndIran();

    const existingLogs = await prisma.unifiedRSSLog.findMany({
      where: {
        created_at: {
          gte: todayStart,
          lte: todayEnd
        },
        OR: [
          { telegram_sent: true },
          { website_sent: true }
        ]
      },
      select: {
        title: true,
        rss_source_url: true,
        original_url: true
      },
      take: 200
    });

    for (const log of existingLogs) {
      const normalizedLogTitle = normalizeTitle(log.title);

      // Truncated matching
      const shorterTitle = normalizedLogTitle.length < normalizedTitle.length ? normalizedLogTitle : normalizedTitle;
      const longerTitle = normalizedLogTitle.length < normalizedTitle.length ? normalizedTitle : normalizedLogTitle;

      const isTitleMatch =
        normalizedLogTitle === normalizedTitle ||
        (shorterTitle.length > 20 && longerTitle.startsWith(shorterTitle));

      if (isTitleMatch) {
        // اگر RSS source موجود است
        if (normalizedRssSource && log.rss_source_url) {
          const normalizedLogRssSource = normalizeUrl(log.rss_source_url);
          if (normalizedLogRssSource === normalizedRssSource) {
            console.log(`[RSS:DuplicateChecker] 🔴 DUPLICATE in UnifiedRSSLog`);
            return true;
          }
        } else {
          // فقط بر اساس title
          console.log(`[RSS:DuplicateChecker] 🔴 DUPLICATE in UnifiedRSSLog by title`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[RSS:DuplicateChecker] ❌ Error checking unified log duplicate:', error);
    return false;
  }
}

/**
 * بررسی جامع تکراری بودن محتوا (هم تلگرام هم Blog)
 * @param title عنوان خبر
 * @param sourceUrl URL منبع اصلی
 * @param rssSourceUrl URL منبع RSS
 * @returns object با وضعیت تکراری بودن برای هر target
 */
export async function isDuplicateContent(
  title: string,
  sourceUrl?: string,
  rssSourceUrl?: string
): Promise<{
  telegramDuplicate: boolean;
  blogDuplicate: boolean;
  unifiedLogDuplicate: boolean;
}> {
  const [telegram, blog, unifiedLog] = await Promise.all([
    isDuplicateTitle(title, sourceUrl, rssSourceUrl),
    isDuplicateBlog(title, sourceUrl, rssSourceUrl),
    isDuplicateUnifiedLog(title, sourceUrl, rssSourceUrl)
  ]);

  return {
    telegramDuplicate: telegram,
    blogDuplicate: blog,
    unifiedLogDuplicate: unifiedLog
  };
}

