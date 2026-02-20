import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { readNewsProcessingLogs, getRecentNewsProcessingLogs } from "@/lib/automation/telegram/news-logger";

async function verifyJWT(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: number; role?: string };
  return payload as { userId: number; role?: string };
}

/**
 * GET: ?????? ??????? ?????? ???
 * Query params:
 * - days: ????? ?????? ???? (default: 1)
 * - date: ????? ??? (YYYY-MM-DD)
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

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "1");
    const date = searchParams.get("date");

    let logs;
    if (date) {
      logs = await readNewsProcessingLogs(date);
    } else {
      logs = await getRecentNewsProcessingLogs(days);
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching news processing logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

