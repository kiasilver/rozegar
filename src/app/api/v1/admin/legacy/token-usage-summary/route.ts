import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";
import { getTodayStartIran } from "@/lib/automation/telegram/rss-date-utils";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * GET: ?????? ???? ???? ???? (??????? ??????? ??????)
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

    const now = new Date();
    const todayStart = getTodayStartIran();
    
    // ?????? ????????? ????
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // ???? ?????? (?????)
    const dailyStats = await prisma.tokenUsage.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
          lte: now,
        },
      },
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

    // ???? ?????? (??? ???)
    const monthlyStats = await prisma.tokenUsage.aggregate({
      where: {
        createdAt: {
          gte: monthStart,
          lte: now,
        },
      },
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

    // ???? ?????? (?????)
    const yearlyStats = await prisma.tokenUsage.aggregate({
      where: {
        createdAt: {
          gte: yearStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Provider (??????)
    const dailyByProvider = await prisma.tokenUsage.groupBy({
      by: ["provider"],
      where: {
        createdAt: {
          gte: todayStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Provider (??????)
    const monthlyByProvider = await prisma.tokenUsage.groupBy({
      by: ["provider"],
      where: {
        createdAt: {
          gte: monthStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Provider (??????)
    const yearlyByProvider = await prisma.tokenUsage.groupBy({
      by: ["provider"],
      where: {
        createdAt: {
          gte: yearStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Operation (??????)
    const dailyByOperation = await prisma.tokenUsage.groupBy({
      by: ["operation"],
      where: {
        createdAt: {
          gte: todayStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Operation (??????)
    const monthlyByOperation = await prisma.tokenUsage.groupBy({
      by: ["operation"],
      where: {
        createdAt: {
          gte: monthStart,
          lte: now,
        },
      },
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

    // ???? ?? ???? Operation (??????)
    const yearlyByOperation = await prisma.tokenUsage.groupBy({
      by: ["operation"],
      where: {
        createdAt: {
          gte: yearStart,
          lte: now,
        },
      },
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

    // ?????? ??????? ?????? ???? ?????? ? ??????
    const daysInMonth = Math.ceil((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysInYear = Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      success: true,
      daily: {
        summary: {
          totalTokens: Number(dailyStats._sum.totalTokens) || 0,
          inputTokens: Number(dailyStats._sum.inputTokens) || 0,
          outputTokens: Number(dailyStats._sum.outputTokens) || 0,
          totalCost: Number(dailyStats._sum.cost) || 0,
          totalRequests: dailyStats._count.id || 0,
        },
        byProvider: dailyByProvider.map((stat) => ({
          provider: stat.provider,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
        byOperation: dailyByOperation.map((stat) => ({
          operation: stat.operation,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
      },
      monthly: {
        summary: {
          totalTokens: Number(monthlyStats._sum.totalTokens) || 0,
          inputTokens: Number(monthlyStats._sum.inputTokens) || 0,
          outputTokens: Number(monthlyStats._sum.outputTokens) || 0,
          totalCost: Number(monthlyStats._sum.cost) || 0,
          totalRequests: monthlyStats._count.id || 0,
          avgTokensPerDay: daysInMonth > 0 ? Math.round(Number(monthlyStats._sum.totalTokens) / daysInMonth) : 0,
          avgCostPerDay: daysInMonth > 0 ? Number(monthlyStats._sum.cost) / daysInMonth : 0,
        },
        byProvider: monthlyByProvider.map((stat) => ({
          provider: stat.provider,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
        byOperation: monthlyByOperation.map((stat) => ({
          operation: stat.operation,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
      },
      yearly: {
        summary: {
          totalTokens: Number(yearlyStats._sum.totalTokens) || 0,
          inputTokens: Number(yearlyStats._sum.inputTokens) || 0,
          outputTokens: Number(yearlyStats._sum.outputTokens) || 0,
          totalCost: Number(yearlyStats._sum.cost) || 0,
          totalRequests: yearlyStats._count.id || 0,
          avgTokensPerDay: daysInYear > 0 ? Math.round(Number(yearlyStats._sum.totalTokens) / daysInYear) : 0,
          avgCostPerDay: daysInYear > 0 ? Number(yearlyStats._sum.cost) / daysInYear : 0,
        },
        byProvider: yearlyByProvider.map((stat) => ({
          provider: stat.provider,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
        byOperation: yearlyByOperation.map((stat) => ({
          operation: stat.operation,
          totalTokens: Number(stat._sum.totalTokens) || 0,
          inputTokens: Number(stat._sum.inputTokens) || 0,
          outputTokens: Number(stat._sum.outputTokens) || 0,
          cost: Number(stat._sum.cost) || 0,
          requests: stat._count.id || 0,
        })),
      },
    });
  } catch (error: any) {
    console.error("[TokenUsage Summary API] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch token usage summary" },
      { status: 500 }
    );
  }
}

