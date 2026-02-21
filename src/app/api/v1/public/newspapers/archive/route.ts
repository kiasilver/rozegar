/**
 * API برای دریافت روزنامه‌های 15 روز گذشته (برای کیوسک دیجیتال)
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * تبدیل تاریخ شمسی به میلادی
 */
function persianDateToGregorian(persianDate: string): Date | null {
  try {
    const parts = persianDate.replace(/\//g, '-').split('-');
    if (parts.length !== 3) return null;

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // تبدیل شمسی به میلادی با الگوریتم دقیق‌تر
    // برای ماه‌های اول سال (فروردین تا شهریور): سال میلادی = سال شمسی + 621
    // برای ماه‌های آخر سال (مهر تا اسفند): سال میلادی = سال شمسی + 622
    const gregorianYear = year + 621;
    const gregorianYearAdjusted = month <= 6 ? gregorianYear : gregorianYear + 1;
    
    // استفاده از UTC با timezone ایران (Asia/Tehran = UTC+3:30)
    // ساعت 12 ظهر برای جلوگیری از مشکل timezone
    const gregorianDate = new Date(Date.UTC(gregorianYearAdjusted, month - 1, day, 12, 0, 0));

    return gregorianDate;
  } catch {
    return null;
  }
}

/**
 * استخراج تاریخ از نام فایل (شمسی با اعداد فارسی یا انگلیسی)
 */
function extractDateFromFilename(filename: string): { date: Date | null; dateStr: string | null } {
  // فرمت: name-YYYY-MM-DD.pdf یا name-۱۴۰۴-۱۲-۰۲.pdf
  // پشتیبانی از جداکننده - و _
  const match = filename.match(/-([0-9۰-۹]{4}[-_][0-9۰-۹]{1,2}[-_][0-9۰-۹]{1,2})\.pdf$/i);
  if (!match) return { date: null, dateStr: null };

  // تبدیل اعداد فارسی به انگلیسی
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  let dateStr = match[1].replace(/_/g, '-'); // تبدیل _ به -
  for (let i = 0; i < 10; i++) {
    const regex = new RegExp(persianDigits[i], 'g');
    dateStr = dateStr.replace(regex, i.toString());
  }

  const date = persianDateToGregorian(dateStr);
  return { date, dateStr };
}

/**
 * Mapping نام‌های انگلیسی به فارسی
 */
const newspaperNameMapping: Record<string, string> = {
  'EghtesadKish': 'اقتصاد کیش',
  'EghtesadAyandeh': 'اقتصاد آینده',
  'EghtesadAyande': 'اقتصاد آینده',
  'DonyayeEghtesad': 'دنیای اقتصاد',
  'JahanSanat': 'جهان صنعت',
  'Sarmayeh': 'سرمایه',
  'TejaratFarda': 'تجارت فردا',
  'Bourse': 'بورس',
  'EghtesadNews': 'اقتصاد نیوز',
  'EghtesadOnline': 'اقتصاد آنلاین',
  'Kargozaran': 'کارگزاران',
  'BoursePress': 'بورس پرس',
  'Tejarat': 'تجارت',
  'Eghtesad': 'اقتصاد',
  'Bazar': 'بازار',
  'Sanat': 'صنعت',
  'JahanEghtesad': 'جهان اقتصاد',
  'JahaneEghtesad': 'جهان اقتصاد',
  'Jahan-e-Eghtesad': 'جهان اقتصاد',
  'Eskenas': 'اسکناس',
  'Eskanass': 'اسکناس',
  'Emruz': 'امروز',
  'Emrooz': 'امروز',
  'Sarmaye': 'ثروت',
  'Khob': 'خوب',
  'Khoob': 'خوب',
  'Ruzegar': 'روزگار',
  'RuzegarMaden': 'روزگار معدن',
  'Shoroo': 'شروع',
  'Shorou': 'شروع',
  'Samat': 'صمت',
  'Semat': 'صمت',
  'MojavezeEghtesadi': 'مواجهه اقتصادی',
  'NagheEghtesad': 'نقش اقتصاد',
  'HadafVaEghtesad': 'هدف و اقتصاد',
  'Asia': 'روزنامه آسیا',
  'Asiya': 'روزنامه آسیا',
  'AbrarEghtesadi': 'ابرار اقتصادی',
  'AkhbarSanat': 'اخبار صنعت',
  'EghtesadPooya': 'اقتصاد پویا',
  'EghtesadSaramad': 'اقتصاد سرآمد',
  'EghtesadeMardom': 'اقتصاد مردم',
  'EghtesadeMeli': 'اقتصاد ملی',
  'EghtesadMardom': 'اقتصاد مردم',
  'EghtesadMeli': 'اقتصاد ملی',
  'TejaratOnline': 'تجارت آنلاین',
  'AsrGhanoon': 'عصر قانون',
  'HadafEconomic': 'هدف و اقتصاد',
  'Movajehe': 'مواجهه اقتصادی',
  'NaghshDaily': 'نقش اقتصاد',
  'Roozegar': 'روزگار',
  'Sarmayegozari': 'سرمایه‌گذاری',
  'Servat': 'ثروت',
};

/**
 * استخراج نام روزنامه از نام فایل PDF
 * از نام فایل PDF استفاده می‌کند و آن را به فارسی تبدیل می‌کند
 */
function extractNewspaperName(filename: string): string {
  // فرمت: name-YYYY-MM-DD.pdf یا name-۱۴۰۴-۱۲-۰۲.pdf
  // پشتیبانی از اعداد فارسی و انگلیسی
  // همچنین پشتیبانی از نام‌های شامل ?date= (مثل AbrarEghtesadi?date=140412-1404-12-02.pdf)
  const match = filename.match(/^(.+?)-([0-9۰-۹]{4}[-_][0-9۰-۹]{1,2}[-_][0-9۰-۹]{1,2})\.pdf$/i);
  if (match) {
    let namePart = match[1];
    
    // تمیز کردن نام از کاراکترهای اضافی (?date=, &date=, و غیره)
    namePart = namePart.split('?')[0].split('&')[0].trim();
    
    // اگر نام در mapping وجود دارد، از آن استفاده کن
    if (newspaperNameMapping[namePart]) {
      return newspaperNameMapping[namePart];
    }
    
    // اگر نام با حروف بزرگ شروع می‌شود (CamelCase)، سعی کن در mapping پیدا کنی
    const camelCaseName = namePart.replace(/-/g, '');
    if (newspaperNameMapping[camelCaseName]) {
      return newspaperNameMapping[camelCaseName];
    }
    
    // جستجوی case-insensitive در mapping
    const lowerName = namePart.toLowerCase();
    for (const [key, value] of Object.entries(newspaperNameMapping)) {
      if (key.toLowerCase() === lowerName || key.toLowerCase() === camelCaseName.toLowerCase()) {
        return value;
      }
    }
    
    // اگر نام شامل حروف فارسی است، همان را برگردان (بدون تاریخ)
    if (/[\u0600-\u06FF]/.test(namePart)) {
      return namePart.replace(/-/g, ' ').trim();
    }
    
    // در غیر این صورت، نام را با فاصله برگردان
    return namePart.replace(/-/g, ' ').trim();
  }
  
  // اگر فرمت مطابقت نداشت، پسوند را حذف کن و تاریخ را جدا کن
  let cleanName = filename.replace('.pdf', '');
  // حذف تاریخ از انتها (اگر وجود دارد)
  cleanName = cleanName.replace(/-[0-9۰-۹]{4}[-_][0-9۰-۹]{1,2}[-_][0-9۰-۹]{1,2}$/i, '');
  // تمیز کردن از کاراکترهای اضافی (?date=, &date=, و غیره)
  cleanName = cleanName.split('?')[0].split('&')[0].trim();
  return cleanName.replace(/-/g, ' ').trim();
}

/**
 * تبدیل تاریخ میلادی به شمسی
 */
function gregorianToPersian(date: Date): string {
  // استفاده از timezone ایران برای تبدیل صحیح تاریخ
  const persianDate = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'persian',
    timeZone: 'Asia/Tehran', // استفاده از timezone ایران
  }).format(date);

  return persianDate;
}

