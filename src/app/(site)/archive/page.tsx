import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import SidebarRight from '@/components/Site/sidebar/sidebar_right';

// ISR - revalidate every hour for better performance
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'آرشیو اخبار | سایت خبری',
  description: 'آرشیو کامل اخبار و مقالات',
  alternates: {
    canonical: '/archive',
  },
};

interface SearchParams {
  page?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || '1', 10);
  const postsPerPage = 20;
  const categorySlug = params.category;
  const fromDate = params.fromDate;
  const toDate = params.toDate;
  const searchQuery = params.search;

  // دریافت دسته‌بندی‌ها
  const categories = await prisma.blogCategory.findMany({
    where: {
      is_active: true,
      parent_id: null,
    },
    include: {
      translations: {
        where: { lang: 'FA' },
        select: { name: true, slug: true },
      },
    },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });

  // Build where clause
  const whereClause: any = {
    is_active: true,
    status: 'PUBLISHED',
    translations: {
      some: {
        lang: 'FA',
      },
    },
  };

  // Filter by category
  if (categorySlug) {
    whereClause.blogcategory = {
      some: {
        translations: {
          some: {
            slug: categorySlug,
            lang: 'FA',
          },
        },
      },
    };
  }

  // Filter by date range
  if (fromDate || toDate) {
    whereClause.published_at = {};
    if (fromDate) {
      whereClause.published_at.gte = new Date(fromDate);
    }
    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      whereClause.published_at.lte = toDateEnd;
    }
  }

  // Search in title and content
  if (searchQuery) {
    whereClause.OR = [
      {
        translations: {
          some: {
            title: {
              contains: searchQuery,
              mode: 'insensitive',
            },
            lang: 'FA',
          },
        },
      },
      {
        translations: {
          some: {
            content: {
              contains: searchQuery,
              mode: 'insensitive',
            },
            lang: 'FA',
          },
        },
      },
    ];
  }

  // Get total count
  const totalPosts = await prisma.blog.count({ where: whereClause });
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Get posts
  const posts = await prisma.blog.findMany({
    where: whereClause,
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
        select: { name: true },
      },
    },
    orderBy: { published_at: 'desc' },
    skip: (currentPage - 1) * postsPerPage,
    take: postsPerPage,
  });

  // Get date range for display
  const dateRange = await prisma.blog.findMany({
    where: {
      is_active: true,
      status: 'PUBLISHED',
    },
    select: {
      published_at: true,
    },
    orderBy: { published_at: 'asc' },
    take: 1,
  });

  const minDate = dateRange[0]?.published_at
    ? new Date(dateRange[0].published_at).toISOString().split('T')[0]
    : '';
  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">آرشیو</h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
              <form method="GET" action="/archive" className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      موضوع
                    </label>
                    <select
                      name="category"
                      defaultValue={categorySlug || ''}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">همه</option>
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

                  {/* Search */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      جستجو
                    </label>
                    <input
                      type="text"
                      name="search"
                      defaultValue={searchQuery || ''}
                      placeholder="جستجو در عنوان و محتوا..."
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* From Date */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      از تاریخ
                    </label>
                    <input
                      type="date"
                      name="fromDate"
                      defaultValue={fromDate || ''}
                      min={minDate}
                      max={maxDate}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      تا تاریخ
                    </label>
                    <input
                      type="date"
                      name="toDate"
                      defaultValue={toDate || ''}
                      min={minDate}
                      max={maxDate}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <Link
                    href="/archive"
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    پاک کردن
                  </Link>
                </div>
              </form>
            </div>

            {/* Results Count */}
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
              تعداد نتایج: {totalPosts.toLocaleString('fa-IR')}
            </div>

            {/* Posts List */}
            {posts.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {posts.map((post) => {
                  const translation = post.translations[0];
                  if (!translation) return null;

                  return (
                    <article
                      key={post.id}
                      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <Link href={`/news/${translation.slug || post.slug}`}>
                        <div className="flex flex-col sm:flex-row">
                          {post.image && (
                            <div className="sm:w-40 md:w-48 flex-shrink-0">
                              <Image
                                src={post.image}
                                alt={translation.title}
                                width={300}
                                height={200}
                                className="w-full h-40 sm:h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 p-3 sm:p-4">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                              {post.blogcategory.slice(0, 2).map((cat) => {
                                const catTranslation = cat.translations[0];
                                if (!catTranslation) return null;
                                return (
                                  <span
                                    key={cat.id}
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-blue-100 text-blue-800 rounded"
                                  >
                                    {catTranslation.name}
                                  </span>
                                );
                              })}
                            </div>
                            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 line-clamp-2">
                              {translation.title}
                            </h2>
                            {translation.excerpt && (
                              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">
                                {translation.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-gray-500 flex-wrap">
                              {post.published_at && (
                                <time className="whitespace-nowrap">
                                  {new Date(post.published_at).toLocaleDateString('fa-IR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </time>
                              )}
                              <span className="whitespace-nowrap">{post.view_count.toLocaleString('fa-IR')} بازدید</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
                <p className="text-sm sm:text-base text-gray-500">نتیجه‌ای یافت نشد</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex justify-center gap-1 sm:gap-2 flex-wrap">
                {currentPage > 1 && (
                  <Link
                    href={`/archive?page=${currentPage - 1}${categorySlug ? `&category=${categorySlug}` : ''}${fromDate ? `&fromDate=${fromDate}` : ''}${toDate ? `&toDate=${toDate}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    قبلی
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-1 sm:px-2 py-1.5 sm:py-2 text-sm sm:text-base">...</span>
                      )}
                      <Link
                        href={`/archive?page=${page}${categorySlug ? `&category=${categorySlug}` : ''}${fromDate ? `&fromDate=${fromDate}` : ''}${toDate ? `&toDate=${toDate}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                        className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page.toLocaleString('fa-IR')}
                      </Link>
                    </React.Fragment>
                  ))}
                {currentPage < totalPages && (
                  <Link
                    href={`/archive?page=${currentPage + 1}${categorySlug ? `&category=${categorySlug}` : ''}${fromDate ? `&fromDate=${fromDate}` : ''}${toDate ? `&toDate=${toDate}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    بعدی
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <SidebarRight />
          </aside>
        </div>
      </div>
    </div>
  );
}

