/**
 * صفحه نمایش تک خبر
 * مسیر: /news/[...slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Image from 'next/image';
import Link from 'next/link';
import SidebarRight from '@/components/site/sidebar/sidebar_right';
import AdBanner from '@/components/site/ads/adbanner';
import { generateArticleStructuredData } from '@/lib/content/seo/seo';

// ISR - revalidate every hour
export const revalidate = 3600;

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

// Helper: Find blog by slug
async function findBlogBySlug(slugParts: string[]) {
    // The slug can be just the title slug or can include category
    // Try multiple approaches
    const fullSlug = slugParts.join('/');
    const lastSlug = slugParts[slugParts.length - 1];

    console.log(`[News Page] Looking for blog with slug: "${fullSlug}" or "${lastSlug}"`);

    // Try exact match first
    let blog = await prisma.blog.findFirst({
        where: {
            OR: [
                { slug: fullSlug },
                { slug: lastSlug },
                {
                    translations: {
                        some: {
                            OR: [
                                { slug: fullSlug },
                                { slug: lastSlug },
                                { slug: { contains: lastSlug } },
                            ],
                        },
                    },
                },
            ],
            status: 'PUBLISHED',
            is_active: true,
        },
        include: {
            translations: {
                where: { lang: 'FA' },
                include: { seo: true },
            },
            blogcategory: {
                include: {
                    translations: {
                        where: { lang: 'FA' },
                    },
                },
            },
            User: {
                select: {
                    name: true,
                    image_profile: true,
                },
            },
        },
    });

    // If not found with FA translation, try finding any
    if (!blog) {
        blog = await prisma.blog.findFirst({
            where: {
                OR: [
                    { slug: fullSlug },
                    { slug: lastSlug },
                    {
                        translations: {
                            some: {
                                OR: [
                                    { slug: fullSlug },
                                    { slug: lastSlug },
                                    { slug: { contains: lastSlug } },
                                ],
                            },
                        },
                    },
                ],
                status: 'PUBLISHED',
                is_active: true,
            },
            include: {
                translations: {
                    include: { seo: true },
                },
                blogcategory: {
                    include: {
                        translations: {
                            where: { lang: 'FA' },
                        },
                    },
                },
                User: {
                    select: {
                        name: true,
                        image_profile: true,
                    },
                },
            },
        });
    }

    return blog;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug: slugParts } = await params;

    // Decode URL parts
    const decodedParts = slugParts.map(part => {
        try {
            return decodeURIComponent(part);
        } catch {
            return part;
        }
    });

    const blog = await findBlogBySlug(decodedParts);

    if (!blog) {
        return {
            title: 'خبر یافت نشد',
        };
    }

    const translation = blog.translations[0];
    const seo = (translation as any)?.seo;
    const title = translation?.title || blog.slug || 'خبر';
    const description = translation?.excerpt || '';
    const image = blog.image || '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const url = `${baseUrl}/news/${decodedParts.join('/')}`;

    return {
        title: seo?.meta_title || title,
        description: seo?.meta_description || description,
        keywords: seo?.meta_keywords?.split(',').map((k: string) => k.trim()) || [],
        alternates: {
            canonical: seo?.canonical_url || url,
        },
        openGraph: {
            type: 'article',
            locale: 'fa_IR',
            url: seo?.og_url || url,
            siteName: 'سایت خبری',
            title: seo?.og_title || title,
            description: seo?.og_description || description,
            images: image ? [{ url: image.startsWith('http') ? image : `${baseUrl}${image}` }] : undefined,
            publishedTime: blog.published_at?.toISOString(),
            modifiedTime: blog.updated_at?.toISOString(),
        },
        twitter: {
            card: 'summary_large_image',
            title: seo?.twitter_title || title,
            description: seo?.twitter_description || description,
            images: image ? [image.startsWith('http') ? image : `${baseUrl}${image}`] : undefined,
        },
    };
}

export default async function NewsPage({ params }: PageProps) {
    const { slug: slugParts } = await params;

    // Decode URL parts
    const decodedParts = slugParts.map(part => {
        try {
            return decodeURIComponent(part);
        } catch {
            return part;
        }
    });

    console.log(`[News Page] Accessing: /news/${decodedParts.join('/')}`);

    const blog = await findBlogBySlug(decodedParts);

    if (!blog) {
        console.error(`[News Page] Blog not found for slug: ${decodedParts.join('/')}`);
        notFound();
    }

    // Increment view count
    try {
        await prisma.blog.update({
            where: { id: blog.id },
            data: { view_count: { increment: 1 } },
        });
    } catch (error) {
        console.warn('[News Page] Failed to increment view count:', error);
    }

    const translation = blog.translations[0];
    const seoData = (translation as any)?.seo;
    const title = translation?.title || blog.slug || 'خبر';
    const content = translation?.content || '';
    const excerpt = translation?.excerpt || '';
    const category = blog.blogcategory?.[0];
    const categoryName = category?.translations?.[0]?.name || 'عمومی';
    const categorySlug = category?.translations?.[0]?.slug || '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // Structured Data
    const articleStructuredData = generateArticleStructuredData(
        title,
        excerpt || content.substring(0, 200),
        blog.image || '',
        `${baseUrl}/news/${decodedParts.join('/')}`,
        blog.published_at,
        blog.updated_at,
        blog.User ? { name: blog.User.name || 'تحریریه' } : null,
        [categoryName]
    );

    // Get related posts
    const relatedPosts = await prisma.blog.findMany({
        where: {
            id: { not: blog.id },
            status: 'PUBLISHED',
            is_active: true,
            blogcategory: category ? {
                some: { id: category.id },
            } : undefined,
        },
        include: {
            translations: {
                where: { lang: 'FA' },
                select: {
                    title: true,
                    slug: true,
                },
            },
        },
        orderBy: { published_at: 'desc' },
        take: 4,
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
            />

            <div className="w-full bg-gray-50 min-h-screen">
                <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
                        {/* Main Content */}
                        <article className="lg:col-span-8">
                            {/* Breadcrumb */}
                            <nav className="mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600">
                                <ol className="flex items-center space-x-1 sm:space-x-2 space-x-reverse flex-wrap">
                                    <li>
                                        <Link href="/" className="hover:text-gray-900">
                                            خانه
                                        </Link>
                                    </li>
                                    <li>/</li>
                                    {categorySlug && (
                                        <>
                                            <li>
                                                <Link href={`/category/${categorySlug}`} className="hover:text-gray-900">
                                                    {categoryName}
                                                </Link>
                                            </li>
                                            <li>/</li>
                                        </>
                                    )}
                                    <li className="text-gray-900 truncate max-w-[200px]">{title}</li>
                                </ol>
                            </nav>

                            {/* Article Header */}
                            <header className="mb-6 sm:mb-8">
                                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-relaxed">
                                    {title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4">
                                    {blog.User && (
                                        <span className="flex items-center gap-1">
                                            <span>نویسنده:</span>
                                            <span className="text-gray-700">{blog.User.name}</span>
                                        </span>
                                    )}
                                    {blog.published_at && (
                                        <time className="flex items-center gap-1">
                                            <span>تاریخ:</span>
                                            <span className="text-gray-700">
                                                {new Date(blog.published_at).toLocaleDateString('fa-IR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </time>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <span>بازدید:</span>
                                        <span className="text-gray-700">{blog.view_count.toLocaleString('fa-IR')}</span>
                                    </span>
                                    {categoryName && (
                                        <Link
                                            href={`/category/${categorySlug}`}
                                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                                        >
                                            {categoryName}
                                        </Link>
                                    )}
                                </div>
                            </header>

                            {/* Featured Image */}
                            {blog.image && (
                                <div className="relative aspect-video w-full mb-6 sm:mb-8 rounded-xl overflow-hidden shadow-lg">
                                    <Image
                                        src={blog.image}
                                        alt={title}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            )}

                            {/* Top Ad */}
                            <AdBanner position="CONTENT_TOP" className="mb-6" />

                            {/* Excerpt */}
                            {excerpt && (
                                <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg mb-6 sm:mb-8">
                                    <div
                                        className="text-gray-700 leading-relaxed text-sm sm:text-base"
                                        dangerouslySetInnerHTML={{ __html: excerpt }}
                                    />
                                </div>
                            )}

                            {/* Article Content */}
                            <div
                                className="prose prose-lg max-w-none mb-8 
                  prose-headings:text-gray-900 
                  prose-p:text-gray-700 
                  prose-p:leading-relaxed
                  prose-p:mb-4
                  prose-p:mt-0
                  prose-a:text-blue-600 
                  prose-img:rounded-lg
                  prose-img:mx-auto
                  prose-img:my-6
                  prose-h2:mt-8
                  prose-h2:mb-4
                  prose-h2:text-2xl
                  prose-h2:font-bold
                  prose-h3:mt-6
                  prose-h3:mb-3
                  prose-h3:text-xl
                  prose-h3:font-semibold
                  [&>*]:text-right
                  [&_p]:text-right
                  [&_p]:mb-4
                  [&_h1]:text-right
                  [&_h2]:text-right
                  [&_h2]:mb-4
                  [&_h2]:mt-8
                  [&_h3]:text-right
                  [&_h3]:mb-3
                  [&_h3]:mt-6
                  [&_h4]:text-right
                  [&_li]:text-right
                  [&_ul]:mb-4
                  [&_ol]:mb-4
                  [&_li]:mb-2"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />

                            {/* Middle Ad */}
                            <AdBanner position="CONTENT_MIDDLE" className="my-8" />

                            {/* Tags / Keywords */}
                            {seoData?.meta_keywords && (
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {seoData.meta_keywords.split(',').map((keyword: string, index: number) => (
                                        <span
                                            key={index}
                                            className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm"
                                        >
                                            {keyword.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Related Posts */}
                            {relatedPosts.length > 0 && (
                                <div className="mt-8 sm:mt-12">
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                                        اخبار مرتبط
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {relatedPosts.map((post) => {
                                            const postTranslation = post.translations[0];
                                            if (!postTranslation) return null;

                                            return (
                                                <Link
                                                    key={post.id}
                                                    href={`/news/${postTranslation.slug || post.slug}`}
                                                    className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <h4 className="text-sm sm:text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                                                        {postTranslation.title}
                                                    </h4>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </article>

                        {/* Sidebar */}
                        <aside className="lg:col-span-4">
                            <SidebarRight />
                        </aside>
                    </div>
                </div>

                {/* Bottom Banner */}
                <AdBanner position="BANNER_BOTTOM" className="w-full" />
            </div>
        </>
    );
}
