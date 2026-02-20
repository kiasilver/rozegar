import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// ?????? ????? ????? ????? ????
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const userPayload = await verifyJWT(token);
    if (!userPayload) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const count = await prisma.blogComment.count({
      where: {
        status: "PENDING",
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching pending comments count:", error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}

