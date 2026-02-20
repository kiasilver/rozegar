/**
 * استخراج قیمت‌های روز بازار از سایت دنیای اقتصاد
 * این فایل قیمت‌ها را از div#carousel_header استخراج می‌کند
 * محتوا با JavaScript لود می‌شود، بنابراین از Puppeteer استفاده می‌کنیم
 */

export interface PriceItem {
  title: string;
  price: string;
  percentage: string;
  trend: 'plus' | 'minus' | 'equal';
}

/**
 * استخراج قیمت‌ها از سایت دنیای اقتصاد
 * @returns آرایه‌ای از قیمت‌ها
 */
export async function fetchPricesFromDonyaEqtesad(): Promise<PriceItem[]> {
  try {
    // بررسی وجود Puppeteer
    let puppeteer: any;
    try {
      puppeteer = require('puppeteer');
    } catch (error) {
      throw new Error('Puppeteer نصب نشده است. لطفاً با دستور "npm install puppeteer" نصب کنید.');
    }

    const url = 'https://donya-e-eqtesad.com/';

    console.log('🔄 [DonyaEqtesad] راه‌اندازی Puppeteer و بارگذاری صفحه:', url);

    // راه‌اندازی browser با disable cache برای اطمینان از دریافت داده‌های جدید
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-application-cache',
        '--disable-cache',
        '--disable-background-networking',
      ],
    });

    try {
      const page = await browser.newPage();

      // غیرفعال کردن cache برای اطمینان از دریافت داده‌های جدید
      await page.setCacheEnabled(false);

      // تنظیم User-Agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // بارگذاری صفحه با استراتژی ساده‌تر و بدون cache
      console.log('⏳ [DonyaEqtesad] در حال بارگذاری صفحه (بدون cache)...');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
        cache: false, // غیرفعال کردن cache
      });

      console.log('✅ [DonyaEqtesad] DOM بارگذاری شد، در حال انتظار برای لود شدن محتوای JavaScript...');

      // انتظار برای لود شدن carousel_header با timeout بیشتر
      await page.waitForSelector('#carousel_header', { timeout: 30000 });

      // اضافه کردن یک تاخیر کوتاه برای اطمینان از لود شدن کامل محتوا
      // و اطمینان از اینکه داده‌های جدید لود شده‌اند
      await new Promise(resolve => setTimeout(resolve, 3000));

      // یک بار دیگر صفحه را refresh کن تا مطمئن شویم داده‌های جدید لود شده‌اند
      console.log('🔄 [DonyaEqtesad] در حال refresh صفحه برای اطمینان از داده‌های جدید...');
      await page.reload({
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // دوباره منتظر بمان تا carousel_header لود شود
      await page.waitForSelector('#carousel_header', { timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ [DonyaEqtesad] بخش carousel_header پیدا شد');

      // استخراج داده‌ها از صفحه
      const priceItems: PriceItem[] = await page.evaluate(() => {
        interface PriceItem {
          title: string;
          price: string;
          percentage: string;
          trend: 'plus' | 'minus' | 'equal';
        }

        const items: PriceItem[] = [];

        // پیدا کردن تمام <li> ها در carousel_header
        const carouselHeader = document.getElementById('carousel_header');
        if (!carouselHeader) {
          return items;
        }

        const liElements = carouselHeader.querySelectorAll('li.plus, li.minus, li.equal');

        liElements.forEach((li) => {
          const trend = (li.className.includes('plus') ? 'plus' :
            li.className.includes('minus') ? 'minus' : 'equal') as 'plus' | 'minus' | 'equal';

          // استخراج عنوان
          const titleElement = li.querySelector('.title a');
          const title = titleElement ? titleElement.textContent?.trim() || '' : '';

          // استخراج قیمت
          const priceElement = li.querySelector('.price span');
          const price = priceElement ? priceElement.textContent?.trim() || '' : '';

          // استخراج درصد - اولین span در price-percentage > wrapper > span
          const percentageElement = li.querySelector('.price-percentage .wrapper span');
          const percentage = percentageElement ? percentageElement.textContent?.trim() || '0.00 %' : '0.00 %';

          if (title && price) {
            items.push({
              title,
              price,
              percentage,
              trend,
            });
          }
        });

        return items;
      });

      // حذف تکراری‌ها (بر اساس title)
      const uniqueItems: PriceItem[] = Array.from(
        new Map(priceItems.map((item: PriceItem) => [item.title, item])).values()
      );

      console.log(`✅ [DonyaEqtesad] ${uniqueItems.length} قیمت استخراج شد`);

      return uniqueItems;

    } finally {
      await browser.close();
    }

  } catch (error: any) {
    console.error('❌ [DonyaEqtesad] خطا در استخراج قیمت‌ها:', error.message);
    throw error;
  }
}

/**
 * فرمت کردن تاریخ شمسی با emoji
 */
export function formatDateWithEmoji(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const iranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));

  // روز هفته
  const weekday = iranTime.toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long' });

  // تاریخ شمسی
  const day = iranTime.toLocaleDateString('fa-IR-u-ca-persian', { day: 'numeric' });
  const month = iranTime.toLocaleDateString('fa-IR-u-ca-persian', { month: 'numeric' });
  const year = iranTime.toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' });

  // ساعت
  const hours = String(iranTime.getHours()).padStart(2, '0');
  const minutes = String(iranTime.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // emoji برای فصول (می‌توانید بر اساس ماه تغییر دهید)
  const monthNum = iranTime.getMonth() + 1;
  let seasonEmoji = '☀️';
  if (monthNum >= 3 && monthNum <= 5) seasonEmoji = '🌸'; // بهار
  else if (monthNum >= 6 && monthNum <= 8) seasonEmoji = '☀️'; // تابستان
  else if (monthNum >= 9 && monthNum <= 11) seasonEmoji = '🍂'; // پاییز
  else seasonEmoji = '❄️'; // زمستان

  const dateStr = `📅  ${weekday}, ${day} / ${month} / ${year} ${seasonEmoji}`;

  return { dateStr, timeStr };
}

