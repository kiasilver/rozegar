import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/core/prisma";

export async function POST(req: Request) {
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fontName = formData.get('fontName') as string;
    const fontWeight = formData.get('fontWeight') as string || '400';
    const fontStyle = formData.get('fontStyle') as string || 'normal';

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fontName) {
      return NextResponse.json({ error: "Font name is required" }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: "Invalid font file type. Allowed: woff, woff2, ttf, otf, eot" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create fonts directory if it doesn't exist
    const fontsDir = join(process.cwd(), 'public', 'fonts', 'custom');
    if (!existsSync(fontsDir)) {
      await mkdir(fontsDir, { recursive: true });
    }

    // Generate filename: fontName-weight-style.extension
    const sanitizedFontName = fontName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${sanitizedFontName}-${fontWeight}-${fontStyle}.${fileExtension}`;
    const filepath = join(fontsDir, filename);

    await writeFile(filepath, buffer);

    const url = `/fonts/custom/${filename}`;

    // Save font info to database
    const fontKey = `font_${sanitizedFontName}_${fontWeight}_${fontStyle}`;
    await prisma.siteSetting.upsert({
      where: { key: fontKey },
      update: {
        value: JSON.stringify({
          name: fontName,
          url,
          weight: fontWeight,
          style: fontStyle,
          filename,
        }),
        updated_at: new Date(),
      },
      create: {
        key: fontKey,
        value: JSON.stringify({
          name: fontName,
          url,
          weight: fontWeight,
          style: fontStyle,
          filename,
        }),
        group_name: 'fonts',
      },
    });

    return NextResponse.json({ 
      success: true,
      url,
      font: {
        name: fontName,
        weight: fontWeight,
        style: fontStyle,
      }
    });
  } catch (error) {
    console.error("Error uploading font:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

