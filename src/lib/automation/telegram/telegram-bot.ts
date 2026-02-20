/**
 * کتابخانه ارسال پیام و عکس به تلگرام
 * استفاده از Telegram Bot API
 */

export interface TelegramMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  enableWatermark?: boolean; // فعال/غیرفعال کردن watermark برای عکس
  logoPath?: string; // مسیر لوگو watermark (اختیاری)
}

export interface TelegramSendResult {
  success: boolean;
  message_id?: number;
  error?: string;
}

/**
 * ارسال پیام متنی به کانال تلگرام
 */
export async function sendTelegramMessage(
  botToken: string,
  channelId: string,
  text: string,
  options: TelegramMessageOptions = {}
): Promise<TelegramSendResult> {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

      // ایجاد AbortController برای timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 ثانیه timeout (افزایش یافت)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: channelId,
            text: text,
            parse_mode: options.parse_mode || 'HTML',
            disable_web_page_preview: options.disable_web_page_preview ?? true,
            disable_notification: options.disable_notification ?? false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMessage = data.description || `HTTP ${response.status}`;

          // خطای "chat not found" - ربات به کانال اضافه نشده یا channel_id اشتباه است
          if (errorMessage.includes('chat not found') || errorMessage.includes('Chat not found')) {
            console.error('[Telegram:Bot] ERROR: Channel not found. Please check:');
            console.error('[Telegram:Bot]   1. Bot is added to channel as Admin');
            console.error('[Telegram:Bot]   2. Channel ID is correct (e.g., @channel_name or -1001234567890)');
            return {
              success: false,
              error: 'کانال یافت نشد. لطفاً بررسی کنید که ربات به کانال اضافه شده و Channel ID درست باشد.',
            };
          }

          // اگر خطای 429 (rate limit) یا 503 (service unavailable) است، retry کن
          if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
            const waitTime = attempt * 2000; // 2s, 4s, 6s
            console.log(`[Telegram:Bot] WARNING: Error ${response.status}, retrying after ${waitTime}ms... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          console.error('[Telegram:Bot] ERROR: Failed to send message:', errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        return {
          success: true,
          message_id: data.result?.message_id,
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError' || fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          lastError = fetchError;
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000;
            console.log(`[Telegram:Bot] WARNING: Timeout sending message, retrying after ${waitTime}ms... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          console.error(`[Telegram:Bot] ERROR: Timeout sending message after ${maxRetries} attempts`);
          return {
            success: false,
            error: 'Timeout: Connection to Telegram took too long',
          };
        }
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000;
        console.log(`[Telegram:Bot] WARNING: Error sending message, retrying after ${waitTime}ms... (${attempt}/${maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      console.error(`[Telegram:Bot] ERROR: Failed to send message after ${maxRetries} attempts:`, error);
      return {
        success: false,
        error: error.message || 'خطای ناشناخته',
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'خطای ناشناخته',
  };
}

/**
 * بررسی دسترسی بودن URL عکس
 */
async function validatePhotoUrl(photoUrl: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثانیه برای بررسی

    try {
      const response = await fetch(photoUrl, {
        method: 'HEAD', // فقط header را دریافت کن (سریع‌تر)
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return {
          valid: false,
          error: 'URL عکس معتبر نیست (content-type: ' + contentType + ')',
        };
      }

      return { valid: true };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return {
          valid: false,
          error: 'Timeout در بررسی URL عکس',
        };
      }
      // اگر HEAD کار نکرد، سعی کن GET کنی (برای برخی سرورها)
      try {
        const getResponse = await fetch(photoUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (getResponse.ok) {
          const contentType = getResponse.headers.get('content-type');
          if (contentType && contentType.startsWith('image/')) {
            return { valid: true };
          }
        }
      } catch {
        // ignore
      }

      return {
        valid: false,
        error: fetchError.message || 'خطا در بررسی URL عکس',
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'خطای ناشناخته در بررسی URL',
    };
  }
}

/**
 * ارسال عکس با caption به کانال تلگرام
 * پشتیبانی از URL و فایل محلی
 */
export async function sendTelegramPhoto(
  botToken: string,
  channelId: string,
  photoUrl: string,
  caption: string,
  options: TelegramMessageOptions = {}
): Promise<TelegramSendResult> {
  // افزایش maxRetries برای خطاهای شبکه (ECONNRESET, ETIMEDOUT, etc.)
  const maxRetries = 5; // افزایش از 3 به 5 برای خطاهای شبکه
  let lastError: any = null;

  // بررسی اینکه آیا photoUrl یک مسیر محلی است یا URL
  const isLocalPath = photoUrl.startsWith('/') && !photoUrl.startsWith('http');
  const isLocalhost = photoUrl.includes('localhost') || photoUrl.includes('127.0.0.1');

  // اگر URL محلی است، سعی کن فایل را از مسیر محلی بخوانی
  let imageBuffer: Buffer | null = null;
  let imageFileName: string | null = null;

  if (isLocalPath || isLocalhost) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // استخراج مسیر فایل از URL
      let filePath: string;
      if (isLocalhost) {
        // استخراج مسیر از URL محلی (مثلاً http://localhost:3000/uploads/images/file.jpg)
        const urlObj = new URL(photoUrl);
        filePath = path.default.join(process.cwd(), 'public', urlObj.pathname);
      } else {
        // مسیر مستقیم (مثلاً /uploads/images/file.jpg)
        filePath = path.default.join(process.cwd(), 'public', photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl);
      }

      // Clean logging - reading file
      imageBuffer = await fs.default.readFile(filePath);
      imageFileName = path.default.basename(filePath);
      // Clean logging - file read
    } catch (fileError: any) {
      console.warn(`[Telegram:Bot] WARNING: Failed to read local file: ${fileError.message}`);
      // اگر فایل محلی خوانده نشد، سعی کن از URL استفاده کنی
      imageBuffer = null;
    }
  }

  // اگر watermark فعال است و imageBuffer وجود دارد، watermark اضافه کن
  if (options.enableWatermark && imageBuffer) {
    try {
      const { addWatermarkToImage } = await import('@/lib/content/media/image-watermark');
      // Clean logging - adding watermark
      // استفاده از logoPath از options اگر موجود باشد
      imageBuffer = await addWatermarkToImage(imageBuffer, 'روزمرکی', {
        position: 'top-left',
        opacity: 1.0, // بدون شفافیت
        logoPath: options.logoPath,
      });
      // Clean logging - watermark added
    } catch (watermarkError: any) {
      console.warn(`[Telegram:Bot] WARNING: Failed to add watermark: ${watermarkError.message}`);
      // ادامه بدون watermark
    }
  }

  // اگر watermark فعال است اما imageBuffer وجود ندارد (URL خارجی یا محلی که خوانده نشد)، عکس را دانلود کن و watermark اضافه کن
  if (options.enableWatermark && !imageBuffer) {
    try {
      // اگر URL محلی است (مثلاً https://example.com/uploads/images/file.jpg)، سعی کن از مسیر محلی بخوانی
      if (photoUrl.includes('/uploads/') && !isLocalhost && !isLocalPath) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          // استخراج مسیر از URL (مثلاً /uploads/images/file.jpg)
          const urlObj = new URL(photoUrl);
          const localPath = path.default.join(process.cwd(), 'public', urlObj.pathname);
          console.log(`📁 [Telegram] تلاش برای خواندن از مسیر محلی: ${localPath}`);
          imageBuffer = await fs.default.readFile(localPath);
          imageFileName = path.default.basename(localPath);
          // Clean logging - file read from local path
        } catch (localError: any) {
          // Clean logging - local file not found, downloading
        }
      }

      // اگر هنوز imageBuffer نداریم، از URL دانلود کن
      if (!imageBuffer) {
        const urlValidation = await validatePhotoUrl(photoUrl);
        if (urlValidation.valid) {
          // Clean logging - downloading image for watermark
          const imageResponse = await fetch(photoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (imageResponse.ok) {
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            imageFileName = 'photo.jpg';
            // Clean logging - image downloaded
          }
        }
      }

      // اگر imageBuffer داریم، watermark اضافه کن
      if (imageBuffer) {
        const { addWatermarkToImage } = await import('@/lib/content/media/image-watermark');
        // Clean logging - adding watermark
        imageBuffer = await addWatermarkToImage(imageBuffer, 'روزمرکی', {
          position: 'top-left',
          opacity: 1.0,
          logoPath: options.logoPath,
        });
        // Clean logging - watermark added
      }
    } catch (downloadError: any) {
      console.warn(`⚠️ [Telegram] خطا در دانلود/پردازش عکس برای watermark: ${downloadError.message}`);
      // ادامه بدون watermark
    }
  }

  // اگر فایل محلی خوانده نشد و URL محلی است، از validation صرف نظر کن
  if (!imageBuffer && !isLocalhost && !isLocalPath) {
    const urlValidation = await validatePhotoUrl(photoUrl);
    if (!urlValidation.valid) {
      console.warn(`⚠️ [Telegram] URL عکس معتبر نیست: ${urlValidation.error}`);
      // Clean logging - sending text only (invalid URL)
      return await sendTelegramMessage(botToken, channelId, caption, options);
    }
  }

  // بررسی و resize کردن عکس قبل از ارسال (برای جلوگیری از خطای PHOTO_INVALID_DIMENSIONS)
  if (imageBuffer) {
    try {
      const sharp = (await import('sharp')).default;
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      const minDimension = 100; // حداقل ابعاد برای Telegram
      const maxDimension = 5000; // حداکثر ابعاد برای Telegram
      const maxFileSize = 10 * 1024 * 1024; // 10MB حداکثر حجم فایل

      let needsResize = false;
      let targetWidth = metadata.width || 1200;
      let targetHeight = metadata.height || 800;

      // بررسی ابعاد
      if (metadata.width && metadata.height) {
        // اگر خیلی کوچک است
        if (metadata.width < minDimension || metadata.height < minDimension) {
          console.warn(`[Telegram:Bot] ⚠️ Image too small (${metadata.width}x${metadata.height}), resizing to minimum ${minDimension}x${minDimension}`);
          needsResize = true;
          // حفظ aspect ratio
          const aspectRatio = metadata.width / metadata.height;
          if (metadata.width < metadata.height) {
            targetHeight = minDimension;
            targetWidth = Math.round(minDimension * aspectRatio);
          } else {
            targetWidth = minDimension;
            targetHeight = Math.round(minDimension / aspectRatio);
          }
        }
        // اگر خیلی بزرگ است
        else if (metadata.width > maxDimension || metadata.height > maxDimension) {
          console.warn(`[Telegram:Bot] ⚠️ Image too large (${metadata.width}x${metadata.height}), resizing to maximum ${maxDimension}x${maxDimension}`);
          needsResize = true;
          // حفظ aspect ratio
          const aspectRatio = metadata.width / metadata.height;
          if (metadata.width > metadata.height) {
            targetWidth = maxDimension;
            targetHeight = Math.round(maxDimension / aspectRatio);
          } else {
            targetHeight = maxDimension;
            targetWidth = Math.round(maxDimension * aspectRatio);
          }
        }
      }

      // بررسی حجم فایل
      if (imageBuffer.length > maxFileSize) {
        console.warn(`[Telegram:Bot] ⚠️ Image file too large (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB), resizing to reduce size`);
        needsResize = true;
        // اگر هنوز target size تنظیم نشده، تنظیم کن
        if (!needsResize || (targetWidth === metadata.width && targetHeight === metadata.height)) {
          const aspectRatio = (metadata.width || 1200) / (metadata.height || 800);
          targetWidth = Math.min(maxDimension, Math.round(Math.sqrt(maxFileSize / 1024 / 1024 * 1000000 / aspectRatio)));
          targetHeight = Math.round(targetWidth / aspectRatio);
        }
      }

      // اگر نیاز به resize است، انجام بده
      if (needsResize) {
        console.log(`[Telegram:Bot] Resizing image from ${metadata.width}x${metadata.height} to ${targetWidth}x${targetHeight}`);
        imageBuffer = await image
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: false, // اجازه بزرگ کردن برای عکس‌های خیلی کوچک
          })
          .jpeg({ quality: 85, mozjpeg: true }) // تبدیل به JPEG برای کاهش حجم
          .toBuffer();
        console.log(`[Telegram:Bot] ✅ Image resized successfully (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
      }
    } catch (resizeError: any) {
      console.warn(`[Telegram:Bot] ⚠️ WARNING: Failed to validate/resize image: ${resizeError.message}`);
      // ادامه با عکس اصلی (شاید کار کند)
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

      // ایجاد AbortController برای timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 ثانیه timeout

      try {
        let response: Response;

        // اگر فایل محلی خوانده شده، از multipart/form-data استفاده کن
        if (imageBuffer) {
          // Clean logging - sending photo
          // استفاده از FormData built-in در Node.js 18+
          const formData = new FormData();

          // تبدیل Buffer به Blob
          const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
          const file = new File([blob], imageFileName || 'photo.jpg', { type: 'image/jpeg' });

          // محدود کردن طول caption به 1024 کاراکتر و اعتبارسنجی HTML
          const maxCaptionLength = 1024;
          const finalCaption = truncateAndValidateCaption(caption, maxCaptionLength);

          formData.append('chat_id', channelId);
          formData.append('photo', file);
          formData.append('caption', finalCaption);
          formData.append('parse_mode', options.parse_mode || 'HTML');
          if (options.disable_notification !== undefined) {
            formData.append('disable_notification', options.disable_notification.toString());
          }

          // تنظیمات اضافی برای بهبود اتصال
          const fetchOptions: RequestInit = {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            // اضافه کردن keepalive برای اتصال پایدارتر
            keepalive: true,
          };

          response = await fetch(url, fetchOptions);
        } else {
          // استفاده از URL
          console.log(`[Telegram:Bot] Sending photo from URL: ${photoUrl}`);
          // محدود کردن طول caption به 1024 کاراکتر و اعتبارسنجی HTML
          const maxCaptionLength = 1024;
          const finalCaption = truncateAndValidateCaption(caption, maxCaptionLength);

          // تنظیمات اضافی برای بهبود اتصال
          const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: channelId,
              photo: photoUrl,
              caption: finalCaption,
              parse_mode: options.parse_mode || 'HTML',
              disable_notification: options.disable_notification ?? false,
            }),
            signal: controller.signal,
            // اضافه کردن keepalive برای اتصال پایدارتر
            keepalive: true,
          };

          response = await fetch(url, fetchOptions);
        }

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMessage = data.description || `HTTP ${response.status}`;

          // خطای "chat not found" - ربات به کانال اضافه نشده یا channel_id اشتباه است
          if (errorMessage.includes('chat not found') || errorMessage.includes('Chat not found')) {
            console.error('[Telegram:Bot] ERROR: Channel not found. Please check:');
            console.error('[Telegram:Bot]   1. Bot is added to channel as Admin');
            console.error('[Telegram:Bot]   2. Channel ID is correct (e.g., @channel_name or -1001234567890)');
            return {
              success: false,
              error: 'کانال یافت نشد. لطفاً بررسی کنید که ربات به کانال اضافه شده و Channel ID درست باشد.',
            };
          }

          // اگر خطای 429 (rate limit) یا 503 (service unavailable) است، retry کن
          if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
            const waitTime = attempt * 2000; // 2s, 4s, 6s
            console.log(`[Telegram:Bot] WARNING: Error ${response.status}, retrying after ${waitTime}ms... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // اگر خطای "bad request" برای عکس است (مثل PHOTO_INVALID_DIMENSIONS)
          if (errorMessage.includes('bad request') || errorMessage.includes('Bad Request') ||
            errorMessage.includes('file') || errorMessage.includes('photo') ||
            errorMessage.includes('PHOTO_INVALID_DIMENSIONS') || errorMessage.includes('invalid dimensions')) {
            console.error(`[Telegram:Bot] ❌ ERROR: Failed to send photo: ${errorMessage}`);
            console.error(`[Telegram:Bot]   This usually means:`);
            console.error(`[Telegram:Bot]     - Image dimensions are invalid (too small < 100x100 or too large > 5000x5000)`);
            console.error(`[Telegram:Bot]     - Image file size is too large (> 10MB)`);
            console.error(`[Telegram:Bot]     - Image format is not supported`);
            console.error(`[Telegram:Bot]   Image is required - news will not be sent without image`);
            // ⚠️ مهم: اگر عکس نتوانست ارسال شود، خبر رد می‌شود - بدون عکس ارسال نمی‌کنیم
            return {
              success: false,
              error: `Failed to send photo: ${errorMessage}. Image is required.`,
            };
          }

          console.error('[Telegram:Bot] ERROR: Failed to send photo:', errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        return {
          success: true,
          message_id: data.result?.message_id,
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // بررسی انواع خطاهای شبکه
        const isNetworkError =
          fetchError.name === 'AbortError' ||
          fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          fetchError.cause?.code === 'ECONNRESET' ||
          fetchError.cause?.code === 'ECONNREFUSED' ||
          fetchError.cause?.code === 'ETIMEDOUT' ||
          fetchError.message?.includes('fetch failed') ||
          fetchError.message?.includes('network') ||
          fetchError.message?.includes('socket') ||
          fetchError.message?.includes('connection');

        if (isNetworkError) {
          lastError = fetchError;
          if (attempt < maxRetries) {
            // Exponential backoff: 3s, 6s, 9s, 12s, 15s (حداکثر 15 ثانیه)
            const waitTime = Math.min(attempt * 3000, 15000);
            console.log(`[Telegram:Bot] WARNING: Network error (${fetchError.cause?.code || fetchError.name || 'unknown'}) sending photo, retrying after ${waitTime}ms... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          console.error(`❌ [Telegram] Network error در ارسال عکس پس از ${maxRetries} تلاش: ${fetchError.cause?.code || fetchError.message}`);
          console.error(`[Telegram:Bot]   This is usually a temporary network issue. Please check your internet connection.`);
          // ⚠️ مهم: اگر خطای شبکه بود و همه retry ها انجام شد، سعی کن بدون عکس ارسال کنی
          console.warn(`[Telegram:Bot] ⚠️ Attempting to send text-only message as fallback...`);
          try {
            const fallbackResult = await sendTelegramMessage(botToken, channelId, caption, options);
            if (fallbackResult.success) {
              console.log(`[Telegram:Bot] ✅ Fallback text-only message sent successfully`);
              return fallbackResult;
            }
          } catch (fallbackError: any) {
            console.error(`[Telegram:Bot] ❌ Fallback text-only message also failed: ${fallbackError.message}`);
          }
          return {
            success: false,
            error: `Network error: ${fetchError.cause?.code || fetchError.message || 'Connection failed'}. Please check your internet connection.`,
          };
        }
        // برای سایر خطاها، throw کن تا در catch بعدی handle شود
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;

      // بررسی انواع خطاهای شبکه
      const isNetworkError =
        error.cause?.code === 'ECONNRESET' ||
        error.cause?.code === 'ECONNREFUSED' ||
        error.cause?.code === 'ETIMEDOUT' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('network') ||
        error.message?.includes('socket') ||
        error.message?.includes('connection');

      if (attempt < maxRetries) {
        // Exponential backoff برای خطاهای شبکه: 5s, 10s, 20s
        // برای سایر خطاها: 2s, 4s, 6s
        const waitTime = isNetworkError
          ? Math.min(attempt * 5000, 20000)
          : attempt * 2000;
        console.log(`[Telegram:Bot] WARNING: Error sending photo (${error.cause?.code || error.message}), retrying after ${waitTime}ms... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`[Telegram:Bot] ERROR: Failed to send photo after ${maxRetries} attempts:`, error);

      // اگر خطای شبکه بود و همه retry ها انجام شد، سعی کن بدون عکس ارسال کنی
      if (isNetworkError) {
        console.warn(`[Telegram:Bot] ⚠️ Network error after all retries, attempting text-only fallback...`);
        try {
          const fallbackResult = await sendTelegramMessage(botToken, channelId, caption, options);
          if (fallbackResult.success) {
            console.log(`[Telegram:Bot] ✅ Fallback text-only message sent successfully`);
            return fallbackResult;
          }
        } catch (fallbackError: any) {
          console.error(`[Telegram:Bot] ❌ Fallback also failed: ${fallbackError.message}`);
        }
      }

      return {
        success: false,
        error: error.message || 'خطای ناشناخته',
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'خطای ناشناخته',
  };
}

/**
 * ارسال ویدیو با caption به کانال تلگرام
 * پشتیبانی از URL و فایل محلی
 */
export async function sendTelegramVideo(
  botToken: string,
  channelId: string,
  videoUrl: string,
  caption: string,
  options: TelegramMessageOptions = {}
): Promise<TelegramSendResult> {
  const maxRetries = 3;
  let lastError: any = null;

  // بررسی اینکه آیا videoUrl یک مسیر محلی است یا URL
  // پشتیبانی از مسیرهای ویندوز (C:\...) و یونیکس (/...)
  const isWindowsAbsolute = /^[A-Za-z]:[\\\/]/.test(videoUrl);
  const isUnixAbsolute = videoUrl.startsWith('/') && !videoUrl.startsWith('http');
  const isLocalPath = isWindowsAbsolute || isUnixAbsolute;
  const isLocalhost = videoUrl.includes('localhost') || videoUrl.includes('127.0.0.1');

  // اگر URL محلی است، سعی کن فایل را از مسیر محلی بخوانی
  let videoBuffer: Buffer | null = null;
  let videoFileName: string | null = null;

  if (isLocalPath || isLocalhost) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      let localPath = videoUrl;

      // اگر مسیر مطلق (ویندوز یا یونیکس) است، مستقیم استفاده کن
      if (isWindowsAbsolute || (isUnixAbsolute && videoUrl.startsWith('/tmp'))) {
        // مسیر مطلق — مستقیم بخوان
        console.log(`[Telegram:Bot] Reading video from absolute path: ${localPath}`);
      } else if (localPath.startsWith('/uploads/')) {
        localPath = path.default.join(process.cwd(), 'public', localPath);
      } else if (localPath.startsWith('/')) {
        localPath = path.default.join(process.cwd(), 'public', localPath.substring(1));
      } else {
        localPath = path.default.join(process.cwd(), 'public', localPath);
      }

      videoBuffer = await fs.default.readFile(localPath);
      videoFileName = path.default.basename(localPath);
      console.log(`[Telegram:Bot] ✅ Video file read: ${videoFileName} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    } catch (readError: any) {
      console.error(`[Telegram:Bot] ERROR: Failed to read local video file: ${readError.message}`);
      // ادامه می‌دهیم و سعی می‌کنیم از URL استفاده کنیم
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendVideo`;

      // ایجاد AbortController برای timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 ثانیه timeout برای ویدیو

      try {
        let response: Response;

        // اگر فایل محلی خوانده شده، از multipart/form-data استفاده کن
        if (videoBuffer) {
          console.log(`[Telegram:Bot] Sending video as file (multipart/form-data)...`);
          const formData = new FormData();

          // تبدیل Buffer به Blob
          const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' });
          const file = new File([blob], videoFileName || 'video.mp4', { type: 'video/mp4' });

          // محدود کردن طول caption به 1024 کاراکتر
          const maxCaptionLength = 1024;
          const finalCaption = truncateAndValidateCaption(caption, maxCaptionLength);

          formData.append('chat_id', channelId);
          formData.append('video', file);
          formData.append('caption', finalCaption);
          formData.append('parse_mode', options.parse_mode || 'HTML');
          if (options.disable_notification !== undefined) {
            formData.append('disable_notification', options.disable_notification.toString());
          }

          response = await fetch(url, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
        } else {
          // استفاده از URL
          // Clean logging - sending video from URL

          // محدود کردن طول caption به 1024 کاراکتر
          const maxCaptionLength = 1024;
          const finalCaption = truncateAndValidateCaption(caption, maxCaptionLength);

          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: channelId,
              video: videoUrl,
              caption: finalCaption,
              parse_mode: options.parse_mode || 'HTML',
              disable_notification: options.disable_notification ?? false,
            }),
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const errorMessage = data.description || `HTTP ${response.status}`;
          console.error(`[Telegram:Bot] Attempt ${attempt}/${maxRetries} failed: ${errorMessage}`);
          lastError = new Error(errorMessage);

          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[Telegram:Bot] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          console.log(`[Telegram:Bot] ✅ Video sent successfully (message_id: ${data.result?.message_id})`);
          return {
            success: true,
            message_id: data.result?.message_id,
          };
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          const errorMessage = 'Request timeout (180s)';
          console.error(`[Telegram:Bot] Attempt ${attempt}/${maxRetries} failed: ${errorMessage}`);
          lastError = new Error(errorMessage);
        } else {
          console.error(`[Telegram:Bot] Attempt ${attempt}/${maxRetries} failed: ${fetchError.message}`);
          lastError = fetchError;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[Telegram:Bot] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    } catch (error: any) {
      console.error(`[Telegram:Bot] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Telegram:Bot] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'خطای ناشناخته',
  };
}

