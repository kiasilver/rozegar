import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        group_name: 'design',
        key: {
          in: ['sitePrimaryColor', 'siteSecondaryColor', 'siteTertiaryColor', 'siteQuaternaryColor'],
        },
      },
    });

    const colors: Record<string, string> = {};
    settings.forEach(setting => {
      if (setting.key) {
        colors[setting.key] = setting.value || '';
      }
    });

    // Default colors if not set
    return NextResponse.json({
      sitePrimaryColor: colors.sitePrimaryColor || '#bc0c00',
      siteSecondaryColor: colors.siteSecondaryColor || '#9e0a00',
      siteTertiaryColor: colors.siteTertiaryColor || '#EAD196',
      siteQuaternaryColor: colors.siteQuaternaryColor || '#EEEEEE',
    });
  } catch (error) {
    console.error("Error fetching color settings:", error);
    // Return default colors on error
    return NextResponse.json({
      sitePrimaryColor: '#bc0c00',
      siteSecondaryColor: '#9e0a00',
      siteTertiaryColor: '#EAD196',
      siteQuaternaryColor: '#EEEEEE',
    });
  }
}

