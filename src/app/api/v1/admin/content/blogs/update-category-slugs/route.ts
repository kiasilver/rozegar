/**
 * API endpoint ???? ??????????? slug ????????????
 * ??? endpoint ???? slug ??? ???????????? ?? ??????????? ??????
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";
import { slugifyPersian } from "@/lib/utils/slugify-fa";
import slugify from "slugify";
import { isPersian } from "@/lib/utils/ispersian";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyJWT(token);

    console.log("?? ???? ??????????? slug ????????????...");

    // ?????? ???? ????????????
    const categories = await prisma.blogCategory.findMany({
      include: {
        translations: {
          where: { lang: "FA" },
        },
      },
    });

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const category of categories) {
      const translation = category.translations[0];
      if (!translation || !translation.name) {
        skipped++;
        continue;
      }

      // ????? slug ????
      const newSlug = isPersian(translation.name)
        ? slugifyPersian(translation.name)
        : slugify(translation.name, { lower: true, strict: true });

      // ????? ?????? ????? slug
      let finalSlug = newSlug;
      let counter = 1;
      while (
        await prisma.blogCategoryTranslation.findFirst({
          where: {
            slug: finalSlug,
            lang: "FA",
            NOT: { id: translation.id },
          },
        })
      ) {
        finalSlug = `${newSlug}-${counter}`;
        counter++;
        if (counter > 100) {
          finalSlug = `${newSlug}-${Date.now()}`;
          break;
        }
      }

      // ??????????? slug
      try {
        await prisma.blogCategoryTranslation.update({
          where: { id: translation.id },
          data: { slug: finalSlug },
        });
        updated++;
        console.log(`? ????????? "${translation.name}": ${translation.slug || 'null'} ? ${finalSlug}`);
      } catch (error) {
        console.error(`? ??? ?? ??????????? ????????? "${translation.name}":`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `??????????? ????? ??: ${updated} ???????????? ${skipped} ?? ???? ${errors} ???`,
      stats: {
        updated,
        skipped,
        errors,
        total: categories.length,
      },
    });
  } catch (error) {
    console.error("? ??? ?? ??????????? slug ????????????:", error);
    return NextResponse.json(
      {
        error: "??? ?? ??????????? slug ????????????",
        message: error instanceof Error ? error.message : "???? ????????",
      },
      { status: 500 }
    );
  }
}

