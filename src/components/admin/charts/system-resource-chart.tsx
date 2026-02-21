"use client";

import * as React from "react";

export function ResourceUsageChart({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label}: {value}%
    </div>
  );
}

