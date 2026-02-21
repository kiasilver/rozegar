/**
 * Next.js Instrumentation Hook
 * این فایل در startup اجرا می‌شود و scheduler را initialize می‌کند
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Initialize Unified RSS Scheduler
      const { initUnifiedRSSScheduler } = await import('@/lib/automation/undefined-rss/unified-rss-scheduler');
      await initUnifiedRSSScheduler();
      console.log('[Instrumentation] Unified RSS Scheduler initialized');
    } catch (error: any) {
      console.error('[Instrumentation] Error initializing RSS Scheduler:', error.message);
    }
  }
}


