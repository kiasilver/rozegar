"use client";

import * as React from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: {
    value: number; // درصد تغییر
    isPositive: boolean; // true = افزایش (سبز), false = کاهش (قرمز)
    period?: string; // دوره زمانی (مثل "This Year")
  };
  icon: React.ReactNode;
  iconBgColor?: "primary" | "secondary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon,
  iconBgColor = "primary",
  className = "",
}: StatCardProps) {
  const bgColorClasses = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-red-500 dark:bg-red-600",
    info: "bg-cyan-500 dark:bg-cyan-600",
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Icon Avatar */}
          <div>
            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${bgColorClasses[iconBgColor]} text-white`}>
              {icon}
            </span>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            {/* Title */}
            <span className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              {title}
            </span>
            
            {/* Value */}
            <h5 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
            </h5>
            
            {/* Trend */}
            {trend && (
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <span
                  className={`inline-flex items-center gap-1 ${
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {trend.isPositive ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {Math.abs(trend.value).toFixed(2)}%
                </span>
                <span className="mr-2">
                  {trend.period || "امسال"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
