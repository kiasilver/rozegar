
import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function GET() {
    const menus = await prisma.menu.findMany({
        include: {
            translations: true,
            other_menus: {
                include: { translations: true }
            }
        },
        orderBy: { menuid: 'asc' }
    });
    return NextResponse.json(menus);
}
