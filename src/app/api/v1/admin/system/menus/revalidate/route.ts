import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== 'Admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Revalidate all menu caches
    revalidateTag('menus', 'layout');
    revalidateTag(`menus-${payload.role}`, 'layout');
    
    return NextResponse.json({ success: true, message: "Menu cache revalidated" });
  } catch (error) {
    console.error("Error revalidating menu cache:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

