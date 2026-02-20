/**
 * SEO Helper Functions - توابع کامل SEO
 * شامل: Metadata generation, Structured Data, و تمام توابع SEO
 */

import { Metadata } from 'next';
import type { SEO } from '@prisma/client';

// ==================== Types ====================

export interface SEOData {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  robots?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_type?: string | null;
  og_url?: string | null;
  og_site_name?: string | null;
  twitter_card?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  twitter_creator?: string | null;
  twitter_site?: string | null;
  structured_data?: string | null;
  article_section?: string | null;
  article_author?: string | null;
  article_published_time?: Date | null;
  article_modified_time?: Date | null;
  locale?: string | null;
  alternate_languages?: string | null;
  breadcrumb_json?: string | null;
}

export interface WorldClassSEOOptions {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "article" | "website" | "category" | "author";
  publishedAt?: Date;
  modifiedAt?: Date;
  author?: {
    name: string;
    url?: string;
    image?: string;
  };
  categories?: string[];
  tags?: string[];
  keywords?: string[];
  readingTime?: number;
  locale?: string;
  alternateLanguages?: { lang: string; url: string }[];
  seoData?: SEO | null;
  breadcrumbs?: { name: string; url: string }[];
  siteName?: string;
  twitterHandle?: string;
  facebookAppId?: string;
}

// ==================== Helper Functions ====================

async function getBaseUrl(): Promise<string> {
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  try {
    const { getUnifiedSettings } = await import('@/lib/automation/undefined-rss/unified-rss-processor');
    const rssSettings = await getUnifiedSettings();
    baseUrl = rssSettings?.site_url || baseUrl;
  } catch (error) {
    // Ignore
  }
  return baseUrl;
}

