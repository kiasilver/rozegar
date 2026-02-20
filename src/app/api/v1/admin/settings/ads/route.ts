import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// GET - ?????? ????? ???????
export async function GET() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [adsEnabledSetting, placeholderSetting, headerSetting, sidebarSetting, bottomSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "ads_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_placeholder_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_header_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_sidebar_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "ads_bottom_enabled" } }),
    ]);

    const enabled = adsEnabledSetting?.value !== "false";
    const placeholderEnabled = placeholderSetting?.value !== "false";
    const headerEnabled = headerSetting?.value !== "false";
    const sidebarEnabled = sidebarSetting?.value !== "false";
    const bottomEnabled = bottomSetting?.value !== "false";
    return NextResponse.json({ enabled, placeholderEnabled, headerEnabled, sidebarEnabled, bottomEnabled });
  } catch (error) {
    console.error("Error fetching ads settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - ????? ????? ???????
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

    const { enabled, placeholderEnabled, headerEnabled, sidebarEnabled, bottomEnabled } = await req.json();

    await Promise.all([
      prisma.siteSetting.upsert({
        where: { key: "ads_enabled" },
        update: {
          value: enabled ? "true" : "false",
          group_name: "ads",
          updated_at: new Date(),
        },
        create: {
          key: "ads_enabled",
          value: enabled ? "true" : "false",
          group_name: "ads",
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: "ads_placeholder_enabled" },
        update: {
          value: placeholderEnabled ? "true" : "false",
          group_name: "ads",
          updated_at: new Date(),
        },
        create: {
          key: "ads_placeholder_enabled",
          value: placeholderEnabled ? "true" : "false",
          group_name: "ads",
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: "ads_header_enabled" },
        update: {
          value: headerEnabled !== false ? "true" : "false",
          group_name: "ads",
          updated_at: new Date(),
        },
        create: {
          key: "ads_header_enabled",
          value: headerEnabled !== false ? "true" : "false",
          group_name: "ads",
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: "ads_sidebar_enabled" },
        update: {
          value: sidebarEnabled !== false ? "true" : "false",
          group_name: "ads",
          updated_at: new Date(),
        },
        create: {
          key: "ads_sidebar_enabled",
          value: sidebarEnabled !== false ? "true" : "false",
          group_name: "ads",
        },
      }),
      prisma.siteSetting.upsert({
        where: { key: "ads_bottom_enabled" },
        update: {
          value: bottomEnabled !== false ? "true" : "false",
          group_name: "ads",
          updated_at: new Date(),
        },
        create: {
          key: "ads_bottom_enabled",
          value: bottomEnabled !== false ? "true" : "false",
          group_name: "ads",
        },
      }),
    ]);

    return NextResponse.json({ success: true, enabled, placeholderEnabled, headerEnabled, sidebarEnabled, bottomEnabled });
  } catch (error) {
    console.error("Error saving ads settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

