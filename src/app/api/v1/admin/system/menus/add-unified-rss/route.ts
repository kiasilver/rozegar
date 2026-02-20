import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * POST: ????? ???? ???? Unified RSS
 */
export async function POST() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ???? ???? ???? Settings
    const settingsMenu = await prisma.menu.findFirst({
      where: { menukey: "admin-settings" },
    });

    if (!settingsMenu) {
      return NextResponse.json(
        { error: "???? Settings ???? ???" },
        { status: 404 }
      );
    }

    // ????? ???? ???? Unified RSS
    const existingMenu = await prisma.menu.findFirst({
      where: { menukey: "admin-settings-unified-rss" },
    });

    if (existingMenu) {
      return NextResponse.json({
        success: true,
        message: "???? Unified RSS ?? ??? ???? ????",
        menuId: existingMenu.menuid,
      });
    }

    // ????? ???? ????
    const newMenu = await prisma.menu.create({
      data: {
        menukey: "admin-settings-unified-rss",
        url: "/admin/rss-unified",
        icon: "rss",
        order: 9,
        is_active: true,
        target: "_self",
        parentid: settingsMenu.menuid,
        translations: {
          create: {
            lang: "FA",
            title: "??????? RSS ???????",
          },
        },
      },
    });

    // ????? ???? ?????????
    await prisma.roleMenuPermissions.createMany({
      data: [
        {
          rolename: "Admin",
          menukey: "admin-settings-unified-rss",
          canview: true,
          canedit: true,
          candelete: true,
        },
        {
          rolename: "Super Admin",
          menukey: "admin-settings-unified-rss",
          canview: true,
          canedit: true,
          candelete: true,
        },
      ],
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: "???? Unified RSS ?? ?????? ????? ??",
      menuId: newMenu.menuid,
      url: newMenu.url,
    });
  } catch (error: any) {
    console.error("[Add Unified RSS Menu] Error:", error);
    return NextResponse.json(
      { error: error.message || "??? ?? ????? ???? ???" },
      { status: 500 }
    );
  }
}

