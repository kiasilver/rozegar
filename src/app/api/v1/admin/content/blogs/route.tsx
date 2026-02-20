// app/api/v1/admin/content/blogs/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { generateSEO as generateAISEO } from "@/lib/content/seo/seo-ai";
import { getAISettings } from "@/lib/ai/ai-settings";
import { generateUniqueBlogSlug, getOrCreateCategorySlug } from "@/lib/content/blog/blog-slug";

// ------------ auth ------------
async function verifyJWT(token: string): Promise<{ userId: number }> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// ------------ validation ------------
const blogSchema = z.object({
  name: z.string().min(3, "????? ???? ????? ? ??????? ????"),
  slug: z.string().optional(),
  description: z.string().min(10, "??????? ???? ????? ?? ??????? ????"),
  categories: z.array(z.string()).min(1, "????? ?? ????????? ?? ?????? ????"),
  image: z.any().optional(),
  lang: z.string().default("FA"),

  // Slider (???? sliderImage)
  sliderRequested: z.boolean().default(false),
  sliderTitle: z.string().optional(), // ??? ???? ????? ?? name ??????? ??????
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),

  // SEO fields
  metaTitle: z.string().optional(),
  metaKeywords: z.string().optional(),
  metaDescription: z.string().optional(),
  canonical_url: z.string().optional(),
  robots: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
});

