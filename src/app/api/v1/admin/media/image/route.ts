import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function verifyJWT() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) throw new Error("No session token");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== "Admin") throw new Error("Unauthorized");
  return payload;
}

export async function POST(req: Request) {
  try {
    await verifyJWT();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const maxWidth = parseInt(formData.get("maxWidth") as string) || 1200;
    const maxHeight = parseInt(formData.get("maxHeight") as string) || 1200;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check if file is GIF - GIFs should not be processed (preserve animation)
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const isGif = file.type === "image/gif" || fileExtension === "gif";

    // Resize image if needed (skip for GIFs to preserve animation)
    let processedBuffer: Buffer = buffer;
    if (!isGif) {
      try {
        // Dynamic import برای کاهش مصرف RAM در startup
        const sharp = (await import("sharp")).default;
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        if (metadata.width && metadata.height) {
          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            const resizedBuffer = await image
              .resize(maxWidth, maxHeight, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .jpeg({ quality: 85 })
              .toBuffer();
            processedBuffer = Buffer.from(resizedBuffer);
          }
        }
      } catch (error) {
        console.error("Error processing image:", error);
        // Continue with original buffer if processing fails
      }
    }

    // Save file
    const uploadDir = join(process.cwd(), "public", "uploads", "ads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `ad-${timestamp}.${file.name.split(".").pop()}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, processedBuffer);

    const publicPath = `/uploads/ads/${filename}`;

    return NextResponse.json({ url: publicPath });
  } catch (error) {
    console.error("Error uploading image:", error);
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

