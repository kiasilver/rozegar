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

// به‌روزرسانی منو
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPayload = await verifyJWT(token);
    if (!userPayload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { group, custom_group_name, title, url, target, ...rest } = body;

    // Validation برای custom group
    if (group === 'custom' && !custom_group_name?.trim()) {
      return NextResponse.json(
        { error: "برای دسته دلخواه، نام دسته الزامی است" },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    // اضافه کردن فیلدها فقط اگر وجود داشته باشند
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (target !== undefined) updateData.target = target;
    if (group !== undefined) {
      updateData.group = group;
      // تنظیم custom_group_name بر اساس group
      if (group === 'custom') {
        if (custom_group_name?.trim()) {
          updateData.custom_group_name = custom_group_name.trim();
        }
      } else {
        updateData.custom_group_name = null;
      }
    }

    const menu = await prisma.footerMenu.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        title: true,
        url: true,
        group: true,
        custom_group_name: true,
        order: true,
        is_active: true,
        target: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json(menu);
  } catch (error) {
    console.error("Error updating footer menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// حذف منو
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPayload = await verifyJWT(token);
    if (!userPayload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.footerMenu.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting footer menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

