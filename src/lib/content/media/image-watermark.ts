/**
 * Image Watermark - پردازش و مدیریت watermark عکس‌ها
 * شامل: اضافه کردن watermark، حذف watermark، و توابع کمکی SEO
 */

// Dynamic import برای کاهش مصرف RAM در startup
// import sharp from 'sharp';
import { slugifyPersian } from '@/lib/utils/slugify-fa';
import { isPersian } from '@/lib/utils/ispersian';
import slugify from 'slugify';

// ==================== Helper Functions ====================

/**
 * تولید نام فایل SEO-friendly
 */
export function generateSEOFileName(title: string, extension: string = 'jpg'): string {
  const cleanTitle = title
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9\s-]/gi, '')
    .trim()
    .substring(0, 100);

  if (isPersian(cleanTitle)) {
    return `${slugifyPersian(cleanTitle)}.${extension}`;
  }

  return `${slugify(cleanTitle, { lower: true, strict: true })}.${extension}`;
}

/**
 * تولید alt text SEO-friendly
 */
export function generateSEOAltText(title: string, category?: string): string {
  const cleanTitle = title.trim().substring(0, 100);
  return category ? `${cleanTitle} - ${category}` : cleanTitle;
}

// ==================== Add Watermark ====================

/**
 * اضافه کردن watermark (لوگو) به عکس
 */
