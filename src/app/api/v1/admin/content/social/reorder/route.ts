import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

export async function POST(req: Request) {
  try {
    await verifyJWT();
    
    const { links } = await req.json();
    
    if (!Array.isArray(links)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Update order for all links
    await Promise.all(
      links.map((link: { id: number; order: number }) =>
        prisma.socialMediaLink.update({
          where: { id: link.id },
          data: { order: link.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering social links:", error);
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

