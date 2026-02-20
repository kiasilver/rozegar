/**
 * Accordion Component با پشتیبانی Dark Mode
 */

"use client";

import { useState, ReactNode } from "react";

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: ReactNode;
}

// ChevronDown Icon Component
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = "",
  icon,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-all duration-200 ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {icon && <span className="text-lg sm:text-xl flex-shrink-0">{icon}</span>}
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-3 sm:p-4 pt-0 border-t border-gray-100 dark:border-gray-700/50">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AccordionGroupProps {
  children: ReactNode;
  className?: string;
}

export function AccordionGroup({
  children,
  className = "",
}: AccordionGroupProps) {
  return (
    <div className={`space-y-2 sm:space-y-3 ${className}`}>
      {children}
    </div>
  );
}

