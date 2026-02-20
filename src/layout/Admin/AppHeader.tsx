"use client";
import { ThemeToggleButton } from "@/components/Admin/common/ThemeToggleButton";
import { LanguageToggleButton } from "@/components/Admin/common/LanguageToggleButton";
import AdminNotificationDropdown from "@/components/Admin/NotificationDropdown";
import UserDropdown from "@/components/Shared/Header/UserDropdown";
import AIContentStatusIcon from "@/components/Admin/automation/AIContentStatusIcon";
import CarPriceStatusIcon from "@/components/Admin/car-prices/CarPriceStatusIcon";
import NewspaperStatusIcon from "@/components/Admin/newspaper/NewspaperStatusIcon";
import PriceTickerStatusIcon from "@/components/Admin/undefined-rss/PriceTickerStatusIcon";
import { useSidebar } from "@/context/Admin/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        toggleSidebar();
      } else {
        toggleMobileSidebar();
      }
    }
  };

  return (
    <header className="sticky top-0 z-[998] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="w-full px-2">
        {/* Header Content */}
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left Side */}
          <div className="flex items-center gap-2 lg:gap-4 flex-1">
            {/* Sidebar Toggle */}
            <button
              onClick={handleToggle}
              className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle Sidebar"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Status Icons - Desktop Only */}
            <div className="hidden md:flex items-center gap-2 ml-4">
              <AIContentStatusIcon />
              <CarPriceStatusIcon />
              <NewspaperStatusIcon />
              <PriceTickerStatusIcon />
            </div>
          </div>

          {/* Right Side */}
          <ul className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Status Icons */}
            <li className="md:hidden flex items-center gap-1">
              <AIContentStatusIcon />
              <CarPriceStatusIcon />
              <NewspaperStatusIcon />
              <PriceTickerStatusIcon />
            </li>

            {/* Language Selector */}
            <li className="hidden sm:block">
              <LanguageToggleButton />
            </li>

            {/* Theme Toggle */}
            <li>
              <ThemeToggleButton />
            </li>

            {/* Notifications */}
            <li className="hidden xl:block">
              <AdminNotificationDropdown />
            </li>

            {/* User Dropdown */}
            <li>
              <UserDropdown />
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