/**
 * دریافت نام فصل جاری (spring, summer, autumn, winter)
 */
export function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const now = new Date();
  const iranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
  const monthNum = iranTime.getMonth() + 1;

  if (monthNum >= 3 && monthNum <= 5) return 'spring';
  if (monthNum >= 6 && monthNum <= 8) return 'summer';
  if (monthNum >= 9 && monthNum <= 11) return 'autumn';
  return 'winter';
}

/**
 * پیدا کردن emoji مناسب برای هر قیمت
 */
function getPriceEmoji(title: string): string {
  const titleLower = title.toLowerCase();

  // طلا و سکه
  if (titleLower.includes('اونس طلا') || titleLower.includes('انس طلا')) return '🔶';
  if (titleLower.includes('مثقال')) return '🔸';
  if (titleLower.includes('گرم طلا') || titleLower.includes('طلا ۱۸')) return '💰';
  if (titleLower.includes('سکه امامی') || titleLower.includes('سکه امام')) return '💰';
  if (titleLower.includes('سکه بهار')) return '💰';
  if (titleLower.includes('نیم سکه')) return '💰';
  if (titleLower.includes('ربع سکه')) return '💰';

  // ارز
  if (titleLower.includes('دلار')) return '💸';
  if (titleLower.includes('یورو')) return '💶';
  if (titleLower.includes('پوند')) return '🇬🇧';
  if (titleLower.includes('درهم')) return '🇦🇪';
  if (titleLower.includes('یوان')) return '🇨🇳';
  if (titleLower.includes('لیر')) return '🇹🇷';
  if (titleLower.includes('بیت کوین')) return '₿';
  if (titleLower.includes('شاخص')) return ''; // بدون emoji برای شاخص

  return '💎';
}

/**
 * دسته‌بندی قیمت‌ها
 */
