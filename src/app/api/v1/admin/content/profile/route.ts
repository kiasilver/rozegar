import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    // Handle both number and string userId
    let userId: number;
    if (typeof payload.userId === 'string') {
      userId = parseInt(payload.userId, 10);
    } else if (typeof payload.userId === 'number') {
      userId = payload.userId;
    } else {
      console.error("Invalid token: userId is missing or invalid", payload);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!userId || isNaN(userId)) {
      console.error("Invalid token: userId is not a valid number", payload);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Log ??????? ???
    // console.log("Fetching profile for userId:", userId, typeof userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image_profile: true,
        bio: true,
        created_at: true,
        userrole: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.error("User not found for userId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format response
    const role = user.userrole[0]?.role?.name || 'guest';
    const roleTitle = role === 'Admin' ? 'Super Admin' : role === 'Author' ? 'Founder & CEO' : role;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image_profile: user.image_profile,
      bio: user.bio,
      role: role,
      roleTitle: roleTitle,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    // Handle both number and string userId
    let userId: number;
    if (typeof payload.userId === 'string') {
      userId = parseInt(payload.userId, 10);
    } else if (typeof payload.userId === 'number') {
      userId = payload.userId;
    } else {
      console.error("Invalid token: userId is missing or invalid", payload);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!userId || isNaN(userId)) {
      console.error("Invalid token: userId is not a valid number", payload);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        email: email || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image_profile: true,
        bio: true,
        created_at: true,
        userrole: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const role = updated.userrole[0]?.role?.name || 'guest';
    const roleTitle = role === 'Admin' ? 'Super Admin' : role === 'Author' ? 'Founder & CEO' : role;

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      image_profile: updated.image_profile,
      bio: updated.bio,
      role: role,
      roleTitle: roleTitle,
      created_at: updated.created_at,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

