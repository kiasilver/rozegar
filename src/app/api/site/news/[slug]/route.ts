/**
 * API Route: /api/site/news/[slug]
 * Returns news items for a specific category by slug or name
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // Find category by slug or name
        const categoryData = await prisma.blogCategoryTranslation.findFirst({
            where: {
                lang: "FA",
                OR: [
                    { slug: slug },
                    { name: slug },
                ],
            },
            include: { blogCategory: true },
        });

        if (!categoryData) {
            return NextResponse.json([], {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                },
            });
        }

        // Fetch blogs for this category
        const blogs = await prisma.blog.findMany({
            where: {
                is_active: true,
                status: "PUBLISHED",
                blogcategory: {
                    some: { id: categoryData.blogCategory_id },
                },
            },
            orderBy: { published_at: "desc" },
            take: 50,
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
                date: blog.published_at?.toISOString() || blog.created_at?.toISOString() || "",
                description: blog.translations[0]?.excerpt || "",
                view_count: blog.view_count || 0,
            }));

        return NextResponse.json(newsItems, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error("Error fetching news by category:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
