import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";

const bulkActionSchema = z.object({
  ids: z.array(z.number()),
  action: z.enum(["delete", "activate", "deactivate"]),
});

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

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

    const body = await req.json();
    const { ids, action } = bulkActionSchema.parse(body);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided" },
        { status: 400 }
      );
    }

    switch (action) {
      case "delete":
        await prisma.ad.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      case "activate":
        await prisma.ad.updateMany({
          where: { id: { in: ids } },
          data: { is_active: true },
        });
        break;

      case "deactivate":
        await prisma.ad.updateMany({
          where: { id: { in: ids } },
          data: { is_active: false },
        });
        break;
    }

    return NextResponse.json({
      success: true,
      message: `عملیات ${action} با موفقیت انجام شد`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error in bulk action:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
