import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * GET: ?????? ???? ?????? ????? ??? ?? ?????? ?? ???? ?????????
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

    // ?????? ??? ??????? ????
    const successLogs = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null }, // ??? ???????? ?? blog_id ????? (?????? ????? ???)
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
          },
        },
      },
    });

    // ????? ?? ???? ? ???
    const totalSuccess = await prisma.unifiedRSSLog.count({
      where: { 
        telegram_sent: true,
        telegram_status: 'success' 
      },
    });

    const totalErrors = await prisma.unifiedRSSLog.count({
      where: { 
        telegram_status: 'error' 
      },
    });

    // ????????? ?? ???? ?????????
    const categoryStats: Record<number, {
      id: number;
      name: string;
      count: number;
    }> = {};

    successLogs.forEach((log) => {
      if (log.blog && log.blog.blogcategory && log.blog.blogcategory.length > 0) {
        log.blog.blogcategory.forEach((category) => {
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

    // ????? ?? ????? ? ????????? ?? ???? ????? (??????? ???)
    const categoryStatsArray = Object.values(categoryStats).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        totalSuccess,
        totalErrors,
        totalWithCategories: categoryStatsArray.reduce((sum, cat) => sum + cat.count, 0),
        categories: categoryStatsArray,
      },
    });
  } catch (error: any) {
    console.error('? [Telegram Reports] ???:', error);
    return NextResponse.json(
      { error: error.message || "???? ?????????" },
      { status: 500 }
    );
  }
}