/**
 * دریافت Channel ID از آخرین پیام‌های ربات
 */
export async function getChannelIdFromUpdates(
  botToken: string
): Promise<{ success: boolean; channelId?: string; error?: string; channels?: Array<{ id: string; title: string; username?: string }> }> {
  try {
    const getUpdatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const response = await fetch(getUpdatesUrl);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'خطا در دریافت اطلاعات',
      };
    }

    const channels: Array<{ id: string; title: string; username?: string }> = [];
    const seenChannels = new Set<string>();

    // استخراج Channel ID از updates
    if (data.result && Array.isArray(data.result)) {
      for (const update of data.result) {
        if (update.channel_post) {
          const chat = update.channel_post.chat;
          if (chat && chat.id && !seenChannels.has(chat.id.toString())) {
            seenChannels.add(chat.id.toString());
            channels.push({
              id: chat.id.toString(),
              title: chat.title || 'بدون نام',
              username: chat.username,
            });
          }
        }
        if (update.message && update.message.chat && update.message.chat.type === 'channel') {
          const chat = update.message.chat;
          if (chat.id && !seenChannels.has(chat.id.toString())) {
            seenChannels.add(chat.id.toString());
            channels.push({
              id: chat.id.toString(),
              title: chat.title || 'بدون نام',
              username: chat.username,
            });
          }
        }
      }
    }

    return {
      success: true,
      channels: channels.length > 0 ? channels : undefined,
      channelId: channels.length > 0 ? channels[0].id : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'خطای ناشناخته',
    };
  }
}

