"use client";

import { CheckCircle, X } from "lucide-react";

interface SuccessAlertProps {
  message: string;
  onClose?: () => void;
}

export default function SuccessAlert({ message, onClose }: SuccessAlertProps) {
  return (
    <div
      className="bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-500 dark:text-green-300 px-4 py-3 rounded-lg relative flex items-center gap-2"
      role="alert"
    >
      <CheckCircle className="w-5 h-5 flex-shrink-0" />
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="mr-auto text-current hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

