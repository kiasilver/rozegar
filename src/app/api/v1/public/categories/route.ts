/**
 * Public Categories API (v1)
 * Returns active blog categories with FA translations
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    // Create query with timeout - 5 seconds max
    const queryPromise = prisma.blogCategory.findMany({
      where: {
        is_active: true,
        parent_id: null, // Only top-level categories
      },
      select: {
        id: true,
        order: true,
        translations: {
          where: { lang: 'FA' },
          select: {
            name: true,
            slug: true,
          },
          take: 1, // Only need first translation
        },
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );

    const categories = await Promise.race([queryPromise, timeoutPromise]);

    // Transform to flat structure expected by frontend
    const formattedCategories = categories
      .filter(cat => cat.translations && cat.translations.length > 0)
      .map(cat => ({
        id: cat.id,
        name: cat.translations[0].name,
        slug: cat.translations[0].slug,
        order: cat.order || 0,
      }));

    return NextResponse.json(formattedCategories, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('❌ [Categories API] Error:', error);
    // Return empty array instead of error to prevent frontend crash
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30',
      },
    });
  }
}
