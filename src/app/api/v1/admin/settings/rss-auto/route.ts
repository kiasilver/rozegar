import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

// GET: ?????? ??????? RSS Auto Generator
export async function GET() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "rss_auto_image",
            "rss_auto_video",
            "rss_auto_seo",
            "rss_personalize_content",
            "rss_enhance_content",
            "rss_auto_generate",
            "rss_auto_check_interval",
          ],
        },
      },
    });

    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      if (s.key) {
        settingsMap[s.key] = s.value;
      }
    });

    return NextResponse.json({
      autoImage: settingsMap["rss_auto_image"] !== "false",
      autoVideo: settingsMap["rss_auto_video"] !== "false",
      autoSEO: settingsMap["rss_auto_seo"] !== "false",
      personalizeContent: settingsMap["rss_personalize_content"] !== "false",
      enhanceContent: settingsMap["rss_enhance_content"] !== "false",
      autoGenerate: settingsMap["rss_auto_generate"] === "true",
      autoCheckInterval: parseInt(settingsMap["rss_auto_check_interval"] || "30", 10),
      enableWatermark: settingsMap["rss_enable_watermark"] !== "false",
    });
  } catch (error) {
    console.error("Error fetching RSS auto settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: ????? ??????? RSS Auto Generator
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      autoImage,
      autoVideo,
      autoSEO,
      personalizeContent,
      enhanceContent,
      autoGenerate,
      autoCheckInterval,
      enableWatermark,
    } = body;

    await Promise.all([
      prisma.siteSetting.upsert({
        where: { key: "rss_auto_image" },
        update: { value: String(autoImage !== false), updated_at: new Date() },
        create: { key: "rss_auto_image", value: String(autoImage !== false), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_auto_video" },
        update: { value: String(autoVideo !== false), updated_at: new Date() },
        create: { key: "rss_auto_video", value: String(autoVideo !== false), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_auto_seo" },
        update: { value: String(autoSEO !== false), updated_at: new Date() },
        create: { key: "rss_auto_seo", value: String(autoSEO !== false), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_personalize_content" },
        update: { value: String(personalizeContent !== false), updated_at: new Date() },
        create: { key: "rss_personalize_content", value: String(personalizeContent !== false), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_enhance_content" },
        update: { value: String(enhanceContent !== false), updated_at: new Date() },
        create: { key: "rss_enhance_content", value: String(enhanceContent !== false), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_auto_generate" },
        update: { value: String(autoGenerate === true), updated_at: new Date() },
        create: { key: "rss_auto_generate", value: String(autoGenerate === true), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_auto_check_interval" },
        update: { value: String(autoCheckInterval || 30), updated_at: new Date() },
        create: { key: "rss_auto_check_interval", value: String(autoCheckInterval || 30), group_name: "rss" },
      }),
      prisma.siteSetting.upsert({
        where: { key: "rss_enable_watermark" },
        update: { value: String(enableWatermark !== false), updated_at: new Date() },
        create: { key: "rss_enable_watermark", value: String(enableWatermark !== false), group_name: "rss" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving RSS auto settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

