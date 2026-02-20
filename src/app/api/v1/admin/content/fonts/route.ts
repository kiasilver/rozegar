import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/core/prisma";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get fonts from database
    const fontSettings = await prisma.siteSetting.findMany({
      where: {
        group_name: 'fonts',
        key: {
          startsWith: 'font_'
        }
      },
    });

    // Group fonts by name
    const fontsMap = new Map<string, Array<{
      weight: string;
      style: string;
      url: string;
      filename: string;
    }>>();

    fontSettings.forEach(setting => {
      try {
        const fontData = JSON.parse(setting.value || '{}');
        const fontName = fontData.name;
        
        if (!fontsMap.has(fontName)) {
          fontsMap.set(fontName, []);
        }
        
        fontsMap.get(fontName)!.push({
          weight: fontData.weight || '400',
          style: fontData.style || 'normal',
          url: fontData.url,
          filename: fontData.filename,
        });
      } catch (e) {
        console.error('Error parsing font data:', e);
      }
    });

    // Convert to array format
    const fonts = Array.from(fontsMap.entries()).map(([name, variants]) => ({
      name,
      variants: variants.sort((a, b) => {
        const weightA = parseInt(a.weight) || 400;
        const weightB = parseInt(b.weight) || 400;
        return weightA - weightB;
      }),
    }));

    // Also check custom fonts directory
    const customFontsDir = join(process.cwd(), 'public', 'fonts', 'custom');
    if (existsSync(customFontsDir)) {
      try {
        const files = await readdir(customFontsDir);
        files.forEach(file => {
          // Parse filename: fontName-weight-style.extension
          const match = file.match(/^(.+?)-(\d+)-(normal|italic|oblique)\.(woff|woff2|ttf|otf|eot)$/);
          if (match) {
            const [, fontName, weight, style] = match;
            const url = `/fonts/custom/${file}`;
            
            if (!fontsMap.has(fontName)) {
              fontsMap.set(fontName, []);
            }
            
            const existing = fontsMap.get(fontName)!.find(v => v.weight === weight && v.style === style);
            if (!existing) {
              fontsMap.get(fontName)!.push({
                weight,
                style,
                url,
                filename: file,
              });
            }
          }
        });
      } catch (e) {
        console.error('Error reading custom fonts directory:', e);
      }
    }

    // Rebuild fonts array
    const allFonts = Array.from(fontsMap.entries()).map(([name, variants]) => ({
      name,
      variants: variants.sort((a, b) => {
        const weightA = parseInt(a.weight) || 400;
        const weightB = parseInt(b.weight) || 400;
        return weightA - weightB;
      }),
    }));

    return NextResponse.json({ fonts: allFonts });
  } catch (error) {
    console.error("Error fetching fonts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fontName = searchParams.get('name');
    const weight = searchParams.get('weight');
    const style = searchParams.get('style');

    if (!fontName) {
      return NextResponse.json({ error: "Font name is required" }, { status: 400 });
    }

    const sanitizedFontName = fontName.replace(/[^a-zA-Z0-9]/g, '-');
    const fontKey = weight && style 
      ? `font_${sanitizedFontName}_${weight}_${style}`
      : `font_${sanitizedFontName}`;

    // Delete from database
    await prisma.siteSetting.deleteMany({
      where: {
        key: {
          startsWith: fontKey
        }
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting font:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