function normalizeUrl(url: string, baseUrl: string): string {
  return url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ==================== Metadata Generation ====================

/**
 * تولید Metadata برای بلاگ (نسخه ساده)
 */
export async function generateBlogMetadata(
  title: string,
  description: string,
  image: string,
  slug: string,
  seoData?: SEOData | null,
  publishedAt?: Date | null,
  modifiedAt?: Date | null,
  author?: string | null,
  categories?: string[]
): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/اخبار/${slug}`;
  const ogImage = seoData?.og_image || image || `${baseUrl}/og-image.jpg`;
  const absoluteImage = normalizeUrl(image || ogImage, baseUrl);

  return {
    title: seoData?.meta_title || title,
    description: seoData?.meta_description || description,
    keywords: seoData?.meta_keywords?.split(',').map(k => k.trim()) || [],
    alternates: {
      canonical: seoData?.canonical_url || url,
    },
    robots: {
      index: seoData?.robots?.includes('index') ?? true,
      follow: seoData?.robots?.includes('follow') ?? true,
      googleBot: {
        index: seoData?.robots?.includes('index') ?? true,
        follow: seoData?.robots?.includes('follow') ?? true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: (seoData?.og_type as 'article' | 'website') || 'article',
      locale: seoData?.locale || 'fa_IR',
      url: seoData?.og_url || url,
      siteName: seoData?.og_site_name || 'سایت خبری',
      title: seoData?.og_title || title,
      description: seoData?.og_description || description,
      images: [{
        url: absoluteImage,
        width: 1200,
        height: 630,
        alt: title,
      }],
      publishedTime: publishedAt?.toISOString(),
      modifiedTime: modifiedAt?.toISOString(),
      authors: author ? [author] : undefined,
      section: seoData?.article_section || categories?.[0],
      tags: categories,
    },
    twitter: {
      card: (seoData?.twitter_card as 'summary' | 'summary_large_image') || 'summary_large_image',
      title: seoData?.twitter_title || title,
      description: seoData?.twitter_description || description,
      images: [seoData?.twitter_image || absoluteImage],
      creator: seoData?.twitter_creator || undefined,
      site: seoData?.twitter_site || undefined,
    },
  };
}

/**
 * تولید Metadata کامل (World-Class) - برای صفحات خاص
 */
export async function generateWorldClassMetadata(
  options: WorldClassSEOOptions
): Promise<Metadata> {
  const {
    title,
    description,
    image,
    url,
    type = "website",
    publishedAt,
    modifiedAt,
    author,
    categories = [],
    tags = [],
    keywords = [],
    readingTime,
    locale = "fa_IR",
    alternateLanguages = [],
    seoData,
    siteName = "سایت خبری",
    twitterHandle,
    facebookAppId,
  } = options;

  const baseUrl = await getBaseUrl();
  const fullUrl = normalizeUrl(url, baseUrl);
  const fullImageUrl = image ? normalizeUrl(image, baseUrl) : `${baseUrl}/og-image.jpg`;

  const metaTitle = seoData?.meta_title || title;
  const metaDescription = seoData?.meta_description || description;
  const metaKeywords = seoData?.meta_keywords
    ? seoData.meta_keywords.split(",").map((k) => k.trim())
    : [...keywords, ...categories, ...tags].filter(Boolean);

  const robotsValue = seoData?.robots || "index, follow";
  const shouldIndex = robotsValue.includes("index");
  const shouldFollow = robotsValue.includes("follow");

  const ogTitle = seoData?.og_title || metaTitle;
  const ogDescription = seoData?.og_description || metaDescription;
  const ogImage = seoData?.og_image ? normalizeUrl(seoData.og_image, baseUrl) : fullImageUrl;
  const ogType = (seoData?.og_type as "article" | "website") || type;
  const ogUrl = seoData?.og_url || fullUrl;

  const twitterTitle = seoData?.twitter_title || metaTitle;
  const twitterDescription = seoData?.twitter_description || metaDescription;
  const twitterImage = seoData?.twitter_image ? normalizeUrl(seoData.twitter_image, baseUrl) : fullImageUrl;
  const twitterCard = (seoData?.twitter_card as "summary" | "summary_large_image") || "summary_large_image";

  const canonicalUrl = seoData?.canonical_url || fullUrl;

  const alternates: Record<string, any> = { canonical: canonicalUrl };
  if (alternateLanguages.length > 0) {
    alternates.languages = {};
    alternateLanguages.forEach((alt) => {
      alternates.languages![alt.lang] = normalizeUrl(alt.url, baseUrl);
    });
  }

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords.length > 0 ? metaKeywords : undefined,
    authors: author ? [{ name: author.name, url: author.url }] : undefined,
    creator: author?.name || siteName,
    publisher: siteName,
    alternates,
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      googleBot: {
        index: shouldIndex,
        follow: shouldFollow,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: ogType,
      locale: seoData?.locale || locale,
      url: ogUrl,
      siteName: seoData?.og_site_name || siteName,
      title: ogTitle,
      description: ogDescription,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: ogTitle,
        type: "image/jpeg",
      }],
      ...(publishedAt && { publishedTime: publishedAt.toISOString() }),
      ...(modifiedAt && { modifiedTime: modifiedAt.toISOString() }),
      ...(author && { authors: [author.name] }),
      ...(categories.length > 0 && { section: categories[0] }),
      ...(tags.length > 0 && { tags }),
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      images: [twitterImage],
      ...(twitterHandle && { creator: twitterHandle, site: twitterHandle }),
    },
    other: {
      ...(publishedAt && { "article:published_time": publishedAt.toISOString() }),
      ...(modifiedAt && { "article:modified_time": modifiedAt.toISOString() }),
      ...(author && { "article:author": author.name }),
      ...(categories.length > 0 && { "article:section": categories[0] }),
      ...(tags.length > 0 && { "article:tag": tags.join(", ") }),
      ...(readingTime && { "article:reading_time": `${readingTime} minutes` }),
      ...(facebookAppId && { "fb:app_id": facebookAppId }),
    },
  };
}

// ==================== Structured Data ====================

/**
 * تولید Structured Data برای مقاله خبری
 */
export function generateArticleStructuredData(
  title: string,
  description: string,
  image: string,
  url: string,
  publishedAt?: Date | null,
  modifiedAt?: Date | null,
  author?: { name: string; url?: string } | null,
  categories?: string[]
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const fullImageUrl = image ? normalizeUrl(image, baseUrl) : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: description,
    image: fullImageUrl ? [fullImageUrl] : undefined,
    datePublished: publishedAt?.toISOString(),
    dateModified: modifiedAt?.toISOString() || publishedAt?.toISOString(),
    author: author ? {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'سایت خبری',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': normalizeUrl(url, baseUrl),
    },
    articleSection: categories?.[0],
    keywords: categories?.join(', '),
  };
}

/**
 * تولید Structured Data برای دسته‌بندی
 */
export function generateCategoryStructuredData(
  name: string,
  description: string,
  url: string,
  articles?: Array<{ title: string; url: string; publishedAt?: Date; image?: string }>
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const fullUrl = normalizeUrl(url, baseUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: fullUrl,
    mainEntity: articles && articles.length > 0 ? {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'NewsArticle',
          headline: article.title,
          url: normalizeUrl(article.url, baseUrl),
          datePublished: article.publishedAt?.toISOString(),
          image: article.image ? normalizeUrl(article.image, baseUrl) : undefined,
        },
      })),
    } : undefined,
  };
}

/**
 * تولید Structured Data برای Breadcrumb
 */
export function generateBreadcrumbStructuredData(items: { name: string; url: string }[]) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: normalizeUrl(item.url, baseUrl),
    })),
  };
}

/**
 * تولید Structured Data برای Website
 */
export function generateWebsiteStructuredData(siteName: string = "سایت خبری") {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * تولید Structured Data برای Organization
 */
export function generateOrganizationStructuredData(
  siteName: string = "سایت خبری",
  logoUrl?: string,
  socialLinks?: { platform: string; url: string }[]
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: siteName,
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl || `${baseUrl}/logo.png`,
      width: 600,
      height: 60,
    },
    ...(socialLinks && socialLinks.length > 0 && {
      sameAs: socialLinks.map((link) => link.url),
    }),
  };
}
