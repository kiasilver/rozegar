/**
 * Cron Job Endpoint for EghtesadOnline News Scraper
 * این endpoint برای cron job استفاده می‌شود
 * صفحه لیست خبرهای اقتصاد آنلاین را scrape کرده و خبرهای جدید را پردازش می‌کند
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleCronRequest(req: NextRequest) {
  try {
    // بررسی API Key
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.CRON_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "CRON_API_KEY تنظیم نشده است" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional query params
    const { searchParams } = new URL(req.url);
    const categoryId = parseInt(searchParams.get('categoryId') || '1');
    const categoryName = searchParams.get('categoryName') || 'اقتصادی';
    const maxItems = parseInt(searchParams.get('maxItems') || '10');
    const telegram = searchParams.get('telegram') !== 'false';
    const website = searchParams.get('website') !== 'false';

    console.log("📺 شروع scrape اقتصاد آنلاین...");

    // Dynamic import to prevent bundling issues
    const { scrapeAndProcessEghtesadonline } = await import(
      '@/lib/automation/scrapers/eghtesadonline-scraper'
    );

    const result = await scrapeAndProcessEghtesadonline(
      categoryId,
      categoryName,
      { telegram, website, maxItems }
    );

    return NextResponse.json({
      success: true,
      message: `اقتصاد آنلاین: ${result.processed} خبر پردازش شد، ${result.duplicates} تکراری، ${result.errors} خطا`,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("❌ خطا در cron job اقتصاد آنلاین:", error);

    return NextResponse.json(
      {
        error: error.message || "خطا در اجرای cron job",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCronRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req);
}
