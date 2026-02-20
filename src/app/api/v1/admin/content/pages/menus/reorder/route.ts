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

// ????????? ????? (drag and drop)
export async function POST(request: Request) {
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

    const body = await request.json();
    const { menus } = body; // Array of { id, order, group }

    if (!Array.isArray(menus)) {
      return NextResponse.json(
        { error: "menus must be an array" },
        { status: 400 }
      );
    }

    // ??????????? order ???? ??? ?????
    const updatePromises = menus.map((menu: { id: number; order: number; group?: string }) =>
      prisma.footerMenu.update({
        where: { id: menu.id },
        data: {
          order: menu.order,
          group: menu.group || undefined,
          updated_at: new Date(),
        },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering footer menus:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

