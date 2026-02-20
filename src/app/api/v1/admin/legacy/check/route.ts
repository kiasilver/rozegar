/**
 * API endpoint برای چک کردن ویدیوها و اینفوگرافیک‌های جدید از اقتصادآنلاین
 * 
 * Note: این endpoint از scripts folder استفاده می‌کند که در build time bundle نمی‌شود
 */

import { NextRequest, NextResponse } from "next/server";

// Mark this route as runtime-only to prevent bundling issues
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 شروع چک کردن اقتصادآنلاین...");

    // اجرای اسکریپت به صورت جداگانه
    // استفاده از dynamic import برای جلوگیری از bundle شدن در build time
    const childProcess = await import("child_process");
    
    // فقط در runtime اجرا شود (نه در build time)
    // استفاده از Function constructor برای جلوگیری از static analysis در build time
    const cwd = process.cwd();
    const scriptsFolder = "scripts";
    const scriptName = "fetch-eghtesadonline-media.js";
    // استفاده از Function constructor برای جلوگیری از static analysis
    const joinPath = new Function('parts', 'return parts.join("/")');
    const scriptPath = joinPath([cwd, scriptsFolder, scriptName]);
    
    const nodeProcess = childProcess.spawn("node", [scriptPath], {
      detached: true,
      stdio: "ignore",
    });

    // جدا کردن process از parent
    nodeProcess.unref();

    return NextResponse.json({
      success: true,
      message: "چک کردن اقتصادآنلاین شروع شد",
      pid: nodeProcess.pid,
    });
  } catch (error: any) {
    console.error("❌ خطا در endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "خطا در اجرای اسکریپت",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "برای چک کردن اقتصادآنلاین، از POST استفاده کنید",
    endpoint: "/api/v1/admin/legacy/check",
    method: "POST",
    description: "این endpoint اسکریپت fetch-eghtesadonline-media.js را اجرا می‌کند",
  });
}

