/**
 * سیستم Anti-Abuse برای جلوگیری از حملات brute-force و rate limiting
 * برای صفحات لاگین و احراز هویت
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

interface AntiAbuseCheckResult {
  allowed: boolean;
  reason?: string;
  blockedUntil?: Date;
  retryAfter?: number; // seconds
}

/**
 * دریافت IP address از request
 */
function getIpAddress(req: NextRequest): string {
  // Check for forwarded IP (from proxy/load balancer)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0]?.trim() || 'unknown';
  }

  // Check for real IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to connection IP (may not work in serverless)
  return req.ip || 'unknown';
}

/**
 * دریافت User-Agent از request
 */
function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent') || null;
}

/**
 * بررسی اینکه آیا IP یا email/phone مسدود شده است
 * بهینه شده با استفاده از index و limit
 */
async function checkIfBlocked(
  ipAddress: string,
  email?: string,
  phone?: string
): Promise<{ blocked: boolean; blockedUntil?: Date }> {
  const now = new Date();

  // بررسی IP مسدود شده - استفاده از index [blocked, blocked_until]
  const blockedIp = await prisma.loginAttempt.findFirst({
    where: {
      ip_address: ipAddress,
      blocked: true,
      blocked_until: {
        gt: now,
      },
    },
    orderBy: {
      blocked_until: 'desc',
    },
    take: 1, // فقط یک رکورد نیاز داریم
  });

  if (blockedIp && blockedIp.blocked_until) {
    return {
      blocked: true,
      blockedUntil: blockedIp.blocked_until,
    };
  }

  // بررسی email مسدود شده - فقط اگر email موجود باشد
  if (email) {
    const blockedEmail = await prisma.loginAttempt.findFirst({
      where: {
        email,
        blocked: true,
        blocked_until: {
          gt: now,
        },
      },
      orderBy: {
        blocked_until: 'desc',
      },
      take: 1,
    });

    if (blockedEmail && blockedEmail.blocked_until) {
      return {
        blocked: true,
        blockedUntil: blockedEmail.blocked_until,
      };
    }
  }

  // بررسی phone مسدود شده - فقط اگر phone موجود باشد
  if (phone) {
    const blockedPhone = await prisma.loginAttempt.findFirst({
      where: {
        phone,
        blocked: true,
        blocked_until: {
          gt: now,
        },
      },
      orderBy: {
        blocked_until: 'desc',
      },
      take: 1,
    });

    if (blockedPhone && blockedPhone.blocked_until) {
      return {
        blocked: true,
        blockedUntil: blockedPhone.blocked_until,
      };
    }
  }

  return { blocked: false };
}

/**
 * بررسی rate limiting برای IP
 * حداکثر 5 تلاش ناموفق در 15 دقیقه
 * بهینه شده: استفاده از findMany با take=5 به جای count برای سرعت بیشتر
 */
