/**
 * Prisma Query Helpers
 * Next.js 16.1.1 Best Practices
 * 
 * Reusable query patterns and optimizations
 */

import { prisma } from '@/lib/core/prisma';
import { cache } from 'react';

/**
 * Cached query helper using React cache
 * Prevents duplicate queries in the same render pass
 */
export const getCachedQuery = <T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const cachedFn = cache(queryFn);
  return cachedFn();
};

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  
  return { page, limit };
}

export function getSkipTake(params: PaginationParams) {
  return {
    skip: (params.page! - 1) * params.limit!,
    take: params.limit!,
  };
}

/**
 * Common select fields for performance optimization
 */
export const blogSelectFields = {
  id: true,
  slug: true,
  image: true,
  published_at: true,
  created_at: true,
  view_count: true,
  is_featured: true,
  is_breaking: true,
  status: true,
  translations: {
    where: { lang: 'FA' },
    select: {
      title: true,
      excerpt: true,
      slug: true,
    },
  },
} as const;

export const blogDetailSelectFields = {
  ...blogSelectFields,
  code: true,
  short_link: true,
  reading_time: true,
  source_url: true,
  translations: {
    where: { lang: 'FA' },
    select: {
      title: true,
      content: true,
      excerpt: true,
      slug: true,
      seo: {
        select: {
          meta_title: true,
          meta_description: true,
          canonical_url: true,
        },
      },
    },
  },
  User: {
    select: {
      id: true,
      name: true,
      image_profile: true,
    },
  },
  blogcategory: {
    select: {
      id: true,
      translations: {
        where: { lang: 'FA' },
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
} as const;

/**
 * Transaction helper for complex operations
 * Next.js 16.1.1 & Prisma 7.2.0 Best Practices
 */
export async function withTransaction<T>(
  operation: (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(operation, {
    maxWait: 5000, // Maximum time to wait for a transaction slot (5 seconds)
    timeout: 10000, // Maximum time the transaction can run (10 seconds)
  });
}
