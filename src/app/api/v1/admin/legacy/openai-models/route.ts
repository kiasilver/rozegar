import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

async function verifyJWT(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number; role?: string };
  return payload as { userId: number; role?: string };
}

/**
 * لیست مدل‌های رسمی OpenAI
 * بر اساس: https://platform.openai.com/docs/models
 */
const OPENAI_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "بهترین مدل OpenAI با عملکرد عالی در همه وظایف",
    contextWindow: 128000,
    tier: "paid",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "نسخه کوچک‌تر GPT-4o با هزینه کمتر",
    contextWindow: 128000,
    tier: "paid",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "مدل پیشرفته با context window بزرگ",
    contextWindow: 128000,
    tier: "paid",
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "مدل اصلی GPT-4",
    contextWindow: 8192,
    tier: "paid",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "مدل ارزان و سریع برای کارهای روزمره",
    contextWindow: 16385,
    tier: "paid",
  },
  {
    id: "gpt-3.5-turbo-16k",
    name: "GPT-3.5 Turbo 16K",
    description: "GPT-3.5 Turbo با context window بزرگتر",
    contextWindow: 16385,
    tier: "paid",
  },
];

/**
 * GET: دریافت لیست مدل‌های OpenAI
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

    return NextResponse.json({ models: OPENAI_MODELS });
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

