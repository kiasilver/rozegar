import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.userId === 'string' ? parseInt(payload.userId, 10) : payload.userId;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get all notifications (both read and unread) for the user
    const notifications = await prisma.notificationTarget.findMany({
      where: {
        user_id: userId,
      },
      include: {
        notification: true,
      },
      orderBy: {
        notification: {
          created_at: 'desc',
        },
      },
      take: 100, // Increased limit to show more notifications
    });

    return NextResponse.json(notifications.map(nt => ({
      id: nt.id,
      notificationId: nt.notification_id,
      title: nt.notification?.title,
      message: nt.notification?.message,
      type: nt.notification?.type || 'info',
      link: nt.notification?.link,
      createdAt: nt.notification?.created_at,
      isRead: nt.is_read,
    })));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== 'Admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type = 'info', link, userIds } = body;

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        link,
      },
    });

    // Create notification targets for all admin users if userIds not specified
    let targetUserIds: number[] = [];
    if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else {
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
      targetUserIds = adminUsers.map(u => u.id);
    }

    // Create notification targets
    await prisma.notificationTarget.createMany({
      data: targetUserIds.map(userId => ({
        notification_id: notification.id,
        user_id: userId,
        is_read: false,
      })),
    });

    return NextResponse.json({ success: true, notificationId: notification.id });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.userId === 'string' ? parseInt(payload.userId, 10) : payload.userId;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationTargetId, isRead } = body;

    if (notificationTargetId) {
      // Mark specific notification as read
      await prisma.notificationTarget.update({
        where: { id: notificationTargetId },
        data: {
          is_read: isRead !== undefined ? isRead : true,
          read_at: isRead !== false ? new Date() : null,
        },
      });
    } else {
      // Mark all notifications as read for this user
      await prisma.notificationTarget.updateMany({
        where: {
          user_id: userId,
          is_read: false,
        },
        data: {
          is_read: true,
          read_at: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.userId === 'string' ? parseInt(payload.userId, 10) : payload.userId;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationTargetId } = body;

    if (notificationTargetId) {
      // First verify the notification belongs to this user, then delete
      const notificationTarget = await prisma.notificationTarget.findFirst({
        where: {
          id: notificationTargetId,
          user_id: userId,
        },
      });

      if (!notificationTarget) {
        return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
      }

      await prisma.notificationTarget.delete({
        where: { 
          id: notificationTargetId,
        },
      });
    } else {
      // Delete all notifications for this user
      await prisma.notificationTarget.deleteMany({
        where: {
          user_id: userId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

