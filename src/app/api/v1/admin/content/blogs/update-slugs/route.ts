import { NextResponse } from "next/server";
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

/**
 * API endpoint ???? ??????????? ??? slug ?? ?? ?????
 */
export async function POST() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = {
      blogTranslations: { updated: 0, skipped: 0 },
      categories: { updated: 0, skipped: 0 },
      tags: { updated: 0, skipped: 0 },
    };

    // 1. ??????????? slug ??? BlogTranslation (?????)
    console.log("?? ?? ??? ??????????? slug ??? BlogTranslation...");
    const blogTranslations = await prisma.blogTranslation.findMany({
      where: { lang: "FA" },
      include: { blog: true },
    });

    for (const translation of blogTranslations) {
      if (!translation.title) continue;
      
      const newSlug = isPersian(translation.title)
        ? slugifyPersian(translation.title)
        : slugify(translation.title, { lower: true, strict: true });

      // ????? ?????? ????? slug
      const existing = await prisma.blogTranslation.findFirst({
        where: {
          slug: newSlug,
          lang: "FA",
          NOT: { id: translation.id },
        },
      });

      if (existing) {
        // ??? ?????? ???? ?? ??? ????? ??
        let counter = 1;
        let finalSlug = `${newSlug}-${counter}`;
        while (
          await prisma.blogTranslation.findFirst({
            where: { slug: finalSlug, lang: "FA" },
          })
        ) {
          counter++;
          finalSlug = `${newSlug}-${counter}`;
        }
        
        await prisma.blogTranslation.update({
          where: { id: translation.id },
          data: { slug: finalSlug },
        });
        
        // ?????? Blog.slug ?? ?? update ??
        await prisma.blog.update({
          where: { id: translation.blog_id },
          data: { slug: finalSlug },
        });
        
        results.blogTranslations.updated++;
      } else if (translation.slug !== newSlug) {
        await prisma.blogTranslation.update({
          where: { id: translation.id },
          data: { slug: newSlug },
        });
        
        // ?????? Blog.slug ?? ?? update ??
        await prisma.blog.update({
          where: { id: translation.blog_id },
          data: { slug: newSlug },
        });
        
        results.blogTranslations.updated++;
      } else {
        results.blogTranslations.skipped++;
      }
    }

    // 2. ??????????? slug ??? BlogCategoryTranslation (?????)
    console.log("?? ?? ??? ??????????? slug ??? BlogCategoryTranslation...");
    const categoryTranslations = await prisma.blogCategoryTranslation.findMany({
      where: { lang: "FA" },
    });

    for (const translation of categoryTranslations) {
      if (!translation.name) continue;
      
      const newSlug = isPersian(translation.name)
        ? slugifyPersian(translation.name)
        : slugify(translation.name, { lower: true, strict: true });

      // ????? ?????? ????? slug
      const existing = await prisma.blogCategoryTranslation.findFirst({
        where: {
          slug: newSlug,
          lang: "FA",
          NOT: { id: translation.id },
        },
      });

      if (existing) {
        // ??? ?????? ???? ?? ??? ????? ??
        let counter = 1;
        let finalSlug = `${newSlug}-${counter}`;
        while (
          await prisma.blogCategoryTranslation.findFirst({
            where: { slug: finalSlug, lang: "FA" },
          })
        ) {
          counter++;
          finalSlug = `${newSlug}-${counter}`;
        }
        
        await prisma.blogCategoryTranslation.update({
          where: { id: translation.id },
          data: { slug: finalSlug },
        });
        
        results.categories.updated++;
      } else if (translation.slug !== newSlug) {
        await prisma.blogCategoryTranslation.update({
          where: { id: translation.id },
          data: { slug: newSlug },
        });
        
        results.categories.updated++;
      } else {
        results.categories.skipped++;
      }
    }

    // 3. ??????????? slug ??? BlogTagTranslation (?????)
    console.log("?? ?? ??? ??????????? slug ??? BlogTagTranslation...");
    const tagTranslations = await prisma.blogTagTranslation.findMany({
      where: { lang: "FA" },
    });

    for (const translation of tagTranslations) {
      if (!translation.name) continue;
      
      const newSlug = isPersian(translation.name)
        ? slugifyPersian(translation.name)
        : slugify(translation.name, { lower: true, strict: true });

      // ????? ?????? ????? slug
      const existing = await prisma.blogTagTranslation.findFirst({
        where: {
          slug: newSlug,
          lang: "FA",
          NOT: { id: translation.id },
        },
      });

      if (existing) {
        // ??? ?????? ???? ?? ??? ????? ??
        let counter = 1;
        let finalSlug = `${newSlug}-${counter}`;
        while (
          await prisma.blogTagTranslation.findFirst({
            where: { slug: finalSlug, lang: "FA" },
          })
        ) {
          counter++;
          finalSlug = `${newSlug}-${counter}`;
        }
        
        await prisma.blogTagTranslation.update({
          where: { id: translation.id },
          data: { slug: finalSlug },
        });
        
        results.tags.updated++;
      } else if (translation.slug !== newSlug) {
        await prisma.blogTagTranslation.update({
          where: { id: translation.id },
          data: { slug: newSlug },
        });
        
        results.tags.updated++;
      } else {
        results.tags.skipped++;
      }
    }

    console.log("? ??????????? slug ?? ???? ??:", results);

    return NextResponse.json({
      success: true,
      message: "??? slug ?? ?? ????? ????? ????",
      results,
    });
  } catch (error) {
    console.error("? ??? ?? ??????????? slug ??:", error);
    return NextResponse.json(
      {
        error: "??? ?? ??????????? slug ??",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

