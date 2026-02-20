import { MetadataRoute } from 'next';
import { prisma } from '@/lib/core/prisma';
import { slugifyPersian } from '@/lib/utils/slugify-fa';

// لیست روزنامه‌های اقتصادی
const economicNewspapers = [
  { english: 'DonyayeEghtesad', persian: 'دنیای اقتصاد' },
  { english: 'Jahan-e-Eghtesad', persian: 'جهان اقتصاد' },
  { english: 'JahanSanat', persian: 'جهان صنعت' },
  { english: 'AbrarEghtesadi', persian: 'ابرار اقتصادی' },
  { english: 'AkhbarSanat', persian: 'اخبار صنعت' },
  { english: 'EghtesadPooya', persian: 'اقتصاد پویا' },
  { english: 'EghtesadSaramad', persian: 'اقتصاد سرآمد' },
  { english: 'EghtesadKish', persian: 'اقتصاد کیش' },
  { english: 'EghtesadeMardom', persian: 'اقتصاد مردم' },
  { english: 'EghtesadeMeli', persian: 'اقتصاد ملی' },
  { english: 'TejaratOnline', persian: 'تجارت آنلاین' },
  { english: 'Tejarat', persian: 'تجارت' },
  { english: 'Sarmayeh', persian: 'سرمایه' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  // Get all published articles
  const blogs = await prisma.blog.findMany({
    where: {
      status: 'PUBLISHED',
      is_active: true,
      published_at: { not: null },
    },
    include: {
      translations: {
        where: { lang: 'FA' },
        select: { slug: true },
      },
    },
    take: 10000, // Limit to prevent timeout
  });

  // Get all active categories
  const categories = await prisma.blogCategory.findMany({
    where: { is_active: true },
    include: {
      translations: {
        where: { lang: 'FA' },
        select: { slug: true },
      },
    },
  });

  // Get all active car price sources (brands)
  const carPriceSources = await prisma.carPriceSource.findMany({
    where: { is_active: true },
  });

  // Static pages
  const staticPages = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/car-prices`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.95 }, // High priority for car prices
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
  ];

  // Article pages
  const articlePages = blogs.map((blog) => {
    const translation = blog.translations[0];
    if (!translation) return null;
    
    return {
      url: `${baseUrl}/news/${translation.slug}`,
      lastModified: blog.updated_at || blog.published_at || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  }).filter(Boolean) as MetadataRoute.Sitemap;

  // Category pages
  const categoryPages = categories.map((category) => {
    const translation = category.translations[0];
    if (!translation) return null;
    
    return {
      url: `${baseUrl}/category/${translation.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  }).filter(Boolean) as MetadataRoute.Sitemap;

  // Newspaper pages - با اولویت بالا برای SEO
  const newspaperPages = economicNewspapers.map((paper) => ({
    url: `${baseUrl}/روزنامه/${slugifyPersian(paper.english.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9, // اولویت بالا برای روزنامه‌ها
  }));

  // Car price brand pages - با اولویت بالا برای SEO
  const carPriceBrandPages = carPriceSources.map((source) => ({
    url: `${baseUrl}/car-prices/${encodeURIComponent(source.name)}`,
    lastModified: source.updated_at || new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9, // اولویت بالا برای صفحات قیمت خودرو
  }));

  return [...staticPages, ...articlePages, ...categoryPages, ...newspaperPages, ...carPriceBrandPages];
}
