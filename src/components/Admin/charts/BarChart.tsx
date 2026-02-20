"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { ChartTooltipContent } from "./ChartTooltip";

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  nameKey?: string;
  className?: string;
  height?: number;
}

export function BarChartComponent({
  data,
  dataKey,
  nameKey = "name",
  className,
  height = 350,
}: BarChartProps) {
  return (
    <ChartContainer config={{ [dataKey]: { label: dataKey } }} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            dataKey={nameKey}
            className="text-xs text-gray-600 dark:text-white"
            tick={{ fill: "currentColor" }}
          />
          <YAxis
            className="text-xs text-gray-600 dark:text-white"
            tick={{ fill: "currentColor" }}
          />
          <Tooltip content={<ChartTooltipContent formatter={(value) => value.toLocaleString("fa-IR") + " بازدید"} />} />
          <Bar
            dataKey={dataKey}
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            className="fill-blue-500"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

