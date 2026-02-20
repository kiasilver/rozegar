/**
 * Next.js Instrumentation - اجرا در startup
 * این فایل در startup سرور اجرا می‌شود
 */

const originalRepeat = String.prototype.repeat;
String.prototype.repeat = function (count) {
  if (count < 0) {
    console.error('SafeRepeat intercepted invalid count:', count);
    console.error(new Error().stack);
    return '';
  }
  return originalRepeat.call(this, count);
};

let isInitialized = false; // جلوگیری از initialize چندباره

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // جلوگیری از initialize چندباره (مخصوصاً در development mode با Fast Refresh)
    if (isInitialized) {
      console.warn('[System:Instrumentation] ⚠️ WARNING: Instrumentation already initialized, skipping duplicate call');
      return;
    }
    isInitialized = true;

    const isDevelopment = process.env.NODE_ENV === 'development';

    // 🔴 پاک کردن همه cache ها در development mode (هر بار که npm run dev اجرا می‌شود)
    if (isDevelopment) {
      try {
        const { clearCache } = await import('./lib/core/cache');
        clearCache();
        console.log('[System:Instrumentation] ✅ All caches cleared (development mode)');
      } catch (error: any) {
        console.warn('[System:Instrumentation] ⚠️ Failed to clear caches:', error.message);
      }
    }

    // Initialize Car Price Scheduler
    try {
      const { initCarPriceScheduler } = await import('@/lib/automation/car-price/car-price-scheduler');
      initCarPriceScheduler();
    } catch (e) {
      console.error('[System:Instrumentation] Failed to init CarPriceScheduler:', e);
    }

    // Initialize Unified RSS Scheduler
    try {
      const { initUnifiedRSSScheduler } = await import('@/lib/automation/undefined-rss/unified-rss-scheduler');
      initUnifiedRSSScheduler();
    } catch (e) {
      console.error('[System:Instrumentation] Failed to init UnifiedRSSScheduler:', e);
    }

    // Initialize Price Ticker Scheduler
    try {
      const { initPriceTickerScheduler } = await import('@/lib/automation/telegram/price-ticker-scheduler');
      initPriceTickerScheduler();
    } catch (e) {
      console.error('[System:Instrumentation] Failed to init PriceTickerScheduler:', e);
    }

    console.log('[System:Instrumentation] System initialized successfully');
  }
}
