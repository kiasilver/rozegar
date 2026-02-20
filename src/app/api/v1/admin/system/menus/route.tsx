import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Lang } from "@prisma/client";
import { unstable_cache } from "next/cache";

const isDev = process.env.NODE_ENV === "development";

// Helper function for conditional logging
const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};

const logError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

// Cache function for menu fetching
async function fetchMenusFromDB(roleName: string, lang: Lang) {
  try {
    // Admin and Super Admin see all menus
    if (roleName === 'Admin' || roleName === 'Super Admin') {
      const whereClause: any = {
        parentid: null,
        menukey: {
          startsWith: 'admin-',
        },
      };

      if (roleName === 'Admin') {
        whereClause.menukey.not = 'admin-author-dashboard';
      }

      return await prisma.menu.findMany({
        where: whereClause,
        include: {
          translations: {
            where: { lang },
            select: { title: true, lang: true },
          },
          other_menus: {
            where: {
              menukey: {
                startsWith: 'admin-',
              },
            },
            include: {
              translations: {
                where: { lang },
                select: { title: true, lang: true },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
        take: 100, // Safety limit
      });
    } else {
      return await prisma.menu.findMany({
        where: {
          parentid: null,
          menukey: {
            startsWith: 'admin-',
          },
          rolemenupermissions: {
            some: {
              rolename: roleName,
              canview: true,
            },
          },
        },
        include: {
          translations: {
            where: { lang },
            select: { title: true, lang: true },
          },
          other_menus: {
            where: {
              rolemenupermissions: {
                some: {
                  rolename: roleName,
                  canview: true,
                },
              },
            },
            include: {
              translations: {
                where: { lang },
                select: { title: true, lang: true },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
        take: 100, // Safety limit
      });
    }
  } catch (dbError) {
    logError("Error in fetchMenusFromDB:", dbError);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "No session token", menus: [] }, { status: 401 });
    }

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secret);
      payload = verifiedPayload;
    } catch (err) {
      return NextResponse.json({ error: "Invalid token", menus: [] }, { status: 401 });
    }

    const roleName = payload.role as string;
    if (!roleName) {
      return NextResponse.json({ error: "No role in payload", menus: [] }, { status: 403 });
    }

    // Extract lang from cookies (default to 'FA')
    const rawLang = (await cookies()).get("language")?.value?.toUpperCase();
    const lang = (rawLang === "FA" || rawLang === "EN" ? rawLang : "FA") as Lang;

    // Use unstable_cache to prevent repeated DB hits
    const getCachedMenus = unstable_cache(
      async () => fetchMenusFromDB(roleName, lang),
      [`menus-${roleName}-${lang}`],
      {
        revalidate: 300, // 5 minutes cache
        tags: ['menus', `menus-${roleName}`, `menus-${lang}`],
      }
    );

    log(`🔍 [MENU API] Fetching menus for role: ${roleName}`);
    const menus = await getCachedMenus();

    return NextResponse.json(menus);
  } catch (error) {
    logError("❌ [MENU API] Error fetching menus:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

