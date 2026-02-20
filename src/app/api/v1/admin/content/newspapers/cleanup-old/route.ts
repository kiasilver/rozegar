import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import fs from "fs/promises";
import path from "path";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * تبدیل تاریخ شمسی به میلادی
 */
function persianDateToGregorian(persianDate: string): Date | null {
  try {
    // فرمت: YYYY-MM-DD یا YYYY/MM/DD
    const parts = persianDate.replace(/\//g, '-').split('-');
    if (parts.length !== 3) return null;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    
    // تبدیل تقریبی تاریخ شمسی به میلادی (برای محاسبه سن فایل)
    // این یک تبدیل ساده است - برای دقت بیشتر می‌توان از کتابخانه‌های تخصصی استفاده کرد
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
  // فرمت: name-YYYY-MM-DD.pdf
  const match = filename.match(/-(\d{4}-\d{2}-\d{2})\.pdf$/);
  if (!match) return null;
  
  const dateStr = match[1];
  return persianDateToGregorian(dateStr);
}

/**
 * POST: پاک کردن PDF های قدیمی‌تر از 15 روز
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newspapersDir = path.join(process.cwd(), "public", "uploads", "newspapers");
    
    // بررسی وجود دایرکتوری
    try {
      await fs.access(newspapersDir);
    } catch {
      return NextResponse.json({
        success: true,
        message: "دایرکتوری روزنامه‌ها وجود ندارد",
        deletedCount: 0,
      });
    }

    // خواندن فایل‌ها
    const files = await fs.readdir(newspapersDir);
    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    // دریافت تعداد روزها از تنظیمات
    const { prisma } = await import("@/lib/core/prisma");
    const archiveDaysSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_archive_days' },
    });
    const archiveDays = archiveDaysSetting?.value ? parseInt(archiveDaysSetting.value) : 15;

    const now = new Date();
    const daysAgo = new Date(now);
    daysAgo.setDate(daysAgo.getDate() - archiveDays);

    let deletedCount = 0;
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of pdfFiles) {
      try {
        const filePath = path.join(newspapersDir, file);
        const stats = await fs.stat(filePath);
        
        // بررسی بر اساس تاریخ فایل (mtime) یا تاریخ در نام فایل
        let fileDate: Date | null = null;
        
        // اول سعی کن تاریخ را از نام فایل استخراج کن
        const dateFromFilename = extractDateFromFilename(file);
        if (dateFromFilename) {
          fileDate = dateFromFilename;
        } else {
          // اگر نتوانستیم از نام فایل، از تاریخ modification استفاده کن
          fileDate = stats.mtime;
        }

        if (fileDate && fileDate < daysAgo) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedFiles.push(file);
          console.log(`🗑️ فایل قدیمی حذف شد: ${file}`);
        }
      } catch (error: any) {
        errors.push(`${file}: ${error.message}`);
        console.error(`❌ خطا در حذف ${file}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} فایل قدیمی حذف شد`,
      deletedCount,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error cleaning up old newspapers:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

