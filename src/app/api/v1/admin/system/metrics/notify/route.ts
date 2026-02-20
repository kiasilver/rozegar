import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * ????? Notification ???? ???????? ?? ???? ???? ?? ?????
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { role } = await verifyJWT(token);
    
    if (role !== 'Admin' && role !== 'Super Admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const body = await req.json();
    const { type, message, suggestion } = body;
    
    if (!type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // ????? Notification
    const notification = await prisma.notification.create({
      data: {
        title: `????? ?????: ${type === 'error' ? '???' : type === 'warning' ? '?????' : '???????'}`,
        message: `${message}${suggestion ? `\n\n???????: ${suggestion}` : ''}`,
        type: type.toUpperCase(),
        link: '/admin/setting/metrics',
      },
    });
    
    // ????? ?? ???? Admin ? Super Admin
    const adminRoles = await prisma.role.findMany({
      where: {
        name: {
          in: ['Admin', 'Super Admin'],
        },
      },
      select: { id: true },
    });
    
    const adminRoleIds = adminRoles.map(r => r.id);
    
    const admins = await prisma.user.findMany({
      where: {
        userrole: {
          some: {
            role_id: {
              in: adminRoleIds,
            },
          },
        },
      },
      select: { id: true },
    });
    
    // ????? NotificationTarget ???? ?? ?????
    await Promise.all(
      admins.map(admin =>
        prisma.notificationTarget.create({
          data: {
            notification_id: notification.id,
            user_id: admin.id,
            is_read: false,
          },
        })
      )
    );
    
    return NextResponse.json({ success: true, notificationId: notification.id });
  } catch (error: any) {
    console.error("Error creating system notification:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

