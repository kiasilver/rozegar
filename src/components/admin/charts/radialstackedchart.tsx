"use client";

import * as React from "react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartContainer, ChartConfig } from "./chart-container";
import { ChartTooltipContent } from "./chart-tooltip";
import { Tooltip } from "recharts";

interface RadialStackedChartProps {
  data: Array<{ name: string; value: number }>;
  config: ChartConfig;
  className?: string;
  title?: string;
  description?: string;
  totalLabel?: string;
}

export function RadialStackedChart({
  data,
  config,
  className,
  title = "نمودار فعالیت",
  description = "نمایش فعالیت سایت",
  totalLabel = "بازدید",
}: RadialStackedChartProps) {
  const totalValue = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data]
  );

  // تبدیل داده‌ها به فرمت مورد نیاز برای RadialBarChart
  const chartData = React.useMemo(() => {
    const result: Record<string, number> = {};
    data.forEach((item, index) => {
      const key = Object.keys(config)[index] || `item${index}`;
      result[key] = item.value;
    });
    return [result];
  }, [data, config]);

  return (
    <div className={`flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800 ${className || ""}`}>
      <div className="items-center pb-0 pt-4 px-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white text-center">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-white text-center mt-1">{description}</p>
      </div>
      <div className="flex flex-1 items-center pb-0 px-6">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square w-full max-w-[250px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={180}
            innerRadius={80}
            outerRadius={130}
          >
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel formatter={(value) => value.toLocaleString("fa-IR")} />}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-gray-900 dark:fill-white text-2xl font-bold"
                        >
                          {totalValue.toLocaleString("fa-IR")}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-gray-600 dark:fill-white"
                        >
                          {totalLabel}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            {Object.keys(config).map((key, index) => {
              const item = data[index];
              if (!item) return null;
              
              return (
                <RadialBar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  cornerRadius={5}
                  fill={config[key]?.color || "#3b82f6"}
                  className="stroke-transparent stroke-2"
                />
              );
            })}
          </RadialBarChart>
        </ChartContainer>
      </div>
      <div className="flex flex-col gap-2 text-sm pb-4 px-6">
        <div className="flex items-center gap-2 leading-none font-medium text-gray-700 dark:text-white justify-center">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span>روند صعودی در این ماه</span>
        </div>
        <div className="text-gray-500 dark:text-white leading-none text-center">
          نمایش کل بازدیدها برای ۶ ماه گذشته
        </div>
      </div>
    </div>
  );
}

