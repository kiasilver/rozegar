/**
 * Exception های مربوط به تلگرام
 */

/**
 * Exception برای توقف پردازش در صورت عدم ارسال موفق به تلگرام
 */
export class TelegramSendFailedError extends Error {
  constructor(message: string, public readonly itemTitle?: string, public readonly itemUrl?: string) {
    super(message);
    this.name = 'TelegramSendFailedError';
  }
}

