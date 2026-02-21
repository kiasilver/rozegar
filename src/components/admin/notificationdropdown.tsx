"use client";
import React, { useState, useEffect, useRef } from "react";
import { Dropdown } from "@/components/shared/ui/dropdown/dropdown";
import { DropdownItem } from "@/components/shared/ui/dropdown/dropdownitem";
import Link from "next/link";

interface Notification {
  id: number;
  notificationId: number;
  title: string | null;
  message: string | null;
  type: string;
  link: string | null;
  createdAt: Date | null;
  isRead: boolean;
}

type TabType = "new" | "read";

export default function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("new");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationCountRef = useRef(0);

  // Load notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/v1/admin/system/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data: Notification[] = await res.json();

      // Check if there are new notifications
      const unreadCount = data.filter(n => !n.isRead).length;
      if (unreadCount > lastNotificationCountRef.current && lastNotificationCountRef.current > 0) {
        setHasNewNotifications(true);
        // Play sound
        if (audioRef.current) {
          audioRef.current.play().catch(err => {
            console.error("Error playing notification sound:", err);
          });
        }
      }
      lastNotificationCountRef.current = unreadCount;

      setNotifications(data);
      setHasNewNotifications(unreadCount > 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Create audio element for notification sound (optional - if file doesn't exist, it will fail silently)
    try {
      const audio = new Audio("/sounds/dropwater.mp3");
      audio.volume = 0.5;
      audio.preload = "auto";
      audio.onerror = () => {
        console.warn("⚠️ فایل صوتی notification یافت نشد");
        audioRef.current = null;
      };
      audioRef.current = audio;
    } catch (error) {
      console.warn("⚠️ خطا در ایجاد فایل صوتی notification:", error);
      audioRef.current = null;
    }

    // Initial fetch
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Auto switch to new tab when new notifications arrive
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount > 0 && activeTab === "read" && isOpen) {
      setActiveTab("new");
    }
  }, [notifications, activeTab, isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Switch to new tab if there are unread notifications
      const unreadCount = notifications.filter(n => !n.isRead).length;
      if (unreadCount > 0) {
        setActiveTab("new");
      }
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const markAsRead = async (notificationTargetId: number) => {
    try {
      await fetch("/api/v1/admin/system/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationTargetId, isRead: true }),
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationTargetId ? { ...n, isRead: true } : n
        )
      );
      setHasNewNotifications(notifications.filter(n => !n.isRead && n.id !== notificationTargetId).length > 0);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/v1/admin/system/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setHasNewNotifications(false);
      setActiveTab("read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید تمام اعلان‌ها را پاک کنید؟")) {
      return;
    }

    setIsClearing(true);
    try {
      await fetch("/api/v1/admin/system/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      setNotifications([]);
      setHasNewNotifications(false);
      lastNotificationCountRef.current = 0;
    } catch (error) {
      console.error("Error clearing notifications:", error);
      alert("خطا در پاک کردن اعلان‌ها");
    } finally {
      setIsClearing(false);
    }
  };

  const clearCurrentTabNotifications = async () => {
    const currentTabNotifications = activeTab === "new"
      ? notifications.filter(n => !n.isRead)
      : notifications.filter(n => n.isRead);

    if (currentTabNotifications.length === 0) return;

    if (!confirm(`آیا مطمئن هستید که می‌خواهید ${currentTabNotifications.length} اعلان ${activeTab === "new" ? "جدید" : "خوانده شده"} را پاک کنید؟`)) {
      return;
    }

    setIsClearing(true);
    try {
      await Promise.all(
        currentTabNotifications.map(notif =>
          fetch("/api/v1/admin/system/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationTargetId: notif.id }),
          })
        )
      );

      setNotifications(prev =>
        prev.filter(n =>
          activeTab === "new" ? n.isRead : !n.isRead
        )
      );

      if (activeTab === "new") {
        setHasNewNotifications(false);
        lastNotificationCountRef.current = 0;
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      alert("خطا در پاک کردن اعلان‌ها");
    } finally {
      setIsClearing(false);
    }
  };

  const deleteNotification = async (notificationTargetId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await fetch("/api/v1/admin/system/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationTargetId }),
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationTargetId));
      const remainingUnread = notifications.filter(n => !n.isRead && n.id !== notificationTargetId).length;
      setHasNewNotifications(remainingUnread > 0);
      lastNotificationCountRef.current = remainingUnread;
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "success":
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "همین الان";
    try {
      const now = new Date();
      const notificationDate = new Date(date);
      const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "همین الان";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} دقیقه پیش`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ساعت پیش`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} روز پیش`;
      }
    } catch {
      return "همین الان";
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);
  const unreadCount = unreadNotifications.length;
  const readCount = readNotifications.length;

  // Get current tab notifications
  const currentTabNotifications = activeTab === "new" ? unreadNotifications : readNotifications;
  const currentTabCount = activeTab === "new" ? unreadCount : readCount;

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-10 w-10 sm:h-11 sm:w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-[10px] sm:text-xs font-bold text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute inline-flex w-full h-full rounded-full bg-orange-400 opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current w-4 h-4 sm:w-5 sm:h-5"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[500px] sm:h-[600px] w-[calc(100vw-2rem)] sm:w-[400px] md:w-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 lg:right-0 overflow-hidden max-w-[420px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <h5 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">
              اعلان‌ها
            </h5>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 sm:h-6 px-2 sm:px-2.5 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-[10px] sm:text-xs font-bold text-white shadow-md">
                {unreadCount} جدید
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {activeTab === "new" && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="همه را خوانده شده علامت بزن"
              >
                <span className="hidden sm:inline">خوانده شده</span>
                <span className="sm:hidden">✓</span>
              </button>
            )}
            {currentTabCount > 0 && (
              <button
                onClick={clearCurrentTabNotifications}
                disabled={isClearing}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="پاک کردن اعلان‌های این تب"
              >
                {isClearing ? (
                  <span className="hidden sm:inline">در حال پاک کردن...</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">پاک کردن</span>
                    <span className="sm:hidden">🗑️</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="p-1 sm:p-1.5 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg
                className="fill-current w-4 h-4 sm:w-5 sm:h-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold transition-all relative ${activeTab === "new"
              ? "text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-800"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
          >
            <span>جدیدها</span>
            {unreadCount > 0 && (
              <span className={`flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full text-[10px] sm:text-xs font-bold ${activeTab === "new"
                ? "bg-orange-500 text-white"
                : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                }`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {activeTab === "new" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-red-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold transition-all relative ${activeTab === "read"
              ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
          >
            <span>خوانده شده</span>
            {readCount > 0 && (
              <span className={`flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full text-[10px] sm:text-xs font-bold ${activeTab === "read"
                ? "bg-blue-500 text-white"
                : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                }`}>
                {readCount > 9 ? "9+" : readCount}
              </span>
            )}
            {activeTab === "read" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
              </div>
            </div>
          ) : currentTabNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400 mb-1 text-center">
                {activeTab === "new" ? "هیچ اعلان جدیدی وجود ندارد" : "هیچ اعلان خوانده شده‌ای وجود ندارد"}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 text-center px-4">
                {activeTab === "new"
                  ? "اعلان‌های جدید اینجا نمایش داده می‌شوند"
                  : "اعلان‌های خوانده شده اینجا نمایش داده می‌شوند"}
              </p>
            </div>
          ) : (
            <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              {currentTabNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClose={closeDropdown}
                  getNotificationIcon={getNotificationIcon}
                  formatTime={formatTime}
                  isUnread={!notification.isRead}
                />
              ))}
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onClose: () => void;
  getNotificationIcon: (type: string) => React.ReactNode;
  formatTime: (date: Date | null) => string;
  isUnread: boolean;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
  getNotificationIcon,
  formatTime,
  isUnread,
}: NotificationItemProps) {
  return (
    <div
      className={`group relative flex gap-2 sm:gap-3 rounded-lg sm:rounded-xl border p-3 sm:p-4 transition-all duration-200 ${isUnread
        ? "border-blue-200 bg-gradient-to-r from-blue-50 to-white dark:border-blue-800 dark:from-blue-900/20 dark:to-gray-800 shadow-sm"
        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700/50"
        }`}
    >
      <div className="flex-shrink-0">
        {getNotificationIcon(notification.type)}
      </div>
      <Link
        href={notification.link || "#"}
        onClick={() => {
          if (!notification.isRead) {
            onMarkAsRead(notification.id);
          }
          onClose();
        }}
        className="flex-1 min-w-0"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
              <h6 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white/90 line-clamp-1">
                {notification.title || "اعلان"}
              </h6>
              {isUnread && (
                <span className="flex-shrink-0 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-orange-500 animate-pulse"></span>
              )}
            </div>
            {notification.message && (
              <p className="mb-1.5 sm:mb-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3 whitespace-pre-line">
                {notification.message}
              </p>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(notification.createdAt)}</span>
            </div>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => onDelete(notification.id, e)}
        className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 sm:p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
        title="حذف اعلان"
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
