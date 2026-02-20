import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

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
 * GET: ?????? ????? Agent ?? ???? TelegramLog
 * ??????? ?? ?? Agent ????? ??????? ? ?? ?????? ????? ???????
 */
export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ?????? ??? ??????? ???? ?? blog_id ????? (?????? ????? ??? ?? ??????)
    const successLogs = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null },
      },
      include: {
        blog: {
          include: {
            blogcategory: {
              include: {
                translations: {
                  where: { lang: 'FA' },
                },
              },
            },
            translations: {
              where: { lang: 'FA' },
              select: {
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        processed_at: 'desc',
      },
    });

    // ????? ???? ??? ??????? ?? source_url ????? (????? ??? ?? Agent ?? RSS)
    const agentBlogs = successLogs
      .filter(log => log.blog && log.blog.source_url)
      .map(log => log.blog!);

    // ???? ???
    const totalAgentArticles = agentBlogs.length;

    // ????????? ?? ???? ?????????
    const categoryStats: Record<number, {
      id: number;
      name: string;
      count: number;
    }> = {};

    agentBlogs.forEach((blog) => {
      if (blog.blogcategory && blog.blogcategory.length > 0) {
        blog.blogcategory.forEach((category) => {
          const categoryId = category.id;
          const categoryName = category.translations?.[0]?.name || `????????? ${categoryId}`;

          if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
              id: categoryId,
              name: categoryName,
              count: 0,
            };
          }
          categoryStats[categoryId].count += 1;
        });
      }
    });

    // ????? ?? ????? ? ?????????
    const categoryStatsArray = Object.values(categoryStats).sort((a, b) => b.count - a.count);

    // ??????? RSS Feed ?? ?? source_url
    const rssFeedStats: Record<string, {
      url: string;
      domain: string;
      count: number;
    }> = {};

    agentBlogs.forEach((blog) => {
      if (blog.source_url) {
        try {
          const url = new URL(blog.source_url);
          const domain = url.hostname.replace("www.", "");

          if (!rssFeedStats[domain]) {
            rssFeedStats[domain] = {
              url: blog.source_url,
              domain: domain,
              count: 0,
            };
          }
          rssFeedStats[domain].count += 1;
        } catch (e) {
          // ??? URL ????? ????? skip ???????
        }
      }
    });

    // ????? ?? ????? ? ?????????
    const rssFeedStatsArray = Object.values(rssFeedStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // ??? 20 ?? ???

    // ???? ?????? (????? 30 ???)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAgentBlogs = agentBlogs.filter(
      (blog) => blog.created_at && blog.created_at >= thirtyDaysAgo
    );

    // ???? ?????? (????? 30 ???) ?? ???? processed_at ?? UnifiedRSSLog
    const dailyStats: Record<string, number> = {};
    successLogs
      .filter(log => {
        if (!log.blog || !log.blog.source_url) return false;
        if (!log.processed_at) return false;
        return log.processed_at >= thirtyDaysAgo;
      })
      .forEach((log) => {
        const date = log.processed_at!.toISOString().split("T")[0];
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });

    const dailyStatsArray = Object.entries(dailyStats)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ???? ?????? ? ???
    const totalSuccess = await prisma.unifiedRSSLog.count({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null },
      },
    });

    const totalErrors = await prisma.unifiedRSSLog.count({
      where: {
        telegram_status: 'error',
        website_blog_id: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        performance: {
          totalArticles: totalAgentArticles,
          recentArticles: recentAgentBlogs.length, // ????? 30 ???
          averagePerDay: dailyStatsArray.length > 0
            ? Math.round(recentAgentBlogs.length / 30 * 10) / 10
            : 0,
          totalSuccess,
          totalErrors,
          successRate: totalSuccess + totalErrors > 0
            ? Math.round((totalSuccess / (totalSuccess + totalErrors)) * 100 * 10) / 10
            : 0,
        },
        byCategory: categoryStatsArray,
        byRssFeed: rssFeedStatsArray,
        dailyStats: dailyStatsArray,
      },
    });
  } catch (error: any) {
    console.error("? [Agent Reports] ???:", error);
    return NextResponse.json(
      { error: error.message || "???? ?????????" },
      { status: 500 }
    );
  }
}
