"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "./chart-container";
import { ChartTooltipContent } from "./chart-tooltip";

export interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

// تابع برای فرمت تاریخ به فارسی (مثل: "فروردین ۳" یا "اردیبهشت ۱۵")
function formatDateToPersian(value: any): string {
  // اگر value یک string است و نام ماه فارسی است (مثل "فروردین"، "اردیبهشت")، همان را برگردان
  const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  
  if (typeof value === 'string') {
    // اگر نام ماه یا روز فارسی است، همان را برگردان
    if (persianMonths.includes(value) || persianDays.includes(value)) {
      return value;
    }
    // اگر شامل '-' یا '/' یا ' ' نیست و یک string ساده است، همان را برگردان
    if (!value.includes('-') && !value.includes('/') && !value.includes(' ')) {
      return value;
    }
  }
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }
    
    // استفاده از toLocaleDateString با locale فارسی برای نمایش ماه فارسی
    const persianDate = date.toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
    });
    
    return persianDate;
  } catch {
    return value;
  }
}

interface BarChartInteractiveProps {
  data: Array<Record<string, any>>;
  config: ChartConfig;
  dataKeys: string[];
  nameKey?: string;
  className?: string;
  height?: number;
  title?: string;
  description?: string;
}

export function BarChartInteractive({
  data,
  config,
  dataKeys,
  nameKey = "date",
  className,
  height = 250,
  title = "روند بازدیدها",
  description = "نمایش روند بازدیدها در بازه زمانی",
}: BarChartInteractiveProps) {
  const [activeChart, setActiveChart] = React.useState<string>(dataKeys[0] || "views");

  const total = React.useMemo(
    () => {
      const totals: Record<string, number> = {};
      dataKeys.forEach((key) => {
        totals[key] = data.reduce((acc, curr) => acc + (curr[key] || 0), 0);
      });
      return totals;
    },
    [data, dataKeys]
  );

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${className || ""}`}>
      <div className="flex flex-col items-stretch border-b border-gray-200 dark:border-gray-700 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-white">{description}</p>
        </div>
        <div className="flex">
          {dataKeys.map((key) => {
            const chartConfig = config[key];
            if (!chartConfig) return null;

            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="data-[active=true]:bg-gray-100 dark:data-[active=true]:bg-gray-800/60 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-gray-200 dark:border-gray-700 px-6 py-4 text-right even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-xs text-gray-500 dark:text-white">
                  {chartConfig.label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl text-gray-900 dark:text-white">
                  {total[key]?.toLocaleString("fa-IR") || "0"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-2 sm:p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-2xl">
        <ChartContainer config={config} className={`aspect-auto w-full [&_.recharts-cartesian-axis-tick_text]:fill-gray-600 dark:[&_.recharts-cartesian-axis-tick_text]:!fill-white`} style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{
                left: 8,
                right: 8,
                top: 10,
                bottom: 25,
              }}
            >
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3"
                className="stroke-gray-300 dark:stroke-gray-600"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey={nameKey}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={24}
                tick={{ 
                  fill: "#6b7280", 
                  fontSize: 10,
                }}
                tickFormatter={formatDateToPersian}
                className="[&_text]:fill-gray-600 dark:[&_text]:!fill-white"
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
                    nameKey="views"
                    formatter={(value, name) => {
                      const label = config[name]?.label || (name === "views" ? "بازدید" : name === "posts" ? "مقالات" : name);
                      return `${value.toLocaleString("fa-IR")} ${label}`;
                    }}
                    labelFormatter={(value) => {
                      if (typeof value === 'string' && !value.includes('-') && !value.includes('/') && !value.includes(' ')) {
                        return value;
                      }
                      try {
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                          return value;
                        }
                        return date.toLocaleDateString("fa-IR", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } catch {
                        return value;
                      }
                    }}
                  />
                }
              />
              <Bar 
                dataKey={activeChart} 
                fill={config[activeChart]?.color || "#3b82f6"}
                radius={[8, 8, 0, 0]}
                className="fill-blue-500 dark:fill-blue-400"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}

