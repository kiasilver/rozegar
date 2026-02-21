"use client";

import { useEffect, useState } from "react";
import ComponentCard from "./componentcard";

interface RealTimeStatsProps {
  endpoint: string;
  refreshInterval?: number; // milliseconds
}

export default function RealTimeStats({
  endpoint,
  refreshInterval = 30000, // 30 seconds
}: RealTimeStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [endpoint, refreshInterval]);

  if (loading || !stats) {
    return (
      <ComponentCard title="آمار لحظه‌ای">
        <div className="text-center py-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">در حال بارگذاری...</div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="آمار لحظه‌ای">
      <div className="space-y-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">{key}:</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {typeof value === "number" ? value.toLocaleString("fa-IR") : String(value)}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            آخرین به‌روزرسانی: {lastUpdate.toLocaleTimeString("fa-IR")}
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}

