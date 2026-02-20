"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Lazy load ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface UserGrowthData {
  date: string;
  activeUsers: number;
  newUsers: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  className?: string;
}

export function UserGrowthChart({
  data,
  className = "",
}: UserGrowthChartProps) {
  // تبدیل داده‌ها به فرمت ApexCharts
  const chartData = React.useMemo(() => {
    const dates = data.map((item) => {
      // تبدیل تاریخ به فرمت کوتاه (مثلاً "Jan 2024")
      const date = new Date(item.date);
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    });

    const activeUsers = data.map((item) => item.activeUsers);
    const newUsers = data.map((item) => item.newUsers);

    return {
      dates,
      activeUsers,
      newUsers,
    };
  }, [data]);

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    colors: ["#3b82f6", "#f97316"], // آبی برای Active Users، نارنجی برای New Users
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    xaxis: {
      categories: chartData.dates,
      labels: {
        style: {
          colors: "#6b7280",
          fontSize: "12px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#6b7280",
          fontSize: "12px",
        },
        formatter: (value: number) => {
          return value.toString();
        },
      },
      min: 0,
      max: 100,
      tickAmount: 10,
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      floating: false,
      fontSize: "14px",
      fontFamily: "inherit",
      fontWeight: 500,
      formatter: undefined,
      inverseOrder: false,
      width: undefined,
      height: undefined,
      tooltipHoverFormatter: undefined,
      customLegendItems: [],
      offsetX: 0,
      offsetY: 0,
      labels: {
        colors: "#374151",
        useSeriesColors: false,
      },
      markers: {
        size: 6,
        strokeWidth: 0,
        fillColors: undefined,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 0,
      },
      onItemClick: {
        toggleDataSeries: true,
      },
      onItemHover: {
        highlightDataSeries: true,
      },
    },
    tooltip: {
      enabled: true,
      shared: true,
      followCursor: false,
      intersect: false,
      inverseOrder: false,
      custom: undefined,
      fillSeriesColor: false,
      theme: "light",
      style: {
        fontSize: "12px",
        fontFamily: "inherit",
      },
      onDatasetHover: {
        highlightDataSeries: false,
      },
      x: {
        show: true,
        format: "dd MMM",
        formatter: undefined,
      },
      y: {
        formatter: (value: number) => {
          return value.toString();
        },
        title: {
          formatter: (seriesName: string) => `${seriesName}: `,
        },
      },
      z: {
        formatter: undefined,
        title: "Size: ",
      },
      marker: {
        show: true,
      },
      fixed: {
        enabled: false,
        position: "topRight",
        offsetX: 0,
        offsetY: 0,
      },
    },
  };

  const chartSeries = [
    {
      name: "Active Users",
      data: chartData.activeUsers,
    },
    {
      name: "New Users",
      data: chartData.newUsers,
    },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          User Growth
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

      {typeof window !== "undefined" && Chart && (
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="line"
          height={350}
        />
      )}
    </div>
  );
}
