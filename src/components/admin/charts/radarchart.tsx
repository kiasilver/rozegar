"use client";

import * as React from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartsRadarChart, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "./chart-container";
import { ChartTooltipContent } from "./chart-tooltip";

interface RadarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  nameKey?: string;
  className?: string;
  height?: number;
}

export function RadarChartComponent({
  data,
  dataKey,
  nameKey = "name",
  className,
  height = 350,
}: RadarChartProps) {
  return (
    <ChartContainer className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart
          data={data}
          margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
        >
          <PolarGrid 
            stroke="#e5e7eb" 
            strokeWidth={1}
            className="dark:stroke-gray-700" 
          />
          <PolarAngleAxis
            dataKey={nameKey}
            tick={{ 
              fill: "currentColor",
              fontSize: 12,
              className: "text-gray-700 dark:text-white"
            }}
            className="text-xs text-gray-700 dark:text-white"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'auto']}
            tick={false}
            tickLine={false}
            axisLine={false}
            label={false}
          />
          <Radar
            name={dataKey}
            dataKey={dataKey}
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Tooltip 
            content={<ChartTooltipContent 
              formatter={(value) => value.toLocaleString("fa-IR")} 
              className="text-gray-900 dark:text-white"
            />} 
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

