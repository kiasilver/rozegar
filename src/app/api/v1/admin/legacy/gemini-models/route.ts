import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

async function verifyJWT(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number; role?: string };
  return payload as { userId: number; role?: string };
}

/**
 * لیست مدل‌های رسمی Google Gemini
 * بر اساس: https://ai.google.dev/gemini-api/docs
 */
const GEMINI_MODELS = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "بهترین مدل Gemini با عملکرد عالی",
    contextWindow: 2000000,
    tier: "paid",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "مدل سریع و ارزان با عملکرد خوب",
    contextWindow: 1000000,
    tier: "paid",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "مدل پیشرفته با context window بزرگ",
    contextWindow: 2000000,
    tier: "paid",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "مدل سریع با context window بزرگ",
    contextWindow: 1000000,
    tier: "paid",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    description: "مدل اصلی Gemini",
    contextWindow: 30720,
    tier: "paid",
  },
];

/**
 * GET: دریافت لیست مدل‌های Gemini
 */
export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ models: GEMINI_MODELS });
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

