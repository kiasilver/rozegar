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

    const gregorianYear = year + 621;
    const gregorianDate = new Date(gregorianYear, month - 1, day);

    return gregorianDate;
  } catch {
    return null;
  }
}

/**
 * استخراج تاریخ از نام فایل (شمسی با اعداد فارسی یا انگلیسی)
 */
function extractDateFromFilename(filename: string): { date: Date | null; dateStr: string | null } {
  // فرمت: name-YYYY-MM-DD.pdf (ممکن است اعداد فارسی باشند)
  const match = filename.match(/-([0-9۰-۹]{4}-[0-9۰-۹]{2}-[0-9۰-۹]{2})\.pdf$/);
  if (!match) return { date: null, dateStr: null };

  // تبدیل اعداد فارسی به انگلیسی
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  let dateStr = match[1];
  for (let i = 0; i < 10; i++) {
    const regex = new RegExp(persianDigits[i], 'g');
    dateStr = dateStr.replace(regex, i.toString());
  }

  const date = persianDateToGregorian(dateStr);
  return { date, dateStr };
}

/**
 * استخراج نام روزنامه از نام فایل
 */
function extractNewspaperName(filename: string): string {
  // فرمت: name-YYYY-MM-DD.pdf
  const match = filename.match(/^(.+?)-([0-9۰-۹]{4}-[0-9۰-۹]{2}-[0-9۰-۹]{2})\.pdf$/);
  if (match) {
    return match[1].replace(/-/g, ' ');
  }
  return filename.replace('.pdf', '');
}

/**
 * تبدیل تاریخ میلادی به شمسی
 */
function gregorianToPersian(date: Date): string {
  const persianDate = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'persian',
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

    const now = new Date();
    const daysAgo = new Date(now);
    daysAgo.setDate(daysAgo.getDate() - archiveDays);
    daysAgo.setHours(0, 0, 0, 0);

    const newspapers: NewspaperArchiveItem[] = [];

    for (const file of pdfFiles) {
      try {
        const filePath = path.join(newspapersDir, file);
        const stats = await fs.stat(filePath);
        const fileDate = stats.mtime; // استفاده از تاریخ modification فایل

        // بررسی اینکه آیا فایل در بازه N روز گذشته است
        if (fileDate >= daysAgo && fileDate <= now) {
          const persianDate = gregorianToPersian(fileDate);
          const dateStr = fileDate.toISOString().split('T')[0]; // YYYY-MM-DD

          // سعی کن تاریخ را از نام فایل هم استخراج کن (برای نمایش بهتر)
          const { dateStr: dateFromFilename } = extractDateFromFilename(file);
          const finalDateStr = dateFromFilename || dateStr;

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
            dateStr: finalDateStr,
            dayOfWeek: new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(fileDate),
          });
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
        from: gregorianToPersian(daysAgo),
        to: gregorianToPersian(now),
      },
      archiveDays,
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

