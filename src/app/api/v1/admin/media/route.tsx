// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = nanoid() + path.extname(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await writeFile(path.join(uploadDir, filename), buffer);

  const fileUrl = `/uploads/${filename}`;
  return NextResponse.json({ url: fileUrl });
}
