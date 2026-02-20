import dynamic from "next/dynamic";
import { Metadata } from "next";
import { prisma } from "@/lib/core/prisma";
import { generateMetadata as generateSiteMetadata } from "@/app/metadata";

// ISR - revalidate every hour for better performance
export const revalidate = 3600;

// Generate metadata for home page
export async function generateMetadata(): Promise<Metadata> {
  return generateSiteMetadata();
}

// Dynamic imports for heavy components
const GridShow = dynamic(() => import("@/components/Site/widget/GridShow"), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
});
const Newpaper = dynamic(() => import("@/components/Site/widget/Newpaper"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const NewsSlider = dynamic(() => import("@/components/Site/news/news"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const DatabaseSlider = dynamic(() => import("@/components/Site/news/DatabaseSlider"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});
const AdBanner = dynamic(() => import("@/components/Site/ads/AdBanner"), {
  loading: () => null, // Don't show loading state for ads
});
const PriceListCarousel = dynamic(() => import("@/components/Site/widget/PriceListCarousel"), {
  loading: () => null, // Don't show loading state
});
const CategorySlideshowGrid = dynamic(() => import("@/components/Site/widget/CategorySlideshowGrid"), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
});
const MostViewedSidebar = dynamic(() => import("@/components/Site/widget/MostViewedSidebar"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});

export default async function Page() {
  // گرفتن تمام دسته‌بندی‌های فعال (بدون نیاز به parent)
  let categories: any[] = [];
  try {
    // ابتدا categories را بدون فیلتر blog بگیریم
    const categoryData = await prisma.blogCategory.findMany({
      where: {
        is_active: true,
        parent_id: null,
      },
      select: {
        id: true,
        order: true,
        translations: {
          where: { lang: "FA" },
          select: { name: true, slug: true },
        },
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
    });

    // سپس بررسی کنیم کدام categories بلاگ دارند - بدون خواندن فیلدهای مشکل‌دار
    const categoryIds = categoryData.map(c => c.id);
    if (categoryIds.length > 0) {
      // استفاده از $queryRawUnsafe با IN clause - ساخت query به صورت امن
      const queryParts: string[] = [];
      for (let i = 0; i < categoryIds.length; i++) {
        queryParts.push(`bc."A" = ${categoryIds[i]}`);
      }
      const whereClause = queryParts.join(' OR ');

      const blogsWithCategories = await prisma.$queryRawUnsafe<Array<{
        category_id: number;
      }>>(
        `SELECT DISTINCT bc."A" as category_id
         FROM "_BlogCategoryToBlog" bc
         INNER JOIN "Blog" b ON bc."B" = b.id
         WHERE (${whereClause})
           AND b.status = 'PUBLISHED'::"BlogStatus"
           AND b.is_active = true`
      );

      const categoryIdsWithBlogs = new Set(blogsWithCategories.map(b => b.category_id));

      categories = categoryData
        .filter(cat => categoryIdsWithBlogs.has(cat.id))
        .map(cat => ({
          ...cat,
          blog: [{ id: cat.id }], // فقط برای سازگاری با کد موجود
        }));
    }
  } catch (error: any) {
    console.error("⚠️ خطا در دریافت categories:", error?.message || error);
    // در صورت خطا، فقط categories بدون بررسی blog را برگردان
    categories = [];
  }

  // فقط دسته‌هایی که بلاگ دارند و فیلتر کردن "پربازدیدترین اخبار اقتصاد"
  const validCategories = categories.filter((cat) => {
    if (!cat.blog || cat.blog.length === 0) return false;
    const catName = cat.translations[0]?.name || '';
    // حذف دسته‌بندی "پربازدیدترین اخبار اقتصاد" از صفحه اصلی
    if (catName.includes('پربازدیدترین اخبار اقتصاد')) return false;
    return true;
  });

  const orderedCategories = [
    "اخبار اقتصادی",
    "اقتصاد جهان",
    "راه‌های کشور",
    "بنادر و دریانوردی",
    "ارزدیجیتال",
    "طلا و ارز",
    "بورس",
  ];

  // پیدا کردن دسته‌بندی‌های مورد نظر که در دیتابیس هستند
  let foundCategories: any[] = [];
  try {
    console.log(`🔍 [HomePage] جستجوی ${orderedCategories.length} دسته‌بندی:`, orderedCategories.join(', '));

    // جستجوی دسته‌بندی‌ها به ترتیب مشخص شده
    const categoryTranslations = await prisma.blogCategoryTranslation.findMany({
      where: {
        lang: "FA",
        name: {
          in: orderedCategories,
        },
        blogCategory: {
          is_active: true,
        },
      },
      select: {
        blogCategory_id: true,
        name: true,
        slug: true,
      }
    });

    console.log(`✅ [HomePage] ${categoryTranslations.length} دسته‌بندی با نام دقیق پیدا شد:`,
      categoryTranslations.map(t => t.name).join(', '));

    // اگر برخی دسته‌بندی‌ها پیدا نشدند، با جستجوی انعطاف‌پذیرتر دوباره جستجو کن
    const foundNames = categoryTranslations.map(t => t.name);
    const missingCategories = orderedCategories.filter(name => !foundNames.includes(name));

    console.log(`⚠️ [HomePage] ${missingCategories.length} دسته‌بندی پیدا نشد:`, missingCategories.join(', '));

    for (const missingName of missingCategories) {
      const foundCategory = await prisma.blogCategoryTranslation.findFirst({
        where: {
          lang: "FA",
          name: {
            contains: missingName,
          },
          blogCategory: {
            is_active: true,
          },
        },
        select: {
          blogCategory_id: true,
          name: true,
          slug: true,
        }
      });
      if (foundCategory) {
        console.log(`✅ [HomePage] دسته‌بندی "${missingName}" با contains پیدا شد: "${foundCategory.name}"`);
        if (!categoryTranslations.find(t => t.blogCategory_id === foundCategory.blogCategory_id)) {
          categoryTranslations.push(foundCategory);
        }
      } else {
        console.warn(`❌ [HomePage] دسته‌بندی "${missingName}" پیدا نشد!`);
      }
    }

    console.log(`📋 [HomePage] در مجموع ${categoryTranslations.length} دسته‌بندی پیدا شد:`,
      categoryTranslations.map(t => t.name).join(', '));

    const categoryIds = categoryTranslations.map(t => t.blogCategory_id);

    console.log(`🔍 [HomePage] بررسی بلاگ‌ها برای ${categoryIds.length} دسته‌بندی:`, categoryIds.join(', '));

    if (categoryIds.length > 0) {
      // Check for blogs using efficient relational filtering (EXISTS query)
      try {
        const categoriesWithContent = await prisma.blogCategory.findMany({
          where: {
            id: { in: categoryIds },
            blog: {
              some: {
                status: 'PUBLISHED',
                is_active: true
              }
            }
          },
          select: { id: true }
        });

        const validCategoryIds = new Set(categoriesWithContent.map(c => c.id));
        console.log(`📰 [HomePage] ${validCategoryIds.size} populated categories found.`);

        foundCategories = categoryTranslations
          .map(t => {
            const hasBlogs = validCategoryIds.has(t.blogCategory_id);
            return {
              id: t.blogCategory_id,
              translations: [{ name: t.name, slug: t.slug }],
              blog: hasBlogs ? [{ id: t.blogCategory_id }] : []
            };
          })
          .filter(cat => cat.blog.length > 0 || cat.translations[0].name.includes('بورس'));

      } catch (queryError: any) {
        console.warn("⚠️ Error checking category content:", queryError?.message || queryError);
        foundCategories = categoryTranslations.map(t => ({
          id: t.blogCategory_id,
          translations: [{ name: t.name, slug: t.slug }],
          blog: [{ id: t.blogCategory_id }]
        }));
      }
    }
  } catch (error: any) {
    console.error("⚠️ خطا در دریافت categories:", error?.message || error);
    foundCategories = [];
  }

  // مرتب‌سازی دسته‌بندی‌ها بر اساس ترتیب مشخص شده
  const sortedCategories = orderedCategories
    .map(categoryName => {
      return foundCategories.find(cat => {
        const catName = cat.translations[0]?.name || '';
        return catName === categoryName || catName.includes(categoryName) || categoryName.includes(catName);
      });
    })
    .filter((cat): cat is any => cat !== undefined);

  // لاگ برای دیباگ
  console.log(`[HomePage] Found ${sortedCategories.length} categories:`,
    sortedCategories.map(c => c.translations[0]?.name).join(', '));

  return (
    <div className="w-full bg-gray-50">
      {/* Container اصلی با max-width */}
      <div className="max-w-[1600px] mx-auto px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
        {/* بخش اصلی: GridShow */}
        <div className="pt-3 xxs:pt-4 sm:pt-6 md:pt-8 lg:pt-10">
          <GridShow />
        </div>

      </div>

      {/* ادامه Container اصلی */}
      <div className="max-w-[1600px] mx-auto px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">

        {/* بخش لیست قیمت‌ها برای هر دسته‌بندی */}
        <div className="space-y-8 xxs:space-y-10 sm:space-y-12 md:space-y-16 lg:space-y-20 pt-3 xxs:pt-4 sm:pt-6 md:pt-8 lg:pt-10">
          {validCategories.map((cat) => {
            const translation = cat.translations[0];
            if (!translation) return null;

            return (
              <PriceListCarousel
                key={`price-${cat.id}`}
                category={translation.name}
                categoryName={translation.name}
              />
            );
          })}
        </div>

        {/* دسته‌بندی‌های جداگانه - هر کدام یک slideshow */}
        <div className="space-y-8 xxs:space-y-10 sm:space-y-12 md:space-y-16 lg:space-y-20 pt-3 xxs:pt-4 sm:pt-6 md:pt-8 lg:pt-10">
          {sortedCategories.map((cat, index) => {
            const translation = cat.translations[0];
            if (!translation) return null;

            return (
              <div key={cat.id} className="w-full">
                <DatabaseSlider
                  category={translation.name}
                  slug={translation.slug}
                  title={translation.name}
                  maxItems={12}
                />

                {/* تبلیغ بعد از هر 3 slideshow (بعد از slideshow های 2, 5, 8, ...) */}
                {(index + 1) % 3 === 0 && (
                  <div className="flex justify-center my-3 xxs:my-4 sm:my-6 md:my-8 lg:my-10">
                    <AdBanner position="CONTENT_MIDDLE" className="w-full max-w-4xl" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slider های از دیتابیس بر اساس دسته‌بندی‌ها */}
        <div className="space-y-8 xxs:space-y-10 sm:space-y-12 md:space-y-16 lg:space-y-20 pt-3 xxs:pt-4 sm:pt-6 md:pt-8 lg:pt-10">
          {validCategories.map((cat, index) => {
            const translation = cat.translations[0];
            if (!translation) return null;

            return (
              <div key={cat.id} className="w-full">
                <NewsSlider
                  category={translation.name}
                />

                {/* تبلیغ بعد از هر 3 slider (بعد از slider های 2, 5, 8, ...) */}
                {(index + 1) % 3 === 0 && (
                  <div className="flex justify-center my-3 xxs:my-4 sm:my-6 md:my-8 lg:my-10">
                    <AdBanner position="CONTENT_MIDDLE" className="w-full max-w-4xl" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* بخش روزنامه */}
        <div className="pt-3 xxs:pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-4 xxs:pb-6 sm:pb-8 md:pb-10 lg:pb-12">
          <Newpaper />
        </div>
      </div>

      {/* تبلیغ بنر پایین صفحه */}
      <AdBanner position="BANNER_BOTTOM" className="w-full" />
    </div>
  );
}

