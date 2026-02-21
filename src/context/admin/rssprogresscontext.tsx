"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { rssProgressStore, RSSProgressData } from "@/lib/rss-progress-store";

interface RSSProgressContextType {
  progress: RSSProgressData;
  setProgress: (progress: Partial<RSSProgressData>) => void;
  resetProgress: () => void;
  refresh: () => Promise<void>;
}

const RSSProgressContext = createContext<RSSProgressContextType | undefined>(undefined);

export function RSSProgressProvider({ children }: { children: ReactNode }) {
  // برای جلوگیری از Hydration mismatch، در SSR همیشه progress غیرفعال است
  const [progress, setProgressState] = useState<RSSProgressData>(() => {
    // در SSR (server-side)، همیشه progress غیرفعال است
    if (typeof window === 'undefined') {
      return {
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
    }
    // در کلاینت، از store بخوان
    return rssProgressStore.getProgress();
  });

  useEffect(() => {
    // Subscribe به RSS Progress Store
    const unsubscribe = rssProgressStore.subscribe((newProgress) => {
      setProgressState(newProgress);
      
      // اگر progress فعال شد، مطمئن شو polling شروع شده
      if (newProgress.isActive && !newProgress.completed) {
        rssProgressStore.refresh().catch(() => {
          // خطا را ignore کن
        });
      }
    });

    // Refresh فوری در mount
    rssProgressStore.refresh().catch(err => {
      console.warn('خطا در refresh RSS progress:', err);
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  const setProgress = (updates: Partial<RSSProgressData>) => {
    rssProgressStore.setProgress(updates);
  };

  const resetProgress = () => {
    rssProgressStore.reset();
  };

  const refresh = async () => {
    await rssProgressStore.refresh();
  };

  return (
    <RSSProgressContext.Provider value={{ progress, setProgress, resetProgress, refresh }}>
      {children}
    </RSSProgressContext.Provider>
  );
}

export function useRSSProgress() {
  const context = useContext(RSSProgressContext);
  if (!context) {
    throw new Error("useRSSProgress must be used within RSSProgressProvider");
  }
  return context;
}
