import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { unstable_cache } from "next/cache";

// Cache public menus for 5 minutes
const getCachedPublicMenus = unstable_cache(
  async () => {
    return prisma.menu.findMany({
      where: {
        parentid: null,
      },
      include: {
        translations: {
          where: { lang: 'FA' },
          select: { title: true, lang: true },
        },
        other_menus: {
          include: {
            translations: {
              where: { lang: 'FA' },
              select: { title: true, lang: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  },
  ['public-menus-fa'],
  { revalidate: 300, tags: ['public-menus'] }
);

export async function GET() {
  try {
    const menus = await getCachedPublicMenus();
    return NextResponse.json(menus);
  } catch (error) {
    console.error("Error fetching site menus:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
