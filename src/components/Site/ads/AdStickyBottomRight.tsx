"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface Ad {
  id: number;
  title?: string | null;
  position: string;
  type: "IMAGE" | "GIF" | "HTML" | "SCRIPT";
  image_url?: string | null;
  html_content?: string | null;
  script_code?: string | null;
  link_url?: string | null;
  target?: string | null;
  width?: number | null;
  height?: number | null;
}

export default function AdStickyBottomRight() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [positionEnabled, setPositionEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // بررسی اینکه کاربر قبلاً این تبلیغ را بسته است
    if (typeof window !== 'undefined') {
      const closedAdId = localStorage.getItem('ad_closed_sticky_bottom_right');
      if (closedAdId) {
        setIsVisible(false);
        setLoading(false);
        return;
      }
    }

    // بررسی اینکه تبلیغات فعال هستند یا نه
    fetch(`/api/v1/public/ads/status`)
      .then((res) => res.json())
      .then((data: { enabled: boolean; bottomEnabled?: boolean }) => {
        setAdsEnabled(data.enabled);
        setPositionEnabled(data.bottomEnabled !== false);
      })
      .catch(() => {
        setAdsEnabled(true);
        setPositionEnabled(true);
      });

    // دریافت تبلیغ
    fetch(`/api/v1/public/ads?position=${encodeURIComponent("STICKY_BOTTOM_RIGHT")}`)
      .then((res) => res.json())
      .then((data: Ad | null) => {
        setAd(data);
        setLoading(false);
        // اگر تبلیغی دریافت شد، بررسی کن که آیا قبلاً بسته شده
        if (data && typeof window !== 'undefined') {
          const closedAdId = localStorage.getItem(`ad_closed_${data.id}`);
          if (closedAdId) {
            setIsVisible(false);
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching ad:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return null;
  }

  // اگر تبلیغات غیرفعال هستند یا موقعیت خاص غیرفعال است، چیزی نمایش نده
  if (!adsEnabled || !positionEnabled) {
    return null;
  }

  // اگر تبلیغی نیست، چیزی نمایش نده
  if (!ad) {
    return null;
  }

  // اگر کاربر تبلیغ را بسته است، چیزی نمایش نده
  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    // ذخیره در localStorage که کاربر تبلیغ را بسته است
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ad_closed_${ad.id}`, 'true');
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const adContent = () => {
    switch (ad.type) {
      case "IMAGE":
      case "GIF":
        if (!ad.image_url) return null;
        const imageElement = (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            className="rounded-lg"
          >
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              className="object-contain rounded-lg"
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        );
        return ad.link_url ? (
          <Link
            href={ad.link_url}
            target={ad.target || "_blank"}
            rel="noopener noreferrer"
            onClick={() => {
              fetch(`/api/v1/public/ads/${ad.id}/click`, { method: "POST" }).catch(
                console.error
              );
            }}
          >
            {imageElement}
          </Link>
        ) : (
          imageElement
        );

      case "HTML":
        return (
          <div
            dangerouslySetInnerHTML={{ __html: ad.html_content || "" }}
            className="w-full"
          />
        );

      case "SCRIPT":
        return (
          <div
            dangerouslySetInnerHTML={{ __html: ad.script_code || "" }}
            className="w-full"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`fixed bottom-2 left-2 sm:bottom-4 sm:left-4 z-50 transition-all duration-300 ${
        isMinimized ? 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 sm:max-w-[56px] md:max-w-[64px]' : 'w-auto'
      }`}
      style={{
        maxWidth: isMinimized ? '48px' : ad.width ? `min(${ad.width}px, 90vw)` : 'min(300px, 90vw)',
      }}
    >
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* دکمه‌های کنترل */}
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex gap-0.5 sm:gap-1 z-10">
          <button
            onClick={handleMinimize}
            className="p-0.5 sm:p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            aria-label={isMinimized ? "باز کردن" : "کوچک کردن"}
          >
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMinimized ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              )}
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="p-0.5 sm:p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            aria-label="بستن"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* محتوای تبلیغ */}
        {!isMinimized && (
          <div className="p-1.5 sm:p-2">
            {adContent()}
          </div>
        )}

        {/* حالت minimized - نمایش آیکون کوچک */}
        {isMinimized && (
          <div
            onClick={handleMinimize}
            className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-100 dark:bg-gray-700"
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

