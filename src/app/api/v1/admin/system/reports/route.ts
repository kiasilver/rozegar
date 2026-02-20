import { NextResponse } from "next/server";
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
 * GET - ?????? ????????? ?????
 * Query params:
 * - type: ads | authors | analytics | author-performance
 * - startDate: ????? ???? (ISO string)
 * - endDate: ????? ????? (ISO string)
 * - authorId: ID ??????? (???? ????????? author)
 */
export async function GET(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, userId } = await verifyJWT(token);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const authorId = searchParams.get("authorId");

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    switch (type) {
      case "ads":
        if (role !== "Admin") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(await getAdsReport(dateFilter));

      case "authors":
        if (role !== "Admin") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(await getAuthorsReport(dateFilter));

      case "analytics":
        if (role !== "Admin") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(await getAnalyticsReport(dateFilter));

      case "author-performance":
        const targetAuthorId = authorId ? parseInt(authorId) : userId;
        if (role !== "Admin" && targetAuthorId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(await getAuthorPerformanceReport(targetAuthorId, dateFilter));

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * ????? ???????
 */
async function getAdsReport(dateFilter: any) {
  const ads = await prisma.ad.findMany({
    where: {
      ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
    },
    select: {
      id: true,
      title: true,
      position: true,
      click_count: true,
      view_count: true,
      is_active: true,
      created_at: true,
    },
  });

  const totalClicks = ads.reduce((sum, ad) => sum + ad.click_count, 0);
  const totalViews = ads.reduce((sum, ad) => sum + ad.view_count, 0);
  const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  // Group by position
  const byPosition = ads.reduce((acc, ad) => {
    if (!acc[ad.position]) {
      acc[ad.position] = { clicks: 0, views: 0, count: 0 };
    }
    acc[ad.position].clicks += ad.click_count;
    acc[ad.position].views += ad.view_count;
    acc[ad.position].count += 1;
    return acc;
  }, {} as Record<string, { clicks: number; views: number; count: number }>);

  return {
    summary: {
      totalAds: ads.length,
      activeAds: ads.filter((ad) => ad.is_active).length,
      totalClicks,
      totalViews,
      averageCTR: Math.round(ctr * 100) / 100,
    },
    byPosition,
    ads: ads.map((ad) => ({
      ...ad,
      ctr: ad.view_count > 0 ? Math.round((ad.click_count / ad.view_count) * 10000) / 100 : 0,
    })),
  };
}

/**
 * ????? ?????????
 */
async function getAuthorsReport(dateFilter: any) {
  const authors = await prisma.user.findMany({
    where: {
      userrole: {
        some: {
          role: {
            name: {
              in: ["Author", "Editor"],
            },
          },
        },
      },
    },
    include: {
      blog: {
        where: {
          ...(Object.keys(dateFilter).length > 0 && { published_at: dateFilter }),
          status: "PUBLISHED",
        },
        select: {
          id: true,
          view_count: true,
          published_at: true,
        },
      },
    },
  });

  return authors.map((author) => {
    const totalViews = author.blog.reduce((sum, post) => sum + post.view_count, 0);
    const averageViews = author.blog.length > 0 ? Math.round(totalViews / author.blog.length) : 0;

    return {
      id: author.id,
      name: author.name,
      email: author.email,
      totalPosts: author.blog.length,
      totalViews,
      averageViews,
      lastPostDate: author.blog[0]?.published_at || null,
    };
  });
}

/**
 * ????? Analytics ???
 */
async function getAnalyticsReport(dateFilter: any) {
  const blogs = await prisma.blog.findMany({
    where: {
      status: "PUBLISHED",
      is_active: true,
      ...(Object.keys(dateFilter).length > 0 && { published_at: dateFilter }),
    },
    select: {
      id: true,
      view_count: true,
      published_at: true,
      blogcategory: {
        include: {
          translations: {
            where: { lang: "FA" },
            select: { name: true },
          },
        },
      },
    },
  });

  const totalViews = blogs.reduce((sum, blog) => sum + blog.view_count, 0);
  const totalPosts = blogs.length;
  const averageViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

  // Group by category
  const byCategory = blogs.reduce((acc, blog) => {
    const category = blog.blogcategory[0]?.translations[0]?.name || "???? ????";
    if (!acc[category]) {
      acc[category] = { posts: 0, views: 0 };
    }
    acc[category].posts += 1;
    acc[category].views += blog.view_count;
    return acc;
  }, {} as Record<string, { posts: number; views: number }>);

  // Group by date (daily)
  const byDate = blogs.reduce((acc, blog) => {
    if (!blog.published_at) return acc;
    const date = blog.published_at.toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { posts: 0, views: 0 };
    }
    acc[date].posts += 1;
    acc[date].views += blog.view_count;
    return acc;
  }, {} as Record<string, { posts: number; views: number }>);

  return {
    summary: {
      totalPosts,
      totalViews,
      averageViews,
    },
    byCategory,
    byDate: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
  };
}

/**
 * ????? ?????? ???????
 */
async function getAuthorPerformanceReport(authorId: number, dateFilter: any) {
  const blogs = await prisma.blog.findMany({
    where: {
      author_id: authorId,
      status: "PUBLISHED",
      is_active: true,
      ...(Object.keys(dateFilter).length > 0 && { published_at: dateFilter }),
    },
    include: {
      translations: {
        where: { lang: "FA" },
        select: {
          title: true,
          slug: true,
        },
      },
      blogcategory: {
        include: {
          translations: {
            where: { lang: "FA" },
            select: { name: true },
          },
        },
      },
    },
    orderBy: { published_at: "desc" },
  });

  const totalViews = blogs.reduce((sum, blog) => sum + blog.view_count, 0);
  const averageViews = blogs.length > 0 ? Math.round(totalViews / blogs.length) : 0;

  // Top performing posts
  const topPosts = blogs
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 10)
    .map((blog) => ({
      id: blog.id,
      title: blog.translations[0]?.title || "???? ?????",
      slug: blog.translations[0]?.slug || blog.slug,
      views: blog.view_count,
      category: blog.blogcategory[0]?.translations[0]?.name || "???? ????",
      publishedAt: blog.published_at,
    }));

  // Performance by date
  const byDate = blogs.reduce((acc, blog) => {
    if (!blog.published_at) return acc;
    const date = blog.published_at.toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { posts: 0, views: 0 };
    }
    acc[date].posts += 1;
    acc[date].views += blog.view_count;
    return acc;
  }, {} as Record<string, { posts: number; views: number }>);

  return {
    summary: {
      totalPosts: blogs.length,
      totalViews,
      averageViews,
    },
    topPosts,
    byDate: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
    posts: blogs.map((blog) => ({
      id: blog.id,
      title: blog.translations[0]?.title || "???? ?????",
      views: blog.view_count,
      publishedAt: blog.published_at,
    })),
  };
}
