import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

// بررسی اینکه تبلیغات فعال هستند یا نه
async function checkAdsEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "ads_enabled" },
    });
    // اگر تنظیمات وجود نداشت، به صورت پیش‌فرض فعال است
    return setting?.value !== "false";
  } catch {
    return true; // به صورت پیش‌فرض فعال
  }
}

// GET - دریافت تبلیغات فعال برای نمایش در سایت
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const position = searchParams.get("position");
    const limit = searchParams.get("limit"); // برای sidebar که می‌خواهد چند تبلیغ بگیرد

    // اگر position مشخص نشده، وضعیت تبلیغات را برگردان
    if (!position) {
      const enabled = await checkAdsEnabled();
      return NextResponse.json({ enabled });
    }

    // بررسی اینکه تبلیغات فعال هستند یا نه
    const adsEnabled = await checkAdsEnabled();
    if (!adsEnabled) {
      return NextResponse.json(null);
    }

    const now = new Date();
    const takeLimit = limit ? parseInt(limit, 10) : 1;

    const ads = await prisma.ad.findMany({
      where: {
        position: position as any,
        is_active: true,
        OR: [
          { start_date: null },
          { start_date: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { end_date: null },
              { end_date: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [{ priority: "desc" }, { created_at: "desc" }],
      take: takeLimit,
    });

    // افزایش view_count برای همه تبلیغات
    if (ads.length > 0) {
      await Promise.all(
        ads.map((ad) =>
          prisma.ad.update({
            where: { id: ad.id },
            data: { view_count: { increment: 1 } },
          })
        )
      );
    }

    // اگر فقط یک تبلیغ خواسته شده، همان را برگردان
    if (takeLimit === 1) {
      return NextResponse.json(ads[0] || null);
    }

    // در غیر این صورت، لیست تبلیغات را برگردان
    return NextResponse.json(ads);
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

