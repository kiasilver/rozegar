/**
 * Comments API - Returns list of comments for admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [comments, total] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          content: true,
          status: true,
          created_at: true,
          name: true,
          email: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image_profile: true,
            },
          },
          blog: {
            select: {
              id: true,
              slug: true,
              translations: {
                where: { lang: 'FA' },
                take: 1,
                select: { title: true, slug: true },
              },
            },
          },
          parent: {
            select: {
              id: true,
              content: true,
            }
          }
        },
      }),
      prisma.blogComment.count({ where }),
    ]);

    const formatted = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      status: comment.status,
      created_at: comment.created_at,
      name: comment.name || comment.user?.name || 'ناشناس',
      email: comment.email || comment.user?.email,
      user: comment.user ? {
        id: comment.user.id,
        name: comment.user.name,
        email: comment.user.email,
        image_profile: comment.user.image_profile,
      } : null,
      blog: comment.blog ? {
        id: comment.blog.id,
        slug: comment.blog.slug,
        translations: comment.blog.translations.map(t => ({
          title: t.title,
          slug: t.slug,
        })),
      } : null,
      parent: comment.parent ? {
        id: comment.parent.id,
        content: comment.parent.content,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Comments API] Error:', error.message);
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
