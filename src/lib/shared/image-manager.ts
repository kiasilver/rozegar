/**
 * Shared Image Manager
 * مدیریت تصاویر مشترک برای Telegram و Website
 * Download یک بار، استفاده مشترک
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

export interface ImageProcessingOptions {
  enableWatermark: boolean;
  watermarkPath?: string;
  targetFolder?: string; // 'news-images', 'blog-images', etc.
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Shared Image Manager Class
 */
export class SharedImageManager {
  private static cache = new Map<string, string>();
  private static cacheTimestamps = new Map<string, number>();
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 ساعت

  /**
   * پردازش تصویر (Download + Resize + Watermark)
   * نتیجه cache می‌شود برای استفاده مشترک
   */
  static async processImage(
    imageUrl: string,
    options: ImageProcessingOptions
  ): Promise<string | null> {
    // بررسی cache
    const cacheKey = this.getCacheKey(imageUrl, options);

    if (this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey) || 0;
      const age = Date.now() - timestamp;

      if (age < this.CACHE_DURATION) {
        const cachedPath = this.cache.get(cacheKey)!;
        console.log(`[SharedImageManager] ♻️ Cache hit (${Math.floor(age / 1000)}s old): ${imageUrl.substring(0, 60)}...`);
        // اگر watermark فعال است، از cache استفاده نکن (باید watermark اعمال شود)
        if (options.enableWatermark && options.watermarkPath) {
          console.log(`[SharedImageManager] ⚠️ Watermark enabled, ignoring cache to apply watermark`);
          this.cache.delete(cacheKey);
          this.cacheTimestamps.delete(cacheKey);
        } else {
          return cachedPath;
        }
      } else {
        // Cache expired
        this.cache.delete(cacheKey);
        this.cacheTimestamps.delete(cacheKey);
      }
    }

    try {
      console.log(`[SharedImageManager] 📥 Downloading: ${imageUrl.substring(0, 80)}...`);

      // Download image با retry (5 attempts, 60s timeout per attempt = 1 دقیقه)
      const buffer = await this.downloadWithRetry(imageUrl, 5, 60000);

      if (!buffer) {
        throw new Error('Failed to download image after retries');
      }

      // ساخت نام فایل unique
      const ext = this.getImageExtension(imageUrl);
      const fileName = `unified-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const folder = options.targetFolder || 'news-images';
      const savePath = path.join(process.cwd(), 'public', 'images', folder, fileName);

      // اطمینان از وجود پوشه
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // پردازش تصویر با sharp
      let image = sharp(buffer);

      // Resize (اگر نیاز باشد)
      if (options.maxWidth || options.maxHeight) {
        image = image.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Quality
      const quality = options.quality || 85;

      if (ext === 'jpg' || ext === 'jpeg') {
        image = image.jpeg({ quality });
      } else if (ext === 'png') {
        image = image.png({ quality });
      } else if (ext === 'webp') {
        image = image.webp({ quality });
      }

      // Save image
      await image.toFile(savePath);

      console.log(`[SharedImageManager] ✅ Saved: ${savePath}`);

      // Apply watermark (اگر فعال باشد)
      if (options.enableWatermark && options.watermarkPath) {
        console.log(`[SharedImageManager] 🏷️ Applying watermark from: ${options.watermarkPath}`);
        try {
          await this.applyWatermark(savePath, options.watermarkPath);
          console.log(`[SharedImageManager] ✅ Watermark applied successfully`);
        } catch (watermarkError: any) {
          console.error(`[SharedImageManager] ❌ Failed to apply watermark:`, watermarkError.message);
          // در صورت خطا، تصویر بدون watermark ذخیره می‌شود
        }
      } else if (options.enableWatermark && !options.watermarkPath) {
        console.log(`[SharedImageManager] ⚠️ Watermark enabled but watermarkPath is missing`);
      } else {
        console.log(`[SharedImageManager] ℹ️ Watermark disabled or not configured (enableWatermark: ${options.enableWatermark}, watermarkPath: ${options.watermarkPath ? 'set' : 'not set'})`);
      }

      // ساخت web path
      const webPath = `/images/${folder}/${fileName}`;

      // ذخیره در cache
      this.cache.set(cacheKey, webPath);
      this.cacheTimestamps.set(cacheKey, Date.now());

      // پاک کردن cache قدیمی
      this.cleanupCache();

      return webPath;

    } catch (error: any) {
      console.error(`[SharedImageManager] ❌ Error processing image:`, error.message);
      return null;
    }
  }

  /**
   * Download تصویر با retry و timeout
   */
  private static async downloadWithRetry(
    url: string,
    maxRetries: number = 5,
    timeout: number = 60000 // 60 ثانیه (1 دقیقه)
  ): Promise<Buffer | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SharedImageManager] 🔄 Attempt ${attempt}/${maxRetries} - Downloading: ${url.substring(0, 60)}...`);

        // ایجاد AbortController برای timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const startTime = Date.now();

