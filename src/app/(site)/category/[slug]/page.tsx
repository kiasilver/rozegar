import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { generateCategoryStructuredData } from '@/lib/content/seo/seo';
import Link from 'next/link';
import Image from 'next/image';
import BlogImage from '@/components/site/blog/blogimage';
import AdBanner from '@/components/site/ads/adbanner';
import SidebarRight from '@/components/site/sidebar/sidebar_right';
import { getBlogUrl } from '@/lib/content/blog/blog-url';

// ISR - revalidate every hour for better performance
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;

  // Decode slug از URL
  let decodedSlug = rawSlug;
  try {
    if (rawSlug.includes('%')) {
      decodedSlug = decodeURIComponent(rawSlug);
    } else {
      // تلاش برای decode کردن حتی اگر % نداشته باشد
      try {
        decodedSlug = decodeURIComponent(rawSlug);
      } catch {
        decodedSlug = rawSlug;
      }
    }
  } catch (e) {
    console.warn(`⚠️ خطا در decode کردن slug "${rawSlug}":`, e);
    decodedSlug = rawSlug;
  }

  // نرمال‌سازی slug
  const normalizeSlug = (slug: string): string => {
    return slug
      .replace(/\u200C/g, '')
      .replace(/\u200D/g, '')
      .replace(/\s+/g, '-')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .trim();
  };

  const normalizedSlug = normalizeSlug(decodedSlug);

  let category = await prisma.blogCategoryTranslation.findFirst({
    where: {
      OR: [
        { slug: decodedSlug },
        { slug: rawSlug },
        { slug: normalizedSlug },
        { slug: { contains: decodedSlug } },
        { slug: { contains: normalizedSlug } },
      ],
      lang: 'FA',
    },
    include: {
      blogCategory: {
        include: {
          blog: {
            where: {
              status: 'PUBLISHED',
              is_active: true,
            },
            take: 1,
          },
        },
      },
      seo: true,
    },
  });

  // اگر پیدا نشد، جستجو با نام
  if (!category) {
    const nameFromSlug = decodedSlug
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    category = await prisma.blogCategoryTranslation.findFirst({
      where: {
        OR: [
          { name: { contains: nameFromSlug } },
          { name: { contains: decodedSlug.replace(/-/g, ' ') } },
        ],
        lang: 'FA',
      },
      include: {
        blogCategory: {
          include: {
            blog: {
              where: {
                status: 'PUBLISHED',
                is_active: true,
              },
              take: 1,
            },
          },
        },
        seo: true,
      },
    });
  }

  if (!category) {
    return {
      title: 'دسته‌بندی پیدا نشد',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const url = `${baseUrl}/category/${decodedSlug}`;
  const description = category.description || `آخرین اخبار و مقالات در دسته‌بندی ${category.name}`;

  return {
    title: category.seo?.meta_title || `${category.name} | سایت خبری`,
    description: category.seo?.meta_description || description,
    keywords: category.seo?.meta_keywords?.split(',').map(k => k.trim()) || [category.name],
    alternates: {
      canonical: category.seo?.canonical_url || url,
    },
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      url: category.seo?.og_url || url,
      siteName: 'سایت خبری',
      title: category.seo?.og_title || category.name,
      description: category.seo?.og_description || description,
      images: category.seo?.og_image ? [{ url: category.seo.og_image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: category.seo?.twitter_title || category.name,
      description: category.seo?.twitter_description || description,
      images: category.seo?.twitter_image ? [category.seo.twitter_image] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);
  const postsPerPage = 12;

  // Decode slug از URL
  let decodedSlug = rawSlug;
  try {
    if (rawSlug.includes('%')) {
      decodedSlug = decodeURIComponent(rawSlug);
    } else {
      // تلاش برای decode کردن حتی اگر % نداشته باشد
      try {
        decodedSlug = decodeURIComponent(rawSlug);
      } catch {
        decodedSlug = rawSlug;
      }
    }
  } catch (e) {
    console.warn(`⚠️ خطا در decode کردن slug "${rawSlug}":`, e);
    decodedSlug = rawSlug;
  }

  console.log(`🔍 جستجوی دسته‌بندی با slug: "${decodedSlug}" (از URL: "${rawSlug}")`);

  // نرمال‌سازی slug: حذف فاصله‌های اضافی و کاراکترهای خاص
  const normalizeSlug = (slug: string): string => {
    return slug
      .replace(/\u200C/g, '') // حذف zero-width non-joiner
      .replace(/\u200D/g, '') // حذف zero-width joiner
      .replace(/\s+/g, '-')   // تبدیل فاصله‌ها به خط تیره
      .replace(/[\u064B-\u065F\u0670]/g, '') // حذف نشانه‌های عربی
      .trim();
  };

  const normalizedSlug = normalizeSlug(decodedSlug);

  // تبدیل slug به نام تقریبی (جایگزین خط تیره با فاصله)
  const nameFromSlug = decodedSlug
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`🔍 جستجو با موارد زیر:`);
  console.log(`   - decodedSlug: "${decodedSlug}"`);
  console.log(`   - normalizedSlug: "${normalizedSlug}"`);
  console.log(`   - nameFromSlug: "${nameFromSlug}"`);

  // جستجو با روش‌های مختلف - اول با نام دقیق (مهم‌ترین)
  let category = await prisma.blogCategoryTranslation.findFirst({
    where: {
      name: nameFromSlug,
      lang: 'FA',
    },
    include: {
      blogCategory: true,
    },
  });

  if (category) {
    console.log(`✅ دسته‌بندی با نام دقیق پیدا شد: "${category.name}" (ID: ${category.blogCategory_id})`);
  }

  // اگر پیدا نشد، جستجو با slug دقیق
  if (!category) {
    console.log(`⚠️ دسته‌بندی با نام پیدا نشد، جستجو با slug...`);
    category = await prisma.blogCategoryTranslation.findFirst({
      where: {
        OR: [
          { slug: decodedSlug },
          { slug: rawSlug },
          { slug: normalizedSlug },
        ],
        lang: 'FA',
      },
      include: {
        blogCategory: true,
      },
    });

    if (category) {
      console.log(`✅ دسته‌بندی با slug پیدا شد: "${category.name}" (ID: ${category.blogCategory_id})`);
    }
  }

  // اگر هنوز پیدا نشد، جستجوی با contains (آخرین راه) - اما فقط اگر nameFromSlug معنی‌دار باشد
  if (!category && nameFromSlug.length > 3) {
    console.log(`⚠️ دسته‌بندی با نام/slug دقیق پیدا نشد، جستجو با contains...`);

    // لیست همه دسته‌بندی‌های مشابه را بگیر
    const similarCategories = await prisma.blogCategoryTranslation.findMany({
      where: {
        OR: [
          { name: { contains: nameFromSlug } },
          { slug: { contains: decodedSlug } },
        ],
        lang: 'FA',
      },
      include: {
        blogCategory: true,
      },
    });

    console.log(`🔍 ${similarCategories.length} دسته‌بندی مشابه پیدا شد:`);
    similarCategories.forEach(cat => {
      console.log(`   - "${cat.name}" (slug: "${cat.slug}")`);
    });

    // انتخاب بهترین match - اولویت با name
    category = similarCategories.find(cat =>
      cat.name === nameFromSlug || cat.name.includes(nameFromSlug)
    ) || similarCategories[0];

    if (category) {
      console.log(`✅ دسته‌بندی با contains پیدا شد: "${category.name}" (ID: ${category.blogCategory_id})`);
    }
  }

  if (!category) {
    console.error(`❌ دسته‌بندی با slug "${decodedSlug}" یا "${rawSlug}" پیدا نشد`);
    notFound();
  }

  console.log(`✅ دسته‌بندی پیدا شد: ID=${category.id}, Name="${category.name}", Slug="${category.slug}", CategoryID=${category.blogCategory_id}`);

  // گرفتن بلاگ‌های مربوط به این دسته‌بندی خاص
  // استفاده از query مستقیم برای اطمینان از فیلتر صحیح
  const allPosts = await prisma.blog.findMany({
    where: {
      status: 'PUBLISHED',
      is_active: true,
      blogcategory: {
        some: {
          id: category.blogCategory_id,
        },
      },
    },
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
          image_profile: true,
        },
      },
    },
    orderBy: {
      published_at: 'desc',
    },
  });

  console.log(`📰 تعداد بلاگ‌های پیدا شده برای دسته‌بندی "${category.name}" (ID: ${category.blogCategory_id}): ${allPosts.length}`);

  // لاگ دسته‌بندی‌های بلاگ‌های پیدا شده برای دیباگ
  if (allPosts.length > 0) {
    console.log(`📋 نمونه دسته‌بندی‌های بلاگ اول:`);
    const firstPost = allPosts[0];
    if (firstPost.blogcategory && firstPost.blogcategory.length > 0) {
      firstPost.blogcategory.forEach((cat: any) => {
        const catName = cat.translations?.[0]?.name || 'نامشخص';
        console.log(`   - "${catName}" (ID: ${cat.id})`);
      });
    }
  } else {
    console.warn(`⚠️ هیچ بلاگی برای دسته‌بندی "${category.name}" پیدا نشد!`);
  }
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const posts = allPosts.slice(startIndex, endIndex);

  // محاسبه URL ها برای posts
  const postsWithUrls = await Promise.all(
    posts.map(async (post) => {
      const translation = post.translations[0];
      const categorySlug = post.blogcategory?.[0]?.translations?.[0]?.slug || null;
      const blogUrl = await getBlogUrl(translation?.slug || post.slug || '', categorySlug || undefined, post.id);
      return {
        ...post,
        blogUrl,
      };
    })
  );

  // Featured post (first post)
  const featuredPost = allPosts[0];
  const featuredPostCategorySlug = featuredPost?.blogcategory?.[0]?.translations?.[0]?.slug || null;
  const featuredPostUrl = featuredPost ? await getBlogUrl(featuredPost.translations[0]?.slug || featuredPost.slug || '', featuredPostCategorySlug || undefined, featuredPost.id) : null;

  // Structured Data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const categoryStructuredData = generateCategoryStructuredData(
    category.name,
    category.description || `آخرین اخبار در دسته‌بندی ${category.name}`,
    `${baseUrl}/category/${decodedSlug}`,
    (await Promise.all(allPosts.slice(0, 10).map(async post => {
      const categorySlug = post.blogcategory?.[0]?.translations?.[0]?.slug || null;
      const blogUrl = await getBlogUrl(post.translations[0]?.slug || post.slug || '', categorySlug || undefined, post.id);
      return {
        title: post.translations[0]?.title || 'بدون عنوان',
        url: `${baseUrl}${blogUrl}`,
        publishedAt: post.published_at || post.created_at || undefined,
        image: post.image || undefined,
      };
    })))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryStructuredData) }}
      />

      <div className="w-full bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Breadcrumb */}
              <nav className="mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600">
                <ol className="flex items-center space-x-1 sm:space-x-2 space-x-reverse">
                  <li>
                    <Link href="/" className="hover:text-gray-900">
                      خانه
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="text-gray-900 truncate">{category.name}</li>
                </ol>
              </nav>

              {/* Category Header */}
              <header className="mb-6 sm:mb-8 mt-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-base sm:text-lg text-gray-600">
                    {category.description}
                  </p>
                )}
                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
                  {totalPosts} مقاله
                </div>
              </header>

              {/* تبلیغ بالای محتوا */}
              <AdBanner position="CONTENT_TOP" className="mb-8" />

              {/* Featured Post */}
              {featuredPost && currentPage === 1 && (
                <div className="mb-8 sm:mb-10 md:mb-12">
                  <Link
                    href={featuredPostUrl || `/news/${featuredPost.translations[0]?.slug || featuredPost.slug}`}
                    className="block group"
                  >
                    <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4">
                      <Image
                        src={featuredPost.image}
                        alt={featuredPost.translations[0]?.title || 'تصویر خبر'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6 lg:p-8">
                        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 group-hover:underline line-clamp-2">
                          {featuredPost.translations[0]?.title || 'بدون عنوان'}
                        </h2>
                        {featuredPost.translations[0]?.excerpt && (
                          <p className="text-gray-200 line-clamp-2 text-xs sm:text-sm md:text-base">
                            {featuredPost.translations[0].excerpt.replace(/<[^>]*>/g, '').trim()}
                          </p>
                        )}
                        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-300">
                          {featuredPost.User && (
                            <span className="truncate">نویسنده: {featuredPost.User.name}</span>
                          )}
                          {featuredPost.published_at && (
                            <time className="whitespace-nowrap">
                              {new Date(featuredPost.published_at).toLocaleDateString('fa-IR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </time>
                          )}
                          <span className="whitespace-nowrap">{featuredPost.view_count.toLocaleString('fa-IR')} بازدید</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Posts Grid */}
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
                  {postsWithUrls.map((post) => {
                    const translation = post.translations[0];
                    if (!translation) return null;

                    return (
                      <Link
                        key={post.id}
                        href={post.blogUrl}
                        className="group block"
                      >
                        <article className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                          <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden bg-gray-200">
                            <BlogImage
                              src={post.image || '/images/logo/logo.png'}
                              alt={translation.title}
                              width={400}
                              height={300}
                              className="object-cover group-hover:scale-105 transition-transform duration-300 w-full h-full"
                            />
                          </div>
                          <div className="p-3 sm:p-4 flex-1 flex flex-col">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {translation.title}
                            </h3>
                            {translation.excerpt && (
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mb-3 flex-1">
                                {translation.excerpt.replace(/<[^>]*>/g, '').trim()}
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
                  <p className="text-base sm:text-lg text-gray-600">مقاله‌ای یافت نشد.</p>
                </div>
              )}

              {/* تبلیغ وسط محتوا */}
              <AdBanner position="CONTENT_MIDDLE" className="my-8" />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8 flex-wrap">
                  {currentPage > 1 && (
                    <Link
                      href={`/category/${decodedSlug}?page=${currentPage - 1}`}
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
                          href={`/category/${decodedSlug}?page=${pageNum}`}
                          className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg transition-colors ${pageNum === currentPage
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
                      href={`/category/${decodedSlug}?page=${currentPage + 1}`}
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
    </>
  );
}
