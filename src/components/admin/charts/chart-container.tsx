"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChartConfig {
  [key: string]: {
    label?: string;
    color?: string;
  };
}

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  config?: ChartConfig;
  style?: React.CSSProperties;
}

export function ChartContainer({
  children,
  className,
  config,
  style,
  ...props
}: ChartContainerProps) {
  // Set CSS variables for colors
  React.useEffect(() => {
    if (config && typeof document !== 'undefined') {
      Object.entries(config).forEach(([key, value]) => {
        if (value.color) {
          document.documentElement.style.setProperty(`--color-${key}`, value.color);
        }
      });
    }
  }, [config]);

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center",
        "[&_.recharts-cartesian-axis-tick_text]:fill-gray-500 dark:[&_.recharts-cartesian-axis-tick_text]:fill-gray-300",
        "[&_.recharts-polar-angle-axis-tick_text]:fill-gray-500 dark:[&_.recharts-polar-angle-axis-tick_text]:fill-gray-300",
        "[&_.recharts-polar-radius-axis-tick_text]:fill-gray-500 dark:[&_.recharts-polar-radius-axis-tick_text]:fill-gray-300",
        "[&_.recharts-legend-item-text]:fill-gray-700 dark:[&_.recharts-legend-item-text]:fill-gray-200",
        "[&_.recharts-pie-label-text]:fill-gray-900 dark:[&_.recharts-pie-label-text]:fill-gray-100",
        "[&_.recharts-tooltip]:bg-white dark:[&_.recharts-tooltip]:bg-gray-800",
        "[&_.recharts-tooltip]:border-gray-200 dark:[&_.recharts-tooltip]:border-gray-700",
        "[&_.recharts-cartesian-grid]:stroke-gray-200 dark:[&_.recharts-cartesian-grid]:stroke-gray-600",
        "[&_.recharts-polar-grid]:stroke-gray-200 dark:[&_.recharts-polar-grid]:stroke-gray-600",
        "[&_.recharts-cartesian-grid]:opacity-50 dark:[&_.recharts-cartesian-grid]:opacity-40",
        "[&_.recharts-polar-grid]:opacity-50 dark:[&_.recharts-polar-grid]:opacity-40",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

