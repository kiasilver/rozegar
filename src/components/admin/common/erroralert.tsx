"use client";

import { X } from "lucide-react";

interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  type?: "error" | "warning" | "info";
}

export default function ErrorAlert({
  message,
  onClose,
  type = "error",
}: ErrorAlertProps) {
  const styles = {
    error: "bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-500 dark:text-yellow-300",
    info: "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300",
  };

  return (
    <div
      className={`${styles[type]} border px-4 py-3 rounded-lg relative flex items-center justify-between`}
      role="alert"
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-current hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

