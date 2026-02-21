"use client";

import * as React from "react";
import { useMemo } from "react";

interface OSData {
  name: string;
  count: number;
  percentage: number;
  icon: string; // emoji یا SVG path
}

interface OperatingSystemChartProps {
  data: OSData[];
  className?: string;
}

// آیکون‌های سیستم عامل‌ها
const OS_ICONS: Record<string, string> = {
  "Windows": "🪟",
  "macOS": "🍎",
  "Linux": "🐧",
  "Android": "🤖",
  "iOS": "📱",
  "Other": "💻",
};

// رنگ‌های سیستم عامل‌ها
const OS_COLORS: Record<string, string> = {
  "Windows": "#0078D4",
  "macOS": "#000000",
  "Linux": "#FCC624",
  "Android": "#3DDC84",
  "iOS": "#000000",
  "Other": "#6B7280",
};

export function OperatingSystemChart({
  data,
  className = "",
}: OperatingSystemChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.count - a.count);
  }, [data]);

  const maxCount = useMemo(() => {
    return sortedData.length > 0 ? sortedData[0].count : 0;
  }, [sortedData]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Operating Systems
        </h3>
        <button
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Options"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {sortedData.map((os, index) => {
          const color = OS_COLORS[os.name] || OS_COLORS["Other"];
          const icon = OS_ICONS[os.name] || OS_ICONS["Other"];
          
          return (
            <div key={os.name} className="flex items-center gap-4">
              {/* آیکون */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-2xl">
                {icon}
              </div>

              {/* نام و درصد */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {os.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-2">
                    {os.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${os.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>

              {/* تعداد */}
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {os.count.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* خلاصه در پایین */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Users</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {sortedData.reduce((sum, os) => sum + os.count, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
