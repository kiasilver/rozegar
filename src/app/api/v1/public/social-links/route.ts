import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const socialLinks = await prisma.socialMediaLink.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        platform: true,
        url: true,
        icon: true,
      },
    });

    // Always return an array, even if empty
    return NextResponse.json(socialLinks || []);
  } catch (error) {
    console.error("Error fetching social links:", error);
    // Return empty array on error instead of error object
    return NextResponse.json([]);
  }
}

