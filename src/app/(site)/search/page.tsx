import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import Image from 'next/image';
import AdBanner from '@/components/site/ads/adbanner';
import SidebarRight from '@/components/site/sidebar/sidebar_right';
import { generateWebsiteStructuredData } from '@/lib/content/seo/seo';

// ISR - revalidate every hour for better performance
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'جستجو | سایت خبری',
  description: 'جستجوی پیشرفته در اخبار و مقالات',
  alternates: {
    canonical: '/search',
  },
};

interface SearchParams {
  q?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const categorySlug = params.category;
  const dateFrom = params.date_from;
  const dateTo = params.date_to;
  const currentPage = parseInt(params.page || '1', 10);
  const postsPerPage = 12;

  // Build where clause
  let whereClause: any = {
    is_active: true,
    status: 'PUBLISHED',
    translations: {
      some: {
        lang: 'FA',
      },
    },
  };

  // Search filter
  if (query) {
    whereClause.OR = [
      {
        translations: {
          some: {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        translations: {
          some: {
            content: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
      },
      {
        translations: {
          some: {
            excerpt: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
      },
    ];
  }

  // Category filter
  if (categorySlug) {
    const category = await prisma.blogCategoryTranslation.findFirst({
      where: {
        slug: categorySlug,
        lang: 'FA',
      },
      include: { blogCategory: true },
    });

    if (category) {
      whereClause.blogcategory = {
        some: { id: category.blogCategory_id },
      };
    }
  }

  // Date filter
  if (dateFrom || dateTo) {
    whereClause.published_at = {};
    if (dateFrom) {
      whereClause.published_at.gte = new Date(dateFrom);
    }
    if (dateTo) {
      whereClause.published_at.lte = new Date(dateTo);
    }
  }

  // Get total count
  const totalPosts = await prisma.blog.count({ where: whereClause });
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Get posts
  const posts = await prisma.blog.findMany({
    where: whereClause,
    orderBy: { published_at: 'desc' },
    skip: (currentPage - 1) * postsPerPage,
    take: postsPerPage,
    include: {
      translations: {
        where: { lang: 'FA' },
        select: {
          title: true,
          slug: true,
          excerpt: true,
        },
      },
      blogcategory: {
        include: {
          translations: {
            where: { lang: 'FA' },
            select: { name: true, slug: true },
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

  // Get all categories for filter
  const categories = await prisma.blogCategory.findMany({
    where: {
      is_active: true,
      blog: {
        some: {
          status: 'PUBLISHED',
          is_active: true,
        },
      },
    },
    include: {
      translations: {
        where: { lang: 'FA' },
        select: { name: true, slug: true },
      },
    },
    orderBy: { order: 'asc' },
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const websiteStructuredData = generateWebsiteStructuredData();

  // Highlight search term in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />

      <div className="w-full bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              جستجوی پیشرفته
            </h1>
            {query && (
              <p className="text-base sm:text-lg text-gray-600">
                نتایج جستجو برای "{query}" ({totalPosts.toLocaleString('fa-IR')} نتیجه)
              </p>
            )}
          </div>

          {/* Search Form */}
          <div className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 md:p-6">
            <form action="/search" method="get" className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  جستجو
                </label>
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="جستجو در عنوان، محتوا و خلاصه..."
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    دسته‌بندی
                  </label>
                  <select
                    name="category"
                    defaultValue={categorySlug || ''}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">همه دسته‌بندی‌ها</option>
                    {categories.map((cat) => {
                      const translation = cat.translations[0];
                      if (!translation) return null;
                      return (
                        <option key={cat.id} value={translation.slug}>
                          {translation.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    از تاریخ
                  </label>
                  <input
                    type="date"
                    name="date_from"
                    defaultValue={dateFrom || ''}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    تا تاریخ
                  </label>
                  <input
                    type="date"
                    name="date_to"
                    defaultValue={dateTo || ''}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  جستجو
                </button>
                {query && (
                  <Link
                    href="/search"
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap"
                  >
                    پاک کردن
                  </Link>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          {query ? (
            posts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
                  {posts.map((post) => {
                    const translation = post.translations[0];
                    if (!translation) return null;

                    return (
                      <Link
                        key={post.id}
                        href={`/news/${translation.slug || post.slug}`}
                        className="group block"
                      >
                        <article className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                          <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                            <Image
                              src={post.image}
                              alt={translation.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {post.blogcategory[0]?.translations[0] && (
                              <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-blue-600 text-white rounded">
                                  {post.blogcategory[0].translations[0].name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 sm:p-4 flex-1 flex flex-col">
                            <h3
                              className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors"
                              dangerouslySetInnerHTML={{
                                __html: highlightText(translation.title, query),
                              }}
                            />
                            {translation.excerpt && (
                              <p
                                className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 flex-1"
                                dangerouslySetInnerHTML={{
                                  __html: highlightText(translation.excerpt.substring(0, 150), query),
                                }}
                              />
                            )}
                            <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                {post.User && (
                                  <span className="truncate max-w-[80px] sm:max-w-none">{post.User.name}</span>
                                )}
                                {post.published_at && (
                                  <time className="whitespace-nowrap">
                                    {new Date(post.published_at).toLocaleDateString('fa-IR', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </time>
                                )}
                              </div>
                              <span className="whitespace-nowrap">{post.view_count.toLocaleString('fa-IR')} بازدید</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8 flex-wrap">
                    {currentPage > 1 && (
                      <Link
                        href={`/search?${new URLSearchParams({
                          ...(query && { q: query }),
                          ...(categorySlug && { category: categorySlug }),
                          ...(dateFrom && { date_from: dateFrom }),
                          ...(dateTo && { date_to: dateTo }),
                          page: String(currentPage - 1),
                        }).toString()}`}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600"
                      >
                        قبلی
                      </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                      ) {
                        return (
                          <Link
                            key={pageNum}
                            href={`/search?${new URLSearchParams({
                              ...(query && { q: query }),
                              ...(categorySlug && { category: categorySlug }),
                              ...(dateFrom && { date_from: dateFrom }),
                              ...(dateTo && { date_to: dateTo }),
                              page: String(pageNum),
                            }).toString()}`}
                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition-colors ${
                              pageNum === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      } else if (
                        pageNum === currentPage - 3 ||
                        pageNum === currentPage + 3
                      ) {
                        return <span key={pageNum} className="px-1 sm:px-2 text-sm sm:text-base">...</span>;
                      }
                      return null;
                    })}
                    {currentPage < totalPages && (
                      <Link
                        href={`/search?${new URLSearchParams({
                          ...(query && { q: query }),
                          ...(categorySlug && { category: categorySlug }),
                          ...(dateFrom && { date_from: dateFrom }),
                          ...(dateTo && { date_to: dateTo }),
                          page: String(currentPage + 1),
                        }).toString()}`}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600"
                      >
                        بعدی
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl">
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                  نتیجه‌ای یافت نشد.
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-2">
                  لطفاً کلمات کلیدی دیگری را امتحان کنید.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl">
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                برای جستجو، کلمه یا عبارتی را وارد کنید.
              </p>
            </div>
          )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4">
                <SidebarRight />
              </aside>
            </div>
          </div>

        <AdBanner position="BANNER_BOTTOM" className="w-full" />
      </div>
    </>
  );
}
