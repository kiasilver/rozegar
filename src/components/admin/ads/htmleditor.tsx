"use client";

import React, { useState, useEffect, useRef } from "react";

interface HTMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function HTMLEditor({
  value,
  onChange,
  placeholder = "کد HTML تبلیغ",
  rows = 10,
}: HTMLEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const formatCode = () => {
    // Simple HTML formatting (basic indentation)
    const formatted = value
      .replace(/>\s*</g, ">\n<")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .join("\n");
    onChange(formatted);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-white">
          محتوای HTML
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={formatCode}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            فرمت کد
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors"
          >
            {showPreview ? "مخفی کردن پیش‌نمایش" : "نمایش پیش‌نمایش"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            style={{ minHeight: `${rows * 24}px` }}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {value.length} کاراکتر
          </p>
        </div>

        {showPreview && (
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              پیش‌نمایش:
            </h4>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: value || "<p className='text-gray-400'>پیش‌نمایش HTML</p>" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

