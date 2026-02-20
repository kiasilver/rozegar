/**
 * API Route: /api/site/news/most-viewed
 * Returns most viewed news items
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
    try {
        // Fetch most viewed blogs
        const blogs = await prisma.blog.findMany({
            where: {
                is_active: true,
                status: "PUBLISHED",
            },
            orderBy: { view_count: "desc" },
            take: 10,
            select: {
                id: true,
                image: true,
                slug: true,
                published_at: true,
                created_at: true,
                view_count: true,
                translations: {
                    where: { lang: "FA" },
                    select: {
                        title: true,
                        excerpt: true,
                        slug: true,
                    },
                },
                blogcategory: {
                    select: {
                        translations: {
                            where: { lang: "FA" },
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        // Transform to match expected format
        const newsItems = blogs
            .filter(blog => blog.translations && blog.translations.length > 0)
            .map(blog => ({
                id: blog.id,
                title: blog.translations[0]?.title || "",
                slug: blog.translations[0]?.slug || blog.slug || "",
                img: blog.image || "",
                image: blog.image || "",
                date: blog.published_at?.toISOString() || blog.created_at?.toISOString() || "",
                published_at: blog.published_at?.toISOString() || blog.created_at?.toISOString() || "",
                view_count: blog.view_count || 0,
                category: blog.blogcategory[0]?.translations[0]?.name || "",
            }));

        return NextResponse.json(newsItems, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error("Error fetching most viewed news:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