          // استفاده از Promise.race برای timeout بهتر
          const fetchPromise = fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': new URL(url).origin,
            },
            signal: controller.signal,
          });

          // Race بین fetch و timeout
          const response = await Promise.race([
            fetchPromise,
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                controller.abort();
                reject(new Error(`Timeout after ${timeout}ms`));
              }, timeout);
            })
          ]);

          clearTimeout(timeoutId);

          const fetchDuration = Date.now() - startTime;
          console.log(`[SharedImageManager] 📡 Response received in ${fetchDuration}ms (Status: ${response.status})`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`Invalid content type: ${contentType}`);
          }

          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            console.log(`[SharedImageManager] 📦 Expected size: ${contentLength} bytes`);
          }

          // خواندن داده به صورت stream برای جلوگیری از timeout در فایل‌های بزرگ
          const reader = response.body?.getReader();

          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const chunks: Uint8Array[] = [];
          let totalBytes = 0;
          const maxSize = 10 * 1024 * 1024; // 10MB limit

          console.log(`[SharedImageManager] 📥 Reading stream...`);

          // خواندن stream با timeout برای هر chunk
          while (true) {
            const readPromise = reader.read();
            const timeoutPromise = new Promise<{ done: true, value?: undefined }>((resolve) => {
              setTimeout(() => resolve({ done: true }), timeout);
            });

            const readResult = await Promise.race([readPromise, timeoutPromise]);

            if (readResult.done) break;

            if (readResult.value) {
              chunks.push(readResult.value);
              totalBytes += readResult.value.length;

              if (totalBytes > maxSize) {
                reader.cancel();
                throw new Error(`Image too large: ${totalBytes} bytes (max: ${maxSize})`);
              }
            }
          }

          // ترکیب chunks
          const arrayBuffer = new Uint8Array(totalBytes);
          let offset = 0;
          for (const chunk of chunks) {
            arrayBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length === 0) {
            throw new Error('Downloaded image is empty');
          }

          const totalDuration = Date.now() - startTime;
          console.log(`[SharedImageManager] ✅ Download successful (${buffer.length} bytes in ${totalDuration}ms)`);
          return buffer;

        } catch (fetchError: any) {
          clearTimeout(timeoutId);

          // بررسی انواع خطا
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted') || fetchError.message?.includes('terminated')) {
            throw new Error(`Request terminated/timeout after ${timeout}ms`);
          }

          // بررسی خطاهای شبکه
          if (fetchError.cause?.code === 'ECONNRESET' ||
            fetchError.cause?.code === 'ECONNREFUSED' ||
            fetchError.cause?.code === 'ETIMEDOUT' ||
            fetchError.message?.includes('network') ||
            fetchError.message?.includes('fetch failed')) {
            throw new Error(`Network error: ${fetchError.message || fetchError.cause?.code || 'Unknown'}`);
          }

          throw fetchError;
        }

      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || 'Unknown error';
        console.log(`[SharedImageManager] ⚠️ Attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
          console.log(`[SharedImageManager] ⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    console.error(`[SharedImageManager] ❌ Failed after ${maxRetries} attempts (total time: ~${Math.min(60000 * maxRetries, 180000)}ms):`, lastError?.message);
    return null;
  }

  /**
   * اضافه کردن watermark به تصویر
   */
  /**
   * اضافه کردن watermark به تصویر
   */
  private static async applyWatermark(
    imagePath: string,
    watermarkPath: string
  ): Promise<void> {
    try {
      // Dynamic import 
      const { addWatermarkToImage } = await import('@/lib/content/media/image-watermark');
      const fs = await import('fs/promises');

      // خواندن تصویر
      const imageBuffer = await fs.default.readFile(imagePath);

      console.log(`[SharedImageManager] 🔄 Applying watermark using unified logic...`);

      // استفاده از تابع استاندارد addWatermarkToImage
      // تنظیم موقعیت به top-left (درخواست کاربر)
      const watermarkedBuffer = await addWatermarkToImage(imageBuffer, 'روزمرکی', {
        logoPath: watermarkPath,
        position: 'top-left', // Default to top-left as requested
        opacity: 1.0,
      });

      // ذخیره نتیجه
      await fs.default.writeFile(imagePath, watermarkedBuffer);
      console.log(`[SharedImageManager] ✅ Watermark applied successfully (top-left)`);

    } catch (error: any) {
      console.error(`[SharedImageManager] ❌ Error applying watermark:`, error.message);
      throw error;
    }
  }

  /**
   * دریافت extension تصویر از URL
   */
  private static getImageExtension(url: string): string {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
    if (urlLower.includes('.png')) return 'png';
    if (urlLower.includes('.webp')) return 'webp';
    if (urlLower.includes('.gif')) return 'gif';

    // پیش‌فرض
    return 'jpg';
  }

  /**
   * ساخت cache key
   */
  private static getCacheKey(url: string, options: ImageProcessingOptions): string {
    const parts = [
      url,
      options.enableWatermark ? 'wm' : 'no-wm',
      options.watermarkPath || '', // اضافه کردن watermarkPath به cache key
      options.maxWidth || '',
      options.maxHeight || '',
      options.quality || '',
    ];
    return parts.join('|');
  }

  /**
   * پاک کردن cache قدیمی
   */
  private static cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SharedImageManager] 🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * پاک کردن کل cache (برای testing)
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('[SharedImageManager] 🧹 Cache cleared');
  }

  /**
   * دریافت آمار cache
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      timestamps: this.cacheTimestamps.size,
      oldestEntry: this.cacheTimestamps.size > 0
        ? Math.min(...Array.from(this.cacheTimestamps.values()))
        : null,
      newestEntry: this.cacheTimestamps.size > 0
        ? Math.max(...Array.from(this.cacheTimestamps.values()))
        : null,
    };
  }
}

