import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * DELETE: ??? ??????? ???? ????
 * Query params:
 * - provider: ??? ??????? ?? provider ??? (optional)
 * - operation: ??? ??????? ?? operation ??? (optional)
 * - all: ??? ??? ?????? (??? true ????)
 */
export async function DELETE(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get("provider");
    const operation = searchParams.get("operation");
    const all = searchParams.get("all") === "true";

    // ???? where clause
    let where: any = undefined;

    if (all) {
      // ??? ??? ?????? - where ?? undefined ????????? ?? ??? ??????? ??? ????
      where = undefined;
    } else if (provider) {
      // ??? ??????? ?? provider ???
      where = { provider };
    } else if (operation) {
      // ??? ??????? ?? operation ???
      where = { operation };
    } else {
      return NextResponse.json(
        { error: "????? provider? operation ?? all=true ?? ???? ????" },
        { status: 400 }
      );
    }

    // ????? ????? ???????? ??? ?????
    const count = where ? await prisma.tokenUsage.count({ where }) : await prisma.tokenUsage.count();

    // ??? ??????
    const result = where 
      ? await prisma.tokenUsage.deleteMany({ where }) 
      : await prisma.tokenUsage.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `${result.count} ??? ??? ??`,
      deletedCount: result.count,
      filter: {
        provider: provider || null,
        operation: operation || null,
        all: all || false,
      },
    });
  } catch (error: any) {
    console.error("[TokenUsage Reset API] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "??? ?? ??? ??????" },
      { status: 500 }
    );
  }
}