interface NewspaperArchiveItem {
  name: string;
  filename: string;
  pdfUrl: string;
  imageUrl?: string; // URL عکس روزنامه
  date: string; // تاریخ شمسی
  dateStr: string; // تاریخ به صورت YYYY-MM-DD
  dayOfWeek: string; // روز هفته
}

/**
 * GET: دریافت روزنامه‌های N روز گذشته (قابل تنظیم)
 */
export async function GET() {
  try {
    // دریافت تعداد روزها از تنظیمات
    const { prisma } = await import("@/lib/core/prisma");
    const archiveDaysSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_archive_days' },
    });
    const archiveDays = archiveDaysSetting?.value ? parseInt(archiveDaysSetting.value) : 15;

    const newspapersDir = path.join(process.cwd(), "public", "uploads", "newspapers");

    try {
      await fs.access(newspapersDir);
    } catch {
      return NextResponse.json({
        success: true,
        newspapers: [],
        count: 0,
        archiveDays,
      });
    }

    const files = await fs.readdir(newspapersDir);
    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    // استفاده از timezone ایران برای تاریخ امروز
    const now = new Date();
    // تاریخ امروز در timezone ایران
    const todayInIran = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const today = new Date(todayInIran);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // تاریخ امروز به شمسی (با timezone ایران)
    const todayPersian = gregorianToPersian(today);

    const newspapers: NewspaperArchiveItem[] = [];

    for (const file of pdfFiles) {
      try {
        // استخراج تاریخ از نام فایل (اولویت اول)
        const { date: dateFromFilename, dateStr: dateStrFromFilename } = extractDateFromFilename(file);
        
        // اگر تاریخ از نام فایل استخراج شد، از آن استفاده کن
        if (dateStrFromFilename) {
          // تبدیل تاریخ شمسی از نام فایل به فرمت YYYY/MM/DD برای مقایسه
          const parts = dateStrFromFilename.split('-');
          if (parts.length === 3) {
            const year = parts[0].padStart(4, '0');
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            const filePersianDate = `${year}/${month}/${day}`;
            
            // تبدیل تاریخ امروز به فرمت YYYY/MM/DD برای مقایسه (با timezone ایران)
            // تبدیل اعداد فارسی به انگلیسی
            const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
            const englishDigits = '0123456789';
            let todayFormatted = todayPersian;
            for (let i = 0; i < 10; i++) {
              const regex = new RegExp(persianDigits[i], 'g');
              todayFormatted = todayFormatted.replace(regex, englishDigits[i]);
            }
            
            // فقط روزنامه‌های امروز را نمایش بده
            if (filePersianDate === todayFormatted) {
              const filePath = path.join(newspapersDir, file);
              const stats = await fs.stat(filePath);
              const fileDate = dateFromFilename || new Date(); // استفاده از تاریخ استخراج شده از نام فایل
              
              // dateStr باید به صورت شمسی (YYYY-MM-DD) باشد برای استفاده در formatJalaliDate
              // استفاده از تاریخ شمسی از نام فایل
              const dateStr = dateStrFromFilename; // این تاریخ شمسی است (YYYY-MM-DD)
              
              // استفاده از فرمت شمسی برای نمایش (YYYY/MM/DD)
              const persianDate = filePersianDate;

              // بررسی وجود تصویر کاور
              const imgFilename = file.replace('.pdf', '.jpg');
              const imgPath = path.join(newspapersDir, imgFilename);
              let imageUrl;
              try {
                await fs.access(imgPath);
                imageUrl = `/uploads/newspapers/${imgFilename}`;
              } catch {
                imageUrl = undefined;
              }

              newspapers.push({
                name: extractNewspaperName(file),
                filename: file,
                pdfUrl: `/uploads/newspapers/${file}`,
                imageUrl,
                date: persianDate,
                dateStr: dateStr, // تاریخ شمسی (YYYY-MM-DD)
                dayOfWeek: new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'Asia/Tehran' }).format(fileDate),
              });
            }
          }
        }
        
        // اگر تاریخ از نام فایل استخراج نشد، از تاریخ modification فایل استفاده کن
        if (!dateStrFromFilename) {
          // اما فقط اگر امروز باشد
          const filePath = path.join(newspapersDir, file);
          const stats = await fs.stat(filePath);
          const fileDate = stats.mtime;
          
          // بررسی اینکه آیا فایل امروز ایجاد شده است
          if (fileDate >= today && fileDate < tomorrow) {
            const persianDate = gregorianToPersian(fileDate);
            // تبدیل تاریخ شمسی به فرمت YYYY-MM-DD
            const persianParts = persianDate.split('/');
            const dateStr = persianParts.length === 3 
              ? `${persianParts[0]}-${persianParts[1].padStart(2, '0')}-${persianParts[2].padStart(2, '0')}`
              : persianDate;

            // بررسی وجود تصویر کاور
            const imgFilename = file.replace('.pdf', '.jpg');
            const imgPath = path.join(newspapersDir, imgFilename);
            let imageUrl;
            try {
              await fs.access(imgPath);
              imageUrl = `/uploads/newspapers/${imgFilename}`;
            } catch {
              imageUrl = undefined;
            }

            newspapers.push({
              name: extractNewspaperName(file),
              filename: file,
              pdfUrl: `/uploads/newspapers/${file}`,
              imageUrl,
              date: persianDate,
              dateStr: dateStr, // تاریخ شمسی (YYYY-MM-DD)
              dayOfWeek: new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'Asia/Tehran' }).format(fileDate),
            });
          }
        }
      } catch (error: any) {
        console.error(`❌ خطا در پردازش ${file}:`, error);
      }
    }

    // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
    newspapers.sort((a, b) => {
      // استفاده از dateStr که تاریخ میلادی است (YYYY-MM-DD)
      const dateA = new Date(a.dateStr);
      const dateB = new Date(b.dateStr);
      return dateB.getTime() - dateA.getTime();
    });

    // گروه‌بندی بر اساس تاریخ
    const groupedByDate: Record<string, NewspaperArchiveItem[]> = {};
    newspapers.forEach((paper) => {
      if (!groupedByDate[paper.dateStr]) {
        groupedByDate[paper.dateStr] = [];
      }
      groupedByDate[paper.dateStr].push(paper);
    });

    return NextResponse.json({
      success: true,
      count: newspapers.length,
      newspapers,
      groupedByDate,
      dateRange: {
        from: todayPersian,
        to: todayPersian,
      },
      archiveDays: 1, // فقط امروز
    });
  } catch (error: any) {
    console.error("❌ Error fetching newspaper archive:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: error.message,
        newspapers: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

