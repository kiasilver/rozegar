"use client";

import * as React from "react";
import { Cell, Pie, PieChart as RechartsPieChart, Tooltip } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { ChartTooltipContent } from "./ChartTooltip";

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  className?: string;
  height?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function PieChartComponent({
  data,
  className,
  height = 350,
}: PieChartProps) {
  return (
    <ChartContainer className={className}>
      <RechartsPieChart width={400} height={height}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltipContent formatter={(value) => value.toLocaleString("fa-IR")} />} />
      </RechartsPieChart>
    </ChartContainer>
  );
}