export async function addWatermarkToImage(
  imageBuffer: Buffer,
  watermarkText: string = 'روزمرکی',
  options?: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'center-left' | 'middle-left';
    opacity?: number;
    fontSize?: number;
    color?: string;
    logoPath?: string;
  }
): Promise<Buffer> {
  try {
    // Dynamic import برای کاهش مصرف RAM در startup
    const sharp = (await import('sharp')).default;

    // مسیر پیش‌فرض لوگوی watermark
    // (rss-settings module حذف شده — از مسیر پیش‌فرض استفاده می‌شود)
    const defaultLogoPath = 'public/logo/watermark.jpg';

    const {
      position = 'top-left', // تغییر پیش‌فرض به بالا سمت چپ
      opacity = 1.0, // تغییر پیش‌فرض به بدون شفافیت (کاملاً واضح)
      fontSize = 24,
      color = '#FFFFFF',
      logoPath = defaultLogoPath,
    } = options || {};

    // Clean logging - watermark processing

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // خواندن لوگو
    const fs = await import('fs/promises');
    const path = await import('path');

    // تبدیل URL به مسیر فایل سیستم
    let logoFileSystemPath = logoPath;
    if (logoPath && logoPath.startsWith('/')) {
      // اگر با / شروع شد، احتمالاً یک URL است (مثلاً /uploads/watermarks/file.jpg)
      // باید به مسیر فایل سیستم تبدیل شود (public/uploads/watermarks/file.jpg)
      if (logoPath.startsWith('/uploads/') || logoPath.startsWith('/images/')) {
        logoFileSystemPath = 'public' + logoPath;
      } else if (logoPath.startsWith('/logo/')) {
        logoFileSystemPath = 'public' + logoPath;
      } else {
        // اگر با / شروع شد اما public/ نبود، public/ اضافه کن
        logoFileSystemPath = 'public' + logoPath;
      }
    }

    const alternativePaths = [
      logoFileSystemPath, // اول از logoPath استفاده کن
      logoPath, // اگر logoFileSystemPath کار نکرد، logoPath اصلی را امتحان کن
      'public/logo/watermark.jpg',
      'public/logo/rozmaregi.png',
    ];

    let logoBuffer: Buffer | null = null;

    for (const tryPath of alternativePaths) {
      // اگر مسیر با http شروع شد، از fetch استفاده کن
      if (tryPath.startsWith('http://') || tryPath.startsWith('https://')) {
        try {
          const response = await fetch(tryPath);
          if (response.ok) {
            logoBuffer = Buffer.from(await response.arrayBuffer());
            // Clean logging - logo downloaded
            break;
          }
        } catch {
          continue;
        }
      } else {
        // مسیر فایل سیستم
        const logoFullPath = path.default.join(process.cwd(), tryPath);
        try {
          logoBuffer = await fs.default.readFile(logoFullPath);
          // Clean logging - logo loaded
          break;
        } catch {
          continue;
        }
      }
    }

    if (!logoBuffer) {
      console.error(`❌ [Watermark] لوگو پیدا نشد. مسیرهای امتحان شده:`, alternativePaths);
      return imageBuffer;
    }

    // Clean logging - logo loaded successfully

    // پردازش لوگو
    const logoMetadata = await sharp(logoBuffer).metadata();
    const logoWidth = logoMetadata.width || 200;
    const logoHeight = logoMetadata.height || 100;

    const padding = 20;

    // محاسبه عرض واترمارک براساس درصدی از عرض تصویر برای یکپارچگی ظاهری
    // حدود 18 درصد اندازه مناسبی است
    const targetPercentage = 0.18;
    let computedLogoWidth = Math.floor(width * targetPercentage);

    // اطمینان از اینکه واترمارک خیلی کوچک یا خیلی بزرگ نشود
    // حداقل عرض 120 پیکسل، حداکثر عرض 400 پیکسل
    const minLogoWidth = 120;
    const maxLogoWidth = 400;

    let targetLogoWidth = Math.max(minLogoWidth, Math.min(computedLogoWidth, maxLogoWidth));

    // در نهایت نباید از عرض تصویر اصلی (منهای حاشیه‌ها) بزرگتر باشد
    const finalLogoWidth = Math.min(targetLogoWidth, width - padding * 2);

    const scale = finalLogoWidth / logoWidth;
    const targetWidth = Math.floor(logoWidth * scale);
    const targetHeight = Math.floor(logoHeight * scale);

    const safeWidth = Math.max(1, Math.min(targetWidth, Math.floor(width * 0.9) - padding * 2));
    const safeHeight = Math.max(1, Math.min(targetHeight, Math.floor(height * 0.9) - padding * 2));

    if (safeWidth <= 0 || safeHeight <= 0) {
      console.warn(`⚠️ [Watermark] ابعاد لوگو نامعتبر است (${safeWidth}x${safeHeight}), skip می‌شود`);
      return imageBuffer;
    }

    let resizedLogo = await sharp(logoBuffer)
      .resize(safeWidth, safeHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    const resizedMetadata = await sharp(resizedLogo).metadata();
    let finalWidth = resizedMetadata.width || safeWidth;
    let finalHeight = resizedMetadata.height || safeHeight;

    if (finalWidth > width || finalHeight > height) {
      const emergencyScale = Math.min(
        (width - padding * 2) / finalWidth,
        (height - padding * 2) / finalHeight,
        1
      );
      finalWidth = Math.floor(finalWidth * emergencyScale);
      finalHeight = Math.floor(finalHeight * emergencyScale);

      resizedLogo = await sharp(resizedLogo)
        .resize(finalWidth, finalHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
    }

    if (finalWidth > width || finalHeight > height) {
      console.warn(`⚠️ [Watermark] لوگو بزرگتر از عکس است، skip می‌شود`);
      return imageBuffer;
    }

    // محاسبه موقعیت
    let left = 0;
    let top = 0;

    switch (position) {
      case 'bottom-right':
        left = Math.max(0, width - finalWidth - padding);
        top = Math.max(0, height - finalHeight - padding);
        break;
      case 'bottom-left':
        left = padding;
        top = Math.max(0, height - finalHeight - padding);
        break;
      case 'top-right':
        left = Math.max(0, width - finalWidth - padding);
        top = padding;
        break;
      case 'top-left':
        left = 0; // بدون فاصله از سمت چپ
        top = 40; // 40 پیکسل از بالا
        break;
      case 'center':
        left = Math.max(0, (width - finalWidth) / 2);
      case 'center':
        left = Math.max(0, (width - finalWidth) / 2);
        top = Math.max(0, (height - finalHeight) / 2);
        break;
      case 'center-left':
      case 'middle-left':
        left = 0; // Stick to the left edge
        top = Math.max(0, (height - finalHeight) / 2); // Vertically centered
        break;
    }

    // اعمال opacity (فقط اگر کمتر از 1 باشد)
    let logoWithAlpha = await sharp(resizedLogo)
      .ensureAlpha()
      .png()
      .toBuffer();

    if (opacity < 1) {
      const overlaySvg = Buffer.from(`<svg width="${finalWidth}" height="${finalHeight}">
        <rect width="${finalWidth}" height="${finalHeight}" fill="white" opacity="${opacity}"/>
      </svg>`);

      logoWithAlpha = await sharp(logoWithAlpha)
        .composite([{
          input: overlaySvg,
          blend: 'dest-in',
        }])
        .png()
        .toBuffer();
    }

    // اضافه کردن لوگو به عکس
    const watermarkedImage = await sharp(imageBuffer)
      .composite([{
        input: logoWithAlpha,
        top: Math.floor(top),
        left: Math.floor(left),
        blend: 'over',
      }])
      .toBuffer();

    // Clean logging - watermark added
    return watermarkedImage;
  } catch (error: any) {
    console.error('❌ خطا در اضافه کردن watermark:', error);
    return imageBuffer;
  }
}

/**
 * برش عکس از پایین بر اساس دامنه منبع
 */
export async function cropImageFromBottom(
  imageBuffer: Buffer,
  sourceUrl?: string
): Promise<Buffer> {
  try {
    // Dynamic import برای کاهش مصرف RAM در startup
    const sharp = (await import('sharp')).default;

    if (!sourceUrl) {
      return imageBuffer;
    }

    // تعیین مقدار crop بر اساس دامنه
    let cropPixels = 0;
    const urlLower = sourceUrl.toLowerCase();

    if (urlLower.includes('eghtesadnews.com')) {
      cropPixels = 100;
    } else if (urlLower.includes('tasnimnews.com')) {
      cropPixels = 75;
    } else if (urlLower.includes('mehrnews.com')) {
      cropPixels = 50;
    } else {
      // اگر دامنه مشخص نیست، crop نکن
      return imageBuffer;
    }

    if (cropPixels <= 0) {
      return imageBuffer;
    }

    // دریافت metadata عکس
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // بررسی اینکه ارتفاع عکس بیشتر از cropPixels باشد
    if (height <= cropPixels) {
      // Clean logging - crop skipped
      return imageBuffer;
    }

    // برش از پایین: extract از بالا تا (height - cropPixels)
    const newHeight = height - cropPixels;

    // Clean logging - cropping image

    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: width,
        height: newHeight,
      })
      .toBuffer();

    // Clean logging - crop completed
    return croppedBuffer;
  } catch (error: any) {
    console.error(`❌ [Crop] خطا در برش عکس: ${error?.message || error}`);
    // در صورت خطا، عکس اصلی را برگردان
    return imageBuffer;
  }
}

