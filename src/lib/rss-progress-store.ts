/**
 * RSS Progress Store - سیستم مدیریت Progress برای RSS Auto Processing
 */

export interface RSSProgressData {
  isActive: boolean;
  progress: number; // 0-100
  message: string;
  total: number;
  current: number;
  completed: boolean;
  queueSize: number;
  isProcessing: boolean;
  isChecking: boolean;
  isRunning: boolean;
  timestamp?: number;
  nextCheckTime?: number; // زمان چک بعدی (milliseconds)
  currentFeedName?: string; // نام RSS feed فعلی که در حال چک است
  currentCategoryName?: string; // نام دسته‌بندی فعلی
  totalFeeds?: number; // تعداد کل RSS feeds
  checkedFeeds?: number; // تعداد RSS feeds چک شده
}

class RSSProgressStore {
  private progress: RSSProgressData = {
    isActive: false,
    progress: 0,
    message: "",
    total: 0,
    current: 0,
    completed: false,
    queueSize: 0,
    isProcessing: false,
    isChecking: false,
    isRunning: false,
    timestamp: Date.now(),
  };

  private listeners: Set<(progress: RSSProgressData) => void> = new Set();
  private storageKey = 'rssProcessingProgress';
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private pollAbortController: AbortController | null = null;
  private lastPollTime = 0;
  private readonly POLL_INTERVAL = 1500; // هر 1.5 ثانیه (برای نمایش سریع‌تر progress)
  private readonly MIN_POLL_GAP = 500; // حداقل 0.5 ثانیه بین هر poll

  constructor() {
    // بارگذاری از localStorage در ابتدا
    this.loadFromStorage();
    
    // فقط اگر progress فعال است، polling را شروع کن
    if (this.progress.isActive && !this.progress.completed) {
      this.startPolling();
    }
  }

