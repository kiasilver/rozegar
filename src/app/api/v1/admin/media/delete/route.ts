import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/core/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function DELETE(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin" && role !== "Author") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // ???? Author: ??? ???????? ???? ?? ???????? ??? ???
    if (role === "Author") {
      const mediaFile = await prisma.mediaFile.findFirst({
        where: {
          url: url,
          user_id: userId,
        },
      });

      if (!mediaFile) {
        return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
      }
    }

    // حذف از دیتابیس
    const deleteResult = await prisma.mediaFile.deleteMany({
      where: {
        url: url,
      },
    });

    // حذف فایل فیزیکی
    const filePath = join(process.cwd(), "public", url);

    try {
      await unlink(filePath);
      console.log(`File deleted successfully: ${filePath}`);
    } catch (error: any) {
      // اگر فایل پیدا نشد (ENOENT)، مشکلی نیست - ممکن است قبلاً حذف شده باشد
      if (error.code === 'ENOENT') {
        console.log(`File not found (may have been deleted already): ${filePath}`);
      } else {
        console.error("Error deleting file:", error);
        // برای خطاهای دیگر، log می‌کنیم اما باز هم success برمی‌گردانیم
        // چون record از database حذف شده است
      }
    }

    return NextResponse.json({ 
      success: true, 
      deletedFromDB: deleteResult.count > 0 
    });
  } catch (error) {
    console.error("Error deleting media file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

