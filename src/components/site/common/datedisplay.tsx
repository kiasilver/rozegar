"use client";

import { formatPersianDate, formatShortDate, getRelativeTime } from "@/lib/utils/date-utils";

interface DateDisplayProps {
  date: Date | string;
  format?: "full" | "short" | "relative";
  showTime?: boolean;
  className?: string;
}

export default function DateDisplay({
  date,
  format = "short",
  showTime = false,
  className = "",
}: DateDisplayProps) {
  let displayText: string;

  switch (format) {
    case "full":
      displayText = formatPersianDate(date);
      break;
    case "relative":
      displayText = getRelativeTime(date);
      break;
    default:
      displayText = formatShortDate(date);
  }

  if (showTime && format !== "relative") {
    const d = typeof date === "string" ? new Date(date) : date;
    const time = d.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    displayText = `${displayText} - ${time}`;
  }

  return (
    <time dateTime={typeof date === "string" ? date : date.toISOString()} className={className}>
      {displayText}
    </time>
  );
}

