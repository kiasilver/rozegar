/**
 * Page Helpers for Next.js 16.1.1
 * 
 * Reusable utilities for page components
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { safeDbOperation } from '@/lib/db/error-handler';

/**
 * Safe page data fetching with error handling
 */
export async function safePageData<T>(
  fetchFn: () => Promise<T | null>,
  options?: {
    notFoundOnError?: boolean;
    defaultValue?: T;
  }
): Promise<T> {
  try {
    const data = await fetchFn();
    
    if (data === null || data === undefined) {
      if (options?.notFoundOnError) {
        notFound();
      }
      if (options?.defaultValue !== undefined) {
        return options.defaultValue;
      }
      throw new Error('Data not found');
    }
    
    return data;
  } catch (error) {
    console.error('[Page Helper] Error fetching data:', error);
    
    if (options?.notFoundOnError) {
      notFound();
    }
    
    if (options?.defaultValue !== undefined) {
      return options.defaultValue;
    }
    
    throw error;
  }
}

/**
 * Generate default metadata with fallback
 */
export function generateDefaultMetadata(
  title: string,
  description?: string,
  options?: {
    keywords?: string[];
    image?: string;
    url?: string;
  }
): Metadata {
  return {
    title,
    description: description || title,
    keywords: options?.keywords,
    openGraph: {
      title,
      description: description || title,
      images: options?.image ? [{ url: options.image }] : undefined,
      url: options?.url,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || title,
      images: options?.image ? [options.image] : undefined,
    },
  };
}

/**
 * Normalize slug for database queries
 */
export function normalizeSlug(slug: string): string {
  return slug
    .replace(/\u200C/g, '') // Zero-width non-joiner
    .replace(/\u200D/g, '') // Zero-width joiner
    .replace(/\s+/g, '-')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics
    .trim();
}

/**
 * Decode and normalize slug from URL
 */
export function decodeAndNormalizeSlug(rawSlug: string): string {
  let decodedSlug = rawSlug;
  
  try {
    if (rawSlug.includes('%')) {
      decodedSlug = decodeURIComponent(rawSlug);
    } else {
      // Try to decode even without %
      try {
        decodedSlug = decodeURIComponent(rawSlug);
      } catch {
        decodedSlug = rawSlug;
      }
    }
  } catch (e) {
    console.warn(`⚠️ [Page Helper] Error decoding slug "${rawSlug}":`, e);
    decodedSlug = rawSlug;
  }
  
  return normalizeSlug(decodedSlug);
}

/**
 * Get pagination from searchParams
 */
export function getPaginationFromSearchParams(
  searchParams: Promise<{ page?: string; limit?: string }>
): Promise<{ page: number; limit: number; skip: number; take: number }> {
  return searchParams.then((params) => {
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));
    
    return {
      page,
      limit,
      skip: (page - 1) * limit,
      take: limit,
    };
  });
}

/**
 * Safe category lookup with multiple fallbacks
 */
export async function safeCategoryLookup(
  slug: string,
  options?: {
    includeBlogs?: boolean;
    includeSEO?: boolean;
  }
) {
  return safeDbOperation(async () => {
    const decodedSlug = decodeAndNormalizeSlug(slug);
    const normalizedSlug = normalizeSlug(decodedSlug);
    
    // Try multiple slug variations
    const whereConditions = [
      { slug: decodedSlug },
      { slug: slug },
      { slug: normalizedSlug },
      { slug: { contains: decodedSlug } },
      { slug: { contains: normalizedSlug } },
    ];
    
    let category = await prisma.blogCategoryTranslation.findFirst({
      where: {
        OR: whereConditions,
        lang: 'FA',
      },
      include: {
        blogCategory: {
          include: options?.includeBlogs ? {
            blog: {
              where: {
                status: 'PUBLISHED',
                is_active: true,
              },
              take: 1,
            },
          } : undefined,
        },
        ...(options?.includeSEO ? { seo: true } : {}),
      },
    });
    
    // If not found by slug, try by name
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
            include: options?.includeBlogs ? {
              blog: {
                where: {
                  status: 'PUBLISHED',
                  is_active: true,
                },
                take: 1,
              },
            } : undefined,
          },
          ...(options?.includeSEO ? { seo: true } : {}),
        },
      });
    }
    
    return category;
  });
}
