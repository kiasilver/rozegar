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
 * POST - ??????? ?? ???? ???? Token Usage ?? Reports
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

    // ???? ???? ???? Reports (parent)
    const reportsMenu = await prisma.menu.findFirst({
      where: {
        OR: [
          { menukey: "admin-reports" },
          { url: "/admin/reports" },
        ],
      },
    });

    // ??? ???? Reports ???? ?????? ????? ??
    let parentMenu = reportsMenu;
    if (!parentMenu) {
      // ???? ???? ???? ???? (Main) ???? ????? ???? Reports
      const mainMenu = await prisma.menu.findFirst({
        where: {
          OR: [
            { menukey: "admin-dashboard" },
            { url: "/admin/dashboard" },
          ],
        },
      });

      if (!mainMenu) {
        return NextResponse.json(
          {
            error: "???? ???? ???? ???",
            message: "????? ????? seed ?? ???? ????: npm run prisma:seed",
          },
          { status: 404 }
        );
      }

      // ????? ???? Reports
      parentMenu = await prisma.menu.create({
        data: {
          menukey: "admin-reports",
          url: "/admin/reports",
          icon: null,
          order: 5,
          is_active: true,
          target: "_self",
          parentid: null,
          translations: {
            create: {
              lang: "FA",
              title: "????????",
            },
          },
        },
      });
    }

    // ????? ???? ???? Token Usage
    let menu = await prisma.menu.findFirst({
      where: {
        OR: [
          { menukey: "admin-reports-token-usage" },
          { url: "/admin/reports/token-usage" },
        ],
      },
    });

    // ??? ??? ???? ?????? ????? ??
    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          menukey: "admin-reports-token-usage",
          url: "/admin/reports/token-usage",
          icon: "metrics", // ????? chart/analytics
          order: 0,
          is_active: true,
          target: "_self",
          parentid: parentMenu.menuid,
          translations: {
            create: {
              lang: "FA",
              title: "??? ???? ????",
            },
          },
        },
      });
    } else if (!menu.icon) {
      // ??? ??? ???? ???? ??? ????? ?????? ????? ?? ????? ??
      menu = await prisma.menu.update({
        where: { menuid: menu.menuid },
        data: { icon: "metrics" },
      });
    }

    // ????? ???? permission ???? Admin
    const existingAdmin = await prisma.roleMenuPermissions.findUnique({
      where: {
        rolename_menukey: {
          rolename: "Admin",
          menukey: "admin-reports-token-usage",
        },
      },
    });

    if (!existingAdmin) {
      await prisma.roleMenuPermissions.create({
        data: {
          rolename: "Admin",
          menukey: "admin-reports-token-usage",
          canview: true,
          canedit: true,
          candelete: true,
        },
      });
    }

    // ????? ???? permission ???? Super Admin
    const existingSuperAdmin = await prisma.roleMenuPermissions.findUnique({
      where: {
        rolename_menukey: {
          rolename: "Super Admin",
          menukey: "admin-reports-token-usage",
        },
      },
    });

    if (!existingSuperAdmin) {
      await prisma.roleMenuPermissions.create({
        data: {
          rolename: "Super Admin",
          menukey: "admin-reports-token-usage",
          canview: true,
          canedit: true,
          candelete: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "???? ??? ???? ???? ?? ?????? ????? ??",
      menu,
    });
  } catch (error) {
    console.error("Error ensuring token usage menu:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

