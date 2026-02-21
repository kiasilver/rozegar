"use client";

import * as React from "react";
import { useMemo, useState, useEffect } from "react";

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryRadarChartProps {
  data: CategoryData[];
  title?: string;
  maxValue?: number;
  className?: string;
  height?: number;
}

export function CategoryRadarChart({
  data,
  title = "Views by category",
  maxValue,
  className = "",
  height = 300,
}: CategoryRadarChartProps) {
  const [isRTL, setIsRTL] = useState(true);
  
  useEffect(() => {
    // بررسی direction از HTML element
    const htmlElement = document.documentElement;
    const checkDirection = () => {
      setIsRTL(htmlElement.dir === 'rtl' || htmlElement.getAttribute('dir') === 'rtl');
    };
    
    checkDirection();
    
    // مشاهده تغییرات در dir attribute
    const observer = new MutationObserver(checkDirection);
    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['dir']
    });
    
    return () => observer.disconnect();
  }, []);
  
  const chartSize = Math.min(height, 300);
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize * 0.35; // 35% of chart size for data area

  // محاسبه maxValue اگر داده نشده باشد
  const calculatedMaxValue = useMemo(() => {
    if (maxValue) return maxValue;
    if (data.length === 0) return 40;
    const max = Math.max(...data.map(d => d.value));
    // Round up to nearest 10
    return Math.ceil(max / 10) * 10 || 40;
  }, [data, maxValue]);

  // تعداد دایره‌های شبکه (4 دایره: 10, 20, 30, 40)
  const gridLevels = 4;
  const gridStep = calculatedMaxValue / gridLevels;

  // محاسبه نقاط برای هر دسته‌بندی
  const categoryPoints = useMemo(() => {
    if (data.length === 0) return [];
    
    return data.map((item, index) => {
      const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2; // شروع از بالا
      const normalizedValue = Math.min(item.value / calculatedMaxValue, 1);
      const pointRadius = radius * normalizedValue;
      
      return {
        ...item,
        angle,
        x: centerX + pointRadius * Math.cos(angle),
        y: centerY + pointRadius * Math.sin(angle),
        labelX: centerX + (radius + 30) * Math.cos(angle),
        labelY: centerY + (radius + 30) * Math.sin(angle),
      };
    });
  }, [data, calculatedMaxValue, radius, centerX, centerY]);

  // تولید path برای polygon با smooth curves (Catmull-Rom spline)
  const polygonPath = useMemo(() => {
    if (categoryPoints.length === 0) return "";
    
    const points = categoryPoints.map(p => ({ x: p.x, y: p.y }));
    const n = points.length;
    
    if (n < 2) return "";
    
    // برای smooth curves، از Catmull-Rom spline استفاده می‌کنیم
    // با tension parameter برای کنترل smoothness
    const tension = 0.5;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];
      
      // محاسبه control points برای Catmull-Rom spline
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    path += " Z";
    return path;
  }, [categoryPoints]);

  return (
    <div className={`relative ${className}`} style={{ height: `${chartSize + 40}px`, width: "100%" }}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 flex items-center mb-2 z-10 px-1 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <h3 className={`text-sm font-semibold text-gray-800 dark:text-white ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
          {title}
        </h3>
        <button
          className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${isRTL ? 'ml-auto' : 'mr-auto'}`}
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

      {/* Chart Container */}
      <div className="relative mt-8" style={{ height: `${chartSize}px`, width: "100%" }}>
        <svg
          width="100%"
          height={chartSize}
          viewBox={`0 0 ${chartSize} ${chartSize}`}
          className="overflow-visible"
        >
          {/* Grid Circles */}
          {Array.from({ length: gridLevels }).map((_, level) => {
            const gridRadius = (radius * (level + 1)) / gridLevels;
            return (
              <circle
                key={`grid-${level}`}
                cx={centerX}
                cy={centerY}
                r={gridRadius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={1}
                className="dark:stroke-gray-700"
              />
            );
          })}

          {/* Grid Lines (Radial) */}
          {categoryPoints.map((point, index) => (
            <line
              key={`grid-line-${index}`}
              x1={centerX}
              y1={centerY}
              x2={point.labelX}
              y2={point.labelY}
              stroke="#e5e7eb"
              strokeWidth={1}
              className="dark:stroke-gray-700"
            />
          ))}

          {/* Scale Numbers - positioned along one axis (right side) */}
          {Array.from({ length: gridLevels }).map((_, level) => {
            const value = (level + 1) * gridStep;
            const labelRadius = (radius * (level + 1)) / gridLevels;
            // قرار دادن اعداد در سمت راست (محور اول یا راست)
            const labelAngle = categoryPoints.length > 0 
              ? categoryPoints[Math.floor(categoryPoints.length * 0.25)].angle 
              : 0; // اگر داده نداریم، از راست شروع می‌کنیم
            const labelX = centerX + labelRadius * Math.cos(labelAngle) + 12;
            const labelY = centerY + labelRadius * Math.sin(labelAngle) + 4;
            
            return (
              <text
                key={`scale-${level}`}
                x={labelX}
                y={labelY}
                textAnchor="start"
                fill="#9ca3af"
                fontSize="10"
                fontWeight="400"
                className="dark:fill-gray-500"
              >
                {Math.round(value)}
              </text>
            );
          })}

          {/* Data Polygon */}
          {categoryPoints.length > 0 && (
            <>
              {/* Filled area */}
              <path
                d={polygonPath}
                fill="#D8DCF7"
                fillOpacity={0.6}
                className="dark:fill-purple-900/30"
              />
              {/* Border */}
              <path
                d={polygonPath}
                fill="none"
                stroke="#8B92D9"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dark:stroke-purple-400"
              />
            </>
          )}

          {/* Data Points (Dots) - Dark purple circles */}
          {categoryPoints.map((point, index) => (
            <g key={`point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={4.5}
                fill="#6366f1"
                stroke="#fff"
                strokeWidth={1.5}
                className="dark:fill-purple-600 dark:stroke-gray-800"
                style={{
                  filter: "drop-shadow(0 1px 2px rgba(99, 102, 241, 0.3))",
                }}
              />
            </g>
          ))}

          {/* Category Labels */}
          {categoryPoints.map((point, index) => {
            const isRight = point.labelX > centerX;
            const isLeft = point.labelX < centerX;
            const isTop = point.labelY < centerY;
            const isBottom = point.labelY > centerY;
            const isVertical = Math.abs(point.labelX - centerX) < 10;
            
            return (
              <g key={`label-${index}`}>
                <text
                  x={point.labelX}
                  y={point.labelY}
                  textAnchor={
                    isVertical
                      ? "middle"
                      : isRight
                      ? "start"
                      : "end"
                  }
                  dominantBaseline={
                    isVertical
                      ? isTop
                        ? "text-after-edge"
                        : "text-before-edge"
                      : "middle"
                  }
                  fill="#374151"
                  fontSize="12"
                  fontWeight="500"
                  className="dark:fill-gray-300"
                  style={{
                    fontFamily: "IRANYekanX, sans-serif",
                  }}
                >
                  {point.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
