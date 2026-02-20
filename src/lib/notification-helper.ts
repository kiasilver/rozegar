/**
 * Helper برای ایجاد notification
 */

import { prisma } from "./core/prisma";

export interface CreateNotificationOptions {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
  userIds?: number[]; // اگر مشخص نشود، به همه admin ها ارسال می‌شود
}

/**
 * ایجاد notification برای admin ها
 */
export async function createNotification(options: CreateNotificationOptions) {
  try {
    const { title, message, type = "info", link, userIds } = options;

    // ایجاد notification
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type.toUpperCase(),
        link,
      },
    });

    // تعیین user های هدف
    let targetUserIds: number[] = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // دریافت همه admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          userrole: {
            some: {
              role: {
                name: {
                  in: ["Admin", "Super Admin"],
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      });
      targetUserIds = adminUsers.map((u) => u.id);
    }

    // ایجاد notification targets
    if (targetUserIds.length > 0) {
      await prisma.notificationTarget.createMany({
        data: targetUserIds.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
          is_read: false,
        })),
      });
    }

    // Log غیرفعال شده برای کاهش spam
    // console.log(`✅ Notification ایجاد شد: ${title} (${targetUserIds.length} کاربر)`);
    return notification;
  } catch (error) {
    console.error("❌ خطا در ایجاد notification:", error);
    throw error;
  }
}

/**
 * ایجاد notification برای موفقیت در تولید بلاگ
 */
export async function notifyBlogCreated(blogId: number, title: string, categoryName: string, userId?: number) {
  return createNotification({
    title: "✅ بلاگ جدید با AI ساخته شد",
    message: `بلاگ "${title.substring(0, 50)}..." در دسته "${categoryName}" با موفقیت ایجاد شد.`,
    type: "success",
    link: `/admin/blog/${blogId}/edit`,
    userIds: userId ? [userId] : undefined,
  });
}

/**
 * ایجاد notification برای خطا در تولید بلاگ
 */
export async function notifyBlogError(categoryName: string, error: string, userId?: number) {
  return createNotification({
    title: "❌ خطا در تولید بلاگ با AI",
    message: `خطا در تولید بلاگ برای دسته "${categoryName}": ${error.substring(0, 200)}`,
    type: "error",
    link: "/admin/blog/addblog",
    userIds: userId ? [userId] : undefined,
  });
}

