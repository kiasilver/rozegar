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
 * POST: پاک کردن همه PDF های روزنامه‌ها
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

    let deletedCount = 0;
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of pdfFiles) {
      try {
        const filePath = path.join(newspapersDir, file);
        await fs.unlink(filePath);
        deletedCount++;
        deletedFiles.push(file);
        console.log(`🗑️ فایل حذف شد: ${file}`);
      } catch (error: any) {
        errors.push(`${file}: ${error.message}`);
        console.error(`❌ خطا در حذف ${file}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} فایل با موفقیت حذف شد`,
      deletedCount,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error deleting all newspapers:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