function categorizePrices(prices: PriceItem[]): {
  gold: PriceItem[];
  currency: PriceItem[];
  stocks: PriceItem[];
  others: PriceItem[];
} {
  const gold: PriceItem[] = [];
  const currency: PriceItem[] = [];
  const stocks: PriceItem[] = [];
  const others: PriceItem[] = [];

  prices.forEach(item => {
    const titleLower = item.title.toLowerCase();
    if (titleLower.includes('طلا') || titleLower.includes('سکه') || titleLower.includes('مثقال') || titleLower.includes('اونس')) {
      gold.push(item);
    } else if (titleLower.includes('دلار') || titleLower.includes('یورو') || titleLower.includes('پوند') ||
      titleLower.includes('درهم') || titleLower.includes('یوان') || titleLower.includes('لیر') ||
      titleLower.includes('بیت کوین')) {
      currency.push(item);
    } else if (titleLower.includes('شاخص') || titleLower.includes('بورس')) {
      stocks.push(item);
    } else {
      others.push(item);
    }
  });

  return { gold, currency, stocks, others };
}

/**
 * فرمت کردن قیمت‌ها به صورت متن برای پیام تلگرام با طراحی بهتر
 * @param prices آرایه قیمت‌ها
 * @returns متن فرمت شده
 */
