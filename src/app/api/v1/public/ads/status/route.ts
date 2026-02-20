import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

// GET - ????? ????? ????/??????? ???? ???????
export async function GET() {
  try {
    const [adsEnabledSetting, placeholderSetting, headerSetting, sidebarSetting, bottomSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "ads_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_placeholder_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_header_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_sidebar_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_bottom_enabled" } }),
    ]);
    // ??? ??????? ???? ?????? ?? ???? ??????? ???? ???
    const enabled = adsEnabledSetting?.value !== "false";
    const placeholderEnabled = placeholderSetting?.value !== "false";
    const headerEnabled = headerSetting?.value !== "false";
    const sidebarEnabled = sidebarSetting?.value !== "false";
    const bottomEnabled = bottomSetting?.value !== "false";
    return NextResponse.json({ enabled, placeholderEnabled, headerEnabled, sidebarEnabled, bottomEnabled });
  } catch (error) {
    console.error("Error checking ads status:", error);
    return NextResponse.json({ enabled: true, placeholderEnabled: true, headerEnabled: true, sidebarEnabled: true, bottomEnabled: true }, { status: 500 });
  }
}