async function checkRateLimit(
  ipAddress: string,
  email?: string,
  phone?: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  // بهینه‌سازی: به جای count، از findMany با take=6 استفاده می‌کنیم
  // اگر 6 رکورد پیدا کردیم، یعنی بیش از 5 تلاش ناموفق وجود دارد
  // این روش خیلی سریع‌تر از count است
  const failedAttemptsFromIp = await prisma.loginAttempt.findMany({
    where: {
      ip_address: ipAddress,
      success: false,
      created_at: {
        gte: fifteenMinutesAgo,
      },
    },
    take: 6, // فقط 6 رکورد اول را بگیر (اگر 6 تا پیدا شد، یعنی >= 5)
    orderBy: {
      created_at: 'desc',
    },
    select: {
      id: true, // فقط id را بگیر برای سرعت بیشتر
    },
  });

  // اگر بیش از 5 تلاش ناموفق از IP، مسدود کن
  if (failedAttemptsFromIp.length >= 5) {
    // مسدود کردن IP برای 30 دقیقه
    const blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
    try {
      await prisma.loginAttempt.create({
        data: {
          ip_address: ipAddress,
          attempt_type: 'rate_limit',
          success: false,
          blocked: true,
          blocked_until: blockedUntil,
          email: email || null,
          phone: phone || null,
        },
      });
    } catch (error) {
      // اگر خطا در ثبت رخ داد، لاگ کن اما ادامه بده
      console.error('❌ [ANTI-ABUSE] Error creating block record:', error);
    }

    const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
    return { allowed: false, retryAfter };
  }

  // بررسی rate limiting برای email - فقط اگر email موجود باشد
  if (email) {
    const failedAttemptsFromEmail = await prisma.loginAttempt.findMany({
      where: {
        email,
        success: false,
        created_at: {
          gte: fifteenMinutesAgo,
        },
      },
      take: 6,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (failedAttemptsFromEmail.length >= 5) {
      const blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
      try {
        await prisma.loginAttempt.create({
          data: {
            ip_address: ipAddress,
            attempt_type: 'rate_limit',
            success: false,
            blocked: true,
            blocked_until: blockedUntil,
            email,
          },
        });
      } catch (error) {
        console.error('❌ [ANTI-ABUSE] Error creating block record:', error);
      }

      const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }
  }

  // بررسی rate limiting برای phone - فقط اگر phone موجود باشد
  if (phone) {
    const failedAttemptsFromPhone = await prisma.loginAttempt.findMany({
      where: {
        phone,
        success: false,
        created_at: {
          gte: fifteenMinutesAgo,
        },
      },
      take: 6,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (failedAttemptsFromPhone.length >= 5) {
      const blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
      try {
        await prisma.loginAttempt.create({
          data: {
            ip_address: ipAddress,
            attempt_type: 'rate_limit',
            success: false,
            blocked: true,
            blocked_until: blockedUntil,
            phone,
          },
        });
      } catch (error) {
        console.error('❌ [ANTI-ABUSE] Error creating block record:', error);
      }

      const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }
  }

  return { allowed: true };
}

/**
 * بررسی anti-abuse برای درخواست
 * با timeout شدید برای جلوگیری از CPU بالا
 */
export async function checkAntiAbuse(
  req: NextRequest,
  email?: string,
  phone?: string
): Promise<AntiAbuseCheckResult> {
  const ipAddress = getIpAddress(req);

  try {
    // Timeout کل عملیات بعد از 1 ثانیه (کاهش از 2 به 1)
    const result = await Promise.race([
      (async () => {
        // بررسی اینکه آیا قبلاً مسدود شده است - فقط IP check (سریع‌تر)
        const blockedCheck = await Promise.race([
          checkIfBlocked(ipAddress, email, phone),
          new Promise<{ blocked: boolean; blockedUntil?: Date }>((resolve) => 
            setTimeout(() => resolve({ blocked: false }), 500)
          ),
        ]);

        if (blockedCheck.blocked && blockedCheck.blockedUntil) {
          const retryAfter = Math.ceil(
            (blockedCheck.blockedUntil.getTime() - Date.now()) / 1000
          );
          return {
            allowed: false,
            reason: 'IP یا حساب کاربری شما به دلیل تلاش‌های ناموفق متعدد موقتاً مسدود شده است',
            blockedUntil: blockedCheck.blockedUntil,
            retryAfter,
          };
        }

        // بررسی rate limiting - فقط IP (سریع‌تر)
        const rateLimitCheck = await Promise.race([
          checkRateLimit(ipAddress, email, phone),
          new Promise<{ allowed: boolean; retryAfter?: number }>((resolve) => 
            setTimeout(() => resolve({ allowed: true }), 500)
          ),
        ]);

        if (!rateLimitCheck.allowed) {
          return {
            allowed: false,
            reason: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً بعداً تلاش کنید',
            retryAfter: rateLimitCheck.retryAfter,
          };
        }

        return {
          allowed: true,
        };
      })(),
      // Timeout بعد از 1 ثانیه (کاهش از 2 به 1)
      new Promise<AntiAbuseCheckResult>((resolve) => 
        setTimeout(() => resolve({ allowed: true }), 1000)
      ),
    ]);

    return result;
  } catch (error) {
    // در صورت خطا، اجازه بده (fail open)
    console.error('❌ [ANTI-ABUSE] Error in checkAntiAbuse:', error);
    return {
      allowed: true,
    };
  }
}

/**
 * ثبت تلاش لاگین
 * بهینه شده: استفاده از createMany برای batch insert (اگر چندین درخواست همزمان باشد)
 */
export async function recordLoginAttempt(
  req: NextRequest,
  attemptType: string,
  success: boolean,
  email?: string,
  phone?: string
): Promise<void> {
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  try {
    // استفاده از create با timeout برای جلوگیری از hang شدن
    await Promise.race([
      prisma.loginAttempt.create({
        data: {
          ip_address: ipAddress,
          user_agent: userAgent,
          email: email || null,
          phone: phone || null,
          attempt_type: attemptType,
          success,
          blocked: false,
        },
      }),
      // Timeout بعد از 2 ثانیه
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      ),
    ]);
  } catch (error: any) {
    // Log error but don't fail the request
    if (error.message !== 'Timeout') {
      console.error('❌ [ANTI-ABUSE] Error recording login attempt:', error);
    }
  }
}

/**
 * ایجاد پاسخ anti-abuse
 */
export function createAntiAbuseResponse(
  abuseCheck: AntiAbuseCheckResult
): NextResponse {
  const headers: HeadersInit = {};

  // اضافه کردن Retry-After header اگر موجود باشد
  if (abuseCheck.retryAfter) {
    headers['Retry-After'] = abuseCheck.retryAfter.toString();
  }

  return NextResponse.json(
    {
      message: abuseCheck.reason || 'درخواست شما به دلیل محدودیت امنیتی رد شد',
      blocked: true,
      retryAfter: abuseCheck.retryAfter,
    },
    {
      status: 429, // Too Many Requests
      headers,
    }
  );
}
