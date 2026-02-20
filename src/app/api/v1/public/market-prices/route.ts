import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fetchPricesFromDonyaEqtesad, PriceItem as DonyaPriceItem } from '@/lib/automation/telegram/daily-prices';

const execAsync = promisify(exec);

interface PriceItem {
  title: string;
  price: string;
  change: number;
  changePercent: number;
  type: 'plus' | 'minus' | 'equal';
}

interface ScrapedItem {
  id: string;
  title: string;
  price: number;
  price_text: string;
  change: number;
  change_percent: number;
  change_text: string;
  type: 'plus' | 'minus' | 'equal';
}

// TGJU API endpoint 
const TGJU_API_BASE = 'https://api.tgju.org/v1';

// --- CACHING STATE ---
let cachedItems: PriceItem[] = [];
let lastFetchTime = 0;
let isFetching = false;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

/**
 * Helper to fetch TGJU Ticker via Python script
 */
async function scrapeTGJUTicker(): Promise<ScrapedItem[] | null> {
  try {
    const scriptPath = path.join(process.cwd(), 'script', 'scrape-tgju-ticker.py');

    if (!fs.existsSync(scriptPath)) {
      console.warn('Python script not found, falling back to API');
      return null;
    }

    let stdout: string, stderr: string;
    try {
      const result = await execAsync(
        `python3 "${scriptPath}"`,
        {
          timeout: 10000,
          maxBuffer: 5 * 1024 * 1024
        }
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      try {
        const result = await execAsync(
          `python "${scriptPath}"`,
          {
            timeout: 10000,
            maxBuffer: 5 * 1024 * 1024
          }
        );
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (fallbackError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Python script execution failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
        }
        return null;
      }
    }

    if (stderr && !stderr.includes('??') && !stderr.includes('SSL') && !stderr.includes('cloudscraper')) {
      console.warn('Python script warnings:', stderr);
    }

    const result = JSON.parse(stdout);

    if (result.success && result.items && Array.isArray(result.items) && result.items.length > 0) {
      return result.items;
    }

    if (process.env.NODE_ENV === 'development' && result.error) {
      console.warn('Python scraping failed:', result.error);
    }
    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Python scraping failed, falling back to API:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }
}

function convertScrapedToPriceItems(scrapedItems: ScrapedItem[]): PriceItem[] {
  const idToTitleMap: Record<string, string> = {
    'l-gc30': 'انس طلا',
    'l-ons': 'انس طلا',
    'l-mesghal': 'مثقال طلا',
    'l-geram18': 'گرم طلا ۱۸ عیار',
    'l-sekee': 'سکه',
    'l-price_dollar_rl': 'دلار بازار',
    'l-oil_brent': 'نفت برنت',
    'l-crypto-tether-irr': 'تتر',
    'l-crypto-bitcoin': 'بیت کوین',
  };

  return scrapedItems.map(item => {
    const title = idToTitleMap[item.id] || item.title;
    const price = item.price;
    const formattedPrice = formatPrice(Math.round(price * 100) / 100);

    return {
      title,
      price: formattedPrice,
      change: item.change,
      changePercent: item.change_percent,
      type: item.type,
    };
  });
}

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchTGJUData() {
  try {
    const timestamp = Date.now();
    const [dollarRes, goldRes, coinRes, euroRes, stockRes, bitcoinRes] = await Promise.allSettled([
      fetchWithTimeout(`${TGJU_API_BASE}/data/price_dollar_rl?t=${timestamp}`, 5000),
      fetchWithTimeout(`${TGJU_API_BASE}/data/price_geram18?t=${timestamp}`, 5000),
      fetchWithTimeout(`${TGJU_API_BASE}/data/price_sekee?t=${timestamp}`, 5000),
      fetchWithTimeout(`${TGJU_API_BASE}/data/price_eur?t=${timestamp}`, 5000),
      fetchWithTimeout(`${TGJU_API_BASE}/data/index_tse?t=${timestamp}`, 5000),
      fetchWithTimeout(`${TGJU_API_BASE}/data/price_btc?t=${timestamp}`, 5000),
    ]);

    const dollarResponse = dollarRes.status === 'fulfilled' ? dollarRes.value : null;
    const goldResponse = goldRes.status === 'fulfilled' ? goldRes.value : null;
    const coinResponse = coinRes.status === 'fulfilled' ? coinRes.value : null;
    const euroResponse = euroRes.status === 'fulfilled' ? euroRes.value : null;
    const stockResponse = stockRes.status === 'fulfilled' ? stockRes.value : null;
    const bitcoinResponse = bitcoinRes.status === 'fulfilled' ? bitcoinRes.value : null;

    const results = await Promise.allSettled([
      dollarResponse?.ok ? dollarResponse.json() : Promise.resolve(null),
      goldResponse?.ok ? goldResponse.json() : Promise.resolve(null),
      coinResponse?.ok ? coinResponse.json() : Promise.resolve(null),
      euroResponse?.ok ? euroResponse.json() : Promise.resolve(null),
      stockResponse?.ok ? stockResponse.json() : Promise.resolve(null),
      bitcoinResponse?.ok ? bitcoinResponse.json() : Promise.resolve(null),
    ]);

    const dollarData = results[0].status === 'fulfilled' ? results[0].value : null;
    const goldData = results[1].status === 'fulfilled' ? results[1].value : null;
    const coinData = results[2].status === 'fulfilled' ? results[2].value : null;
    const euroData = results[3].status === 'fulfilled' ? results[3].value : null;
    const stockData = results[4].status === 'fulfilled' ? results[4].value : null;
    const bitcoinData = results[5].status === 'fulfilled' ? results[5].value : null;

    if (process.env.NODE_ENV === 'development') {
      console.log('Bitcoin API response:', {
        raw: bitcoinData,
        current: bitcoinData?.current,
        price: bitcoinData?.current?.price || bitcoinData?.current?.p,
      });
    }

    return {
      dollar: dollarData?.current || dollarData || null,
      gold: goldData?.current || goldData || null,
      coin: coinData?.current || coinData || null,
      euro: euroData?.current || euroData || null,
      stock: stockData?.current || stockData || null,
      dirham: null,
      bitcoin: bitcoinData?.current || bitcoinData || null,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('TGJU API unavailable, using fallback data:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }
}

function getFallbackPrices(): PriceItem[] {
  return [
    {
      title: 'دلار بازار',
      price: '120,800',
      change: 0.49,
      changePercent: 0.49,
      type: 'plus',
    },
    {
      title: 'گرم طلا ۱۸ عیار',
      price: '12,360,681',
      change: 0.46,
      changePercent: 0.46,
      type: 'plus',
    },
    {
      title: 'سکه امامی',
      price: '128,000,000',
      change: 0,
      changePercent: 0,
      type: 'equal',
    },
    {
      title: 'یورو',
      price: '140,700',
      change: 0.35,
      changePercent: 0.35,
      type: 'plus',
    },
    {
      title: 'بیت کوین',
      price: '88,719',
      change: -3.60,
      changePercent: -3.60,
      type: 'minus',
    },
  ];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price);
}

function processTGJUData(data: any): PriceItem[] {
  const items: PriceItem[] = [];

  if (data.stock) {
    const price = data.stock.price || data.stock.p || 0;
    const change = data.stock.change || data.stock.c || 0;
    const changePercent = data.stock.changePercent || data.stock.cp || 0;
    items.push({
      title: 'شاخص کل بورس',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.dollar) {
    const price = data.dollar.price || data.dollar.p || 0;
    const change = data.dollar.change || data.dollar.c || 0;
    const changePercent = data.dollar.changePercent || data.dollar.cp || 0;
    items.push({
      title: 'دلار بازار',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.gold) {
    const price = data.gold.price || data.gold.p || 0;
    const change = data.gold.change || data.gold.c || 0;
    const changePercent = data.gold.changePercent || data.gold.cp || 0;
    items.push({
      title: 'گرم طلا ۱۸ عیار',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.coin) {
    const price = data.coin.price || data.coin.p || 0;
    const change = data.coin.change || data.coin.c || 0;
    const changePercent = data.coin.changePercent || data.coin.cp || 0;
    items.push({
      title: 'سکه امامی',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.euro) {
    const price = data.euro.price || data.euro.p || 0;
    const change = data.euro.change || data.euro.c || 0;
    const changePercent = data.euro.changePercent || data.euro.cp || 0;
    items.push({
      title: 'یورو',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.dirham) {
    const price = data.dirham.price || data.dirham.p || 0;
    const change = data.dirham.change || data.dirham.c || 0;
    const changePercent = data.dirham.changePercent || data.dirham.cp || 0;
    items.push({
      title: 'درهم امارات',
      price: formatPrice(price),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  if (data.bitcoin) {
    const price = data.bitcoin.price || data.bitcoin.p || 0;
    const change = data.bitcoin.change || data.bitcoin.c || 0;
    const changePercent = data.bitcoin.changePercent || data.bitcoin.cp || 0;

    if (process.env.NODE_ENV === 'development') {
      console.log('Bitcoin data:', {
        price,
        change,
        changePercent,
        raw: data.bitcoin
      });
    }

    items.push({
      title: 'بیت کوین',
      price: formatPrice(Math.round(price * 100) / 100),
      change,
      changePercent,
      type: change > 0 ? 'plus' : change < 0 ? 'minus' : 'equal',
    });
  }

  return items;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function convertDonyaToPriceItems(donyaItems: DonyaPriceItem[]): PriceItem[] {
  return donyaItems.map(item => {
    const percentageStr = item.percentage.replace(/[%\s]/g, '').trim();
    const changePercent = parseFloat(percentageStr) || 0;
    const priceNumber = parseFloat(item.price.replace(/,/g, '')) || 0;
    const change = (priceNumber * changePercent) / 100;

    return {
      title: item.title,
      price: item.price,
      change: change,
      changePercent: changePercent,
      type: item.trend,
    };
  });
}

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        group_name: 'price-ticker',
      },
    });

    const enabled = settings.find(s => s.key === 'price_ticker_enabled')?.value === 'true';

    if (!enabled) {
      return NextResponse.json({ enabled: false, items: [] });
    }

    // --- CACHE CHECK ---
    const now = Date.now();
    if (cachedItems.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
      console.log('✅ Serving market prices from cache');
      const filteredItems = filterItems(cachedItems, settings);
      return returnResponse(filteredItems, settings, true);
    }

    // --- CONCURRENCY LOCK ---
    // If fetching is already in progress, return stale cache if available, or wait/fail
    if (isFetching) {
      if (cachedItems.length > 0) {
        console.log('⚠️ Fetch in progress, serving stale cache');
        const filteredItems = filterItems(cachedItems, settings);
        return returnResponse(filteredItems, settings, true);
      }
      // If no cache, we have to wait or return empty ? Better to fail gracefully or fallback
      console.log('⚠️ Fetch in progress and no cache. Returning fallback.');
      return returnResponse(getFallbackPrices(), settings, false);
    }

    isFetching = true;
    let items: PriceItem[] = [];

    try {
      // Priority 1: Donya-e-Eqtesad (Heavy Scraper)
      try {
        console.log('🔄 Fetching from DonyaEqtesad (Puppeteer)...');
        const donyaItems = await fetchPricesFromDonyaEqtesad();
        if (donyaItems && donyaItems.length > 0) {
          items = convertDonyaToPriceItems(donyaItems);
        } else {
          throw new Error('No items from DonyaEqtesad');
        }
      } catch (donyaError) {
        console.warn('⚠️ DonyaEqtesad failed, trying TGJU API:', donyaError instanceof Error ? donyaError.message : 'Unknown');
        // Fallback: TGJU API
        const tgjuData = await fetchTGJUData();
        if (tgjuData && Object.keys(tgjuData).some(key => tgjuData[key as keyof typeof tgjuData] !== null)) {
          items = processTGJUData(tgjuData);
        } else {
          // Fallback: Python Scraper
          const scrapedItems = await scrapeTGJUTicker();
          if (scrapedItems && scrapedItems.length > 0) {
            items = convertScrapedToPriceItems(scrapedItems);
          } else {
            items = getFallbackPrices();
          }
        }
      }

      // Update Cache
      if (items.length > 0) {
        cachedItems = items;
        lastFetchTime = Date.now();
      }

    } finally {
      isFetching = false;
    }

    const filteredItems = filterItems(items, settings);
    return returnResponse(filteredItems, settings, false);

  } catch (error) {
    console.error('Error fetching market prices:', error);
    isFetching = false;
    return NextResponse.json(
      {
        enabled: false,
        items: [],
        error: 'Error fetching prices'
      },
      { status: 500 }
    );
  }
}

function filterItems(items: PriceItem[], settings: any[]) {
  return items.filter(item => {
    if (item.title.includes('شاخص')) {
      return settings.find(s => s.key === 'price_ticker_show_stock_index')?.value === 'true';
    }
    if (item.title.includes('دلار') && !item.title.includes('کانادا')) {
      return settings.find(s => s.key === 'price_ticker_show_dollar')?.value === 'true';
    }
    if (item.title.includes('انس طلا')) {
      return settings.find(s => s.key === 'price_ticker_show_gold_ounce')?.value === 'true';
    }
    if (item.title.includes('مثقال طلا')) {
      return settings.find(s => s.key === 'price_ticker_show_gold_mithqal')?.value === 'true';
    }
    if (item.title.includes('گرم طلا') || item.title.includes('عیار')) {
      return settings.find(s => s.key === 'price_ticker_show_gold')?.value === 'true';
    }
    if (item.title.includes('سکه')) {
      return settings.find(s => s.key === 'price_ticker_show_coin')?.value === 'true';
    }
    if (item.title.includes('یورو')) {
      return settings.find(s => s.key === 'price_ticker_show_euro')?.value === 'true';
    }
    if (item.title.includes('درهم')) {
      return settings.find(s => s.key === 'price_ticker_show_dirham')?.value === 'true';
    }
    if (item.title.includes('بیت کوین')) {
      return settings.find(s => s.key === 'price_ticker_show_bitcoin')?.value === 'true';
    }
    if (item.title.includes('تتر')) {
      return settings.find(s => s.key === 'price_ticker_show_tether')?.value === 'true';
    }
    if (item.title.includes('نفت برنت') || item.title.includes('نفت')) {
      return settings.find(s => s.key === 'price_ticker_show_brent_oil')?.value === 'true';
    }
    return true;
  });
}

function returnResponse(items: PriceItem[], settings: any[], fromCache: boolean) {
  const response = NextResponse.json({
    enabled: true,
    items: items,
    timestamp: new Date().toISOString(),
    refresh_interval: settings.find(s => s.key === 'price_ticker_refresh_interval')?.value || '30',
    cached: fromCache
  });

  // Disable browser caching even if server side cached, to make sure client asks server
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');

  return response;
}

