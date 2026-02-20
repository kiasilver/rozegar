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

    const categories = await prisma.blogCategory.findMany({
      where: { is_active: true },
      include: {
        translations: {
          where: { lang: "FA" },
          select: { name: true, slug: true },
        },
        blog: {
          where: {
            status: "PUBLISHED",
            is_active: true,
            ...(Object.keys(dateFilter).length > 0 && { published_at: dateFilter }),
          },
          select: {
            id: true,
            view_count: true,
            published_at: true,
          },
        },
      },
    });

    const report = categories.map((cat) => {
      const translation = cat.translations[0];
      const totalPosts = cat.blog.length;
      const totalViews = cat.blog.reduce((sum, post) => sum + post.view_count, 0);
      const averageViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

      return {
        id: cat.id,
        name: translation?.name || "???? ???",
        slug: translation?.slug || "",
        totalPosts,
        totalViews,
        averageViews,
      };
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching categories report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

