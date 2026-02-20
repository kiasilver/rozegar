import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const [logoHeader, logoFooter] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "logoHeader" } }),
      prisma.siteSetting.findUnique({ where: { key: "logoFooter" } }),
    ]);

    return NextResponse.json({
      header: logoHeader?.value || "/logo/rozmaregi.png",
      footer: logoFooter?.value || "/logo/rozmaregi.png",
    });
  } catch (error) {
    console.error("Error fetching logo settings:", error);
    return NextResponse.json({
      header: "/logo/rozmaregi.png",
      footer: "/logo/rozmaregi.png",
    });
  }
}

