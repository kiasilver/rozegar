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

// ?????? ???? ?????? footer
export async function GET() {
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

    // ??????? ?? raw query ???? ?????? ??? ?????? ???? custom_group_name
    try {
      const menus = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        url: string | null;
        group: string | null;
        custom_group_name: string | null;
        order: number;
        is_active: boolean;
        target: string | null;
        created_at: Date;
        updated_at: Date | null;
      }>>`
        SELECT id, title, url, "group", "custom_group_name", "order", is_active, target, created_at, updated_at
        FROM "FooterMenu"
        ORDER BY "group" ASC, "order" ASC
      `;
      return NextResponse.json(menus);
    } catch (rawError: any) {
      // ??? raw query ??? ???? ?? ??? ???? Prisma ??????? ???????
      console.warn('Raw query failed, trying Prisma method:', rawError.message);
      const menus = await prisma.footerMenu.findMany({
        orderBy: [
          { group: "asc" },
          { order: "asc" },
        ],
      });
      return NextResponse.json(menus);
    }
  } catch (error) {
    console.error("Error fetching footer menus:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ????? ???? ????
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
    const { title, url, group, order, target, custom_group_name } = body;

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (group === 'custom' && !custom_group_name?.trim()) {
      return NextResponse.json(
        { error: "???? ???? ??????? ??? ???? ?????? ???" },
        { status: 400 }
      );
    }

    // ???? ???? ???? ????? ???
    const finalGroup = group || "quick-access";
    const finalCustomGroupName = (finalGroup === 'custom' && custom_group_name?.trim()) ? custom_group_name.trim() : null;
    const finalUrl = url || null;
    const finalOrder = order || 0;
    const finalTarget = target || "_self";

    // ??????? ?? raw query ???? ??????? ?? ???? Prisma Client ?? ???? custom_group_name ?? ?????????
    try {
      const result = await prisma.$queryRaw<Array<{
        id: number;
        title: string;
        url: string | null;
        group: string | null;
        custom_group_name: string | null;
        order: number;
        is_active: boolean;
        target: string | null;
        created_at: Date;
        updated_at: Date | null;
      }>>`
        INSERT INTO "FooterMenu" (title, url, "group", "custom_group_name", "order", target, is_active, created_at, updated_at)
        VALUES (${title}, ${finalUrl}, ${finalGroup}, ${finalCustomGroupName}, ${finalOrder}, ${finalTarget}, ${true}, NOW(), NOW())
        RETURNING id, title, url, "group", "custom_group_name", "order", is_active, target, created_at, updated_at
      `;

      const menu = result[0];
      return NextResponse.json(menu, { status: 201 });
    } catch (rawError: any) {
      // ??? raw query ??? ???? ?? ??? ???? Prisma ??????? ???????
      console.warn('Raw query failed, trying Prisma method:', rawError.message);
      
      const createData: any = {
        title,
        url: finalUrl,
        group: finalGroup,
        order: finalOrder,
        target: finalTarget,
        is_active: true,
      };

      // ????? ???? custom_group_name ??? ??? group ????? custom ????
      // ??????? ?? $executeRaw ???? INSERT
      if (finalGroup === 'custom' && finalCustomGroupName) {
        try {
          await prisma.$executeRaw`
            INSERT INTO "FooterMenu" (title, url, "group", "custom_group_name", "order", target, is_active, created_at, updated_at)
            VALUES (${title}, ${finalUrl}, ${finalGroup}, ${finalCustomGroupName}, ${finalOrder}, ${finalTarget}, ${true}, NOW(), NOW())
          `;
          
          // ?????? ????? ???? ????? ???
          const newMenu = await prisma.$queryRaw<Array<{
            id: number;
            title: string;
            url: string | null;
            group: string | null;
            custom_group_name: string | null;
            order: number;
            is_active: boolean;
            target: string | null;
            created_at: Date;
            updated_at: Date | null;
          }>>`
            SELECT id, title, url, "group", "custom_group_name", "order", is_active, target, created_at, updated_at
            FROM "FooterMenu"
            WHERE title = ${title} AND "group" = ${finalGroup}
            ORDER BY id DESC
            LIMIT 1
          `;
          
          return NextResponse.json(newMenu[0], { status: 201 });
        } catch (e: any) {
          throw new Error(`Failed to create menu: ${e.message}`);
        }
      } else {
        const menu = await prisma.footerMenu.create({
          data: createData,
        });
        return NextResponse.json(menu, { status: 201 });
      }
    }

  } catch (error: any) {
    console.error("Error creating footer menu:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

