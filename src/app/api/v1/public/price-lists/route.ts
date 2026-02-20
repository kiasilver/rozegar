import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const dynamic = "force-dynamic";

/**
 * ??????? ???? ?? ?????? HTML
 */
function extractPriceTable(htmlContent: string): string | null {
  if (!htmlContent) return null;
  
  // ?????? ???? ?? ?????
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/i;
  const match = htmlContent.match(tableRegex);
  
  if (match && match[0]) {
    return match[0];
  }
  
  return null;
}

/**
 * ????? ????? ??? ????? ???? ???? ???? ??? ?? ??
 */
function hasPriceTable(content: string, title: string): boolean {
  if (!content) return false;
  
  // ????? ???? ????
  const hasTable = /<table[^>]*>/i.test(content);
  if (!hasTable) return false;
  
  // ????? ????? ????? ????? ?? ????
  const priceKeywords = [
    '????',
    '???? ????',
    '???? ????',
    '???????',
    '????',
    '???',
    '?????',
    '??????'
  ];
  
  const contentLower = (content + ' ' + title).toLowerCase();
  return priceKeywords.some(keyword => contentLower.includes(keyword.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!categoryName) {
      return NextResponse.json({ error: "????????? ?????? ???" }, { status: 400 });
    }

    // ???? ???? ?????????
    const categoryData = await prisma.blogCategoryTranslation.findFirst({
      where: {
        lang: "FA",
        OR: [
          { slug: categoryName },
          { name: categoryName },
        ],
      },
      include: { blogCategory: true },
    });

    if (!categoryData) {
      return NextResponse.json({ error: "????????? ???? ???" }, { status: 404 });
    }

    // ?????? ?????? ?? ???? ????
    const posts = await prisma.blog.findMany({
      where: {
        is_active: true,
        status: "PUBLISHED",
        blogcategory: {
          some: { id: categoryData.blogCategory_id },
        },
      },
      orderBy: { published_at: "desc" },
      take: limit * 2, // ????? ?????? ?? ??? ?? ?????? ????? ???? ????? ?????
      select: {
        id: true,
        slug: true,
        image: true,
        published_at: true,
        created_at: true,
        translations: {
          where: { lang: "FA" },
          select: {
            title: true,
            content: true,
            slug: true,
          },
        },
      },
    });

    // ????? ???? ?????? ?? ???? ????
    const priceListPosts = posts
      .filter((post) => {
        const translation = post.translations[0];
        if (!translation || !translation.content || !translation.title) {
          return false;
        }
        return hasPriceTable(translation.content, translation.title);
      })
      .slice(0, limit)
      .map((post) => {
        const translation = post.translations[0];
        const table = extractPriceTable(translation?.content || "");
        
        return {
          id: post.id,
          title: translation?.title || "???? ?????",
          slug: translation?.slug || post.slug || post.id.toString(),
          image: post.image,
          table: table || null,
          publishedAt: post.published_at?.toISOString() || post.created_at?.toISOString() || new Date().toISOString(),
        };
      });

    return NextResponse.json(priceListPosts);
  } catch (error: any) {
    console.error("Error fetching price lists:", error);
    return NextResponse.json({ error: "??? ?? ?????? ???? ???????" }, { status: 500 });
  }
}



