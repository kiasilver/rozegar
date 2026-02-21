"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { progressStore, ProgressData } from "@/lib/progress-store";

interface ProgressContextType {
  progress: ProgressData;
  setProgress: (progress: Partial<ProgressData>) => void;
  resetProgress: () => void;
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  // برای جلوگیری از Hydration mismatch، در SSR همیشه progress غیرفعال است
  const [progress, setProgressState] = useState<ProgressData>(() => {
    // در SSR (server-side)، همیشه progress غیرفعال است
    if (typeof window === 'undefined') {
      return {
        isActive: false,
        progress: 0,
        message: "",
        total: 0,
        current: 0,
        completed: false,
        timestamp: Date.now(),
      };
    }
    // در کلاینت، از store بخوان
    return progressStore.getProgress();
  });

  useEffect(() => {
    // Subscribe به Progress Store
    const unsubscribe = progressStore.subscribe((newProgress) => {
      // Update state immediately for instant UI update
      setProgressState(newProgress);
      
      // اگر progress فعال شد، مطمئن شو polling شروع شده
      if (newProgress.isActive && !newProgress.completed) {
        // ProgressStore خودش polling را مدیریت می‌کند، اما برای اطمینان یک refresh بزن
        progressStore.refresh().catch(() => {
          // خطا را ignore کن
        });
      }
    });

    // Refresh فوری در mount برای دریافت progress از server
    // این مهم است چون progress در server-side set می‌شود
    progressStore.refresh().catch(err => {
      console.warn('خطا در refresh progress:', err);
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  const setProgress = (updates: Partial<ProgressData>) => {
    progressStore.setProgress(updates);
  };

  const resetProgress = () => {
    progressStore.reset();
  };

  const refresh = async () => {
    await progressStore.refresh();
  };

  return (
    <ProgressContext.Provider value={{ progress, setProgress, resetProgress, refresh }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within ProgressProvider");
  }
  return context;
}
