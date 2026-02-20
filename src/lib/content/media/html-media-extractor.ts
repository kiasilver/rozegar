/**
 * استخراج ویدیو و اینفوگرافیک از صفحه HTML (برای سایت‌هایی که RSS ندارند)
 * مثل donya-e-eqtesad.com
 */

import { RSSItem } from '../../shared/unified-content-extractor';

/**
 * دریافت HTML از URL
 */
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * استخراج لینک‌های ویدیو و اینفوگرافیک از صفحه HTML
 */
function extractMediaLinks(html: string, baseUrl: string): Array<{
  type: 'video' | 'infographic';
  link: string;
  image: string;
  title: string;
}> {
  const items: Array<{ type: 'video' | 'infographic'; link: string; image: string; title: string }> = [];

  console.log(`🔍 [HTML Extract] شروع استخراج از ${baseUrl}...`);
  console.log(`📏 [HTML Extract] طول HTML: ${html.length} کاراکتر`);

  // بررسی اینکه آیا این donya-e-eqtesad.com است یا eghtesadonline.com
  const isDonyaEqtesad = baseUrl.includes('donya-e-eqtesad.com');
  const isEghtesadOnline = baseUrl.includes('eghtesadonline.com');

  // استخراج از تب "ویدیو" - جستجوی مستقیم لینک‌های با "فیلم" یا "ویدیو"
  // برای donya-e-eqtesad.com: ساختار متفاوت است - باید از بخش "چند رسانه‌ای" > "ویدئو" استخراج کنم
  // برای eghtesadonline.com: ساختار مشابه اسکریپت قبلی

  const videoLinks = new Set<string>();
  let match: RegExpExecArray | null;

  if (isDonyaEqtesad) {
    // برای donya-e-eqtesad.com: استفاده از روش مشابه eghtesadonline
    // جستجوی مستقیم لینک‌های خبر در بخش "ویدئو" با regex ساده
    // ابتدا بخش "ویدئو" را پیدا کن
    const videoSectionMatch = html.match(/ویدئو[\s\S]*?چند رسانه/gi) ||
      html.match(/ویدئو[\s\S]{0,10000}/gi);
    const searchHtml = videoSectionMatch ? videoSectionMatch[0] : html;

    console.log(`🔍 [HTML Extract] بخش ویدئو پیدا شد: ${videoSectionMatch ? 'بله' : 'خیر'}`);
    console.log(`📏 [HTML Extract] طول بخش ویدئو: ${searchHtml.length} کاراکتر`);

    // استفاده از regex ساده برای پیدا کردن لینک‌های خبر
    // برای donya-e-eqtesad.com: ساختار URL ممکن است متفاوت باشد
    // روش: ابتدا همه لینک‌های href را پیدا کن، سپس فیلتر کن
    const videoLinkPatterns = [
      // الگوی 1: همه لینک‌های href در بخش ویدئو
      /href=["']([^"']*donya-e-eqtesad\.com[^"']*)[\"']/gi,
      // الگوی 2: لینک‌های نسبی که ممکن است خبر باشند
      /href=["']([^"']*\/[^"']*)[\"']/gi,
    ];

    const foundLinks = new Set<string>();

    for (const pattern of videoLinkPatterns) {
      while ((match = pattern.exec(searchHtml)) !== null) {
        let link = match[1] || match[0];
        // اگر لینک نسبی است، آن را کامل کن
        if (link && !link.startsWith('http')) {
          if (link.startsWith('/')) {
            link = `${baseUrl}${link}`;
          } else if (link.startsWith('#')) {
            continue; // رد کردن anchor links
          } else {
            link = `${baseUrl}/${link}`;
          }
        }
        if (link && link.includes('donya-e-eqtesad.com')) {
          foundLinks.add(link);
        }
      }
    }

    console.log(`🔍 [HTML Extract] ${foundLinks.size} لینک اولیه پیدا شد`);

    // برای هر لینک پیدا شده، بررسی کن که آیا واقعاً خبر است
    for (const link of Array.from(foundLinks)) {
      // رد کردن لینک‌های صفحه اصلی
      if (link === baseUrl || link === `${baseUrl}/` || (link.endsWith('/') && link.split('/').filter(p => p).length <= 3)) {
        continue;
      }

      // رد کردن لینک‌های دسته‌بندی و تگ
      if (link.includes('/category/') || link.includes('/tag/') || link.includes('/آرشیو/') || link.includes('/archive/')) {
        continue;
      }

      // پذیرش لینک‌هایی که شامل /news/ یا عدد هستند
      // برای donya-e-eqtesad.com: لینک‌ها ممکن است ساختار /بخش/عدد/عنوان داشته باشند
      const linkParts = link.split('/').filter(p => p);
      // بررسی اینکه آیا لینک شامل عدد است (در URL یا decoded)
      let decodedLink = link;
      try {
        decodedLink = decodeURIComponent(link);
      } catch (e) {
        // اگر decode نشد، از همان link استفاده کن
      }

      // بررسی عدد در URL (encoded یا decoded)
      const hasNumberInUrl = link.match(/\/\d+\//) !== null ||
        linkParts.some(p => /^\d+$/.test(p)) ||
        decodedLink.match(/\/\d+\//) !== null ||
        decodedLink.match(/\d+/) !== null;

      // بررسی عدد در decoded URL (مثل "94" در "بخش-ضمیمه-جدید-94")
      const hasNumberInDecoded = decodedLink !== link && decodedLink.match(/\d+/) !== null;

      const hasNumber = hasNumberInUrl || hasNumberInDecoded;
      const hasNewsPath = link.includes('/news/') || link.includes('/fa/news/');
      const isDeepLink = linkParts.length > 3; // لینک‌های عمیق

      // اگر لینک شامل عدد است یا عمیق است، آن را بپذیر
      // برای donya-e-eqtesad.com: لینک‌های خبر معمولاً شامل عدد هستند
      if (hasNewsPath || hasNumber || isDeepLink) {
        videoLinks.add(link);
        console.log(`🔗 [HTML Extract] لینک ویدیو پیدا شد: ${link.substring(0, 100)}... (news: ${hasNewsPath}, عدد: ${hasNumber}, عمیق: ${isDeepLink})`);
      } else {
        console.log(`⚠️ [HTML Extract] لینک رد شد: ${link.substring(0, 100)}... (news: ${hasNewsPath}, عدد: ${hasNumber}, عمیق: ${isDeepLink})`);
      }
    }

    console.log(`🎥 [HTML Extract] ${videoLinks.size} لینک خبر از donya-e-eqtesad.com پیدا شد`);
  } else if (isEghtesadOnline) {
    // برای eghtesadonline.com: استفاده از الگوهای قبلی
    const eghtesadPatterns = [
      /\/fa\/news\/\d+\/[^"'\s<>]+(?:فیلم|ویدیو|ویدئو)[^"'\s<>]*/gi,
      /href=["']([^"']*(?:فیلم|ویدیو|ویدئو)[^"']*)["']/gi,
    ];

    for (const pattern of eghtesadPatterns) {
      while ((match = pattern.exec(html)) !== null) {
        let link = match[1] || match[0];
        if (!link.startsWith('http') && link.startsWith('/')) {
          link = `${baseUrl}${link}`;
        } else if (!link.startsWith('http') && !link.startsWith('/')) {
          link = `${baseUrl}/${link}`;
        }
        if (link.includes('eghtesadonline.com')) {
          videoLinks.add(link);
        }
      }
    }

    console.log(`🎥 [HTML Extract] ${videoLinks.size} لینک ویدیو از eghtesadonline.com پیدا شد`);
  }

  // برای هر لینک ویدیو، اطلاعات را استخراج کن
  for (const linkPath of Array.from(videoLinks).slice(0, 10)) {
    const linkIndex = html.indexOf(linkPath);
    if (linkIndex === -1) continue;

    const start = Math.max(0, linkIndex - 1000);
    const end = Math.min(html.length, linkIndex + 1000);
    const section = html.substring(start, end);

    const imgMatch = section.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
    let image = imgMatch ? imgMatch[1] : null;

    const titleMatch = section.match(/<a[^>]+title=["']([^"']+)["'][^>]*>/i) ||
      section.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    if (image) {
      if (!image.startsWith('http')) {
        if (image.startsWith('//')) {
          image = `https:${image}`;
        } else if (image.startsWith('/')) {
          image = `${baseUrl}${image}`;
        } else {
          image = `${baseUrl}/${image}`;
        }
      }

      if (image.includes('defultpic') || image.includes('default')) {
        const articleMatch = section.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
          const articleImgMatch = articleMatch[1].match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
          if (articleImgMatch) {
            let articleImage = articleImgMatch[1];
            if (!articleImage.startsWith('http')) {
              if (articleImage.startsWith('//')) {
                articleImage = `https:${articleImage}`;
              } else if (articleImage.startsWith('/')) {
                articleImage = `${baseUrl}${articleImage}`;
              } else {
                articleImage = `${baseUrl}/${articleImage}`;
              }
            }
            if (!articleImage.includes('defultpic') && !articleImage.includes('default')) {
              image = articleImage;
            }
          }
        }
      }

      const finalLink = linkPath.startsWith('http') ? linkPath : `${baseUrl}${linkPath}`;
      const finalTitle = title || finalLink.split('/').pop()?.replace(/-/g, ' ') || 'ویدیو';

      items.push({
        type: 'video',
        link: finalLink,
        image: image,
        title: finalTitle,
      });

      console.log(`✅ [HTML Extract] ویدیو اضافه شد: ${finalTitle.substring(0, 50)}...`);
    } else {
      console.log(`⚠️ [HTML Extract] عکس برای لینک پیدا نشد: ${linkPath.substring(0, 80)}...`);
      // حتی اگر عکس نداریم، لینک را اضافه کن (ممکن است در صفحه خبر عکس داشته باشد)
      const finalLink = linkPath.startsWith('http') ? linkPath : `${baseUrl}${linkPath}`;
      const finalTitle = title || finalLink.split('/').pop()?.replace(/-/g, ' ') || 'ویدیو';

      items.push({
        type: 'video',
        link: finalLink,
        image: '', // خالی - بعداً از صفحه خبر گرفته می‌شود
        title: finalTitle,
      });
    }
  }

  // استخراج از تب "اینفوگرافیک"
  const infographicLinks = new Set<string>();
  match = null;

  if (isDonyaEqtesad) {
    // برای donya-e-eqtesad.com: استفاده از روش مشابه eghtesadonline
    // جستجوی مستقیم لینک‌های خبر در بخش "اینفوگرافی" با regex ساده
    // ابتدا بخش "اینفوگرافی" را پیدا کن
    const infographicSectionMatch = html.match(/اینفوگرافی[\s\S]*?چند رسانه/gi) ||
      html.match(/اینفوگرافی[\s\S]{0,10000}/gi);
    const searchHtml = infographicSectionMatch ? infographicSectionMatch[0] : html;

    console.log(`🔍 [HTML Extract] بخش اینفوگرافی پیدا شد: ${infographicSectionMatch ? 'بله' : 'خیر'}`);
    console.log(`📏 [HTML Extract] طول بخش اینفوگرافی: ${searchHtml.length} کاراکتر`);

    // استفاده از regex ساده برای پیدا کردن لینک‌های خبر
    // روش: ابتدا همه لینک‌های href را پیدا کن، سپس فیلتر کن
    const infographicLinkPatterns = [
      // الگوی 1: همه لینک‌های href در بخش اینفوگرافی
      /href=["']([^"']*donya-e-eqtesad\.com[^"']*)[\"']/gi,
      // الگوی 2: لینک‌های نسبی که ممکن است خبر باشند
      /href=["']([^"']*\/[^"']*)[\"']/gi,
    ];

    const foundLinks = new Set<string>();

    for (const pattern of infographicLinkPatterns) {
      while ((match = pattern.exec(searchHtml)) !== null) {
        let link = match[1] || match[0];
        // اگر لینک نسبی است، آن را کامل کن
        if (link && !link.startsWith('http')) {
          if (link.startsWith('/')) {
            link = `${baseUrl}${link}`;
          } else if (link.startsWith('#')) {
            continue; // رد کردن anchor links
          } else {
            link = `${baseUrl}/${link}`;
          }
        }
        if (link && link.includes('donya-e-eqtesad.com')) {
          foundLinks.add(link);
        }
      }
    }

    console.log(`🔍 [HTML Extract] اینفوگرافیک ${foundLinks.size} لینک اولیه پیدا شد`);

    // برای هر لینک پیدا شده، بررسی کن که آیا واقعاً خبر است
    for (const link of Array.from(foundLinks)) {
      // رد کردن لینک‌های صفحه اصلی
      if (link === baseUrl || link === `${baseUrl}/` || (link.endsWith('/') && link.split('/').filter(p => p).length <= 3)) {
        continue;
      }

      // رد کردن لینک‌های دسته‌بندی و تگ
      if (link.includes('/category/') || link.includes('/tag/') || link.includes('/آرشیو/') || link.includes('/archive/')) {
        continue;
      }

      // پذیرش لینک‌هایی که شامل /news/ یا عدد هستند
      // برای donya-e-eqtesad.com: لینک‌ها ممکن است ساختار /بخش/عدد/عنوان داشته باشند
      const linkParts = link.split('/').filter(p => p);
      // بررسی اینکه آیا لینک شامل عدد است (در URL یا decoded)
      let decodedLink = link;
      try {
        decodedLink = decodeURIComponent(link);
      } catch (e) {
        // اگر decode نشد، از همان link استفاده کن
      }

      // بررسی عدد در URL (encoded یا decoded)
      const hasNumberInUrl = link.match(/\/\d+\//) !== null ||
        linkParts.some(p => /^\d+$/.test(p)) ||
        decodedLink.match(/\/\d+\//) !== null ||
        decodedLink.match(/\d+/) !== null;

      // بررسی عدد در decoded URL (مثل "94" در "بخش-ضمیمه-جدید-94")
      const hasNumberInDecoded = decodedLink !== link && decodedLink.match(/\d+/) !== null;

      const hasNumber = hasNumberInUrl || hasNumberInDecoded;
      const hasNewsPath = link.includes('/news/') || link.includes('/fa/news/');
      const isDeepLink = linkParts.length > 3; // لینک‌های عمیق

      // اگر لینک شامل عدد است یا عمیق است، آن را بپذیر
      // برای donya-e-eqtesad.com: لینک‌های خبر معمولاً شامل عدد هستند
      if (hasNewsPath || hasNumber || isDeepLink) {
        infographicLinks.add(link);
        console.log(`🔗 [HTML Extract] لینک اینفوگرافیک پیدا شد: ${link.substring(0, 100)}... (news: ${hasNewsPath}, عدد: ${hasNumber}, عمیق: ${isDeepLink})`);
      } else {
        console.log(`⚠️ [HTML Extract] لینک رد شد: ${link.substring(0, 100)}... (news: ${hasNewsPath}, عدد: ${hasNumber}, عمیق: ${isDeepLink})`);
      }
    }

    console.log(`📊 [HTML Extract] ${infographicLinks.size} لینک خبر از donya-e-eqtesad.com پیدا شد`);
  } else if (isEghtesadOnline) {
    // برای eghtesadonline.com
    const eghtesadInfographicPatterns = [
      /\/fa\/news\/\d+\/[^"'\s<>]*اینفوگرافیک[^"'\s<>]*/gi,
      /href=["']([^"']*اینفوگرافیک[^"']*)["']/gi,
    ];

    for (const pattern of eghtesadInfographicPatterns) {
      while ((match = pattern.exec(html)) !== null) {
        let link = match[1] || match[0];
        if (!link.startsWith('http') && link.startsWith('/')) {
          link = `${baseUrl}${link}`;
        } else if (!link.startsWith('http') && !link.startsWith('/')) {
          link = `${baseUrl}/${link}`;
        }
        if (link.includes('eghtesadonline.com')) {
          infographicLinks.add(link);
        }
      }
    }

    console.log(`📊 [HTML Extract] ${infographicLinks.size} لینک اینفوگرافیک از eghtesadonline.com پیدا شد`);
  }

  for (let linkPath of Array.from(infographicLinks).slice(0, 10)) {
    // اگر لینک کامل نیست، آن را کامل کن
    if (!linkPath.startsWith('http')) {
      linkPath = `${baseUrl}${linkPath}`;
    }

    // پیدا کردن لینک در HTML (هم کامل و هم نسبی)
    let linkIndex = html.indexOf(linkPath);
    if (linkIndex === -1) {
      // اگر لینک کامل پیدا نشد، سعی کن بدون baseUrl پیدا کن
      const relativePath = linkPath.replace(/https?:\/\/(?:www\.)?(?:donya-e-eqtesad\.com|eghtesadonline\.com)/, '');
      linkIndex = html.indexOf(relativePath);
      if (linkIndex === -1) {
        // سعی کن فقط slug را پیدا کن
        const slug = linkPath.split('/').pop();
        if (slug) {
          linkIndex = html.indexOf(slug);
        }
        if (linkIndex === -1) {
          console.log(`⚠️ [HTML Extract] لینک پیدا نشد: ${linkPath.substring(0, 80)}...`);
          continue;
        }
      }
    }

    const start = Math.max(0, linkIndex - 1000);
    const end = Math.min(html.length, linkIndex + 1000);
    const section = html.substring(start, end);

    const imgMatch = section.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
    let image = imgMatch ? imgMatch[1] : null;

    const titleMatch = section.match(/<a[^>]+title=["']([^"']+)["'][^>]*>/i) ||
      section.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    if (image) {
      if (!image.startsWith('http')) {
        if (image.startsWith('//')) {
          image = `https:${image}`;
        } else if (image.startsWith('/')) {
          image = `${baseUrl}${image}`;
        } else {
          image = `${baseUrl}/${image}`;
        }
      }

      if (image.includes('defultpic') || image.includes('default')) {
        const articleMatch = section.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
          const articleImgMatch = articleMatch[1].match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i);
          if (articleImgMatch) {
            let articleImage = articleImgMatch[1];
            if (!articleImage.startsWith('http')) {
              if (articleImage.startsWith('//')) {
                articleImage = `https:${articleImage}`;
              } else if (articleImage.startsWith('/')) {
                articleImage = `${baseUrl}${articleImage}`;
              } else {
                articleImage = `${baseUrl}/${articleImage}`;
              }
            }
            if (!articleImage.includes('defultpic') && !articleImage.includes('default')) {
              image = articleImage;
            }
          }
        }
      }

      const finalLink = linkPath.startsWith('http') ? linkPath : `${baseUrl}${linkPath}`;
      const finalTitle = title || finalLink.split('/').pop()?.replace(/-/g, ' ') || 'اینفوگرافیک';

      items.push({
        type: 'infographic',
        link: finalLink,
        image: image,
        title: finalTitle,
      });

      console.log(`✅ [HTML Extract] اینفوگرافیک اضافه شد: ${finalTitle.substring(0, 50)}...`);
    } else {
      console.log(`⚠️ [HTML Extract] عکس برای لینک پیدا نشد: ${linkPath.substring(0, 80)}...`);
      // حتی اگر عکس نداریم، لینک را اضافه کن (ممکن است در صفحه خبر عکس داشته باشد)
      const finalLink = linkPath.startsWith('http') ? linkPath : `${baseUrl}${linkPath}`;
      const finalTitle = title || finalLink.split('/').pop()?.replace(/-/g, ' ') || 'اینفوگرافیک';

      items.push({
        type: 'infographic',
        link: finalLink,
        image: '', // خالی - بعداً از صفحه خبر گرفته می‌شود
        title: finalTitle,
      });
    }
  }

  // حذف تکراری
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.link)) {
      return false;
    }
    seen.add(item.link);
    return true;
  });
}