  /**
   * Subscribe به تغییرات Progress
   */
  subscribe(listener: (progress: RSSProgressData) => void): () => void {
    this.listeners.add(listener);
    
    // فوراً progress فعلی را ارسال کن
    listener(this.progress);
    
    // همیشه یک refresh فوری انجام بده
    this.refresh().catch(err => {
      // خطا را ignore کن
    });
    
    // شروع polling اگر فعال نیست
    if (!this.isPolling) {
      if ((this.progress.isActive && !this.progress.completed) || this.progress.isRunning) {
        this.startPolling();
      } else {
        // Check again after a short delay
        setTimeout(() => {
          if ((this.progress.isActive && !this.progress.completed || this.progress.isRunning) && !this.isPolling) {
            this.startPolling();
          }
        }, 500);
      }
    }
    
    // Unsubscribe function
    return () => {
      this.listeners.delete(listener);
      
      // اگر هیچ listener نداریم، polling را متوقف کن
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  /**
   * دریافت Progress فعلی
   */
  getProgress(): RSSProgressData {
    return { ...this.progress };
  }

  /**
   * به‌روزرسانی Progress
   */
  setProgress(newProgress: Partial<RSSProgressData>) {
    const updated: RSSProgressData = {
      ...this.progress,
      ...newProgress,
      progress: Math.max(0, Math.min(100, newProgress.progress ?? this.progress.progress)),
      timestamp: Date.now(),
    };

    // فقط اگر تغییر کرده، به‌روزرسانی کن
    const hasChanged = 
      updated.isActive !== this.progress.isActive ||
      updated.progress !== this.progress.progress ||
      updated.message !== this.progress.message ||
      updated.completed !== this.progress.completed ||
      updated.current !== this.progress.current ||
      updated.total !== this.progress.total ||
      updated.queueSize !== this.progress.queueSize ||
      updated.isProcessing !== this.progress.isProcessing ||
      updated.isChecking !== this.progress.isChecking ||
      updated.isRunning !== this.progress.isRunning;

    if (hasChanged) {
      const wasActive = this.progress.isActive;
      const isNowActive = updated.isActive && !updated.completed;
      
      this.progress = updated;
      this.saveToStorage();
      
      // Notify listeners FIRST
      this.notifyListeners();
      
      // مدیریت polling
      // اگر سیستم فعال است (isRunning) یا progress فعال است، polling را ادامه بده
      if ((isNowActive || updated.isRunning) && !this.isPolling) {
        this.startPolling();
      } else if (!isNowActive && !updated.isRunning && this.isPolling && updated.completed) {
        // فقط اگر completed است و سیستم غیرفعال است، polling را متوقف کن
        this.stopPolling();
      }
    } else {
      // Even if nothing changed, notify listeners if progress is active
      if (updated.isActive && !updated.completed) {
        this.notifyListeners();
      }
    }
  }

  /**
   * Reset Progress
   */
  reset() {
    this.progress = {
      isActive: false,
      progress: 0,
      message: "",
      total: 0,
      current: 0,
      completed: false,
      queueSize: 0,
      isProcessing: false,
      isChecking: false,
      isRunning: false,
      timestamp: Date.now(),
    };
    this.clearStorage();
    this.stopPolling();
    this.notifyListeners();
  }

  /**
   * Notify همه listeners
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.progress);
      } catch (error) {
        console.error('خطا در listener RSS Progress:', error);
      }
    });
  }

  /**
   * بارگذاری از localStorage
   */
  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // فقط اگر timestamp جدیدتر از 2 دقیقه پیش است، استفاده کن
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        if (parsed.timestamp && parsed.timestamp > twoMinutesAgo) {
          this.progress = {
            isActive: parsed.isActive || false,
            progress: parsed.progress || 0,
            message: parsed.message || "",
            total: parsed.total || 0,
            current: parsed.current || 0,
            completed: parsed.completed || false,
            queueSize: parsed.queueSize || 0,
            isProcessing: parsed.isProcessing || false,
            isChecking: parsed.isChecking || false,
            isRunning: parsed.isRunning || false,
            timestamp: parsed.timestamp || Date.now(),
          };
        }
      }
    } catch (error) {
      console.error('خطا در بارگذاری RSS progress از localStorage:', error);
    }
  }

  /**
   * ذخیره در localStorage
   */
  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    } catch (error) {
      console.error('خطا در ذخیره RSS progress در localStorage:', error);
    }
  }

  /**
   * پاک کردن localStorage
   */
  private clearStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('خطا در پاک کردن RSS progress از localStorage:', error);
    }
  }

  /**
   * شروع Polling
   */
  private startPolling() {
    if (this.isPolling) {
      return;
    }
    
    // اگر سیستم فعال است (isRunning) یا progress فعال است، polling را شروع کن
    if (!this.progress.isActive && !this.progress.isRunning) {
      return;
    }

    this.isPolling = true;
    
    // اولین poll فوری
    this.pollFromServer();
    
    // سپس polling را شروع کن
    this.pollingInterval = setInterval(() => {
      // اگر سیستم فعال است یا progress فعال است، polling را ادامه بده
      if (!this.progress.isActive && !this.progress.isRunning) {
        this.stopPolling();
        return;
      }
      this.pollFromServer();
    }, this.POLL_INTERVAL);
  }

  /**
   * متوقف کردن Polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
    
    this.isPolling = false;
  }

  /**
   * Poll از Server
   */
  private async pollFromServer() {
    const now = Date.now();
    
    // Debouncing
    if (now - this.lastPollTime < this.MIN_POLL_GAP) {
      return;
    }
    
    this.lastPollTime = now;
    
    // Cancel request قبلی
    if (this.pollAbortController) {
      this.pollAbortController.abort();
    }
    
    this.pollAbortController = new AbortController();
    
    try {
      const response = await fetch('/api/v1/admin/automation/telegram/rss-progress', {
        signal: this.pollAbortController.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: RSSProgressData = await response.json();
      
      // به‌روزرسانی progress
      this.setProgress({
        isActive: data.isActive || false,
        progress: data.progress || 0,
        message: data.message || "",
        total: data.total || 0,
        current: data.current || 0,
        completed: data.completed || false,
        queueSize: data.queueSize || 0,
        isProcessing: data.isProcessing || false,
        isChecking: data.isChecking || false,
        isRunning: data.isRunning || false,
      });

      // اگر completed است، polling را متوقف کن (اما فقط اگر سیستم غیرفعال است)
      if (data.completed && !data.isRunning) {
        this.stopPolling();
        // بعد از 2 ثانیه reset کن
        setTimeout(() => {
          if (this.progress.completed && !this.progress.isRunning) {
            this.reset();
          }
        }, 2000);
      } else if (!data.isActive && data.progress === 0 && !data.isChecking && !data.isProcessing && !data.isRunning) {
        // اگر progress 0 است و در حال پردازش نیست و سیستم غیرفعال است، polling را متوقف کن
        this.stopPolling();
      } else if (data.isRunning) {
        // اگر سیستم فعال است، polling را ادامه بده (حتی اگر progress 0 باشد)
        if (!this.isPolling) {
          this.startPolling();
        }
      }
    } catch (error: any) {
      // فقط اگر abort نشده، خطا را لاگ کن
      if (error.name !== 'AbortError') {
        // خطا را لاگ نکن (برای کاهش spam)
      }
    }
  }

  /**
   * Force refresh
   */
  async refresh() {
    const previousLastPollTime = this.lastPollTime;
    this.lastPollTime = 0;
    
    const wasPolling = this.isPolling;
    if (!wasPolling) {
      this.isPolling = true;
    }
    
    try {
      await this.pollFromServer();
    } finally {
      if (!wasPolling) {
        this.isPolling = false;
        this.lastPollTime = previousLastPollTime;
      }
    }
  }
}

// Singleton instance
export const rssProgressStore = new RSSProgressStore();