/**
 * اضافه کردن تیتر خبر به پایین عکس
 */
export async function addTitleToImage(
  imageBuffer: Buffer,
  title: string,
  options?: {
    titleColor?: string; // رنگ تیتر (default: قرمز #FF0000)
    backgroundColor?: string; // رنگ پس‌زمینه (default: شفاف با سایه)
    fontSize?: number;
    padding?: number;
    position?: 'bottom' | 'top';
  }
): Promise<Buffer> {
  try {
    // Dynamic import برای کاهش مصرف RAM در startup
    const sharp = (await import('sharp')).default;

    const {
      titleColor = '#FFFFFF', // سفید پیش‌فرض
      backgroundColor = '#bc0c00', // قرمز تیره پیش‌فرض
      fontSize = 36,
      padding = 30,
      position = 'bottom',
    } = options || {};

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // محدود کردن طول تیتر برای جلوگیری از overflow
    const maxTitleLength = Math.floor(width / (fontSize * 0.6));
    const truncatedTitle = title.length > maxTitleLength
      ? title.substring(0, maxTitleLength - 3) + '...'
      : title;

    // محاسبه اندازه متن (با در نظر گیری چند خطی بودن)
    const lines = Math.ceil(truncatedTitle.length / maxTitleLength) || 1;
    const lineHeight = fontSize * 1.2;
    // تبدیل به عدد صحیح برای sharp (extend نیاز به integer دارد)
    const textHeight = Math.ceil(Math.max(fontSize + padding * 2, lines * lineHeight + padding * 2));
    const textWidth = width; // full width

    // Escape کردن کاراکترهای خاص برای SVG (به ترتیب - اول & باید escape شود)
    let escapedTitle = truncatedTitle;
    // حذف کاراکترهای کنترل و کاراکترهای غیرمجاز در XML (قبل از escape)
    escapedTitle = escapedTitle.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // اول همه & را escape کن (قبل از escape کردن کاراکترهای دیگر)
    escapedTitle = escapedTitle.replace(/&/g, '&amp;');
    // سپس کاراکترهای دیگر را escape کن
    escapedTitle = escapedTitle.replace(/</g, '&lt;');
    escapedTitle = escapedTitle.replace(/>/g, '&gt;');
    escapedTitle = escapedTitle.replace(/"/g, '&quot;');
    escapedTitle = escapedTitle.replace(/'/g, '&apos;');

    // ساخت SVG برای متن با پس‌زمینه (استفاده از CDATA برای اطمینان از صحت XML)
    const svgText = Buffer.from(`<svg width="${textWidth}" height="${textHeight}" xmlns="http://www.w3.org/2000/svg">
<defs>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@700&amp;display=swap');
</style>
</defs>
<rect width="${textWidth}" height="${textHeight}" fill="${backgroundColor}"/>
<text x="${textWidth / 2}" y="${textHeight / 2}" font-family="'Noto Sans Arabic', 'Arial', 'Tahoma', 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="bold" fill="${titleColor}" text-anchor="middle" dominant-baseline="middle" direction="rtl"><![CDATA[${truncatedTitle}]]></text>
</svg>`);

    // اضافه کردن متن به عکس
    let finalImage: Buffer;

    if (position === 'bottom') {
      // اضافه کردن متن در پایین
      finalImage = await sharp(imageBuffer)
        .extend({
          top: 0,
          bottom: textHeight,
          left: 0,
          right: 0,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .composite([{
          input: svgText,
          top: height,
          left: 0,
          blend: 'over',
        }])
        .toBuffer();
    } else {
      // اضافه کردن متن در بالا
      finalImage = await sharp(imageBuffer)
        .extend({
          top: textHeight,
          bottom: 0,
          left: 0,
          right: 0,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .composite([{
          input: svgText,
          top: 0,
          left: 0,
          blend: 'over',
        }])
        .toBuffer();
    }

    console.log(`✅ [Title] تیتر با موفقیت اضافه شد (رنگ: ${titleColor}, طول: ${truncatedTitle.length} کاراکتر)`);
    return finalImage;
  } catch (error: any) {
    console.error('❌ خطا در اضافه کردن تیتر:', error);
    return imageBuffer;
  }
}

/**
 * اضافه کردن کادر قرمز با خلاصه حرفه‌ای خبر (با Agent)
 * استفاده از node-canvas برای render کردن متن با فونت (بدون SVG)
 */
export async function addSummaryBoxToImage(
  imageBuffer: Buffer,
  title: string,
  content: string,
  options?: {
    summaryColor?: string; // رنگ متن خلاصه (default: سفید)
    boxColor?: string; // رنگ کادر (default: قرمز تیره)
    fontSize?: number;
    padding?: number;
    maxLength?: number; // حداکثر طول خلاصه
  }
): Promise<Buffer> {
  try {
    // Dynamic import برای کاهش مصرف RAM در startup
    const sharp = (await import('sharp')).default;

    const {
      summaryColor = '#FFFFFF', // سفید پیش‌فرض
      boxColor = '#bc0c00', // قرمز تیره پیش‌فرض
      fontSize = 28,
      padding = 25,
      maxLength = 200, // حداکثر 200 کاراکتر برای خلاصه
    } = options || {};

    // تولید خلاصه حرفه‌ای با Agent
    let summary: string;
    try {
      const { summarizeNewsForTelegram } = await import('@/lib/automation/telegram/telegram-agent');
      const summarized = await summarizeNewsForTelegram(content, title, maxLength);
      if (!summarized || summarized.trim().length < 30) {
        // اگر Agent کار نکرد، از title استفاده کن
        summary = title.substring(0, maxLength);
      } else {
        summary = summarized.trim();
        // حذف کاراکترهای مشکل‌ساز (مثل "ee" که در واقع "05" است - مشکل encoding)
        // این کاراکترها معمولاً از تبدیل نادرست encoding می‌آیند
        summary = summary.replace(/éé/g, '05'); // تبدیل "éé" به "05" (سال)
        summary = summary.replace(/ee/g, '05'); // تبدیل "ee" به "05" (سال) - برای حالت‌های مختلف
        summary = summary.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\.,;:!?\-\(\)\[\]\/]/g, ''); // حذف کاراکترهای غیرمجاز
      }
    } catch (error: any) {
      console.warn(`⚠️ [Summary Box] خطا در تولید خلاصه با Agent: ${error.message}، استفاده از title`);
      summary = title.substring(0, maxLength);
      // حذف کاراکترهای مشکل‌ساز از title هم
      summary = summary.replace(/éé/g, '05'); // تبدیل "éé" به "05" (سال)
      summary = summary.replace(/ee/g, '05'); // تبدیل "ee" به "05" (سال)
    }

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // محدود کردن طول خلاصه
    const maxSummaryLength = Math.floor(width / (fontSize * 0.5));
    const truncatedSummary = summary.length > maxSummaryLength
      ? summary.substring(0, maxSummaryLength - 3) + '...'
      : summary;

    // محاسبه اندازه کادر (چند خطی)
    const lines = Math.ceil(truncatedSummary.length / maxSummaryLength) || 1;
    const lineHeight = fontSize * 1.3;
    // تبدیل به عدد صحیح برای sharp (extend نیاز به integer دارد)
    const boxHeight = Math.ceil(Math.max(fontSize + padding * 2, lines * lineHeight + padding * 2));
    const boxWidth = width; // full width

    // استفاده از node-canvas برای render کردن متن با فونت (بدون SVG)
    // تست 3 فونت مختلف: INaznnBd.ttf, IRANYekanX-Regular.woff, IRANYekanX-Bold.woff
    let textBoxBuffer: Buffer | null = null;
    let usedFont = 'none';

    try {
      // سعی کن node-canvas را import کن
      const { createCanvas, registerFont } = await import('canvas');
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      let fontkit: any = null;

      try {
        // @ts-ignore - fontkit ممکن است types نداشته باشد
        fontkit = await import('fontkit');
      } catch (e) {
        console.warn(`⚠️ [Summary Box] fontkit در دسترس نیست، استفاده از نام پیش‌فرض فونت`);
      }

      // لیست فونت‌ها برای تست (به ترتیب اولویت)
      // node-canvas از TTF و WOFF پشتیبانی می‌کند (نه WOFF2)
      // برای inter.woff2 از SVG استفاده می‌کنیم (اولویت اول)
      const fontsToTry = [
        { path: pathModule.default.join(process.cwd(), 'public', 'fonts', 'Iran', 'inter.woff2'), defaultName: 'Inter', weight: 'normal', format: 'woff2', useSVG: true }, // اولویت اول: inter.woff2 با SVG
        { path: pathModule.default.join(process.cwd(), 'public', 'fonts', 'Iran', 'INaznnBd.ttf'), defaultName: 'INaznnBd', weight: 'bold', format: 'ttf' },
        { path: pathModule.default.join(process.cwd(), 'public', 'fonts', 'IranYekan', 'IRANYekanX-Regular.woff'), defaultName: 'IRANYekanX', weight: 'normal', format: 'woff' },
        { path: pathModule.default.join(process.cwd(), 'public', 'fonts', 'IranYekan', 'IRANYekanX-Bold.woff'), defaultName: 'IRANYekanX', weight: 'bold', format: 'woff' },
      ];

      // ابتدا همه فونت‌ها را register کن (قبل از ایجاد Canvas)
      // برای WOFF2 از SVG استفاده می‌کنیم، برای TTF/WOFF از node-canvas
      const registeredFonts: Array<{ path: string; name: string; weight: string; format: string; useSVG?: boolean }> = [];

      for (const font of fontsToTry) {
        try {
          // بررسی وجود فایل
          await fs.default.access(font.path);

          // اگر WOFF2 است و useSVG فعال است، از SVG استفاده می‌کنیم (بعداً)
          if (font.format === 'woff2' && font.useSVG) {
            registeredFonts.push({
              path: font.path,
              name: font.defaultName,
              weight: font.weight,
              format: font.format,
              useSVG: true
            });
            console.log(`✅ [Summary Box] فونت ${font.defaultName} (${font.format}) برای SVG آماده شد: ${font.path}`);
            continue; // از register کردن در node-canvas رد می‌شویم
          }

          // Register فونت (node-canvas از TTF و WOFF پشتیبانی می‌کند)
          if (font.format === 'woff2') {
            console.warn(`⚠️ [Summary Box] node-canvas از WOFF2 پشتیبانی نمی‌کند، رد شدن از ${font.defaultName}`);
            continue;
          }

          // سعی کن نام واقعی فونت را از فایل بگیر
          let fontFamilyName = font.defaultName;
          if (fontkit && (font.format === 'ttf' || font.format === 'otf')) {
            try {
              const fontFile = fontkit.openSync(font.path);
              fontFamilyName = fontFile.familyName || font.defaultName;
              console.log(`📝 [Summary Box] نام واقعی فونت از فایل: ${fontFamilyName} (فایل: ${font.defaultName})`);
            } catch (e: any) {
              console.warn(`⚠️ [Summary Box] خطا در خواندن نام فونت از فایل: ${e.message}`);
            }
          }

          // Register فونت با نام واقعی
          registerFont(font.path, { family: fontFamilyName });
          registeredFonts.push({ path: font.path, name: fontFamilyName, weight: font.weight, format: font.format });
          console.log(`✅ [Summary Box] فونت ${fontFamilyName} (${font.format}) register شد: ${font.path}`);
        } catch (fontError: any) {
          console.warn(`⚠️ [Summary Box] خطا در register کردن فونت ${font.defaultName}: ${fontError.message}`);
        }
      }

      // حالا سعی کن از هر فونت register شده استفاده کن
      for (const font of registeredFonts) {
        try {
          // اگر useSVG فعال است، از SVG استفاده کن (برای WOFF2)
          if (font.useSVG) {
            console.log(`   🎨 [Summary Box] استفاده از SVG برای فونت ${font.name} (${font.format})`);

            // خواندن فونت و تبدیل به base64
            const fontBuffer = await fs.default.readFile(font.path);
            const fontBase64 = fontBuffer.toString('base64');

            // Escape کردن متن برای SVG
            let escapedSummary = truncatedSummary;
            escapedSummary = escapedSummary.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            escapedSummary = escapedSummary.replace(/&/g, '&amp;');
            escapedSummary = escapedSummary.replace(/</g, '&lt;');
            escapedSummary = escapedSummary.replace(/>/g, '&gt;');
            escapedSummary = escapedSummary.replace(/"/g, '&quot;');
            escapedSummary = escapedSummary.replace(/'/g, '&apos;');

            // ساخت SVG با فونت embed شده
            const svgBox = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
<style type="text/css"><![CDATA[
@font-face {
  font-family: '${font.name}';
  src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
  font-weight: ${font.weight === 'bold' ? 'bold' : 'normal'};
  font-style: normal;
  font-display: swap;
}
]]></style>
</defs>
<rect width="${boxWidth}" height="${boxHeight}" fill="${boxColor}"/>
<text x="${boxWidth / 2}" y="${boxHeight / 2}" font-family="'${font.name}', 'Arial', 'Tahoma', sans-serif" font-size="${fontSize}" font-weight="${font.weight === 'bold' ? 'bold' : 'normal'}" fill="${summaryColor}" text-anchor="middle" dominant-baseline="middle" direction="rtl" xml:space="preserve"><![CDATA[${truncatedSummary}]]></text>
</svg>`, 'utf8');

            textBoxBuffer = svgBox;
            usedFont = `${font.name} (${font.format}, SVG)`;
            console.log(`✅ [Summary Box] کادر با فونت ${font.name} render شد (روش: SVG)`);
            break; // اگر موفق شد، دیگر فونت‌ها را تست نکن
          }

          // ساخت canvas برای کادر قرمز (بعد از register کردن فونت)
          const canvas = createCanvas(boxWidth, boxHeight);
          const ctx = canvas.getContext('2d');

          // رسم کادر قرمز
          ctx.fillStyle = boxColor;
          ctx.fillRect(0, 0, boxWidth, boxHeight);

          // تنظیم فونت و رنگ متن
          const fontStyle = font.weight === 'bold' ? 'bold ' : '';
          const fontString = `${fontStyle}${fontSize}px "${font.name}"`;
          ctx.font = fontString;
          ctx.fillStyle = summaryColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // تست کردن فونت با یک متن ساده
          const testText = 'تست';
          ctx.fillText(testText, boxWidth / 2, boxHeight / 2);

          // بررسی اینکه آیا فونت کار می‌کند (با اندازه‌گیری متن)
          const testMetrics = ctx.measureText(testText);
          if (testMetrics.width === 0) {
            console.warn(`⚠️ [Summary Box] فونت ${font.name} کار نمی‌کند (width = 0)`);
            continue;
          }

          // پاک کردن canvas برای رسم مجدد
          ctx.clearRect(0, 0, boxWidth, boxHeight);
          ctx.fillStyle = boxColor;
          ctx.fillRect(0, 0, boxWidth, boxHeight);
          ctx.font = fontString;
          ctx.fillStyle = summaryColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // تقسیم متن به خطوط (برای چند خطی) - با در نظر گیری RTL
          // برای RTL، باید کلمات را از راست به چپ مرتب کنیم
          const words = truncatedSummary.split(' ').reverse(); // معکوس کردن برای RTL
          const lines: string[] = [];
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? `${word} ${currentLine}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > boxWidth - padding * 2 && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }

          // معکوس کردن خطوط برای نمایش صحیح RTL
          lines.reverse();

          // رسم متن در وسط کادر
          const totalHeight = lines.length * fontSize * 1.3;
          const startY = (boxHeight - totalHeight) / 2 + fontSize;

          lines.forEach((line, index) => {
            const y = startY + index * fontSize * 1.3;
            ctx.fillText(line, boxWidth / 2, y);
          });

          // تبدیل canvas به buffer
          textBoxBuffer = canvas.toBuffer('image/png');
          usedFont = `${font.name} (${font.format})`;
          console.log(`✅ [Summary Box] کادر قرمز با فونت ${font.name} render شد (${lines.length} خط, روش: node-canvas)`);
          break; // اگر موفق شد، دیگر فونت‌ها را تست نکن
        } catch (fontError: any) {
          console.warn(`⚠️ [Summary Box] خطا در استفاده از فونت ${font.name}: ${fontError.message}`);
          console.warn(`   Stack: ${fontError.stack}`);
          continue; // سعی کن فونت بعدی را استفاده کن
        }
      }

      if (!textBoxBuffer) {
        throw new Error('هیچ فونتی کار نکرد');
      }
    } catch (canvasError: any) {
      // اگر node-canvas نصب نشده یا کار نکرد، از SVG با فونت embed شده استفاده کن (fallback)
      console.warn(`⚠️ [Summary Box] node-canvas در دسترس نیست یا خطا داد: ${canvasError.message}`);
      console.warn(`   استفاده از روش SVG با فونت embed شده (fallback)...`);

      // سعی کن فونت را بخوان و در SVG embed کن
      let fontBase64 = '';
      let fontFormat = 'truetype';
      let fontFamilyName = 'INaznnBd';

      try {
        const fs = await import('fs/promises');
        const pathModule = await import('path');

        // اول سعی کن INaznnBd.ttf را بخوان
        let fontPath = pathModule.default.join(process.cwd(), 'public', 'fonts', 'Iran', 'INaznnBd.ttf');
        try {
          const fontBuffer = await fs.default.readFile(fontPath);
          fontBase64 = fontBuffer.toString('base64');
          fontFormat = 'truetype';
          fontFamilyName = 'INaznnBd';
          console.log(`✅ [Summary Box] فونت ایران (INaznnBd.ttf) برای SVG خوانده شد`);
        } catch (ttfError: any) {
          // اگر TTF پیدا نشد، سعی کن IRANYekanX-Regular.woff را بخوان
          console.warn(`⚠️ [Summary Box] فونت INaznnBd.ttf پیدا نشد، استفاده از IRANYekanX-Regular.woff...`);
          try {
            fontPath = pathModule.default.join(process.cwd(), 'public', 'fonts', 'IranYekan', 'IRANYekanX-Regular.woff');
            const fontBuffer = await fs.default.readFile(fontPath);
            fontBase64 = fontBuffer.toString('base64');
            fontFormat = 'woff';
            fontFamilyName = 'IRANYekanX';
            console.log(`✅ [Summary Box] فونت ایران (IRANYekanX-Regular.woff) برای SVG خوانده شد`);
          } catch (woffError: any) {
            console.warn(`⚠️ [Summary Box] هیچ فونتی پیدا نشد، استفاده از فونت پیش‌فرض`);
          }
        }
      } catch (fontError: any) {
        console.warn(`⚠️ [Summary Box] خطا در خواندن فونت برای SVG: ${fontError.message}`);
      }

      // Escape کردن متن برای SVG
      let escapedSummary = truncatedSummary;
      escapedSummary = escapedSummary.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      escapedSummary = escapedSummary.replace(/&/g, '&amp;');
      escapedSummary = escapedSummary.replace(/</g, '&lt;');
      escapedSummary = escapedSummary.replace(/>/g, '&gt;');
      escapedSummary = escapedSummary.replace(/"/g, '&quot;');
      escapedSummary = escapedSummary.replace(/'/g, '&apos;');

      // ساخت SVG با فونت embed شده
      const fontFace = fontBase64
        ? `<defs>
            <style type="text/css"><![CDATA[
              @font-face {
                font-family: '${fontFamilyName}';
                src: url('data:font/${fontFormat === 'truetype' ? 'truetype' : fontFormat};base64,${fontBase64}') format('${fontFormat === 'truetype' ? 'truetype' : fontFormat}');
                font-weight: ${fontFamilyName === 'INaznnBd' ? 'bold' : 'normal'};
                font-style: normal;
                font-display: swap;
              }
            ]]></style>
          </defs>`
        : `<defs>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@600&amp;display=swap');
            </style>
          </defs>`;

      const fontFamily = fontBase64 ? `'${fontFamilyName}', 'Arial', 'Tahoma', sans-serif` : "'Noto Sans Arabic', 'Arial', 'Tahoma', sans-serif";
      const fontWeight = fontBase64 && fontFamilyName === 'INaznnBd' ? 'bold' : (fontBase64 ? 'normal' : '600');

      const svgBox = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
${fontFace}
<rect width="${boxWidth}" height="${boxHeight}" fill="${boxColor}"/>
<text x="${boxWidth / 2}" y="${boxHeight / 2}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${summaryColor}" text-anchor="middle" dominant-baseline="middle" direction="rtl" xml:space="preserve"><![CDATA[${truncatedSummary}]]></text>
</svg>`, 'utf8');

      textBoxBuffer = svgBox;
      usedFont = fontBase64 ? `${fontFamilyName} (SVG fallback)` : 'Noto Sans Arabic (SVG fallback)';
    }

    // اضافه کردن کادر در پایین عکس (full width)
    if (!textBoxBuffer) {
      throw new Error('نمی‌توان کادر متن را render کرد');
    }

    const finalImage = await sharp(imageBuffer)
      .extend({
        top: 0,
        bottom: boxHeight, // باید integer باشد
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .composite([{
        input: textBoxBuffer,
        top: height, // موقعیت کادر در پایین عکس
        left: 0, // full width - از چپ شروع می‌شود
        blend: 'over',
      }])
      .toBuffer();

    console.log(`✅ [Summary Box] کادر قرمز با خلاصه اضافه شد (فونت: ${usedFont}, طول: ${truncatedSummary.length} کاراکتر, عرض: ${boxWidth}px, ارتفاع: ${boxHeight}px)`);
    return finalImage;
  } catch (error: any) {
    console.error('❌ خطا در اضافه کردن کادر خلاصه:', error);
    throw error; // خطا را throw کن تا در news-processor catch شود و خبر ارسال نشود
  }
}

/**
 * اضافه کردن watermark و تیتر به عکس (تابع ترکیبی)
 */
export async function addWatermarkAndTitleToImage(
  imageBuffer: Buffer,
  title: string,
  options?: {
    watermarkPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    watermarkOpacity?: number;
    watermarkLogoPath?: string;
    titleColor?: string;
    titleBackgroundColor?: string;
    titleFontSize?: number;
    titlePadding?: number;
  }
): Promise<Buffer> {
  try {
    // اول watermark اضافه کن
    let processedImage = await addWatermarkToImage(imageBuffer, 'روزمرکی', {
      position: options?.watermarkPosition || 'top-left',
      opacity: options?.watermarkOpacity ?? 1.0,
      logoPath: options?.watermarkLogoPath,
    });

    // تیتر غیرفعال شده - فقط watermark اضافه می‌شود
    // (کاربر نمی‌خواهد عنوان در پایین عکس باشد)
    // processedImage = await addTitleToImage(processedImage, title, {
    //   titleColor: options?.titleColor || '#FFFFFF', // سفید پیش‌فرض
    //   backgroundColor: options?.titleBackgroundColor || '#bc0c00', // قرمز تیره پیش‌فرض
    //   fontSize: options?.titleFontSize || 32,
    //   padding: options?.titlePadding || 20,
    //   position: 'bottom',
    // });

    // Clean logging - watermark added
    return processedImage;
  } catch (error: any) {
    console.error('❌ خطا در اضافه کردن watermark و تیتر:', error);
    return imageBuffer;
  }
}

/**
 * اضافه کردن watermark، تیتر و کادر خلاصه به عکس (تابع کامل)
 */
export async function addWatermarkTitleAndSummaryToImage(
  imageBuffer: Buffer,
  title: string,
  content: string,
  options?: {
    watermarkPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    watermarkOpacity?: number;
    watermarkLogoPath?: string;
    titleColor?: string;
    titleBackgroundColor?: string;
    titleFontSize?: number;
    titlePadding?: number;
    summaryColor?: string;
    summaryBoxColor?: string;
    summaryFontSize?: number;
    summaryPadding?: number;
    summaryMaxLength?: number;
  }
): Promise<Buffer> {
  try {
    // اول watermark اضافه کن
    let processedImage = await addWatermarkToImage(imageBuffer, 'روزمرکی', {
      position: options?.watermarkPosition || 'top-left',
      opacity: options?.watermarkOpacity ?? 1.0,
      logoPath: options?.watermarkLogoPath,
    });

    // تیتر و کادر خلاصه غیرفعال شده‌اند - فقط watermark اضافه می‌شود
    // (کاربر نمی‌خواهد کادر قرمز و عنوان در پایین عکس باشد)
    // processedImage = await addTitleToImage(processedImage, title, {
    //   titleColor: options?.titleColor || '#FFFFFF',
    //   backgroundColor: options?.titleBackgroundColor || '#bc0c00',
    //   fontSize: options?.titleFontSize || 32,
    //   padding: options?.titlePadding || 20,
    //   position: 'bottom',
    // });

    // processedImage = await addSummaryBoxToImage(processedImage, title, content, {
    //   summaryColor: options?.summaryColor || '#FFFFFF',
    //   boxColor: options?.summaryBoxColor || '#bc0c00',
    //   fontSize: options?.summaryFontSize || 28,
    //   padding: options?.summaryPadding || 25,
    //   maxLength: options?.summaryMaxLength || 200,
    // });

    // Clean logging - watermark added
    return processedImage;
  } catch (error: any) {
    console.error('❌ خطا در اضافه کردن watermark، تیتر و خلاصه:', error);
    throw error; // خطا را throw کن تا در news-processor catch شود
  }
}

// ==================== Remove Watermark ====================

/**
 * حذف watermark از عکس با استفاده از PixelBin API
 */
export async function removeWatermarkWithAgent(
  imageBuffer: Buffer,
  apiKey?: string
): Promise<Buffer> {
  try {
    console.log('🤖 [PixelBin] شروع حذف watermark...');

    const PIXELBIN_API_KEYS = [
      '871c6905-f2f1-4ef0-ba56-35540540c350',
      '482df21c-3692-4f82-9781-54883bdaee2e'
    ];

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://www.pixelbin.io/api/plugin?plugin=wm_remove&isolateFlow=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELBIN_API_KEYS[0]}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn(`⚠️ [PixelBin] خطا در حذف watermark: ${response.status}`);
      return await removeWatermarkWithInpainting(imageBuffer);
    }

    const data = await response.json();

    if (data.image || data.result || data.url) {
      if (data.url) {
        const imageResponse = await fetch(data.url);
        if (imageResponse.ok) {
          return Buffer.from(await imageResponse.arrayBuffer());
        }
      }

      if (data.image || data.result) {
        const base64Data = (data.image || data.result).replace(/^data:image\/\w+;base64,/, '');
        const resultBuffer = Buffer.from(base64Data, 'base64');
        console.log('✅ [PixelBin] Watermark با موفقیت حذف شد');
        return resultBuffer;
      }
    }

    return await removeWatermarkWithInpainting(imageBuffer);
  } catch (error) {
    console.error('❌ [PixelBin] خطا در حذف watermark:', error);
    return await removeWatermarkWithInpainting(imageBuffer);
  }
}

/**
 * حذف watermark با استفاده از inpainting (روش جایگزین)
 */
async function removeWatermarkWithInpainting(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Dynamic import برای کاهش مصرف RAM در startup
    const sharp = (await import('sharp')).default;

    console.log('🎨 [Inpainting] استفاده از روش inpainting...');

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;
    const padding = Math.min(width, height) * 0.1;

    const processedImage = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: width,
        height: height,
      })
      .blur(2)
      .composite([{
        input: await sharp(imageBuffer)
          .extract({
            left: Math.floor(padding),
            top: Math.floor(padding),
            width: Math.floor(width - padding * 2),
            height: Math.floor(height - padding * 2),
          })
          .toBuffer(),
        left: Math.floor(padding),
        top: Math.floor(padding),
      }])
      .toBuffer();

    console.log('✅ [Inpainting] Watermark حذف شد');
    return processedImage;
  } catch (error) {
    console.error('❌ [Inpainting] خطا در حذف watermark:', error);
    return imageBuffer;
  }
}