/**
 * استخراج ویدیو از صفحه خبر
 */
async function extractVideoFromNewsPage(html: string, baseUrl: string): Promise<string | null> {
  // جستجوی تگ video
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match = videoRegex.exec(html);
  if (match) {
    const videoSrc = match[1];
    if (videoSrc.startsWith('/files/')) {
      return `${baseUrl}${videoSrc}`;
    } else if (videoSrc.startsWith('http')) {
      return videoSrc;
    }
  }

  // جستجوی source tag
  const sourceRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
  match = sourceRegex.exec(html);
  if (match) {
    const videoSrc = match[1];
    if (videoSrc.startsWith('/files/')) {
      return `${baseUrl}${videoSrc}`;
    } else if (videoSrc.startsWith('http')) {
      return videoSrc;
    }
  }

  // جستجوی ویدیو از background-image (مثل plyr player)
  // مثال: <div class="plyr__poster" style="background-image: url(&quot;https://vod.demg.org/ao/19afee3693c_2f3f70.webp&quot;);"></div>
  const bgImageRegex = /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgImageRegex.exec(html)) !== null) {
    const src = match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // بررسی اینکه آیا این یک ویدیو است (نه عکس)
    const videoDomains = ['vod.', 'video.', 'media.', 'stream.', 'cdn.', 'demg.org'];
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m3u8'];
    const isVideoDomain = videoDomains.some(domain => src.toLowerCase().includes(domain));
    const hasVideoExtension = videoExtensions.some(ext => src.toLowerCase().includes(ext));

    if (isVideoDomain || hasVideoExtension || src.includes('video') || src.includes('vod')) {
      // اگر webp است اما در دامنه video است، سعی کن URL واقعی ویدیو را پیدا کن
      if (src.toLowerCase().endsWith('.webp') && isVideoDomain) {
        // تبدیل .webp به .mp4
        const videoUrl = src.replace(/\.webp$/i, '.mp4');
        console.log(`🎥 [HTML Extract] ویدیو از background-image (تبدیل webp به mp4): ${videoUrl.substring(0, 80)}...`);
        return videoUrl;
      } else if (!src.toLowerCase().endsWith('.webp')) {
        // اگر webp نیست، مستقیماً برگردان
        console.log(`🎥 [HTML Extract] ویدیو از background-image پیدا شد: ${src.substring(0, 80)}...`);
        return src;
      }
    }
  }

  return null;
}

