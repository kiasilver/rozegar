"use client";
import React, { useRef, useEffect, useState, useMemo } from "react";
import { X, Search, Filter, Edit2, Save, RotateCcw } from "lucide-react";

interface AdvancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  editable?: boolean;
  onSave?: () => void;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  showFilters?: boolean;
  filters?: React.ReactNode;
}

export const AdvancedModal: React.FC<AdvancedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  searchable = false,
  searchPlaceholder = "جستجو...",
  onSearch,
  editable = false,
  onSave,
  className = "",
  maxWidth = "2xl",
  showFilters = false,
  filters,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isEditing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isEditing, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (onSearch) {
      const timeoutId = setTimeout(() => {
        onSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, onSearch]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto modal">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 h-full w-full bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthClasses[maxWidth]} mx-4 my-8 rounded-3xl bg-white shadow-2xl dark:bg-gray-900 transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-4 dark:border-gray-800 dark:bg-gray-900/95 rounded-t-3xl">
          <div className="flex items-center gap-4 flex-1">
            {title && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {editable && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isEditing
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {isEditing && onSave && (
              <button
                onClick={handleSave}
                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-all duration-200 dark:bg-green-900/30 dark:text-green-400"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showFilterPanel
                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchable && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && showFilterPanel && filters && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 animate-in slide-in-from-top-2">
            {filters}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-300px)] px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

