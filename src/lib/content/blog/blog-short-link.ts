/**
 * Blog Short Link Generator
 * Base62 encoding برای کوتاه کردن لینک‌های Blog
 */

import { prisma } from '@/lib/core/prisma';

/**
 * Base62 Character Set
 * 0-9, a-z, A-Z = 62 کاراکتر
 */
const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARSET.length; // 62

/**
 * تبدیل عدد به Base62
 * مثال: 12345 → "3D7"
 */
export function encodeBase62(num: number): string {
  if (num === 0) return CHARSET[0];
  if (num < 0) throw new Error('Number must be positive');
  
  let result = '';
  let n = num;
  
  while (n > 0) {
    result = CHARSET[n % BASE] + result;
    n = Math.floor(n / BASE);
  }
  
  return result;
}

/**
 * تبدیل Base62 به عدد
 * مثال: "3D7" → 12345
 */
export function decodeBase62(str: string): number {
  if (!str) return 0;
  
  let result = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = CHARSET.indexOf(char);
    
    if (index === -1) {
      throw new Error(`Invalid character in Base62 string: ${char}`);
    }
    
    result = result * BASE + index;
  }
  
  return result;
}

/**
 * تولید short link برای Blog
 * فرمت: https://rozeghar.com/n/{code}
 */
export async function generateShortLink(
  blogId: number,
  siteUrl: string = 'https://rozeghar.com'
): Promise<string> {
  try {
    // تولید code
    const code = encodeBase62(blogId);
    
    // ساخت short link
    const shortLink = `${siteUrl}/n/${code}`;
    
    // به‌روزرسانی Blog
    await prisma.blog.update({
      where: { id: blogId },
      data: {
        code,
        short_link: shortLink,
      },
    });
    
    console.log(`[ShortLink] ✅ Generated short link for blog ${blogId}: ${shortLink}`);
    
    return shortLink;
  } catch (error: any) {
    console.error(`[ShortLink] ❌ Error generating short link:`, error.message);
    throw error;
  }
}

/**
 * دریافت Blog از code
 */
export async function getBlogFromCode(code: string) {
  try {
    // دریافت Blog با code
    const blog = await prisma.blog.findUnique({
      where: { code },
      include: {
        translations: {
          where: { lang: 'FA' },
          select: {
            slug: true,
            title: true,
          },
        },
      },
    });
    
    if (!blog) {
      console.log(`[ShortLink] ⚠️ Blog not found for code: ${code}`);
      return null;
    }
    
    console.log(`[ShortLink] ✅ Found blog for code ${code}: ${blog.id}`);
    
    return blog;
  } catch (error: any) {
    console.error(`[ShortLink] ❌ Error getting blog from code:`, error.message);
    return null;
  }
}

/**
 * تولید short link برای بلاگ‌های موجود که code ندارند
 */
export async function generateShortLinksForExistingBlogs(
  limit: number = 100,
  siteUrl: string = 'https://rozeghar.com'
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  try {
    // پیدا کردن بلاگ‌هایی که code ندارند
    const blogs = await prisma.blog.findMany({
      where: {
        OR: [
          { code: null },
          { code: '' },
        ],
      },
      take: limit,
      select: { id: true },
    });
    
    console.log(`[ShortLink] 🔄 Generating short links for ${blogs.length} blogs...`);
    
    for (const blog of blogs) {
      try {
        await generateShortLink(blog.id, siteUrl);
        success++;
      } catch (error) {
        failed++;
      }
    }
    
    console.log(`[ShortLink] ✅ Done: ${success} success, ${failed} failed`);
    
    return { success, failed };
  } catch (error: any) {
    console.error(`[ShortLink] ❌ Error in batch generation:`, error.message);
    return { success, failed };
  }
}

/**
 * تست encoding/decoding
 */
export function testBase62() {
  const testCases = [
    0, 1, 10, 61, 62, 100, 999, 1000, 12345, 99999, 999999,
  ];
  
  console.log('[ShortLink] Testing Base62 encoding/decoding:');
  
  for (const num of testCases) {
    const encoded = encodeBase62(num);
    const decoded = decodeBase62(encoded);
    const isCorrect = num === decoded;
    
    console.log(
      `  ${num} → "${encoded}" → ${decoded} ${isCorrect ? '✅' : '❌'}`
    );
    
    if (!isCorrect) {
      throw new Error(`Base62 test failed for ${num}`);
    }
  }
  
  console.log('[ShortLink] ✅ All tests passed');
}

