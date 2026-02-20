"use client";

import * as React from "react";
import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartConfig } from "./ChartContainer";
import { ChartTooltip, ChartTooltipContent } from "./ChartTooltip";

interface RadialChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  className?: string;
  height?: number;
  config?: ChartConfig;
  dataKey?: string;
  nameKey?: string;
}

// رنگ‌های بهینه برای dark mode
const COLORS_LIGHT = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const COLORS_DARK = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635'];

export function RadialChartComponent({
  data,
  className,
  height = 350,
  config,
  dataKey = "value",
  nameKey = "name",
}: RadialChartProps) {
  // تشخیص dark mode
  const [isDark, setIsDark] = React.useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDarkMode = document.documentElement.classList.contains('dark') || 
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(isDarkMode);
      }
    };
    
    checkDarkMode();
    
    // گوش دادن به تغییرات theme
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', checkDarkMode);
      
      return () => {
        observer.disconnect();
        mediaQuery.removeEventListener('change', checkDarkMode);
      };
    }
  }, []);

  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  // تبدیل داده‌ها به فرمت مورد نیاز
  const chartData = data.map((item, index) => ({
    [nameKey]: item.name,
    [dataKey]: item.value,
    fill: item.color || colors[index % colors.length],
  }));

  // ساخت config برای ChartContainer
  const chartConfig: ChartConfig = config || {};
  data.forEach((item, index) => {
    if (!chartConfig[item.name]) {
      chartConfig[item.name] = {
        label: item.name,
        color: item.color || colors[index % colors.length],
      };
    }
  });

  // ساخت config برای dataKey
  if (!chartConfig[dataKey]) {
    chartConfig[dataKey] = {
      label: "مقدار",
    };
  }

  return (
    <div className="relative">
      <ChartContainer 
        config={chartConfig} 
        className={`[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square pb-0 ${className || ""}`}
        style={{ maxHeight: `${height}px` }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <ChartTooltip 
              content={<ChartTooltipContent 
                hideLabel={false}
                labelFormatter={(label) => {
                  const item = data.find(d => d.name === label);
                  return item?.name || label;
                }}
                formatter={(value: any, name: any, props: any) => {
                  const item = data.find(d => d.value === value || d.name === name || d.name === props?.payload?.[nameKey]);
                  const total = data.reduce((sum, d) => sum + d.value, 0);
                  const percent = item ? ((item.value / total) * 100).toFixed(1) : '0';
                  return [
                    `${typeof value === 'number' ? value.toLocaleString('fa-IR') : value} (${percent}%)`,
                    item?.name || name
                  ];
                }}
              />} 
            />
            <Pie 
              data={chartData} 
              dataKey={dataKey} 
              label={false}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={height * 0.35}
              labelLine={false}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      
      {/* راهنمای رنگ */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((item, index) => (
          <div 
            key={item.name}
            className="flex items-center gap-2 group"
            title={`${item.name}: ${item.value.toLocaleString('fa-IR')}`}
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: item.color || colors[index % colors.length] }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
              {item.name}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.value.toLocaleString('fa-IR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

