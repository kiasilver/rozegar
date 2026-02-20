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

/**
 * POST - ??????? ?? ???? permission ???? AI Settings ???? Admin
 * ??? endpoint ?? ????????? ???? ????? ???? permission ??????? ????
 */
export async function POST() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ???? ???? ???? ??????? (parent)
    const settingsMenu = await prisma.menu.findUnique({
      where: { menukey: "admin-settings" },
    });

    if (!settingsMenu) {
      return NextResponse.json(
        {
          error: "???? ??????? ???? ???",
          message: "????? ????? seed ?? ???? ????: npm run prisma:seed",
        },
        { status: 404 }
      );
    }

    // ????? ???? ???
    let menu = await prisma.menu.findUnique({
      where: { menukey: "admin-settings-ai" },
    });

    // ??? ??? ???? ?????? ????? ??
    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          menukey: "admin-settings-ai",
          url: "/admin/setting/ai",
          icon: null,
          order: 2,
          is_active: true,
          target: "_self",
          parentid: settingsMenu.menuid,
          translations: {
            create: {
              lang: "FA",
              title: "??? ??????",
            },
          },
        },
      });
    }

    // ????? ???? permission
    const existing = await prisma.roleMenuPermissions.findUnique({
      where: {
        rolename_menukey: {
          rolename: "Admin",
          menukey: "admin-settings-ai",
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Permission ?? ??? ???? ????",
        permission: existing,
      });
    }

    // ????? permission
    const permission = await prisma.roleMenuPermissions.create({
      data: {
        rolename: "Admin",
        menukey: "admin-settings-ai",
        canview: true,
        canedit: true,
        candelete: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Permission ?? ?????? ????? ??",
      permission,
    });
  } catch (error) {
    console.error("Error ensuring permission:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

