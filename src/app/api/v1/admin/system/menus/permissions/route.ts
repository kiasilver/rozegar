import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";

const permissionSchema = z.object({
  menukey: z.string(),
  rolename: z.string(),
  canview: z.boolean(),
  canedit: z.boolean().optional(),
  candelete: z.boolean().optional(),
});

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// GET - ?????? permission ??? ?? ???
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
    const menukey = searchParams.get("menukey");
    const rolename = searchParams.get("rolename");

    if (menukey && rolename) {
      // ?????? permission ???
      const permission = await prisma.roleMenuPermissions.findUnique({
        where: {
          rolename_menukey: {
            rolename,
            menukey,
          },
        },
      });

      return NextResponse.json(permission || null);
    } else if (menukey) {
      // ?????? ??? permission ??? ?? ???
      const permissions = await prisma.roleMenuPermissions.findMany({
        where: { menukey },
      });

      return NextResponse.json(permissions);
    } else {
      // ?????? ??? permission ??
      const permissions = await prisma.roleMenuPermissions.findMany({
        include: {
          menu: {
            include: {
              translations: true,
            },
          },
        },
      });

      return NextResponse.json(permissions);
    }
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - ????? ?? ??????????? permission
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = permissionSchema.parse(body);

    // ????? ???? ???
    const menu = await prisma.menu.findUnique({
      where: { menukey: data.menukey },
    });

    if (!menu) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    // ????? ?? ??????????? permission
    const permission = await prisma.roleMenuPermissions.upsert({
      where: {
        rolename_menukey: {
          rolename: data.rolename,
          menukey: data.menukey,
        },
      },
      update: {
        canview: data.canview,
        canedit: data.canedit ?? false,
        candelete: data.candelete ?? false,
      },
      create: {
        rolename: data.rolename,
        menukey: data.menukey,
        canview: data.canview,
        canedit: data.canedit ?? false,
        candelete: data.candelete ?? false,
      },
    });

    return NextResponse.json(permission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error saving permission:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - ??? permission
export async function DELETE(req: Request) {
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
    const menukey = searchParams.get("menukey");
    const rolename = searchParams.get("rolename");

    if (!menukey || !rolename) {
      return NextResponse.json(
        { error: "menukey and rolename are required" },
        { status: 400 }
      );
    }

    await prisma.roleMenuPermissions.delete({
      where: {
        rolename_menukey: {
          rolename,
          menukey,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

