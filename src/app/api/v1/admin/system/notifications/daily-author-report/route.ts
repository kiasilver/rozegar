import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

/**
 * API endpoint to create daily author report notification
 * This should be called by a cron job or scheduled task
 */
export async function POST(req: Request) {
  try {
    // Verify admin access (for manual trigger) or use API key for cron
    const authHeader = req.headers.get('authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      // Cron job access
    } else {
      // Manual access - verify JWT
      const cookieStore = await cookies();
      const token = cookieStore.get("session")?.value;
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.role !== 'Admin' && payload.role !== 'Super Admin') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all authors
    const authors = await prisma.user.findMany({
      where: {
        userrole: {
          some: {
            role: {
              name: 'Author',
            },
          },
        },
      },
      include: {
        blog: {
          where: {
            created_at: {
              gte: yesterday,
              lt: today,
            },
          },
          select: {
            id: true,
            view_count: true,
            status: true,
            created_at: true,
          },
        },
      },
    });

    // Calculate report data
    const reportData = authors.map(author => {
      const totalPosts = author.blog.length;
      const publishedPosts = author.blog.filter(b => b.status === 'PUBLISHED').length;
      const totalViews = author.blog.reduce((sum, b) => sum + b.view_count, 0);

      return {
        authorId: author.id,
        authorName: author.name,
        totalPosts,
        publishedPosts,
        totalViews,
      };
    }).filter(author => author.totalPosts > 0); // Only authors with activity

    if (reportData.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No author activity yesterday",
        reportData: [] 
      });
    }

    // Create notification message
    const totalAuthors = reportData.length;
    const totalPosts = reportData.reduce((sum, a) => sum + a.totalPosts, 0);
    const totalViews = reportData.reduce((sum, a) => sum + a.totalViews, 0);
    const topAuthor = reportData.sort((a, b) => b.totalViews - a.totalViews)[0];

    const message = `????? ?????? ?????????:\n` +
      `?? ${totalAuthors} ??????? ????\n` +
      `?? ${totalPosts} ??? ????\n` +
      `??? ${totalViews.toLocaleString('fa-IR')} ??????\n` +
      `? ?????? ???????: ${topAuthor.authorName} (${topAuthor.totalViews.toLocaleString('fa-IR')} ??????)`;

    // Get all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        userrole: {
          some: {
            role: {
              name: {
                in: ['Admin', 'Super Admin'],
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (adminUsers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No admin users found" 
      });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: "????? ?????? ?????????",
        message,
        type: "info",
        link: "/admin/reports?type=authors",
      },
    });

    // Create notification targets for all admin users
    await prisma.notificationTarget.createMany({
      data: adminUsers.map(user => ({
        notification_id: notification.id,
        user_id: user.id,
        is_read: false,
      })),
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: notification.id,
      reportData,
      message: "Daily author report notification created successfully"
    });
  } catch (error) {
    console.error("Error creating daily author report notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

