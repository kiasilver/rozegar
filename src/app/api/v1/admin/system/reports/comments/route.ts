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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const comments = await prisma.blogComment.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
      },
      include: {
        blog: {
          include: {
            translations: {
              where: { lang: "FA" },
              select: { title: true },
            },
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const totalComments = comments.length;
    const approvedComments = comments.filter((c) => c.status === "APPROVED").length;
    const pendingComments = comments.filter((c) => c.status === "PENDING").length;

    // Group by date
    const byDate = comments.reduce((acc, comment) => {
      const date = comment.created_at.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { total: 0, approved: 0, pending: 0 };
      }
      acc[date].total += 1;
      if (comment.status === "APPROVED") acc[date].approved += 1;
      else if (comment.status === "PENDING") acc[date].pending += 1;
      return acc;
    }, {} as Record<string, { total: number; approved: number; pending: number }>);

    return NextResponse.json({
      summary: {
        totalComments,
        approvedComments,
        pendingComments,
      },
      byDate: Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content.substring(0, 100),
        blogTitle: c.blog.translations[0]?.title || "???? ?????",
        userName: c.user?.name || "??????",
        isApproved: c.status === "APPROVED",
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching comments report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

