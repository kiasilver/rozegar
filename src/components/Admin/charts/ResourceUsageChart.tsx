"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartConfig } from "./ChartContainer";
import { ChartTooltip, ChartTooltipContent } from "./ChartTooltip";

interface ResourceUsageChartProps {
  value: number;
  label: string;
  color?: string;
  className?: string;
  size?: number;
}

const COLORS = {
  cpu: '#3b82f6',
  ram: '#10b981',
  disk: '#f59e0b',
};

export function ResourceUsageChart({
  value,
  label,
  color,
  className,
  size = 200,
}: ResourceUsageChartProps) {
  // اطمینان از اینکه value یک عدد معتبر است
  const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const chartColor = color || COLORS[label.toLowerCase() as keyof typeof COLORS] || '#3b82f6';
  
  const data = [
    { name: 'used', value: Math.min(100, Math.max(0, numValue)) },
    { name: 'free', value: Math.max(0, 100 - numValue) },
  ];

  const chartConfig: ChartConfig = {
    used: {
      label: 'استفاده شده',
      color: chartColor,
    },
    free: {
      label: 'آزاد',
      color: '#e5e7eb',
    },
  };

  const outerRadius = size * 0.45;
  const innerRadius = size * 0.35;

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      <ChartContainer
        config={chartConfig}
        className="mx-auto"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value: any) => {
                    const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
                    return `${numVal.toFixed(1)}%`;
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? chartColor : '#e5e7eb'}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-4 text-center">
        <div className="text-2xl font-bold text-gray-800 dark:text-white">
          {numValue.toFixed(1)}%
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