/**
 * دریافت اطلاعات کانال از Channel ID یا Username
 */
export async function getChatInfo(
  botToken: string,
  channelId: string
): Promise<{ success: boolean; chatInfo?: any; error?: string }> {
  try {
    const getChatUrl = `https://api.telegram.org/bot${botToken}/getChat`;
    const response = await fetch(getChatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'خطا در دریافت اطلاعات کانال',
      };
    }

    return {
      success: true,
      chatInfo: data.result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'خطای ناشناخته',
    };
  }
}

/**
 * تست اتصال به تلگرام
 */
export async function testTelegramConnection(
  botToken: string,
  channelId: string
): Promise<{ success: boolean; error?: string; botInfo?: any; chatInfo?: any }> {
  try {
    // تست دریافت اطلاعات ربات
    const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const getMeResponse = await fetch(getMeUrl);
    const getMeData = await getMeResponse.json();

    if (!getMeResponse.ok || !getMeData.ok) {
      return {
        success: false,
        error: getMeData.description || 'خطا در اتصال به ربات تلگرام',
      };
    }

    // بررسی اینکه Channel ID درست است
    const chatInfoResult = await getChatInfo(botToken, channelId);
    if (!chatInfoResult.success) {
      return {
        success: false,
        error: chatInfoResult.error || 'کانال یافت نشد. لطفاً بررسی کنید که ربات به کانال اضافه شده باشد.',
        botInfo: getMeData.result,
      };
    }

    // بررسی نوع chat
    const chatType = chatInfoResult.chatInfo?.type;
    if (chatType !== 'channel' && chatType !== 'supergroup') {
      return {
        success: false,
        error: `این یک ${chatType} است، نه کانال. لطفاً Channel ID یک کانال را وارد کنید.`,
        botInfo: getMeData.result,
        chatInfo: chatInfoResult.chatInfo,
      };
    }

    // بررسی اینکه ربات Admin است
    const botMember = chatInfoResult.chatInfo?.permissions;
    if (!botMember) {
      // سعی کن از getChatMember استفاده کنی
      const getMemberUrl = `https://api.telegram.org/bot${botToken}/getChatMember`;
      const memberResponse = await fetch(getMemberUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: channelId,
          user_id: getMeData.result.id,
        }),
      });

      const memberData = await memberResponse.json();
      if (memberResponse.ok && memberData.ok) {
        const status = memberData.result?.status;
        if (status !== 'administrator' && status !== 'creator') {
          return {
            success: false,
            error: 'ربات باید Admin کانال باشد. لطفاً ربات را به عنوان Admin به کانال اضافه کنید.',
            botInfo: getMeData.result,
            chatInfo: chatInfoResult.chatInfo,
          };
        }
      }
    }

    // تست ارسال پیام تستی
    const testResult = await sendTelegramMessage(
      botToken,
      channelId,
      '✅ تست اتصال موفق بود!',
      { disable_notification: true }
    );

    if (!testResult.success) {
      return {
        success: false,
        error: testResult.error || 'خطا در ارسال پیام تستی',
        botInfo: getMeData.result,
        chatInfo: chatInfoResult.chatInfo,
      };
    }

    return {
      success: true,
      botInfo: getMeData.result,
      chatInfo: chatInfoResult.chatInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'خطای ناشناخته',
    };
  }
}

/**
 * Truncate کردن caption و اعتبارسنجی HTML
 * 🔴 مهم: لینک "مشروح خبر" و هشتگ‌ها را حفظ می‌کند
 */
