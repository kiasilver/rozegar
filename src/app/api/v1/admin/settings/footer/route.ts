import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

// JWT verification function
async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// ?????? ??????? footer
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

    const settings = await prisma.siteSetting.findMany({
      where: {
        group_name: "footer",
      },
    });

    const result: Record<string, string> = {};
    settings.forEach((setting) => {
      if (setting.key) {
        result[setting.key] = setting.value || "";
      }
    });

    return NextResponse.json({
      bio: result.footer_bio || "",
      copyright: result.footer_copyright || "",
    });
  } catch (error) {
    console.error("Error fetching footer settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ????? ??????? footer
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
    const { bio, copyright } = body;

    // ????? bio
    await prisma.siteSetting.upsert({
      where: { key: "footer_bio" },
      update: {
        value: bio || "",
        group_name: "footer",
        updated_at: new Date(),
      },
      create: {
        key: "footer_bio",
        value: bio || "",
        group_name: "footer",
      },
    });

    // ????? copyright
    await prisma.siteSetting.upsert({
      where: { key: "footer_copyright" },
      update: {
        value: copyright || "",
        group_name: "footer",
        updated_at: new Date(),
      },
      create: {
        key: "footer_copyright",
        value: copyright || "",
        group_name: "footer",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving footer settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
