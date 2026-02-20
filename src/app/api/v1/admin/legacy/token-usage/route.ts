import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

/**
 * GET: ?????? ???? ???? ????
 * Query params:
 * - period: "day" | "week" | "month" (default: "month")
 * - provider: filter by provider (optional)
 * - operation: filter by operation (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period") || "month";
    const provider = searchParams.get("provider");
    const operation = searchParams.get("operation");

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (provider) {
      where.provider = provider;
    }

    if (operation) {
      where.operation = operation;
    }

    // Get total stats
    const totalStats = await prisma.tokenUsage.aggregate({
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    });

    // Get stats by provider
    const statsByProvider = await prisma.tokenUsage.groupBy({
      by: ["provider"],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    });

    // Get stats by operation
    const statsByOperation = await prisma.tokenUsage.groupBy({
      by: ["operation"],
      where,
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    });

    // Get daily stats for the period
    const allDailyRecords = await prisma.tokenUsage.findMany({
      where,
      select: {
        createdAt: true,
        totalTokens: true,
        cost: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by date
    const dailyMap = new Map<string, { totalTokens: number; totalCost: number; count: number }>();
    allDailyRecords.forEach((record) => {
      const dateKey = record.createdAt.toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey) || { totalTokens: 0, totalCost: 0, count: 0 };
      dailyMap.set(dateKey, {
        totalTokens: existing.totalTokens + record.totalTokens,
        totalCost: existing.totalCost + (record.cost || 0),
        count: existing.count + 1,
      });
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        requests: stats.count,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate average per day
    const daysInPeriod = period === "day" ? 1 : period === "week" ? 7 : 30;
    const avgTokensPerDay = totalStats._sum.totalTokens
      ? Math.round(Number(totalStats._sum.totalTokens) / daysInPeriod)
      : 0;
    const avgCostPerDay = totalStats._sum.cost
      ? Number(totalStats._sum.cost) / daysInPeriod
      : 0;

    // Estimate monthly cost (extrapolate from current period)
    const monthlyEstimate = period === "month"
      ? totalStats._sum.cost || 0
      : (totalStats._sum.cost || 0) * (30 / daysInPeriod);

    return NextResponse.json({
      success: true,
      period,
      summary: {
        totalTokens: Number(totalStats._sum.totalTokens) || 0,
        inputTokens: Number(totalStats._sum.inputTokens) || 0,
        outputTokens: Number(totalStats._sum.outputTokens) || 0,
        totalCost: Number(totalStats._sum.cost) || 0,
        totalRequests: totalStats._count.id || 0,
        avgTokensPerDay,
        avgCostPerDay,
        monthlyEstimate,
      },
      byProvider: statsByProvider.map((stat) => ({
        provider: stat.provider,
        totalTokens: Number(stat._sum.totalTokens) || 0,
        inputTokens: Number(stat._sum.inputTokens) || 0,
        outputTokens: Number(stat._sum.outputTokens) || 0,
        cost: Number(stat._sum.cost) || 0,
        requests: stat._count.id || 0,
      })),
      byOperation: statsByOperation.map((stat) => ({
        operation: stat.operation,
        totalTokens: Number(stat._sum.totalTokens) || 0,
        inputTokens: Number(stat._sum.inputTokens) || 0,
        outputTokens: Number(stat._sum.outputTokens) || 0,
        cost: Number(stat._sum.cost) || 0,
        requests: stat._count.id || 0,
      })),
      daily: dailyStats.map((stat) => ({
        date: stat.date,
        totalTokens: Number(stat.totalTokens),
        totalCost: Number(stat.totalCost),
        requests: Number(stat.requests),
      })),
    });
  } catch (error: any) {
    console.error("[TokenUsage API] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch token usage" },
      { status: 500 }
    );
  }
}

