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
  // Allow Admin and Author roles
  if (payload.role !== "Admin" && payload.role !== "Author") {
    throw new Error("Unauthorized");
  }
  return payload;
}

export async function POST(req: Request) {
  try {
    await verifyJWT();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "image"; // image or video
    const maxWidth = parseInt(formData.get("maxWidth") as string) || 1920;
    const maxHeight = parseInt(formData.get("maxHeight") as string) || 1920;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (10MB for images, 50MB for videos)
    const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file
    const uploadDir = join(process.cwd(), "public", "uploads", "blogs");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const filename = `blog-${timestamp}.${fileExtension}`;
    const filepath = join(uploadDir, filename);

    // Process image if it's an image
    if (type === "image" && ["jpg", "jpeg", "png", "webp", "gif"].includes(fileExtension)) {
      let processedBuffer: Buffer = buffer;
      try {
        // Dynamic import برای کاهش مصرف RAM در startup
        const sharp = (await import("sharp")).default;
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        if (metadata.width && metadata.height) {
          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            // Resize but keep original format
            const resizedBuffer = await image
              .resize(maxWidth, maxHeight, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .toFormat(fileExtension === "png" ? "png" : "jpeg", { quality: 90 })
              .toBuffer();
            processedBuffer = Buffer.from(resizedBuffer);
          }
        }
        await writeFile(filepath, processedBuffer);
      } catch (error) {
        console.error("Error processing image:", error);
        // Continue with original buffer if processing fails
        await writeFile(filepath, buffer);
      }
    } else {
      // For videos or other files, save as-is
      await writeFile(filepath, buffer);
    }

    const publicPath = `/uploads/blogs/${filename}`;

    return NextResponse.json({ url: publicPath, type });
  } catch (error) {
    console.error("Error uploading file:", error);
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

