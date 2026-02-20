"use client";

import * as React from "react";
import { TooltipProps } from "recharts";

interface ChartTooltipProps extends TooltipProps<any, any> {
  active?: boolean;
  payload?: Array<any>;
  label?: any;
  formatter?: (value: number, name: string, props?: any) => React.ReactNode;
  labelFormatter?: (value: any) => React.ReactNode;
  nameKey?: string;
  className?: string;
  hideLabel?: boolean;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  nameKey,
  className,
  hideLabel = false,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={`rounded-lg border bg-white dark:bg-gray-800 shadow-md p-3 ${className || ""}`}>
      <div className="grid gap-2">
        {!hideLabel && label && (
          <div className="font-medium text-gray-900 dark:text-white mb-1">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        {payload.map((item: any, index: number) => {
          const displayName = item.name || item.dataKey || nameKey;
          const displayValue = formatter
            ? formatter(item.value, displayName)
            : typeof item.value === 'number'
            ? item.value.toLocaleString("fa-IR")
            : item.value;
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill || item.stroke }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ChartTooltip wrapper component
export function ChartTooltip({ content, ...props }: any) {
  const { Tooltip } = require("recharts");
  return <Tooltip content={content} {...props} />;
}
