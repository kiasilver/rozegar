import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * ?????? ???? ????? ???? ???? (?? ??? ?? ??? ?????)
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const userPayload = await verifyJWT(token);
      if (!userPayload) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } catch (authError) {
      console.error("JWT verification error:", authError);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // ?????? ????????????? ????
    let categories: any[] = [];
    try {
      categories = await prisma.blogCategory.findMany({
        where: {
          is_active: true,
        },
        include: {
          translations: {
            where: { lang: 'FA' },
            select: { name: true, slug: true },
          },
        },
        orderBy: { order: 'asc' },
      });
    } catch (catError) {
      console.error("Error fetching categories:", catError);
      // ????? ??????? ?? ????? ????
    }

    // ?????? ????? ??????? (MenuPage)
    let staticPages: any[] = [];
    try {
      staticPages = await prisma.menuPage.findMany({
        where: {
          is_active: true,
        },
        include: {
          translations: {
            where: { lang: 'FA' },
            select: { title: true },
          },
        },
      });
    } catch (staticError) {
      console.error("Error fetching static pages:", staticError);
      // ????? ??????? ?? ????? ????
    }

    // ?????? ????? ????? (GeneralPage) ??? about, contact, archive
    let generalPages: any[] = [];
    try {
      generalPages = await prisma.generalPage.findMany({
        where: {
          is_active: true,
        },
        include: {
          translations: {
            where: { lang: 'FA' },
            select: { title: true, slug: true },
          },
        },
      });
    } catch (generalError) {
      console.error("Error fetching general pages:", generalError);
      // ????? ??????? ?? ????? ????
    }

    // ???? ???? ?????
    const pages: Array<{ label: string; value: string; type: string }> = [
      // ????? ????
      { label: '???? ????', value: '/', type: 'main' },
      { label: '?????', value: '/news', type: 'main' },
      { label: '????', value: '/blog', type: 'main' },
      { label: '?????', value: '/search', type: 'main' },
      { label: '?????', value: '/archive', type: 'main' },
      { label: '????? ???????', value: '/newspaper-kiosk', type: 'main' },
      { label: '???????', value: '/ads', type: 'main' },
      
      // ????????????
      ...categories
        .filter(cat => cat.translations && cat.translations.length > 0 && cat.translations[0]?.slug)
        .map(cat => ({
          label: `?????????: ${cat.translations[0].name}`,
          value: `/category/${cat.translations[0].slug}`,
          type: 'category' as const,
        })),
      
      // ????? ??????? (MenuPage)
      ...staticPages
        .filter(page => page.translations && page.translations.length > 0 && page.slug)
        .map(page => ({
          label: `????: ${page.translations[0].title}`,
          value: `/${page.slug}`,
          type: 'page' as const,
        })),
      
      // ????? ????? (GeneralPage) ??? about, contact
      ...generalPages
        .filter(page => page.translations && page.translations.length > 0 && page.translations[0]?.slug)
        .map(page => ({
          label: page.translations[0].title,
          value: `/${page.translations[0].slug}`,
          type: 'general' as const,
        })),
    ];

    return NextResponse.json(pages);
  } catch (error: any) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error?.message || "Unknown error",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

