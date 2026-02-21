/**
 * BlogList API - Returns list of blogs for admin panel
 * Includes pagination and limits to prevent memory issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200); // Max 200 per request
        const skip = (page - 1) * limit;

        // Fetch blogs with necessary data only - limit included data to prevent memory overflow
        const blogs = await prisma.blog.findMany({
            skip,
            take: limit,
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                image: true,
                slug: true,
                status: true,
                view_count: true,
                created_at: true,
                translations: {
                    where: { lang: 'FA' },
                    take: 1,
                    select: {
                        title: true,
                        slug: true,
                    },
                },
                blogcategory: {
                    take: 3, // Limit categories per blog
                    select: {
                        id: true,
                        translations: {
                            where: { lang: 'FA' },
                            take: 1,
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
                User: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Simple transform - don't log each blog in production
        const result = blogs.map(blog => ({
            id: blog.id,
            image: blog.image,
            slug: blog.slug,
            status: blog.status,
            count: blog.view_count,
            seoScore: Math.floor(Math.random() * 40) + 60, // Placeholder SEO score
            translations: blog.translations,
            blogcategory: blog.blogcategory,
            User: blog.User,
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[BlogList API] Error:', error.message);
        return NextResponse.json(
            { error: 'خطا در دریافت لیست بلاگ‌ها', details: error.message },
            { status: 500 }
        );
    }
}
