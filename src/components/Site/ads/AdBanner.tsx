"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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

interface AdBannerProps {
  position: string;
  className?: string;
  showPlaceholder?: boolean; // نمایش متن جایگزین
}

export default function AdBanner({ position, className = "", showPlaceholder = true }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [placeholderEnabled, setPlaceholderEnabled] = useState(true);
  const [positionEnabled, setPositionEnabled] = useState(true);

  useEffect(() => {
    // بررسی اینکه تبلیغات فعال هستند یا نه
    fetch(`/api/v1/public/ads/status`)
      .then((res) => res.json())
      .then((data: { enabled: boolean; placeholderEnabled?: boolean; headerEnabled?: boolean; sidebarEnabled?: boolean; bottomEnabled?: boolean }) => {
        setAdsEnabled(data.enabled);
        setPlaceholderEnabled(data.placeholderEnabled !== false);
        
        // بررسی فعال بودن موقعیت خاص
        if (position.includes('HEADER')) {
          setPositionEnabled(data.headerEnabled !== false);
        } else if (position.includes('SIDEBAR')) {
          setPositionEnabled(data.sidebarEnabled !== false);
        } else if (position.includes('BOTTOM') || position.includes('BANNER')) {
          setPositionEnabled(data.bottomEnabled !== false);
        } else {
          setPositionEnabled(true);
        }
      })
      .catch(() => {
        setAdsEnabled(true);
        setPlaceholderEnabled(true);
        setPositionEnabled(true);
      });

    // دریافت تبلیغ
    fetch(`/api/v1/public/ads?position=${encodeURIComponent(position)}`)
      .then((res) => res.json())
      .then((data: Ad | null) => {
        setAd(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ad:", err);
        setLoading(false);
      });
  }, [position]);

  if (loading) {
    return null;
  }

  // اگر تبلیغات غیرفعال هستند یا موقعیت خاص غیرفعال است، چیزی نمایش نده
  if (!adsEnabled || !positionEnabled) {
    return null;
  }

  // اگر تبلیغی نیست و showPlaceholder و placeholderEnabled فعال هستند، متن جایگزین نمایش بده
  if (!ad && showPlaceholder && placeholderEnabled) {
    return (
      <div className={`ad-banner ad-${position} ${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 md:p-4 min-h-[80px] sm:min-h-[100px]`}>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
            جای تبلیغ شما
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs mt-1">
            {position}
          </p>
        </div>
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  const adContent = () => {
    switch (ad.type) {
      case "IMAGE":
      case "GIF":
        if (!ad.image_url) return null;
        // استایل خاص برای BANNER_BOTTOM
        const isBannerBottom = position === "BANNER_BOTTOM";
        const imageElement = (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: isBannerBottom ? "15px 20px" : "0",
            }}
            className={isBannerBottom ? "sm:p-[20px] md:p-[30px]" : ""}
          >
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              className={`object-contain w-full ${isBannerBottom ? "sm:h-[70px] md:h-[90px]" : ""}`}
              style={{
                height: isBannerBottom ? "60px" : "auto",
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
              // ثبت کلیک
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
    <div className={`ad-banner ad-${position} ${className}`}>
      {adContent()}
    </div>
  );
}

