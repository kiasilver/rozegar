import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

// Rate limiting configuration
const RATE_LIMITS = {
  // Maximum attempts per time window
  MAX_ATTEMPTS_PER_IP: 10, // 10 attempts per 15 minutes per IP
  MAX_ATTEMPTS_PER_EMAIL: 5, // 5 attempts per 15 minutes per email
  MAX_ATTEMPTS_PER_PHONE: 5, // 5 attempts per 15 minutes per phone

  // Time windows (in milliseconds)
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes

  // Blocking thresholds
  BLOCK_AFTER_FAILED_ATTEMPTS: 5, // Block after 5 failed attempts
  BLOCK_DURATION_MS: 30 * 60 * 1000, // Block for 30 minutes

  // Request throttling (minimum time between requests)
  MIN_REQUEST_INTERVAL_MS: 1000, // 1 second between requests
};

interface AntiAbuseResult {
  allowed: boolean;
  message?: string;
  retryAfter?: number; // seconds
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  // Check various headers for IP (in order of preference)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback if no IP headers are found
  return 'unknown';
}

/**
 * Get user agent from request
 */
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Check if IP is currently blocked
 */
async function isIPBlocked(ip: string): Promise<{ blocked: boolean; until?: Date }> {
  const now = new Date();

  const blockedAttempt = await prisma.loginAttempt.findFirst({
    where: {
      ip_address: ip,
      blocked: true,
      blocked_until: {
        gt: now,
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (blockedAttempt && blockedAttempt.blocked_until) {
    return {
      blocked: true,
      until: blockedAttempt.blocked_until,
    };
  }

  return { blocked: false };
}

/**
 * Check rate limits for IP address
 */
async function checkIPRateLimit(ip: string): Promise<AntiAbuseResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMITS.WINDOW_MS);

  // Count attempts in the time window
  const attemptCount = await prisma.loginAttempt.count({
    where: {
      ip_address: ip,
      created_at: {
        gte: windowStart,
      },
    },
  });

  if (attemptCount >= RATE_LIMITS.MAX_ATTEMPTS_PER_IP) {
    return {
      allowed: false,
      message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.',
      retryAfter: Math.ceil(RATE_LIMITS.WINDOW_MS / 1000),
    };
  }

  // Check for rapid requests (throttling)
  const recentAttempt = await prisma.loginAttempt.findFirst({
    where: {
      ip_address: ip,
      created_at: {
        gte: new Date(now.getTime() - RATE_LIMITS.MIN_REQUEST_INTERVAL_MS),
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (recentAttempt) {
    const timeSinceLastRequest = now.getTime() - recentAttempt.created_at.getTime();
    const retryAfter = Math.ceil((RATE_LIMITS.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest) / 1000);

    if (retryAfter > 0) {
      return {
        allowed: false,
        message: 'لطفاً کمی صبر کنید و دوباره تلاش کنید.',
        retryAfter,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check rate limits for email
 */
async function checkEmailRateLimit(email: string): Promise<AntiAbuseResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMITS.WINDOW_MS);

  const attemptCount = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      created_at: {
        gte: windowStart,
      },
    },
  });

  if (attemptCount >= RATE_LIMITS.MAX_ATTEMPTS_PER_EMAIL) {
    return {
      allowed: false,
      message: 'تعداد تلاش‌های ورود برای این ایمیل بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.',
      retryAfter: Math.ceil(RATE_LIMITS.WINDOW_MS / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Check rate limits for phone
 */
async function checkPhoneRateLimit(phone: string): Promise<AntiAbuseResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMITS.WINDOW_MS);

  const attemptCount = await prisma.loginAttempt.count({
    where: {
      phone: phone,
      created_at: {
        gte: windowStart,
      },
    },
  });

  if (attemptCount >= RATE_LIMITS.MAX_ATTEMPTS_PER_PHONE) {
    return {
      allowed: false,
      message: 'تعداد تلاش‌های ورود برای این شماره تلفن بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.',
      retryAfter: Math.ceil(RATE_LIMITS.WINDOW_MS / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Check failed attempts and block if necessary
 */
async function checkFailedAttempts(
  ip: string,
  email?: string,
  phone?: string
): Promise<AntiAbuseResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMITS.WINDOW_MS);

  // Count failed attempts in the time window
  const failedCount = await prisma.loginAttempt.count({
    where: {
      ip_address: ip,
      success: false,
      created_at: {
        gte: windowStart,
      },
      ...(email && { email: email.toLowerCase() }),
      ...(phone && { phone: phone }),
    },
  });

  if (failedCount >= RATE_LIMITS.BLOCK_AFTER_FAILED_ATTEMPTS) {
    // Block the IP
    const blockedUntil = new Date(now.getTime() + RATE_LIMITS.BLOCK_DURATION_MS);

    await prisma.loginAttempt.create({
      data: {
        ip_address: ip,
        email: email?.toLowerCase(),
        phone: phone,
        attempt_type: 'block',
        success: false,
        blocked: true,
        blocked_until: blockedUntil,
      },
    });

    return {
      allowed: false,
      message: `به دلیل تلاش‌های ناموفق مکرر، دسترسی شما به مدت ${Math.ceil(RATE_LIMITS.BLOCK_DURATION_MS / 60000)} دقیقه مسدود شده است.`,
      retryAfter: Math.ceil(RATE_LIMITS.BLOCK_DURATION_MS / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  req: NextRequest,
  attemptType: 'email' | 'phone' | 'password' | 'otp',
  success: boolean,
  email?: string,
  phone?: string
): Promise<void> {
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  await prisma.loginAttempt.create({
    data: {
      ip_address: ip,
      user_agent: userAgent,
      email: email?.toLowerCase(),
      phone: phone,
      attempt_type: attemptType,
      success: success,
      blocked: false,
    },
  });

  // If failed, check if we should block (but don't return error, just record)
  // The blocking will be checked in the next request via checkAntiAbuse
  if (!success) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMITS.WINDOW_MS);

    // Count failed attempts in the time window
    const failedCount = await prisma.loginAttempt.count({
      where: {
        ip_address: ip,
        success: false,
        created_at: {
          gte: windowStart,
        },
        ...(email && { email: email.toLowerCase() }),
        ...(phone && { phone: phone }),
      },
    });

    // If threshold reached, block the IP
    if (failedCount >= RATE_LIMITS.BLOCK_AFTER_FAILED_ATTEMPTS) {
      const blockedUntil = new Date(now.getTime() + RATE_LIMITS.BLOCK_DURATION_MS);

      await prisma.loginAttempt.create({
        data: {
          ip_address: ip,
          email: email?.toLowerCase(),
          phone: phone,
          attempt_type: 'block',
          success: false,
          blocked: true,
          blocked_until: blockedUntil,
        },
      });
    }
  }
}

/**
 * Main anti-abuse check function
 */
export async function checkAntiAbuse(
  req: NextRequest,
  email?: string,
  phone?: string
): Promise<AntiAbuseResult> {
  // Skip blocking in development mode
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true };
  }

  const ip = getClientIP(req);

  // 1. Check if IP is currently blocked
  const blockStatus = await isIPBlocked(ip);
  if (blockStatus.blocked && blockStatus.until) {
    const retryAfter = Math.ceil((blockStatus.until.getTime() - Date.now()) / 1000);
    return {
      allowed: false,
      message: 'دسترسی شما به دلیل فعالیت مشکوک مسدود شده است. لطفاً بعداً تلاش کنید.',
      retryAfter: retryAfter > 0 ? retryAfter : 0,
    };
  }

  // 2. Check IP rate limit
  const ipCheck = await checkIPRateLimit(ip);
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // 3. Check email rate limit (if provided)
  if (email) {
    const emailCheck = await checkEmailRateLimit(email);
    if (!emailCheck.allowed) {
      return emailCheck;
    }
  }

  // 4. Check phone rate limit (if provided)
  if (phone) {
    const phoneCheck = await checkPhoneRateLimit(phone);
    if (!phoneCheck.allowed) {
      return phoneCheck;
    }
  }

  // 5. Check failed attempts (only if we have email or phone)
  if (email || phone) {
    const failedCheck = await checkFailedAttempts(ip, email, phone);
    if (!failedCheck.allowed) {
      return failedCheck;
    }
  }

  return { allowed: true };
}

/**
 * Helper function to create error response with retry-after header
 */
export function createAntiAbuseResponse(result: AntiAbuseResult): NextResponse {
  const response = NextResponse.json(
    { message: result.message || 'درخواست شما رد شد' },
    { status: 429 } // Too Many Requests
  );

  if (result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }

  return response;
}

