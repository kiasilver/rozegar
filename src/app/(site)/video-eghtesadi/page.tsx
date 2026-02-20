import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import BlogImage from '@/components/Site/blog/BlogImage';
import AdBanner from '@/components/Site/ads/AdBanner';
import SidebarRight from '@/components/Site/sidebar/sidebar_right';

// ISR - revalidate every hour for better performance
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'ویدیو اقتصادی | سایت خبری',
  description: 'ویدیوهای خبری اقتصادی',
  alternates: {
    canonical: '/video-eghtesadi',
  },
};

interface SearchParams {
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function VideoEghtesadiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || '1', 10);
  const postsPerPage = 12;

  // پیدا کردن دسته‌بندی اقتصادی
  const eghtesadiCategory = await prisma.blogCategoryTranslation.findFirst({
    where: {
      lang: 'FA',
      OR: [
        { slug: 'eghtesadi' },
        { name: { contains: 'اقتصاد', mode: 'insensitive' } },
      ],
    },
    include: { blogCategory: true },
  });

  // Build where clause - فقط خبرهایی که ویدیو دارند و در دسته‌بندی اقتصادی هستند
  let whereClause: any = {
    is_active: true,
    status: 'PUBLISHED',
    translations: {
      some: {
        lang: 'FA',
        OR: [
          {
            content: {
              contains: '<video',
            },
          },
          {
            content: {
              contains: '<iframe',
            },
          },
          {
            content: {
              contains: 'youtube.com',
            },
          },
          {
            content: {
              contains: 'youtu.be',
            },
          },
          {
            content: {
              contains: 'vimeo.com',
            },
          },
          {
            content: {
              contains: '/uploads/videos/',
            },
          },
          {
            content: {
              contains: 'video-wrapper',
            },
          },
        ],
      },
    },
  };

  // فیلتر بر اساس دسته‌بندی اقتصادی
  if (eghtesadiCategory) {
    whereClause.blogcategory = {
      some: { id: eghtesadiCategory.blogCategory_id },
    };
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

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                ویدیو اقتصادی
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                ویدیوهای خبری اقتصادی ({totalPosts.toLocaleString('fa-IR')} مورد)
              </p>
            </div>

            {/* تبلیغ بالای محتوا */}
            <AdBanner position="CONTENT_TOP" className="mb-8" />

            {/* Posts Grid */}
            {posts.length > 0 ? (
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
                      <article className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                        <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden bg-gray-200">
                          <BlogImage
                            src={post.image || '/images/logo/logo.png'}
                            alt={translation.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {post.blogcategory[0]?.translations[0] && (
                            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-blue-600 text-white rounded">
                                {post.blogcategory[0].translations[0].name}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
                            <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-red-600 text-white rounded flex items-center gap-1">
                              <svg width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              ویدیو
                            </div>
                          </div>
                        </div>
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {translation.title}
                          </h3>
                          {translation.excerpt && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mb-3 flex-1">
                              {translation.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mt-auto pt-2 sm:pt-3 border-t border-gray-100">
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
            ) : (
              <div className="text-center py-8 sm:py-12">
                <p className="text-base sm:text-lg text-gray-600">ویدیوی اقتصادی یافت نشد.</p>
              </div>
            )}

            {/* تبلیغ وسط محتوا */}
            <AdBanner position="CONTENT_MIDDLE" className="my-8" />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8 flex-wrap">
                {currentPage > 1 && (
                  <Link
                    href={`/video-eghtesadi?page=${currentPage - 1}`}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                        href={`/video-eghtesadi?page=${pageNum}`}
                        className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
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
                    href={`/video-eghtesadi?page=${currentPage + 1}`}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

      {/* تبلیغ بنر پایین صفحه */}
      <AdBanner position="BANNER_BOTTOM" className="w-full" />
    </div>
  );
}

