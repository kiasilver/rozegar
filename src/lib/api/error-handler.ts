/**
 * Error Handler - مدیریت خطاها به صورت مرکزی
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * مدیریت خطاهای API
 */
export function handleApiError(error: unknown): { message: string; code?: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || "خطای نامشخص رخ داد",
      code: "UNKNOWN_ERROR",
    };
  }

  return {
    message: "خطای نامشخص رخ داد",
    code: "UNKNOWN_ERROR",
  };
}

/**
 * لاگ کردن خطاها
 */
export function logError(error: unknown, context?: string) {
  const errorInfo = handleApiError(error);
  console.error(`[${context || "ERROR"}]`, {
    message: errorInfo.message,
    code: errorInfo.code,
    error,
  });
}

/**
 * نمایش خطا به کاربر
 */
export function formatErrorMessage(error: unknown): string {
  const errorInfo = handleApiError(error);
  
  // پیام‌های دوستانه برای کاربر
  const friendlyMessages: Record<string, string> = {
    "UNAUTHORIZED": "شما دسترسی لازم را ندارید",
    "FORBIDDEN": "دسترسی غیرمجاز",
    "NOT_FOUND": "موردی یافت نشد",
    "VALIDATION_ERROR": "اطلاعات وارد شده معتبر نیست",
    "NETWORK_ERROR": "خطا در ارتباط با سرور",
    "TIMEOUT": "زمان درخواست به پایان رسید",
  };

  return friendlyMessages[errorInfo.code || ""] || errorInfo.message;
}