function truncateAndValidateCaption(caption: string, maxLength: number = 1024): string {
  let finalCaption = caption;

  // 🔴 جدا کردن لینک "مشروح خبر" (HTML یا Text) و هشتگ‌ها از محتوای اصلی
  // این کار برای اطمینان از اینکه لینک و هشتگ‌ها حذف نمی‌شوند
  // پشتیبانی از فرمت جدید: 📰 <a...>...</a> (ایموجی بیرون لینک) یا <a>📰...</a> (ایموجی داخل لینک)
  const fullNewsLinkPattern = /(?:📰\s*<a\s+href=["'][^"']+["'][^>]*>\s*مشروح\s*خبر\s*<\/a>|<a\s+href=["'][^"']+["'][^>]*>📰\s*مشروح\s*خبر\s*<\/a>|📰\s*مشروح\s*خبر\s*\([^)]+\))/gi;
  // 🔴 FIX: هشتگ‌ها باید بعد از لینک "مشروح خبر" باشند
  // Pattern برای هشتگ‌ها: \n\n#hashtag1 #hashtag2 ... (بعد از لینک)
  // پشتیبانی از هر دو حالت (قبل یا بعد از لینک) برای backward compatibility
  const hashtagPatternAfterLink = /\n\n(#[\u0600-\u06FFa-zA-Z0-9_]+(?:\s+#[\u0600-\u06FFa-zA-Z0-9_]+)*)$/; // در انتهای متن
  const hashtagPatternBeforeLink = /\n\n(#[\u0600-\u06FFa-zA-Z0-9_]+(?:\s+#[\u0600-\u06FFa-zA-Z0-9_]+)*)(?=\s*\n\n(?:📰|<a))/; // قبل از لینک

  let fullNewsLink = '';
  let hashtags = '';
  let mainContent = caption;

  // 🔴 ابتدا لینک را استخراج می‌کنیم
  const linkMatch = mainContent.match(fullNewsLinkPattern);
  if (linkMatch) {
    fullNewsLink = linkMatch[0];
  }

  // 🔴 استخراج هشتگ‌ها (بعد از لینک - ترجیحاً، یا قبل از لینک برای backward compatibility)
  // اول سعی می‌کنیم هشتگ‌ها را در انتهای متن پیدا کنیم (بعد از لینک)
  let hashtagMatch = mainContent.match(hashtagPatternAfterLink);
  if (!hashtagMatch) {
    // اگر در انتهای متن نیست، شاید قبل از لینک باشد (backward compatibility)
    hashtagMatch = mainContent.match(hashtagPatternBeforeLink);
  }

  if (hashtagMatch) {
    hashtags = '\n\n' + hashtagMatch[1]; // اضافه کردن \n\n در ابتدا
    console.log(`[Telegram:Bot:Truncate] ✅ Found hashtags: ${hashtags}`);
    // حذف هشتگ‌ها از محتوای اصلی (هر دو pattern)
    mainContent = mainContent.replace(hashtagPatternAfterLink, '').replace(hashtagPatternBeforeLink, '').trim();
  } else {
    console.log(`[Telegram:Bot:Truncate] ⚠️ No hashtags found in caption`);
    console.log(`[Telegram:Bot:Truncate] ⚠️ Caption ends with: ${mainContent.substring(Math.max(0, mainContent.length - 200))}`);
  }

  // حذف لینک از محتوای اصلی (بعد از استخراج هشتگ‌ها)
  if (fullNewsLink) {
    mainContent = mainContent.replace(fullNewsLinkPattern, '').trim();
  }

  // محاسبه فضای لازم برای لینک و هشتگ‌ها
  const footerLength = (fullNewsLink ? fullNewsLink.length + 2 : 0) + (hashtags ? hashtags.length : 0); // +2 برای \n\n
  const availableLength = maxLength - footerLength;

  // 🔴 truncate کردن محتوای اصلی (با در نظر گرفتن فضای لازم برای لینک و هشتگ‌ها)
  if (mainContent.length > availableLength) {
    // برش دادن caption در انتهای جمله (نه با "...")
    const truncated = mainContent.substring(0, availableLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('؟');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

    let truncatePoint = availableLength;
    if (lastSentenceEnd > availableLength * 0.7) {
      // اگر نقطه در 70% آخر متن است، از آنجا برش بزن
      truncatePoint = lastSentenceEnd + 1;
    }

    // 🔴 CRITICAL: بررسی اینکه آیا در نقطه truncate تگ <b> ناقص شده یا نه
    // پیدا کردن آخرین تگ <b> باز قبل از truncatePoint
    let adjustedTruncatePoint = truncatePoint;
    const beforeTruncate = mainContent.substring(0, truncatePoint);
    const lastOpenB = beforeTruncate.lastIndexOf('<b>');
    const lastCloseB = beforeTruncate.lastIndexOf('</b>');

    // اگر آخرین <b> باز بعد از آخرین </b> بسته است، باید </b> اضافه کنیم
    if (lastOpenB > lastCloseB) {
      // بررسی اینکه آیا تگ <b> در آخرین کلمه یا جمله است (نباید truncate کنیم)
      // یا باید تگ <b> را ببندیم
      // پیدا کردن اینکه آیا بعد از <b> محتوایی هست یا نه
      const afterOpenB = mainContent.substring(lastOpenB + 3, truncatePoint).trim();
      if (afterOpenB.length > 0) {
        // محتوا بعد از <b> وجود دارد - می‌توانیم truncate کنیم اما باید </b> اضافه کنیم بعداً
        adjustedTruncatePoint = truncatePoint;
      } else {
        // بعد از <b> محتوا نیست - باید قبل از <b> truncate کنیم
        adjustedTruncatePoint = lastOpenB;
      }
    }

    mainContent = mainContent.substring(0, adjustedTruncatePoint).trim();
    console.log(`[Telegram:Bot] WARNING: Caption truncated from ${caption.length} to ${mainContent.length + footerLength} characters (Telegram limit: ${maxLength}) - ended at sentence boundary`);

    // 🔴 CRITICAL: بستن همه تگ‌های باز قبل از truncate
    // این کار اطمینان می‌دهد که هیچ تگ باز قبل از لینک "مشروح خبر" باقی نماند
    mainContent = fixUnclosedHtmlTags(mainContent);

    // بررسی و اصلاح تگ‌های HTML بعد از truncate
    // ابتدا تگ‌های باز و بسته را بشمار
    const openBTags = (mainContent.match(/<b>/g) || []).length;
    const closeBTags = (mainContent.match(/<\/b>/g) || []).length;

    if (openBTags !== closeBTags) {
      console.warn(`[Telegram:Bot] WARNING: After truncation, unmatched <b> tags (${openBTags} open, ${closeBTags} close) - fixing...`);
      if (openBTags > closeBTags) {
        // بستن تگ‌های باز اضافی
        const missingCloses = openBTags - closeBTags;
        mainContent += '</b>'.repeat(missingCloses);
        console.log(`[Telegram:Bot] Added ${missingCloses} closing </b> tags after truncation`);
      } else {
        // حذف تگ‌های بسته اضافی (از انتها)
        const extraCloses = closeBTags - openBTags;
        // پیدا کردن آخرین تگ‌های </b> و حذف آنها
        for (let i = 0; i < extraCloses; i++) {
          const lastCloseTag = mainContent.lastIndexOf('</b>');
          if (lastCloseTag !== -1) {
            mainContent = mainContent.substring(0, lastCloseTag) + mainContent.substring(lastCloseTag + 4);
          }
        }
        console.log(`[Telegram:Bot] Removed ${extraCloses} extra closing </b> tags after truncation`);
      }
    }

    // 🔴 بررسی نهایی: اطمینان از اینکه همه تگ‌های <b> بسته شده‌اند قبل از اضافه کردن لینک
    // استفاده از روش دقیق‌تر: بررسی ترتیبی و بستن تگ‌های باز
    mainContent = fixUnclosedHtmlTags(mainContent);
  }

  // 🔴 CRITICAL: اطمینان از اینکه همه تگ‌های <b> بسته شده‌اند قبل از اضافه کردن لینک
  // این کار اطمینان می‌دهد که لینک "مشروح خبر" خارج از هر تگ باز قرار می‌گیرد
  mainContent = fixUnclosedHtmlTags(mainContent);

  // 🔴 بررسی نهایی: شمارش تگ‌های <b> باز و بستن آنها قبل از اضافه کردن لینک
  const finalOpenBTags = (mainContent.match(/<b>/g) || []).length;
  const finalCloseBTags = (mainContent.match(/<\/b>/g) || []).length;
  if (finalOpenBTags > finalCloseBTags) {
    const missingCloses = finalOpenBTags - finalCloseBTags;
    mainContent += '</b>'.repeat(missingCloses);
    console.log(`[Telegram:Bot] CRITICAL: Closed ${missingCloses} <b> tags before adding link`);
  }

  // 🔴 اضافه کردن لینک "مشروح خبر" و هشتگ‌ها به محتوای truncate شده
  // 🔴 ترتیب صحیح: محتوا -> لینک "مشروح خبر" -> هشتگ‌ها
  finalCaption = mainContent;
  if (fullNewsLink) {
    finalCaption += '\n\n' + fullNewsLink;
  }
  if (hashtags) {
    finalCaption += hashtags;
  }

  // 🔴 بررسی نهایی: اطمینان از اینکه همه تگ‌های HTML به درستی بسته شده‌اند
  // این کار برای جلوگیری از خطای "Unclosed end tag" در Telegram
  finalCaption = fixUnclosedHtmlTags(finalCaption);

  // 🔴 بررسی نهایی برای تگ‌های <a>: اطمینان از اینکه همه تگ‌های <a> به درستی بسته شده‌اند
  // استفاده از یک regex دقیق‌تر برای پیدا کردن تگ‌های <a> کامل
  const aTagPattern = /<a\s+[^>]*>/gi;
  const openATags = (finalCaption.match(aTagPattern) || []).length;
  const closeATags = (finalCaption.match(/<\/a>/gi) || []).length;

  if (openATags !== closeATags) {
    console.warn(`[Telegram:Bot] WARNING: Unmatched <a> tags (${openATags} open, ${closeATags} close) - fixing...`);

    // استفاده از یک روش ساده‌تر: پیدا کردن تگ‌های <a> و بستن آنها به ترتیب
    let fixedCaption = finalCaption;
    let tagStack: number[] = []; // موقعیت تگ‌های <a> باز

    for (let i = 0; i < fixedCaption.length; i++) {
      if (fixedCaption.substring(i, i + 2) === '<a') {
        // پیدا کردن انتهای تگ <a>
        const tagEnd = fixedCaption.indexOf('>', i);
        if (tagEnd !== -1) {
          // بررسی اینکه آیا تگ self-closing نیست (مثل <a/>)
          const tagContent = fixedCaption.substring(i + 1, tagEnd);
          if (!tagContent.endsWith('/')) {
            tagStack.push(i);
          }
          i = tagEnd;
        }
      } else if (fixedCaption.substring(i, i + 4) === '</a>') {
        if (tagStack.length > 0) {
          tagStack.pop();
        }
        i += 3;
      }
    }

    // بستن تگ‌های باز باقی‌مانده
    if (tagStack.length > 0) {
      // از انتها شروع کن و تگ‌های باز را ببند
      for (let j = tagStack.length - 1; j >= 0; j--) {
        const tagPos = tagStack[j];
        const tagEnd = fixedCaption.indexOf('>', tagPos);
        if (tagEnd !== -1) {
          // پیدا کردن محتوای بعد از تگ تا پایان متن یا تا تگ بعدی
          const afterTag = fixedCaption.substring(tagEnd + 1);
          const nextTagPos = afterTag.search(/<[^\/]/);
          const contentEnd = nextTagPos !== -1 ? tagEnd + 1 + nextTagPos : fixedCaption.length;

          // بررسی اینکه آیا محتوا وجود دارد
          const content = fixedCaption.substring(tagEnd + 1, contentEnd).trim();
          if (content) {
            // اگر محتوا دارد و </a> ندارد، آن را اضافه کن
            if (!content.endsWith('</a>')) {
              fixedCaption = fixedCaption.substring(0, contentEnd) + '</a>' + fixedCaption.substring(contentEnd);
            }
          } else {
            // اگر محتوا ندارد، محتوای پیش‌فرض اضافه کن
            fixedCaption = fixedCaption.substring(0, tagEnd + 1) + '📰 مشروح خبر</a>' + fixedCaption.substring(tagEnd + 1);
          }
        }
      }
      console.log(`[Telegram:Bot] Fixed ${tagStack.length} unclosed <a> tag(s)`);
      finalCaption = fixedCaption;
    }

    // اگر هنوز مشکل دارد، از روش force-fix استفاده کن
    const finalOpenATags = (finalCaption.match(aTagPattern) || []).length;
    const finalCloseATags = (finalCaption.match(/<\/a>/gi) || []).length;

    if (finalOpenATags > finalCloseATags) {
      const stillMissing = finalOpenATags - finalCloseATags;
      // اضافه کردن تگ‌های بسته در انتها
      finalCaption += '</a>'.repeat(stillMissing);
      console.log(`[Telegram:Bot] Force-closed ${stillMissing} remaining <a> tags`);
    } else if (finalCloseATags > finalOpenATags) {
      // حذف تگ‌های بسته اضافی
      const extra = finalCloseATags - finalOpenATags;
      for (let i = 0; i < extra; i++) {
        const lastCloseTag = finalCaption.lastIndexOf('</a>');
        if (lastCloseTag !== -1) {
          finalCaption = finalCaption.substring(0, lastCloseTag) + finalCaption.substring(lastCloseTag + 4);
        }
      }
      console.log(`[Telegram:Bot] Removed ${extra} extra closing </a> tag(s)`);
    }
  }

  // 🔴 CRITICAL: حذف تگ‌های ناقص که ممکن است به صورت plain text نمایش داده شوند
  // این شامل تگ‌هایی است که < ندارند (مثل "/b" که باید "</b>" باشد)
  // یا تگ‌هایی که در وسط truncate شده‌اند

  // حذف تگ‌های ناقص که < ندارند (مثل "/b" که باید "</b>" باشد)
  // این regex "/b" یا "/a" یا "/i" را که به تنهایی آمده (بدون < قبل) پیدا می‌کند
  finalCaption = finalCaption.replace(/([^<])\/(b|a|i)(?![>])/g, '$1');

  // همچنین اگر در ابتدای متن یا بعد از space/newline باشد
  finalCaption = finalCaption.replace(/^\/(b|a|i)(?![>])/g, '');
  finalCaption = finalCaption.replace(/\s+\/(b|a|i)(?![>])/g, ' ');

  // حذف تگ‌های ناقص <a> که در خط جدید هستند (تگ‌هایی که > ندارند)
  finalCaption = finalCaption.replace(/<a\s+[^>]*$/gm, '');

  // حذف تگ‌های ناقص <b> که در خط جدید هستند (مثل "<b" بدون >)
  finalCaption = finalCaption.replace(/<b[^>]*$/gm, '');

  // حذف تگ‌های ناقص </b> که در خط جدید هستند (مثل "</b" بدون >)
  finalCaption = finalCaption.replace(/<\/b[^>]*$/gm, '');

  // 🔴 CRITICAL: بررسی نهایی - اطمینان از اینکه ترتیب تگ‌ها درست است
  // Telegram به ترتیب تگ‌ها حساس است - اگر <b> باز باشد و بعد <a> بیاید، باید </a> قبل از </b> بیاید
  // یا بهتر است که تگ‌های <b> قبل از لینک بسته شوند

  // بررسی اینکه آیا تگ <b> باز بعد از آخرین تگ </a> وجود دارد (این غیرمجاز است)
  const lastATagClose = finalCaption.lastIndexOf('</a>');
  const lastBTagOpen = finalCaption.lastIndexOf('<b>');

  if (lastBTagOpen > lastATagClose && lastATagClose !== -1) {
    // تگ <b> بعد از </a> باز شده - باید بسته شود
    // پیدا کردن آخرین </b> بعد از lastATagClose
    const lastBTagClose = finalCaption.lastIndexOf('</b>');
    if (lastBTagClose < lastATagClose || lastBTagClose === -1) {
      // باید یک </b> اضافه کنیم قبل از لینک
      const beforeLink = finalCaption.substring(0, lastATagClose === -1 ? finalCaption.length : lastATagClose);
      const afterLink = finalCaption.substring(lastATagClose === -1 ? finalCaption.length : lastATagClose);
      const openBTagsBefore = (beforeLink.match(/<b>/g) || []).length;
      const closeBTagsBefore = (beforeLink.match(/<\/b>/g) || []).length;
      if (openBTagsBefore > closeBTagsBefore) {
        finalCaption = beforeLink + '</b>'.repeat(openBTagsBefore - closeBTagsBefore) + afterLink;
        console.log(`[Telegram:Bot] Fixed <b> tag order: closed ${openBTagsBefore - closeBTagsBefore} <b> tags before link`);
      }
    }
  }

  return finalCaption;
}

/**
 * اصلاح تگ‌های HTML باز شده
 * این تابع به صورت ترتیبی تگ‌های <b> را بررسی می‌کند و تگ‌های باز را می‌بندد
 */
function fixUnclosedHtmlTags(text: string): string {
  let result = text;

  // اول: حذف تگ‌های ناقص (تگ‌هایی که در وسط برش خورده‌اند)
  // پیدا کردن < که > ندارد (تگ ناقص)
  let i = 0;
  while (i < result.length) {
    const openBracket = result.indexOf('<', i);
    if (openBracket === -1) break;

    const closeBracket = result.indexOf('>', openBracket);
    if (closeBracket === -1) {
      // تگ ناقص پیدا شد - حذف کن
      result = result.substring(0, openBracket) + result.substring(openBracket + 1);
      i = openBracket;
      continue;
    }

    i = closeBracket + 1;
  }

  // 🔴 دوم: مدیریت تگ‌های <b> و <a> به صورت همزمان با استفاده از stack
  // این روش nested tags را درست handle می‌کند
  let tagStack: Array<{ type: 'b' | 'a'; position: number }> = [];
  let fixedResult = '';
  i = 0;

  while (i < result.length) {
    // بررسی تگ باز <b>
    if (result.substring(i, i + 3) === '<b>') {
      tagStack.push({ type: 'b', position: fixedResult.length });
      fixedResult += '<b>';
      i += 3;
    }
    // بررسی تگ بسته </b>
    else if (result.substring(i, i + 4) === '</b>') {
      // پیدا کردن آخرین تگ باز <b> در stack
      let found = false;
      for (let j = tagStack.length - 1; j >= 0; j--) {
        if (tagStack[j].type === 'b') {
          tagStack.splice(j, 1);
          found = true;
          break;
        }
      }
      if (found) {
        fixedResult += '</b>';
      }
      // اگر پیدا نشد، تگ بسته اضافی است - حذف کن (اضافه نکن)
      i += 4;
    }
    // بررسی تگ باز <a>
    else if (result.substring(i, i + 2) === '<a') {
      const tagEnd = result.indexOf('>', i);
      if (tagEnd !== -1) {
        const tagContent = result.substring(i, tagEnd + 1);
        // بررسی اینکه آیا self-closing نیست
        if (!tagContent.endsWith('/>')) {
          tagStack.push({ type: 'a', position: fixedResult.length });
          fixedResult += tagContent;
          i = tagEnd + 1;
        } else {
          // self-closing tag - اضافه کن اما به stack اضافه نکن
          fixedResult += tagContent;
          i = tagEnd + 1;
        }
      } else {
        // تگ ناقص - skip کن
        i++;
      }
    }
    // بررسی تگ بسته </a>
    else if (result.substring(i, i + 4) === '</a>') {
      // پیدا کردن آخرین تگ باز <a> در stack
      let found = false;
      for (let j = tagStack.length - 1; j >= 0; j--) {
        if (tagStack[j].type === 'a') {
          tagStack.splice(j, 1);
          found = true;
          break;
        }
      }
      if (found) {
        fixedResult += '</a>';
      }
      // اگر پیدا نشد، تگ بسته اضافی است - حذف کن (اضافه نکن)
      i += 4;
    }
    else {
      // کاراکتر عادی - اضافه کن
      fixedResult += result[i];
      i++;
    }
  }

  // بستن تگ‌های باز باقی‌مانده (از آخر به اول)
  while (tagStack.length > 0) {
    const lastTag = tagStack.pop()!;
    if (lastTag.type === 'b') {
      fixedResult += '</b>';
    } else if (lastTag.type === 'a') {
      fixedResult += '</a>';
    }
  }

  // بستن تگ‌های باز باقی‌مانده (از آخر به اول)
  let fixedCount = 0;
  while (tagStack.length > 0) {
    const lastTag = tagStack.pop()!;
    if (lastTag.type === 'b') {
      fixedResult += '</b>';
      fixedCount++;
    } else if (lastTag.type === 'a') {
      fixedResult += '</a>';
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    console.log(`[Telegram:Bot] Fixed ${fixedCount} unclosed tag(s) using stack-based validation`);
  }

  result = fixedResult;

  // بررسی نهایی با regex - فقط برای لاگ
  const finalOpenBTags = (result.match(/<b>/g) || []).length;
  const finalCloseBTags = (result.match(/<\/b>/g) || []).length;
  const finalOpenATags = (result.match(/<a\s+[^>]*>/gi) || []).length;
  const finalCloseATags = (result.match(/<\/a>/gi) || []).length;

  if (finalOpenBTags === finalCloseBTags && finalOpenATags === finalCloseATags) {
    console.log(`[Telegram:Bot] ✅ HTML tags validated: ${finalOpenBTags} <b> tags, ${finalOpenATags} <a> tags properly closed`);
  } else {
    // اگر هنوز مشکل دارد، یک بار دیگر با روش ساده‌تر اصلاح کن
    if (finalOpenBTags !== finalCloseBTags) {
      console.warn(`[Telegram:Bot] WARNING: Still unmatched <b> tags (${finalOpenBTags} open, ${finalCloseBTags} close) - force fixing...`);
      if (finalOpenBTags > finalCloseBTags) {
        const stillMissing = finalOpenBTags - finalCloseBTags;
        result += '</b>'.repeat(stillMissing);
        console.log(`[Telegram:Bot] Force-closed ${stillMissing} remaining <b> tags`);
      } else {
        // حذف تگ‌های بسته اضافی از انتها
        const extra = finalCloseBTags - finalOpenBTags;
        for (let j = 0; j < extra; j++) {
          const lastCloseTag = result.lastIndexOf('</b>');
          if (lastCloseTag !== -1) {
            result = result.substring(0, lastCloseTag) + result.substring(lastCloseTag + 4);
          }
        }
        console.log(`[Telegram:Bot] Removed ${extra} extra closing </b> tag(s)`);
      }
    }

    if (finalOpenATags !== finalCloseATags) {
      console.warn(`[Telegram:Bot] WARNING: Still unmatched <a> tags (${finalOpenATags} open, ${finalCloseATags} close) - force fixing...`);
      if (finalOpenATags > finalCloseATags) {
        const stillMissing = finalOpenATags - finalCloseATags;
        result += '</a>'.repeat(stillMissing);
        console.log(`[Telegram:Bot] Force-closed ${stillMissing} remaining <a> tags`);
      } else {
        // حذف تگ‌های بسته اضافی از انتها
        const extra = finalCloseATags - finalOpenATags;
        for (let j = 0; j < extra; j++) {
          const lastCloseTag = result.lastIndexOf('</a>');
          if (lastCloseTag !== -1) {
            result = result.substring(0, lastCloseTag) + result.substring(lastCloseTag + 4);
          }
        }
        console.log(`[Telegram:Bot] Removed ${extra} extra closing </a> tag(s)`);
      }
    }
  }

  // بررسی نهایی: حذف هر کاراکتر < که > ندارد (تگ‌های ناقص باقی‌مانده)
  // اما تگ‌های <a href="..."> را حفظ کن
  const incompleteTagRegex = /<[^>]*$/;
  if (incompleteTagRegex.test(result)) {
    // بررسی اینکه آیا این یک تگ <a> کامل است یا نه
    // ابتدا بررسی کن که آیا تگ <a> در انتهای متن است
    const lastATagMatch = result.match(/<a\s+href=["'][^"']*["'][^>]*>.*?<\/a>\s*$/s);
    if (!lastATagMatch) {
      // بررسی کن که آیا تگ <a> ناقص است (بدون >)
      const incompleteATag = result.match(/<a\s+href=["'][^"']*["'][^>]*$/);
      if (incompleteATag) {
        // تگ <a> ناقص است - سعی کن آن را کامل کن
        // اگر href کامل است، > را اضافه کن
        const hrefMatch = incompleteATag[0].match(/href=["']([^"']*)["']/);
        if (hrefMatch && hrefMatch[1]) {
          // href کامل است - تگ را کامل کن
          result = result.replace(/<a\s+href=["'][^"']*["'][^>]*$/, (match) => {
            return match + '>📰 مشروح خبر</a>';
          });
        } else {
          // href ناقص است - تگ ناقص را حذف کن
          result = result.replace(/<[^>]*$/, '');
        }
      } else {
        // تگ دیگری ناقص است - حذف کن
        result = result.replace(/<[^>]*$/, '');
      }
      // Clean logging - removed incomplete tag
    }
  }

  return result;
}

/**
 * تبدیل Markdown به HTML برای تلگرام
 */
/**
 * تبدیل Markdown به HTML برای تلگرام
 */
export function markdownToTelegramHTML(text: string): string {
  // 🔴 CRITICAL: تبدیل و پاکسازی Markdown برای تلگرام
  text = text.trim();

  // تبدیل **text** به <b>text</b> (Greedy match to allow inner characters like * if needed, but usually lazy is better)
  // استفاده از .+? برای مچ کردن هر چیزی (شامل * تکی) تا رسیدن به ** بعدی
  text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // حذف * از ابتدای متن (اگر باقی مانده به عنوان bullet point)
  text = text.replace(/^\*\s+/gm, '• ');

  // حذف خطوط جداکننده (━━━━━━━━━━━━━━━━)
  text = text.replace(/[━───]+/g, '');

  // حذف فاصله‌های اضافی از ابتدا و انتها
  text = text.trim();

  // تبدیل *text* به <i>text</i> (italic)
  text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<i>$1</i>');

  // تبدیل __text__ به <b>text</b>
  text = text.replace(/__([^_]+?)__/g, '<b>$1</b>');

  // تبدیل _text_ به <i>text</i> (اما فقط اگر __ نباشد)
  text = text.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<i>$1</i>');

  return text;
}

/**
 * فرمت‌بندی متن برای تلگرام (HTML)
 */
export function formatTelegramText(text: string): string {
  // اول Markdown را به HTML تبدیل کن
  text = markdownToTelegramHTML(text);

  // Escape HTML characters (اما تگ‌های HTML را حفظ کن)
  // ابتدا تگ‌های HTML معتبر (<b>, </b>, <a href="...">, </a>) را موقتاً جایگزین کن
  const htmlTags: Array<{ placeholder: string; tag: string }> = [];
  let tagIndex = 0;

  // حفظ تگ‌های <b> و </b>
  text = text.replace(/<\/?b>/g, (match) => {
    const placeholder = `__HTML_TAG_B_${tagIndex}_${Date.now()}__`;
    htmlTags.push({ placeholder, tag: match });
    tagIndex++;
    return placeholder;
  });

  // حفظ تگ‌های <a href="..."> و </a>
  text = text.replace(/<a\s+href=["'][^"']+["'][^>]*>/gi, (match) => {
    const placeholder = `__HTML_TAG_A_${tagIndex}_${Date.now()}__`;
    htmlTags.push({ placeholder, tag: match });
    tagIndex++;
    return placeholder;
  });
  text = text.replace(/<\/a>/gi, (match) => {
    const placeholder = `__HTML_TAG_A_CLOSE_${tagIndex}_${Date.now()}__`;
    htmlTags.push({ placeholder, tag: match });
    tagIndex++;
    return placeholder;
  });

  // حذف تگ‌های <a> ناقص (بدون href)
  text = text.replace(/<a\s+[^>]*>/gi, '');
  text = text.replace(/<\/a>/gi, '');

  // Escape HTML characters (اما نه & که قبلاً در تگ‌ها استفاده شده)
  // ابتدا &amp; را موقتاً جایگزین کن
  text = text.replace(/&amp;/g, '__AMP__');
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // برگرداندن &amp; اصلی
  text = text.replace(/__AMP__/g, '&amp;');

  // برگرداندن تگ‌های HTML معتبر
  htmlTags.forEach(({ placeholder, tag }) => {
    // پیدا کردن placeholder و جایگزین کردن آن با تگ اصلی
    const placeholderPattern = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    text = text.replace(placeholderPattern, tag);
  });

  return text;
}

/**
 * حذف اعداد خاص تسنیم و "یادداشت اختصاصی" از محتوا
 */
function removeTasnimSpecificContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let cleaned = content;

  // حذف اعداد خاص تسنیم (مثل 70، 61، 32) که در ابتدای سرفصل‌ها می‌آیند
  // الگو: عدد 1-3 رقمی در ابتدای خط یا بعد از فاصله
  cleaned = cleaned.replace(/^\s*\d{1,3}\s+/gm, ''); // در ابتدای خط
  cleaned = cleaned.replace(/\s+\d{1,3}\s+/g, ' '); // در وسط متن (فقط اعداد 1-3 رقمی که جدا هستند)

  // حذف "یادداشت اختصاصی"
  cleaned = cleaned.replace(/یادداشت\s+اختصاصی[،,؛:.\s]*/gi, '');

  // حذف فاصله‌های اضافی
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * حذف نام خبرگزاری‌ها و گزارشگران از محتوا (بدون حذف **bold**)
 */
function removeNewsAgencyNamesFromContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let cleaned = content;

  // حذف "تهران- ایرنا-" یا الگوهای مشابه از ابتدای متن (تبلیغ خبرگزاری)
  cleaned = cleaned.replace(/^[\s]*تهران[\s\-–—]*ایرنا[\s\-–—]+/i, '');
  cleaned = cleaned.replace(/^[\s]*تهران[\s\-–—]+/i, '');
  cleaned = cleaned.trim();

  // حذف اعداد خاص تسنیم و "یادداشت اختصاصی" (قبل از حذف نام خبرگزاری‌ها)
  cleaned = removeTasnimSpecificContent(cleaned);

  // الگوهای حذف نام خبرگزاری و گزارشگر (بدون حذف **bold**)
  const patterns = [
    // الگوهای "گزارشگر [نام خبرگزاری]"
    /گزارشگر\s+(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)[،,؛:.\s]*/gi,
    // الگوهای "[نام خبرگزاری] گزارش داد"
    /(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)\s+گزارش\s+داد[،,؛:.\s]*/gi,
    // الگوهای "به گزارش [نام خبرگزاری]"
    /به\s+گزارش\s+(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)[،,؛:.\s]*/gi,
    // الگوهای "گزارش [نام خبرگزاری]"
    /گزارش\s+(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)[،,؛:.\s]*/gi,
    // الگوهای "منبع: [نام خبرگزاری]"
    /منبع\s*[:：]\s*(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)[،,؛:.\s]*/gi,
    // الگوهای "خبرگزاری [نام] گزارش می‌دهد"
    /(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)\s+گزارش\s+می\s*[‌\s]*دهد[،,؛:.\s]*/gi,
    // الگوهای "خبرگزاری [نام] نوشت"
    /(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)\s+نوشت[،,؛:.\s]*/gi,
    // الگوهای "خبرگزاری [نام] اعلام کرد"
    /(?:خبرگزاری\s+)?(?:تسنیم|ایسنا|فارس|مهر|ایرنا|باشگاه\s+خبرنگاران|دانشجویان\s+ایران|برنا|صدا\s+و\s+سیما|خانه\s+ملت|مجلس|کار|کارگران)\s+اعلام\s+کرد[،,؛:.\s]*/gi,
  ];

  // اعمال الگوها
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // حذف فاصله‌های اضافی که ممکن است بعد از حذف ایجاد شده باشند
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * ساخت پیام خبر برای تلگرام
 */
export async function createNewsMessage(
  title: string,
  content: string,
  sourceUrl?: string,
  siteUrl?: string,
  telegramSiteUrl?: string, // آدرس وب‌سایت از تنظیمات تلگرام
  categoryName?: string // نام دسته‌بندی برای هشتگ
): Promise<string> {
  // حذف "+ویدیو"، "+ فیلم"، "+ اینفوگرافیک"، "+ جدول" از عنوان
  let cleanTitle = title
    .replace(/\s*\+\s*ویدیو\s*/gi, ' ')
    .replace(/\s*ویدیو\s*\+\s*/gi, ' ')
    .replace(/\s*\+\s*ویدئو\s*/gi, ' ')
    .replace(/\s*ویدئو\s*\+\s*/gi, ' ')
    .replace(/\s*\+\s*فیلم\s*/gi, ' ')
    .replace(/\s*فیلم\s*\+\s*/gi, ' ')
    .replace(/\s*\(\s*\+\s*فیلم\s*\)\s*/gi, ' ')
    .replace(/\s*\+\s*اینفوگرافیک\s*/gi, ' ')
    .replace(/\s*اینفوگرافیک\s*\+\s*/gi, ' ')
    .replace(/\s*\+\s*اینفو\s*/gi, ' ')
    .replace(/\s*اینفو\s*\+\s*/gi, ' ')
    .replace(/\s*\(\s*\+\s*اینفوگرافیک\s*\)\s*/gi, ' ')
    .replace(/\s*\+\s*جدول\s*/gi, ' ')
    .replace(/\s*جدول\s*\+\s*/gi, ' ')
    .replace(/\s*\(\s*\+\s*جدول\s*\)\s*/gi, ' ')
    .replace(/\s*\+\s*/g, ' ') // حذف همه "+" باقی‌مانده با فاضله
    .replace(/\s+/g, ' ')
    .trim();

  // ⚠️ کوتاه کردن عنوان‌های خیلی طولانی (بیشتر از 150 کاراکتر)
  // برای جلوگیری از برش خوردن محتوا در Telegram (محدودیت 1024 کاراکتر)
  const MAX_TITLE_LENGTH = 120;
  if (cleanTitle.length > MAX_TITLE_LENGTH) {
    const originalTitle = cleanTitle;
    // پیدا کردن آخرین "/" یا "،" قبل از MAX_TITLE_LENGTH
    const lastSlash = cleanTitle.lastIndexOf('/', MAX_TITLE_LENGTH);
    const lastComma = cleanTitle.lastIndexOf('،', MAX_TITLE_LENGTH);
    const cutPoint = Math.max(lastSlash, lastComma);

    if (cutPoint > 50) {
      // برش در نقطه مناسب
      cleanTitle = cleanTitle.substring(0, cutPoint).trim();
      console.log(`[Telegram:Bot:CreateMessage] Title truncated from ${originalTitle.length} to ${cleanTitle.length} chars`);
    } else {
      // برش ساده در MAX_TITLE_LENGTH
      cleanTitle = cleanTitle.substring(0, MAX_TITLE_LENGTH).trim() + '...';
      console.log(`[Telegram:Bot:CreateMessage] Title truncated (no good cut point) from ${originalTitle.length} to ${cleanTitle.length} chars`);
    }
  }

  // 🔴 DEBUG: Log شروع ساخت پیام
  console.log('[Telegram:Bot:CreateMessage] ========== شروع ساخت پیام ==========');
  console.log('[Telegram:Bot:CreateMessage] Title (original):', title);
  console.log('[Telegram:Bot:CreateMessage] Title (cleaned):', cleanTitle);
  console.log('[Telegram:Bot:CreateMessage] Content (original length):', content.trim().length);
  console.log('[Telegram:Bot:CreateMessage] Content (preview):', content.trim().substring(0, 200) + '...');

  // 🔴 SIMPLE: عنوان را با <b> bold می‌کنیم (escape HTML characters)
  const escapedTitle = cleanTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  console.log('[Telegram:Bot:CreateMessage] Title (escaped):', escapedTitle);

  // عنوان با bold + دو خط خالی بعد از آن
  let message = `<b>${escapedTitle}</b>\n\n`;

  console.log('[Telegram:Bot:CreateMessage] Message (after title):', message.substring(0, 100) + '...');

  // 🔴 SIMPLE: محتوای خبر را ساده پاکسازی می‌کنیم
  let cleanedContent = content.trim();

  // پاکسازی پایه
  cleanedContent = cleanedContent.replace(/https?:\/\/[^\s]+/gi, '');
  cleanedContent = cleanedContent.replace(/www\.[^\s]+/gi, '');
  cleanedContent = cleanedContent.replace(/[━───]+/g, '');
  cleanedContent = removeNewsAgencyNamesFromContent(cleanedContent);

  console.log('[Telegram:Bot:CreateMessage] Content (after basic cleanup, length):', cleanedContent.length);

  // تبدیل markdown **text** به <b>text</b> (برای bold کردن موارد مهم توسط Agent)
  const beforeMarkdownConvert = cleanedContent;
  cleanedContent = cleanedContent.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>');
  const markdownBoldCount = (cleanedContent.match(/<b>/g) || []).length;
  console.log('[Telegram:Bot:CreateMessage] Content (after markdown conversion):', markdownBoldCount, '<b> tags found');
  if (beforeMarkdownConvert !== cleanedContent) {
    console.log('[Telegram:Bot:CreateMessage] Markdown ** converted to <b> tags');
  }

  // 🔴 AUTO-BOLD: اگر Agent موارد مهم را bold نکرده، به صورت خودکار bold می‌کنیم
  if (markdownBoldCount === 0) {
    console.log('[Telegram:Bot:CreateMessage] No bold tags found - applying auto-bold to important items');

    // تعریف pattern برای اعداد فارسی و انگلیسی
    // اعداد فارسی: ۰-۹ (Unicode: \u06F0-\u06F9)
    // اعداد انگلیسی: 0-9
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const englishDigits = '0123456789';
    const allDigits = `[${persianDigits}${englishDigits}]`;

    // Bold کردن درصدها (مثل: ۱۲۱.۵ درصد، ۲۰ درصد، ۱۰۶.۶ درصد، ۴۳ درصد) - اول این را انجام می‌دهیم
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}+[.،]${allDigits}+|${allDigits}+)[\\s،]+(درصد|%)`, 'g'), '<b>$1 $2</b>');

    // Bold کردن قیمت‌های پیچیده (مثل: ۲۹۰ هزار میلیارد تومان، ۱۷۰ هزار میلیارد تومان، ۸.۸ میلیارد دلار)
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}+[.،]${allDigits}+|${allDigits}+)[\\s،]+(هزار)[\\s،]+(میلیارد|میلیون)[\\s،]+(تومان|ریال|دلار)`, 'g'), '<b>$1 $2 $3 $4</b>');
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}+[.،]${allDigits}+|${allDigits}+)[\\s،]+(میلیارد|میلیون)[\\s،]+(دلار|تومان|ریال)`, 'g'), '<b>$1 $2 $3</b>');

    // Bold کردن قیمت‌های ساده (مثل: ۱۷۵ هزار تومان، ۵۳۲ هزار تومان)
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}+)[\\s،]+(هزار)[\\s،]+(تومان|ریال|دلار)`, 'g'), '<b>$1 $2 $3</b>');

    // Bold کردن اعداد مهم با "تا" (مثل: ۲۰ تا ۳۰ میلیارد دلار)
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}+)[\\s،]+(تا|الی|و)[\\s،]+(${allDigits}+)[\\s،]+(میلیون|میلیارد|هزار)[\\s،]+(دلار|تومان|ریال)`, 'g'), '<b>$1 $2 $3 $4 $5</b>');

    // Bold کردن اعداد مهم دیگر (مثل: ۱۷۱ رأی) - فقط اعداد 3 رقمی یا بیشتر
    cleanedContent = cleanedContent.replace(new RegExp(`(${allDigits}{3,})[\\s،]+(رأی|رای|نفر)`, 'g'), '<b>$1 $2</b>');

    const autoBoldCount = (cleanedContent.match(/<b>/g) || []).length;
    console.log('[Telegram:Bot:CreateMessage] Auto-bold applied - <b> tags:', autoBoldCount);
  }

  // 🔴 SIMPLE: Escape HTML اما تگ‌های <b> و <a> را preserve کن
  // استفاده از regex ساده‌تر برای جایگزینی تگ‌ها
  const tags: Array<{ placeholder: string; tag: string }> = [];
  let idx = 0;

  // حفظ تگ‌های <b> و </b>
  const beforeBTags = (cleanedContent.match(/<b>/g) || []).length;
  const beforeBCloseTags = (cleanedContent.match(/<\/b>/g) || []).length;
  console.log('[Telegram:Bot:CreateMessage] Before escape - <b> tags:', beforeBTags, ', </b> tags:', beforeBCloseTags);

  cleanedContent = cleanedContent.replace(/<\/?b>/g, (match) => {
    const p = `__T${idx}__`;
    tags.push({ placeholder: p, tag: match });
    idx++;
    return p;
  });

  // حفظ تگ‌های <a>
  cleanedContent = cleanedContent.replace(/<a\s+href=["'][^"']+["'][^>]*>/gi, (match) => {
    const p = `__T${idx}__`;
    tags.push({ placeholder: p, tag: match });
    idx++;
    return p;
  });

  cleanedContent = cleanedContent.replace(/<\/a>/gi, (match) => {
    const p = `__T${idx}__`;
    tags.push({ placeholder: p, tag: match });
    idx++;
    return p;
  });

  console.log('[Telegram:Bot:CreateMessage] Tags preserved:', tags.length, 'tags');
  tags.forEach((tag, i) => {
    console.log(`[Telegram:Bot:CreateMessage]   Tag ${i}: placeholder="${tag.placeholder}", tag="${tag.tag}"`);
  });

  // Escape HTML characters
  cleanedContent = cleanedContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  console.log('[Telegram:Bot:CreateMessage] Content (after HTML escape, length):', cleanedContent.length);

  // برگرداندن تگ‌های HTML (از آخر به اول برای جلوگیری از جایگزینی اشتباه)
  for (let i = tags.length - 1; i >= 0; i--) {
    cleanedContent = cleanedContent.replace(tags[i].placeholder, tags[i].tag);
  }

  const afterBTags = (cleanedContent.match(/<b>/g) || []).length;
  const afterBCloseTags = (cleanedContent.match(/<\/b>/g) || []).length;
  console.log('[Telegram:Bot:CreateMessage] After restore - <b> tags:', afterBTags, ', </b> tags:', afterBCloseTags);

  // پاکسازی نهایی
  cleanedContent = cleanedContent.trim();
  cleanedContent = cleanedContent.replace(/\.\.\.+$/g, '').trim();

  // 🔴 رفع مشکلات فاصله‌گذاری:
  // 1. حذف فاصله قبل از ویرگول: "نام ، عنوان" → "نام، عنوان"
  cleanedContent = cleanedContent.replace(/\s+،/g, '،');

  // 2. اضافه کردن فاصله بعد از ویرگول اگر نباشد: "نام،عنوان" → "نام، عنوان"
  cleanedContent = cleanedContent.replace(/،([^\s\n])/g, '، $1');

  // 3. حذف فاصله‌های اضافی بعد از ویرگول: "نام،  عنوان" → "نام، عنوان"
  cleanedContent = cleanedContent.replace(/،\s{2,}/g, '، ');

  // 4. اصلاح فاصله‌گذاری اعداد فارسی (مثل "۴میلیون" → "۴ میلیون")
  cleanedContent = cleanedContent.replace(/([۰-۹0-9]+)(میلیون|میلیارد|هزار|درصد)/g, '$1 $2');

  // 🔴 بهبود خوانایی: تبدیل جمله‌ها به خط‌های جداگانه
  // اضافه کردن خط جدید بعد از نقطه، علامت سؤال و علامت تعجب (برای خوانایی بهتر)
  cleanedContent = cleanedContent.replace(/([.!?])\s+([^.!?\n])/g, '$1\n\n$2');

  // حذف خطوط خالی اضافی (بیش از 2 خط)
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');

  // پاکسازی نهایی مجدد
  cleanedContent = cleanedContent.trim();

  console.log('[Telegram:Bot:CreateMessage] Content (final, length):', cleanedContent.length);
  console.log('[Telegram:Bot:CreateMessage] Content (final preview):', cleanedContent.substring(0, 200) + '...');

  // اضافه کردن محتوا به message
  message += cleanedContent;

  console.log('[Telegram:Bot:CreateMessage] Message (after content, length):', message.length);

  // اضافه کردن لینک‌ها (بعد از همه پردازش‌ها - بدون escape)
  const finalSiteUrl = telegramSiteUrl || siteUrl;

  // همیشه فقط "مشروح خبر" را نشان بده (ساختار یکسان با خبر دستی)
  // اگر sourceUrl موجود باشد و با siteUrl متفاوت باشد، از sourceUrl استفاده کن
  // در غیر این صورت از siteUrl استفاده کن
  const linkUrl = sourceUrl && sourceUrl !== finalSiteUrl ? sourceUrl : finalSiteUrl;

  if (linkUrl) {
    // Escape کردن URL برای استفاده در HTML attribute
    const escapedLinkUrl = linkUrl
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    message += '\n\n';
    // اضافه کردن لینک با تگ کامل HTML (بدون escape کردن < و >)
    message += `<a href="${escapedLinkUrl}">📰 مشروح خبر</a>`;
  }

  // استخراج هشتگ‌های از دسته‌بندی (category-based - بدون Agent)
  let hashtags: string[] = [];
  try {
    // استفاده از هشتگ‌های دینامیک بر اساس دسته‌بندی‌های دیتابیس
    const { getHashtagsForCategoryAsync } = await import('./category-hashtags');
    const categoryHashtags = await getHashtagsForCategoryAsync(categoryName || '');

    if (categoryHashtags && categoryHashtags.length > 0) {
      hashtags = categoryHashtags;
    }
  } catch (error: any) {
    // Silent fail
  }

  // Fallback: اگر هشتگ دسته‌بندی پیدا نشد، از روش ساده استفاده کن
  if (hashtags.length === 0) {
    // استخراج موضوع از عنوان (کلمات کلیدی)
    const titleWords = title.split(/\s+/).filter(word => word.length > 3);
    if (titleWords.length > 0) {
      // استفاده از 1-2 کلمه کلیدی اول عنوان
      const topicHashtag = titleWords.slice(0, 2).join('').replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '');
      if (topicHashtag.length > 2) {
        hashtags.push(topicHashtag);
      }
    }

    // اضافه کردن دسته‌بندی
    if (categoryName) {
      const categoryHashtag = categoryName.replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '');
      if (categoryHashtag.length > 2) {
        hashtags.push(categoryHashtag);
      }
    }
  }

  // اضافه کردن هشتگ‌ها در آخر
  if (hashtags.length > 0) {
    message += '\n\n';
    message += hashtags.map(tag => `#${tag}`).join(' ');
  }

  // ⚠️ اعتبارسنجی نهایی: بررسی billing error در message نهایی
  // این چک برای اطمینان از اینکه billing error در message نهایی نیست
  const billingErrorPatterns = [
    /billing\s+error/i,
    /insufficient\s+credits/i,
    /required:\s*\$[\d.]+/i,
    /available:\s*\$[\d.]+/i,
    /billing\s+error:\s*insufficient\s+credits/i,
    /\$\d+\.\d+\s*required/i,
    /\$\d+\.\d+\s*available/i,
  ];

  const hasBillingError = billingErrorPatterns.some(pattern => pattern.test(message));
  if (hasBillingError) {
    console.error(`[Telegram:Bot] ❌ CRITICAL ERROR: Billing error detected in final message!`);
    console.error(`[Telegram:Bot]   Message preview: ${message.substring(0, 500)}...`);
    throw new Error('Billing error detected in message - cannot send to Telegram');
  }

  // 🔴 بررسی نهایی: حذف الگوهای raw "a href="..." که ممکن است در انتهای پیام باقی مانده باشند
  // این الگوها باید حذف شوند تا لینک "مشروح خبر" به درستی نمایش داده شود
  // الگو: "a href="..." که نه قبل از آن < دارد
  // اما باید مراقب باشیم که لینک "مشروح خبر" که با <a href="..."> شروع می‌شود را حذف نکنیم

  // ابتدا لینک "مشروح خبر" را موقتاً جایگزین کن (با الگوهای مختلف)
  const fullNewsLinkPatterns = [
    /📰\s*<a\s+href=["'][^"']+["'][^>]*>\s*مشروح\s*خبر\s*<\/a>/gi,
    /<a\s+href=["'][^"']+["'][^>]*>📰\s*مشروح\s*خبر\s*<\/a>/gi,
    /<a\s+href=["'][^"']+["'][^>]*>\s*📰\s*مشروح\s*خبر\s*<\/a>/gi,
    /📰\s*مشروح\s*خبر\s*\([^)]+\)/gi,
  ];
  const fullNewsLinks: string[] = [];
  let linkCounter = 0;

  fullNewsLinkPatterns.forEach(pattern => {
    message = message.replace(pattern, (match) => {
      const placeholder = `__FULL_NEWS_LINK_${linkCounter}__`;
      fullNewsLinks.push(match);
      linkCounter++;
      return placeholder;
    });
  });

  // حالا الگوهای raw "a href="..." را حذف کن (الگوهایی که بدون < شروع می‌شوند)
  // این regex الگوهایی را پیدا می‌کند که:
  // - با "a " شروع می‌شوند (بدون < قبل از آن)
  // - "href=" دارند
  // - URL در داخل "..." یا '...' دارند

  // استفاده از یک regex ساده و قوی که همه الگوهای raw را پیدا می‌کند
  // الگو: هر جا که "a href=" باشد (بدون < قبل از آن) تا " بعدی
  // این regex الگوهای زیر را پیدا و حذف می‌کند:
  // - "a href="https://..."
  // - "\na href="https://..."
  // - "text a href="https://..."
  message = message.replace(/(^|\n|\r|[^\s<])\s*\ba\s+href\s*=\s*["']([^"']+)["']/gi, '$1');

  // همچنین حذف الگوهایی که ممکن است با فاصله‌های اضافی باشند
  message = message.replace(/\s*\ba\s+href\s*=\s*["'][^"']*["']/gi, '');

  // 🔴 CRITICAL: regex های مشکل‌دار حذف شدند - چون تگ‌های HTML و newline ها را خراب می‌کردند!
  // این regex ها قبلاً `>` و newline را از انتهای خطوط حذف می‌کردند
  // که باعث می‌شد `</b>` به `</b` تبدیل شود و newline ها هم حذف شوند

  // برگرداندن لینک "مشروح خبر"
  fullNewsLinks.forEach((link, index) => {
    message = message.replace(`__FULL_NEWS_LINK_${index}__`, link);
  });

  // 🔴 DEBUG: Log نهایی قبل از return
  const finalBTags = (message.match(/<b>/g) || []).length;
  const finalBCloseTags = (message.match(/<\/b>/g) || []).length;
  const finalATags = (message.match(/<a\s+href/gi) || []).length;
  const finalACloseTags = (message.match(/<\/a>/gi) || []).length;
  const newlineCount = (message.match(/\n\n/g) || []).length;

  console.log('[Telegram:Bot:CreateMessage] ========== پیام نهایی ==========');
  console.log('[Telegram:Bot:CreateMessage] Final message length:', message.length);
  console.log('[Telegram:Bot:CreateMessage] Final <b> tags:', finalBTags);
  console.log('[Telegram:Bot:CreateMessage] Final </b> tags:', finalBCloseTags);
  console.log('[Telegram:Bot:CreateMessage] Final <a> tags:', finalATags);
  console.log('[Telegram:Bot:CreateMessage] Final </a> tags:', finalACloseTags);
  console.log('[Telegram:Bot:CreateMessage] Newline pairs (\\n\\n):', newlineCount);
  console.log('[Telegram:Bot:CreateMessage] Message preview (first 500 chars):');
  console.log(message.substring(0, 500));
  console.log('[Telegram:Bot:CreateMessage] Message preview (last 300 chars):');
  console.log(message.substring(Math.max(0, message.length - 300)));
  console.log('[Telegram:Bot:CreateMessage] ========== پایان ساخت پیام ==========\n');

  return message;
}

