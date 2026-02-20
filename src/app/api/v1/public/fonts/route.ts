import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/core/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
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

    // Convert to array format
    const fonts = Array.from(fontsMap.entries()).map(([name, variants]) => ({
      name,
      variants: variants.sort((a, b) => {
        const weightA = parseInt(a.weight) || 400;
        const weightB = parseInt(b.weight) || 400;
        return weightA - weightB;
      }),
    }));

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("Error fetching fonts:", error);
    return NextResponse.json({ fonts: [] });
  }
}

