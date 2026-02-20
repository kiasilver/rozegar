/**
 * سیستم Anti-Spam برای کامنت‌ها
 */

interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
}

/**
 * بررسی IP address برای rate limiting
 */
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * بررسی spam با استفاده از honeypot و rate limiting
 */
export async function checkSpam(
  content: string,
  email: string,
  name: string,
  ipAddress: string,
  honeypot?: string,
  isLoggedIn?: boolean // اگر کاربر لاگین کرده باشد
): Promise<SpamCheckResult> {
  // لاگ برای debugging
  console.log("🔍 [ANTI-SPAM] Checking:", {
    contentLength: content?.length,
    email: email ? `${email.substring(0, 3)}***` : "none",
    name: name ? `${name.substring(0, 3)}***` : "none",
    isLoggedIn,
    hasHoneypot: !!honeypot,
    ipAddress: ipAddress === "unknown" ? "unknown" : `${ipAddress.substring(0, 7)}***`,
  });

  // 1. بررسی honeypot (اگر پر شده باشد، spam است)
  if (honeypot && honeypot.trim().length > 0) {
    console.log("🚫 [ANTI-SPAM] Honeypot filled");
    return { isSpam: true, reason: "Honeypot field filled" };
  }

  // 2. بررسی rate limiting (حداکثر 5 کامنت در 10 دقیقه از یک IP)
  const now = Date.now();
  const ipData = ipRequestCounts.get(ipAddress);

  if (ipData) {
    if (now < ipData.resetTime) {
      if (ipData.count >= 5) {
        return { isSpam: true, reason: "Too many requests from this IP" };
      }
      ipData.count++;
    } else {
      // Reset counter
      ipRequestCounts.set(ipAddress, { count: 1, resetTime: now + 10 * 60 * 1000 });
    }
  } else {
    ipRequestCounts.set(ipAddress, { count: 1, resetTime: now + 10 * 60 * 1000 });
  }

  // 3. بررسی محتوای spam (کلمات کلیدی spam)
  // فقط کلمات کلیدی مشکوک‌تر را بررسی می‌کنیم
  const spamKeywords = [
    "کلیک کنید",
    "خرید کنید",
    "فروش ویژه",
    "تبلیغات رایگان",
    "کسب درآمد",
    "پول سریع",
  ];

  const contentLower = content.toLowerCase();
  const spamCount = spamKeywords.filter((keyword) => contentLower.includes(keyword.toLowerCase())).length;

  // اگر 2 یا بیشتر از کلمات کلیدی مشکوک وجود داشت، spam است
  if (spamCount >= 2) {
    return { isSpam: true, reason: "Too many spam keywords" };
  }

  // بررسی لینک‌های مشکوک (اگر بیش از 3 لینک در متن باشد)
  const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
  const urls = content.match(urlPattern);
  if (urls && urls.length > 3) {
    return { isSpam: true, reason: "Too many URLs in content" };
  }

  // 4. بررسی طول محتوا (خیلی کوتاه یا خیلی بلند)
  const contentLength = content.trim().length;
  if (contentLength < 10) {
    console.log("🚫 [ANTI-SPAM] Content too short:", contentLength);
    return { isSpam: true, reason: "Content too short" };
  }

  if (contentLength > 2000) {
    console.log("🚫 [ANTI-SPAM] Content too long:", contentLength);
    return { isSpam: true, reason: "Content too long" };
  }

  // 5. بررسی تکرار کاراکترها (مثل: "aaaaaa")
  const repeatedChars = /(.)\1{10,}/.test(content);
  if (repeatedChars) {
    return { isSpam: true, reason: "Repeated characters detected" };
  }

  // 6. بررسی ایمیل معتبر (فقط برای کاربران مهمان)
  if (!isLoggedIn) {
    if (!email || email.trim().length === 0) {
      console.log("🚫 [ANTI-SPAM] Email is required for guest users");
      return { isSpam: true, reason: "Email is required for guest users" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("🚫 [ANTI-SPAM] Invalid email format:", email);
      return { isSpam: true, reason: "Invalid email format" };
    }
  }

  // 7. بررسی نام (فقط برای کاربران مهمان)
  if (!isLoggedIn) {
    if (!name || name.trim().length < 2) {
      console.log("🚫 [ANTI-SPAM] Invalid name:", name);
      return { isSpam: true, reason: "Invalid name" };
    }
  }

  console.log("✅ [ANTI-SPAM] Comment passed all checks");
  return { isSpam: false };
}

/**
 * پاک کردن IP های قدیمی از cache
 */
export function cleanupIpCache() {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now >= data.resetTime) {
      ipRequestCounts.delete(ip);
    }
  }
}

// پاک کردن cache هر 5 دقیقه
if (typeof setInterval !== "undefined") {
  setInterval(cleanupIpCache, 5 * 60 * 1000);
}

