/**
 * Progress Store - سیستم ساده و کارآمد برای مدیریت Progress
 * بدون وابستگی به framework خاص
 */

export interface ProgressData {
  isActive: boolean;
  progress: number; // 0-100
  message: string;
  total: number;
  current: number;
  completed: boolean;
  timestamp?: number;
}

class ProgressStore {
  private progress: ProgressData = {
    isActive: false,
    progress: 0,
    message: "",
    total: 0,
    current: 0,
    completed: false,
    timestamp: Date.now(),
  };

  private listeners: Set<(progress: ProgressData) => void> = new Set();
  private storageKey = 'blogGenerationProgress';
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private pollAbortController: AbortController | null = null;
  private lastPollTime = 0;
  private readonly POLL_INTERVAL = 2000; // هر 2 ثانیه (برای نمایش سریع‌تر progress)
  private readonly MIN_POLL_GAP = 1000; // حداقل 1 ثانیه بین هر poll (debouncing)

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
  subscribe(listener: (progress: ProgressData) => void): () => void {
    this.listeners.add(listener);
    
    // فوراً progress فعلی را ارسال کن
    listener(this.progress);
    
    // همیشه یک refresh فوری انجام بده تا progress از server دریافت شود
    // این مهم است چون progress در server-side set می‌شود
    this.refresh().catch(err => {
      // خطا را ignore کن (مثلاً اگر هنوز mount نشده)
    });
    
    // فقط اگر progress فعال است و polling متوقف شده، دوباره شروع کن
    // Important: Start polling even if progress is not active yet (it will be set soon)
    if (!this.isPolling) {
      // Start polling if progress is active, or wait a bit and check again
      if (this.progress.isActive && !this.progress.completed) {
        this.startPolling();
      } else {
        // Check again after a short delay in case progress becomes active
        setTimeout(() => {
          if (this.progress.isActive && !this.progress.completed && !this.isPolling) {
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
  getProgress(): ProgressData {
    return { ...this.progress };
  }

  /**
   * به‌روزرسانی Progress
   */
  setProgress(newProgress: Partial<ProgressData>) {
    const updated: ProgressData = {
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
      updated.total !== this.progress.total;

    if (hasChanged) {
      const wasActive = this.progress.isActive;
      const isNowActive = updated.isActive && !updated.completed;
      
      this.progress = updated;
      this.saveToStorage();
      
      // Important: Notify listeners FIRST so UI updates immediately
      this.notifyListeners();
      
      // مدیریت polling بر اساس وضعیت progress
      if (isNowActive && !this.isPolling) {
        // اگر progress فعال شد و polling متوقف است، شروع کن
        this.startPolling();
      } else if (!isNowActive && this.isPolling) {
        // اگر progress غیرفعال شد و polling فعال است، متوقف کن
        this.stopPolling();
      }
    } else {
      // Even if nothing changed, notify listeners if progress is active
      // This ensures UI updates when progress is set from client-side
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
      timestamp: Date.now(),
    };
    this.clearStorage();
    this.stopPolling(); // متوقف کردن polling
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
        console.error('خطا در listener Progress:', error);
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
        // فقط اگر timestamp جدیدتر از 5 دقیقه پیش است، استفاده کن
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (parsed.timestamp && parsed.timestamp > fiveMinutesAgo) {
          this.progress = {
            isActive: parsed.isActive || false,
            progress: parsed.progress || 0,
            message: parsed.message || "",
            total: parsed.total || 0,
            current: parsed.current || 0,
            completed: parsed.completed || false,
            timestamp: parsed.timestamp || Date.now(),
          };
        }
      }
    } catch (error) {
      console.error('خطا در بارگذاری progress از localStorage:', error);
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
      console.error('خطا در ذخیره progress در localStorage:', error);
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
      console.error('خطا در پاک کردن progress از localStorage:', error);
    }
  }

  /**
   * شروع Polling
   */
  private startPolling() {
    if (this.isPolling) {
      return; // Already polling
    }
    
    // فقط اگر progress فعال است، polling را شروع کن
    if (!this.progress.isActive || this.progress.completed) {
      return;
    }

    this.isPolling = true;
    
    // اولین poll فوری برای دریافت progress از server
    this.pollFromServer();
    
    // سپس polling را شروع کن
    this.pollingInterval = setInterval(() => {
      // بررسی مجدد قبل از هر poll
      if (!this.progress.isActive || this.progress.completed) {
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
    
    // Debouncing: اگر کمتر از MIN_POLL_GAP گذشته، skip کن
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
      const response = await fetch('/api/v1/admin/content/blogs/generation-progress', {
        signal: this.pollAbortController.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ProgressData = await response.json();
      
      // به‌روزرسانی progress
      const wasActive = this.progress.isActive;
      this.setProgress({
        isActive: data.isActive || false,
        progress: data.progress || 0,
        message: data.message || "",
        total: data.total || 0,
        current: data.current || 0,
        completed: data.completed || false,
      });

      // اگر completed است یا غیرفعال است، polling را متوقف کن
      if (data.completed || (!data.isActive && data.progress >= 100)) {
        this.stopPolling();
        // بعد از 3 ثانیه reset کن
        if (data.completed) {
          setTimeout(() => {
            if (this.progress.completed) {
              this.reset();
            }
          }, 3000);
        }
      } else if (!data.isActive && data.progress === 0) {
        // اگر progress 0 است و غیرفعال است، polling را متوقف کن
        this.stopPolling();
      }
    } catch (error: any) {
      // فقط اگر abort نشده، خطا را لاگ کن
      if (error.name !== 'AbortError') {
        // خطا را لاگ نکن (برای کاهش spam)
      }
    }
  }

  /**
   * Force refresh - حتی اگر polling متوقف است
   */
  async refresh() {
    const previousLastPollTime = this.lastPollTime;
    this.lastPollTime = 0; // اجازه poll فوری
    
    // اگر polling متوقف است، موقتاً آن را فعال کن
    const wasPolling = this.isPolling;
    if (!wasPolling) {
      this.isPolling = true;
    }
    
    try {
      await this.pollFromServer();
    } finally {
      // اگر قبلاً polling متوقف بود، دوباره متوقف کن
      if (!wasPolling) {
        this.isPolling = false;
        this.lastPollTime = previousLastPollTime;
      }
    }
  }
}

// Singleton instance
export const progressStore = new ProgressStore();

