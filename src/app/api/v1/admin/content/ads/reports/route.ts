import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function GET(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;

    switch (range) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }

    // Build where clause
    const whereClause: any = {};
    if (startDate) {
      whereClause.created_at = { gte: startDate };
    }

    // Get all ads
    const ads = await prisma.ad.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        position: true,
        view_count: true,
        click_count: true,
        is_active: true,
        created_at: true,
      },
    });

    // Calculate statistics
    const totalAds = ads.length;
    const activeAds = ads.filter((ad) => ad.is_active).length;
    const totalViews = ads.reduce((sum, ad) => sum + ad.view_count, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.click_count, 0);
    const averageCTR =
      totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    // Calculate CTR for each ad
    const adsWithCTR = ads.map((ad) => ({
      ...ad,
      ctr: ad.view_count > 0 ? (ad.click_count / ad.view_count) * 100 : 0,
    }));

    // Daily stats (last 30 days)
    const dailyStats = [];
    const daysToShow = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30;
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      
      // For simplicity, distribute total views/clicks evenly across days
      // In a real system, you'd track views/clicks per day separately
      const dayViews = Math.floor(totalViews / daysToShow);
      const dayClicks = Math.floor(totalClicks / daysToShow);

      dailyStats.push({
        date: date.toISOString(),
        views: dayViews,
        clicks: dayClicks,
      });
    }

    // Position stats
    const positionMap = new Map<string, { views: number; clicks: number }>();
    ads.forEach((ad) => {
      const existing = positionMap.get(ad.position) || { views: 0, clicks: 0 };
      positionMap.set(ad.position, {
        views: existing.views + ad.view_count,
        clicks: existing.clicks + ad.click_count,
      });
    });

    const positionStats = Array.from(positionMap.entries()).map(([position, stats]) => ({
      position,
      views: stats.views,
      clicks: stats.clicks,
      ctr: stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0,
    }));

    return NextResponse.json({
      totalAds,
      activeAds,
      totalViews,
      totalClicks,
      averageCTR,
      ads: adsWithCTR,
      dailyStats,
      positionStats,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