export function formatPricesForTelegram(prices: PriceItem[]): string {
  if (prices.length === 0) {
    return 'قیمتی یافت نشد';
  }

  const { dateStr, timeStr } = formatDateWithEmoji();
  const { gold, currency, stocks, others } = categorizePrices(prices);

  const parts: string[] = [];

  // هدر با تاریخ و ساعت
  parts.push(dateStr);

  // بخش طلا و سکه (با ترتیب مشخص)
  if (gold.length > 0) {
    // جدا کردن انواع مختلف
    const onzGold = gold.find(item => item.title.includes('اونس طلا') || item.title.includes('انس طلا'));
    const mesghal17 = gold.find(item => item.title.includes('مثقال') && item.title.includes('۱۷'));
    const mesghal18 = gold.find(item => item.title.includes('مثقال') && item.title.includes('۱۸') && !item.title.includes('۱۷'));
    const gramGold = gold.find(item => item.title.includes('گرم طلا'));
    const sekeItems = gold.filter(item => item.title.includes('سکه'));

    // اونس طلا (اول)
    if (onzGold) {
      parts.push('');
      const trendEmoji = onzGold.trend === 'plus' ? '📈' : onzGold.trend === 'minus' ? '📉' : '';
      parts.push(`🧈 انس طلا:  ${onzGold.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }

    // مثقال‌ها
    if (mesghal18) {
      const trendEmoji = mesghal18.trend === 'plus' ? '📈' : mesghal18.trend === 'minus' ? '📉' : '';
      parts.push(`🧈 یک مثقال  ۱۸ عیار :    ${mesghal18.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }

    // گرم طلا
    if (gramGold) {
      const trendEmoji = gramGold.trend === 'plus' ? '📈' : gramGold.trend === 'minus' ? '📉' : '';
      parts.push(`🧈 ۱گرم طلا ۱۸:  ${gramGold.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }

    // سکه‌ها (با ترتیب مشخص)
    const sekeImam = sekeItems.find(item => item.title.includes('امامی') || item.title.includes('امام'));
    const sekeBahar = sekeItems.find(item => item.title.includes('بهار'));
    const nimSeke = sekeItems.find(item => item.title.includes('نیم سکه'));
    const robSeke = sekeItems.find(item => item.title.includes('ربع سکه'));

    if (sekeImam) {
      const trendEmoji = sekeImam.trend === 'plus' ? '📈' : sekeImam.trend === 'minus' ? '📉' : '';
      parts.push(`🟡 سکه امام :  ${sekeImam.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (sekeBahar) {
      const trendEmoji = sekeBahar.trend === 'plus' ? '📈' : sekeBahar.trend === 'minus' ? '📉' : '';
      parts.push(`🟡 سکه بهار :  ${sekeBahar.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (nimSeke) {
      const trendEmoji = nimSeke.trend === 'plus' ? '📈' : nimSeke.trend === 'minus' ? '📉' : '';
      parts.push(`🟡 نیم سکه :    ${nimSeke.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (robSeke) {
      const trendEmoji = robSeke.trend === 'plus' ? '📈' : robSeke.trend === 'minus' ? '📉' : '';
      parts.push(`🟡 ربع سکه :    ${robSeke.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
  }

  // جداکننده قبل از ارز
  if (currency.length > 0) {


  }

  // بخش ارز (با ترتیب مشخص)
  if (currency.length > 0) {
    const dollar = currency.find(item => item.title.includes('دلار'));
    const euro = currency.find(item => item.title.includes('یورو'));
    const pound = currency.find(item => item.title.includes('پوند'));
    const dirham = currency.find(item => item.title.includes('درهم'));
    const yuan = currency.find(item => item.title.includes('یوان'));
    const lira = currency.find(item => item.title.includes('لیر'));
    const bitcoin = currency.find(item => item.title.includes('بیت کوین'));

    if (dollar) {
      const trendEmoji = dollar.trend === 'plus' ? '📈' : dollar.trend === 'minus' ? '📉' : '';
      parts.push(`💸 دلار    ≈       ${dollar.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (euro) {
      const trendEmoji = euro.trend === 'plus' ? '📈' : euro.trend === 'minus' ? '📉' : '';
      parts.push(`💶 یورو  ≈       ${euro.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (pound) {
      const trendEmoji = pound.trend === 'plus' ? '📈' : pound.trend === 'minus' ? '📉' : '';
      parts.push(`🇬🇧پوند.   ≈       ${pound.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (dirham) {
      const trendEmoji = dirham.trend === 'plus' ? '📈' : dirham.trend === 'minus' ? '📉' : '';
      parts.push(`‏🇦🇪 درهم   ≈       ${dirham.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (yuan) {
      const trendEmoji = yuan.trend === 'plus' ? '📈' : yuan.trend === 'minus' ? '📉' : '';
      parts.push(`🇨🇳یوان    ≈       ${yuan.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (lira) {
      const trendEmoji = lira.trend === 'plus' ? '📈' : lira.trend === 'minus' ? '📉' : '';
      parts.push(`🇹🇷لیر      ≈        ${lira.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
      parts.push('');
    }
    if (bitcoin) {
      const trendEmoji = bitcoin.trend === 'plus' ? '📈' : bitcoin.trend === 'minus' ? '📉' : '';
      parts.push(`🪙 بیت کوین    ≈       ${bitcoin.price}${trendEmoji ? ' ' + trendEmoji : ''}`);
    }

    // جداکننده بعد از ارز
    parts.push('');

  }

  // بخش شاخص بورس (اگر بود) - بدون emoji و در خط آخر
  if (stocks.length > 0) {
    stocks.forEach(item => {
      // بدون emoji برای شاخص
      parts.push(`${item.title} : ${item.price}`);
    });
  }

  // سایر موارد
  if (others.length > 0) {

    others.forEach(item => {
      const emoji = getPriceEmoji(item.title);
      const trendEmoji = item.trend === 'plus' ? '📈' : item.trend === 'minus' ? '📉' : '';
      parts.push(`${emoji}${item.title}:  ${item.price} (${item.percentage})${trendEmoji ? ' ' + trendEmoji : ''}`);
    });
  }

  // اضافه کردن هشتگ‌های ثابت برای قیمت روز
  parts.push('');
  parts.push('#قیمت_روز #انس_طلا #مثقال_طلا #گرم_طلا_۱۸ #سکه_امام #سکه_بهار_آزادی #نیم_سکه #ربع_سکه #دلار #یورو #درهم #بیت_کوین #شاخص_کل_بورس');

  return parts.join('\n');
}
