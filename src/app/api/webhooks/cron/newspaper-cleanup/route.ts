/**
 * Cron Job Endpoint for Cleaning Up Old Newspaper PDFs
 * This endpoint should be called daily to remove PDFs older than 15 days
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
 * استخراج تاریخ از نام فایل
 */
function extractDateFromFilename(filename: string): Date | null {
  const match = filename.match(/-(\d{4}-\d{2}-\d{2})\.pdf$/);
  if (!match) return null;
  
  const dateStr = match[1];
  return persianDateToGregorian(dateStr);
}

export async function GET(request: Request) {
  try {
    // بررسی API key برای امنیت (اختیاری)
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("key");
    
    // می‌توانید یک API key در env تعریف کنید
    if (process.env.CRON_SECRET && apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newspapersDir = path.join(process.cwd(), "public", "uploads", "newspapers");
    
    try {
      await fs.access(newspapersDir);
    } catch {
      return NextResponse.json({
        success: true,
        message: "دایرکتوری روزنامه‌ها وجود ندارد",
        deletedCount: 0,
      });
    }

    const files = await fs.readdir(newspapersDir);
    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    let deletedCount = 0;
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of pdfFiles) {
      try {
        const filePath = path.join(newspapersDir, file);
        const stats = await fs.stat(filePath);
        
        let fileDate: Date | null = null;
        
        const dateFromFilename = extractDateFromFilename(file);
        if (dateFromFilename) {
          fileDate = dateFromFilename;
        } else {
          fileDate = stats.mtime;
        }

        if (fileDate && fileDate < fifteenDaysAgo) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedFiles.push(file);
          console.log(`🗑️ [Cron] فایل قدیمی حذف شد: ${file}`);
        }
      } catch (error: any) {
        errors.push(`${file}: ${error.message}`);
        console.error(`❌ [Cron] خطا در حذف ${file}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} فایل قدیمی حذف شد`,
      deletedCount,
      deletedFiles: deletedFiles.slice(0, 10), // فقط 10 تا اول را برگردان
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [Cron] Error cleaning up old newspapers:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

