import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";

const socialLinkSchema = z.object({
  platform: z.string().min(1, "??? ?????? ?????? ???"),
  url: z.string().url("???? ????? ????"),
  is_active: z.boolean().default(true),
});

// Verify JWT helper
async function verifyJWT() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  
  if (!token) {
    throw new Error("No session token");
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  
  if (payload.role !== "Admin") {
    throw new Error("Unauthorized");
  }
  
  return payload;
}

export async function GET() {
  try {
    await verifyJWT();
    
    const socialLinks = await prisma.socialMediaLink.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(socialLinks);
  } catch (error) {
    console.error("Error fetching social links:", error);
    if (error instanceof Error && error.message === "No session token") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await verifyJWT();
    
    const body = await req.json();
    const data = socialLinkSchema.parse(body);

    // Get max order to add new item at the end
    const maxOrder = await prisma.socialMediaLink.aggregate({
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const socialLink = await prisma.socialMediaLink.create({
      data: {
        ...data,
        order: nextOrder,
      },
    });

    return NextResponse.json(socialLink, { status: 201 });
  } catch (error) {
    console.error("Error creating social link:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "No session token") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