/**
 * استخراج عنوان و محتوا از صفحه خبر
 */
export function extractNewsContent(html: string, baseUrl: string): { title: string; content: string; image: string | null } {
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const contentMatch = html.match(/<div[^>]*class=["'][^"']*content["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const content = contentMatch ? contentMatch[1] : '';

  // استخراج عکس واقعی از صفحه خبر
  let realImage: string | null = null;
  const imageRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  const seenImages = new Set<string>();
  let imgMatch: RegExpExecArray | null;

  while ((imgMatch = imageRegex.exec(html)) !== null) {
    let imgSrc = imgMatch[1];

    if (imgSrc.includes('defultpic') ||
      imgSrc.includes('default') ||
      imgSrc.includes('icon') ||
      imgSrc.includes('logo') ||
      imgSrc.includes('avatar')) {
      continue;
    }

    if (!imgSrc.startsWith('http')) {
      if (imgSrc.startsWith('//')) {
        imgSrc = `https:${imgSrc}`;
      } else if (imgSrc.startsWith('/')) {
        imgSrc = `${baseUrl}${imgSrc}`;
      } else {
        imgSrc = `${baseUrl}/${imgSrc}`;
      }
    }

    if ((imgSrc.includes('donya-e-eqtesad.com') || imgSrc.includes('eghtesadonline.com')) && !seenImages.has(imgSrc)) {
      if (imgSrc.includes('/files/fa/news/')) {
        realImage = imgSrc;
        break;
      } else if (!realImage) {
        realImage = imgSrc;
      }
      seenImages.add(imgSrc);
    }
  }

  return { title, content, image: realImage };
}

/**
 * تبدیل لینک‌های استخراج شده به RSSItem
 */
export async function extractMediaFromHtmlPage(
  url: string,
  maxItems: number = 10
): Promise<RSSItem[]> {
  try {
    console.log(`📄 [HTML Extract] استخراج از صفحه HTML: ${url}`);

    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    // دریافت صفحه اصلی
    const html = await fetchHtml(url);

    // استخراج لینک‌های ویدیو و اینفوگرافیک
    const mediaItems = extractMediaLinks(html, baseUrl);

    console.log(`✅ [HTML Extract] ${mediaItems.length} آیتم پیدا شد`);

    if (mediaItems.length === 0) {
      console.warn(`⚠️ [HTML Extract] هیچ آیتمی پیدا نشد! بررسی HTML...`);
      // بررسی اینکه آیا HTML دریافت شده است
      if (html.length < 1000) {
        console.error(`❌ [HTML Extract] HTML خیلی کوتاه است (${html.length} کاراکتر) - ممکن است خطا در دریافت باشد`);
      } else {
        // بررسی اینکه آیا بخش "چند رسانه‌ای" وجود دارد
        const hasMultimedia = html.includes('چند رسانه') || html.includes('ویدئو') || html.includes('اینفوگرافی');
        console.log(`🔍 [HTML Extract] بخش چند رسانه‌ای پیدا شد: ${hasMultimedia ? 'بله' : 'خیر'}`);

        // بررسی اینکه آیا لینک‌های خبر وجود دارند
        const hasNewsLinks = html.includes('/news/') || html.includes('/fa/news/');
        console.log(`🔍 [HTML Extract] لینک‌های خبر پیدا شد: ${hasNewsLinks ? 'بله' : 'خیر'}`);
      }
    }

    // تبدیل به RSSItem
    const rssItems: RSSItem[] = [];

    for (const item of mediaItems.slice(0, maxItems)) {
      try {
        console.log(`📥 [HTML Extract] دریافت صفحه خبر: ${item.link.substring(0, 80)}...`);
        // دریافت صفحه خبر برای استخراج ویدیو و محتوا
        const newsHtml = await fetchHtml(item.link);
        const { title, content, image } = extractNewsContent(newsHtml, baseUrl);
        const videoUrl = item.type === 'video' ? await extractVideoFromNewsPage(newsHtml, baseUrl) : undefined;

        const finalTitle = title || item.title;
        const finalImage = image || item.image;

        rssItems.push({
          title: finalTitle,
          link: item.link,
          description: content || finalTitle,
          pubDate: new Date().toISOString(),
          imageUrl: finalImage,
          videoUrl: videoUrl || undefined,
          category: item.type === 'video' ? 'ویدیو' : 'اینفوگرافیک',
        });

        console.log(`✅ [HTML Extract] آیتم پردازش شد: ${finalTitle.substring(0, 50)}...`);
      } catch (error: any) {
        console.warn(`⚠️ [HTML Extract] خطا در پردازش ${item.link}:`, error?.message || error);
        // در صورت خطا، حداقل اطلاعات را اضافه کن
        rssItems.push({
          title: item.title,
          link: item.link,
          description: item.title,
          pubDate: new Date().toISOString(),
          imageUrl: item.image,
          category: item.type === 'video' ? 'ویدیو' : 'اینفوگرافیک',
        });
      }
    }

    return rssItems;
  } catch (error) {
    console.error(`❌ [HTML Extract] خطا در استخراج از ${url}:`, error);
    throw error;
  }
}


export function extractMetadata(url: string, html: string) {
  let baseUrl = '';
  try {
    const urlObj = new URL(url);
    baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    baseUrl = url;
  }
  const result = extractNewsContent(html, baseUrl);
  return {
    title: result.title,
    description: result.content,
    image: result.image
  };
}
