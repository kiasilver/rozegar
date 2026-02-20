import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const baseFolder = (formData.get("folder") as string) || "uploads/others";

    if (!file) {
      return NextResponse.json({ error: "فایلی انتخاب نشده است" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a date-based subfolder: YYYY-MM-DD
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // e.g. 2026-02-20

    // Normalize path separators to forward slash, just in case
    const normalizedBaseFolder = baseFolder.replace(/\\/g, '/');
    const finalFolder = `${normalizedBaseFolder}/${dateStr}`;

    // Clean up filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_\u0600-\u06FF]/g, '_');
    const filename = nanoid(8) + '-' + sanitizedName;

    // Create the directory path
    const uploadDir = path.join(process.cwd(), "public", ...finalFolder.split('/'));

    // Make sure directory exists
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/${finalFolder}/${filename}`;

    return NextResponse.json({ url: fileUrl, message: "فایل با موفقیت آپلود شد" });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "خطا در آپلود فایل", details: error.message }, { status: 500 });
  }
}
