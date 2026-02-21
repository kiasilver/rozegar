/**
 * Categories API - Get all blog categories
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

// GET - List all blog categories
export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      include: {
        translations: true,
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('[Categories] GET Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'خطا در دریافت دسته‌بندی‌ها' },
      { status: 500 }
    );
  }
}


