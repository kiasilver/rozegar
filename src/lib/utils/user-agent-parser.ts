/**
 * User Agent Parser
 * استخراج سیستم عامل از User Agent string
 */

export interface ParsedUserAgent {
  os: string;
  browser: string;
  device: string;
}

/**
 * استخراج سیستم عامل از User Agent
 */
export function parseOperatingSystem(userAgent: string | null | undefined): string {
  if (!userAgent) return "Other";

  const ua = userAgent.toLowerCase();

  // Windows
  if (ua.includes("windows")) {
    if (ua.includes("windows nt 10.0")) return "Windows";
    if (ua.includes("windows nt 6.3")) return "Windows";
    if (ua.includes("windows nt 6.2")) return "Windows";
    if (ua.includes("windows nt 6.1")) return "Windows";
    if (ua.includes("windows nt 6.0")) return "Windows";
    if (ua.includes("windows nt 5.1")) return "Windows";
    if (ua.includes("windows nt 5.0")) return "Windows";
    return "Windows";
  }

  // macOS
  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macOS";
  }

  // Linux
  if (ua.includes("linux")) {
    if (ua.includes("android")) {
      // Android (که بر پایه Linux است)
      return "Android";
    }
    return "Linux";
  }

  // Android
  if (ua.includes("android")) {
    return "Android";
  }

  // iOS
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iOS";
  }

  // Chrome OS
  if (ua.includes("cros")) {
    return "Linux"; // Chrome OS بر پایه Linux است
  }

  // Other
  return "Other";
}

/**
 * استخراج مرورگر از User Agent
 */
export function parseBrowser(userAgent: string | null | undefined): string {
  if (!userAgent) return "Other";

  const ua = userAgent.toLowerCase();

  if (ua.includes("edg")) return "Edge";
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  if (ua.includes("msie") || ua.includes("trident")) return "IE";

  return "Other";
}

/**
 * استخراج نوع دستگاه از User Agent
 */
export function parseDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Desktop";

  const ua = userAgent.toLowerCase();

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
    return "Mobile";
  }

  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "Tablet";
  }

  return "Desktop";
}

/**
 * Parse کامل User Agent
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  return {
    os: parseOperatingSystem(userAgent),
    browser: parseBrowser(userAgent),
    device: parseDevice(userAgent),
  };
}