// ------------ route ------------
export async function POST(req: Request) {
  // ????: ??? ???????? ?? cookies() ??? async ???????? ??????? await ?? ??????
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return NextResponse.json({ message: "????? ???? ????" }, { status: 401 });
  }

  const userPayload = await verifyJWT(token);
  if (!userPayload) {
    return NextResponse.json({ message: "???? ????? ????" }, { status: 401 });
  }
  const { userId } = userPayload;

  try {
    const body = await req.json();
    const parsed = blogSchema.parse(body);

    // Helper to check for short content/image only
    const isContentOnlyImage = (content: string, minLength: number = 100) => {
      const text = content.replace(/<[^>]+>/g, '').trim();
      return text.length < minLength;
    };

    if (isContentOnlyImage(parsed.description, 100)) {
      return NextResponse.json(
        {
          message: "متن خبر خیلی کوتاه است. حداقل ۱۰۰ کاراکتر (بدون درنظر گرفتن تصویر) وارد کنید.",
          error: "CONTENT_ONLY_IMAGE"
        },
        { status: 400 }
      );
    }

    // ????? ????? ??? ????? ???? "???????????" ??? ? ????? ???? ????
    const isInfographic = parsed.name.toLowerCase().includes('???????????') ||
      parsed.name.toLowerCase().includes('??????????') ||
      parsed.name.toLowerCase().includes('infographic');
    const contentText = parsed.description.replace(/<[^>]+>/g, ' ').trim();
    if (isInfographic && contentText.length < 200) {
      return NextResponse.json(
        {
          message: "?????? ??????????? ???? ?????? ???? ???? ????? ?????. ??????? ?? ??? ??? ????? ???? ??? ??????.",
          error: "INFOGRAPHIC_WITHOUT_CONTENT"
        },
        { status: 400 }
      );
    }

    const {
      lang = "FA",
      og_title,
      og_description,
      twitter_title,
      twitter_description,
      sliderRequested,
    } = parsed;

    // 1) ???????????? (??? ??? ????? FA ?????)
    const categoryIds: number[] = await Promise.all(
      parsed.categories.map(async (categoryId) => {
        const existingCategory = await prisma.blogCategory.findUnique({
          where: { id: Number(categoryId) },
          include: { translations: { where: { lang: "FA" } } },
        });

        if (!existingCategory || existingCategory.translations.length === 0) {
          throw new Error(
            `????????? ?? ????? ${categoryId} ???? ??? ?? ????? ????? ?????.`
          );
        }
        return existingCategory.id;
      })
    );

    // 2) ???? slug ????? ?? ??? - ????: category-slug/title-slug
    // ?????? slug ????????? ???
    const categorySlug = await getOrCreateCategorySlug(categoryIds[0], "FA");

    // ???? slug ???? ? ????? ?? ???
    const finalBaseSlug = await generateUniqueBlogSlug(
      parsed.name,
      categorySlug,
      parsed.slug || undefined
    );

    // 3) SEO (????? ?????? ?? ???? ????)
    let seo: {
      metaTitle: string | undefined;
      metaDescription: string | undefined;
      metaKeywords: string | undefined;
    };
    if (!parsed.metaTitle || !parsed.metaDescription || !parsed.metaKeywords) {
      const generated = await generateAISEO(parsed.name, parsed.description, [], {
        language: lang === "FA" ? "fa" : "en",
      });
      seo = {
        metaTitle: generated.meta_title,
        metaDescription: generated.meta_description,
        metaKeywords: generated.meta_keywords,
      };
    } else {
      seo = {
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        metaKeywords: parsed.metaKeywords,
      };
    }

    // 4) ????? ????? ??????? (fallback ? name)
    const finalSliderTitle =
      (parsed.sliderTitle && parsed.sliderTitle.trim()) || parsed.name;

    const now = new Date();

    // ????? ?? ??? ? ???? ?????
    const { generateNewsCode, generateShortLink, ensureUniqueNewsCode, ensureUniqueShortLink } = await import("@/lib/utils/short-link");
    let newsCode: string | undefined;
    let shortLink: string | undefined;

    try {
      newsCode = await ensureUniqueNewsCode(generateNewsCode(0));
      shortLink = await ensureUniqueShortLink(generateShortLink(0));
    } catch (codeError: any) {
      // ??? ???? code ???? ?????? ??? warning ??? ? ????? ???
      if (codeError?.message?.includes("Unknown argument 'code'") || codeError?.message?.includes("code") || codeError?.message?.includes("short_link")) {
        console.warn("?? ???? 'code' ?? 'short_link' ?? Blog model ???? ???. Prisma client ?? regenerate ????.");
        newsCode = undefined;
        shortLink = undefined;
      } else {
        throw codeError;
      }
    }

    // 5) ??????: Blog + SEO + Translation + (???????) SliderItem
    const result = await prisma.$transaction(async (tx) => {
      // Blog
      const blogData: any = {
        image: parsed.image || "",
        slug: finalBaseSlug,
        sliderRequested: !!sliderRequested,
        sliderRequestedAt: sliderRequested ? now : null,
        sliderTitle: finalSliderTitle,
        status: parsed.status,
        published_at: parsed.status === "PUBLISHED" ? now : null,
        blogcategory: {
          connect: categoryIds.map((id) => ({ id })),
        },
      };

      // ??? ??? authorId ???? ????? ????? ??
      if (userId) {
        blogData.author_id = userId;
      }

      // ??? ??? code ? short_link ????? ????? ????? ??
      if (newsCode) blogData.code = newsCode;
      if (shortLink) blogData.short_link = shortLink;

      let blog;
      try {
        blog = await tx.blog.create({
          data: blogData,
        });
      } catch (createError: any) {
        // ??? ??????? code, short_link, ?? author_id ???? ??????? ???? ???? ?????? ??
        if (createError?.message?.includes("Unknown argument") &&
          (createError?.message?.includes("code") ||
            createError?.message?.includes("short_link") ||
            createError?.message?.includes("author_id"))) {
          console.warn("?? ???? ?????? ?? Blog model ???? ?????. ???? ???? ????...");
          const fallbackData: any = {
            image: parsed.image || "",
            slug: finalBaseSlug,
            sliderRequested: !!sliderRequested,
            sliderRequestedAt: sliderRequested ? now : null,
            sliderTitle: finalSliderTitle,
            status: parsed.status,
            published_at: parsed.status === "PUBLISHED" ? now : null,
            blogcategory: {
              connect: categoryIds.map((id) => ({ id })),
            },
          };
          blog = await tx.blog.create({
            data: fallbackData,
          });
        } else {
          throw createError;
        }
      }

      // ??????????? code ? short_link ?? blog.id ????? (??? ????? ????? ???? ?????)
      if (newsCode && shortLink) {
        try {
          const finalCode = await ensureUniqueNewsCode(generateNewsCode(blog.id), blog.id);
          const finalShortLink = await ensureUniqueShortLink(generateShortLink(blog.id), blog.id);
          await tx.blog.update({
            where: { id: blog.id },
            data: { code: finalCode, short_link: finalShortLink },
          });
        } catch (updateError: any) {
          // ??? ???? code ???? ?????? ??? warning ???
          if (updateError?.message?.includes("Unknown argument 'code'") || updateError?.message?.includes("code") || updateError?.message?.includes("short_link")) {
            console.warn("?? ???? 'code' ?? 'short_link' ?? Blog model ???? ???. Prisma client ?? regenerate ????.");
          } else {
            throw updateError;
          }
        }
      }

      // SEO
      const createdSEO = await tx.sEO.create({
        data: {
          meta_title: seo.metaTitle || "",
          meta_description: seo.metaDescription || "",
          meta_keywords: seo.metaKeywords || "",
          canonical_url: `/${lang.toLowerCase()}/${finalBaseSlug}`,
          robots: parsed.robots ?? "index",
          og_title: og_title ?? seo.metaTitle,
          og_description: og_description ?? seo.metaDescription,
          twitter_title: twitter_title ?? seo.metaTitle,
          twitter_description: twitter_description ?? seo.metaDescription,
          locale: lang,
        },
      });

      // Translation (FA)
      await tx.blogTranslation.create({
        data: {
          blog_id: blog.id,
          title: parsed.name,
          content: parsed.description,
          slug: finalBaseSlug,
          lang: "FA",
          seo_id: createdSEO.id,
        },
      });

      // SliderItem (???? ??????? ?????? ?????? ????????)
      if (sliderRequested) {
        // ??????? ?? ???? SliderConfig
        await tx.sliderConfig.upsert({
          where: { id: 1 },
          update: {},
          create: { id: 1, maxSlots: 6, backfillWindowHours: 72 },
        });

        const endAt = new Date(now.getTime() + 24 * 3600 * 1000); // 24h
        await tx.sliderItem.create({
          data: {
            blogId: blog.id,
            startAt: now,
            endAt,
            ttlHours: 24,
            priority: 0,
            pinned: false,
            status: "ACTIVE",
          },
        });
      }

      return blog.id;
    });

    // Broadcast new blog to realtime subscribers (only if published)
    if (parsed.status === "PUBLISHED") {
      try {
        const { broadcastNewBlog } = await import('@/lib/sse/broadcast');
        await broadcastNewBlog(result, parsed.name, finalBaseSlug);
      } catch (error) {
        console.error('Error broadcasting new blog:', error);
        // Don't fail the request if broadcast fails
      }
    }

    return NextResponse.json({ success: true, blog_id: result }, { status: 201 });
  } catch (error: unknown) {
    console.error("? ??? ?? ????? ????:", error);

    // Better error handling
    let message = "????? ?? ???? ???.";
    let status = 400;

    if (error instanceof Error) {
      message = error.message;

      // Check for validation errors
      if (error.message.includes("zod") || error.message.includes("validation")) {
        status = 400;
      } else if (error.message.includes("Unauthorized") || error.message.includes("token")) {
        status = 401;
      } else if (error.message.includes("Forbidden")) {
        status = 403;
      }
    }

    return NextResponse.json({
      error: message,
      details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined
    }, { status });
  }
}
