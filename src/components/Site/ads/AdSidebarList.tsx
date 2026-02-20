"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdBanner from "./AdBanner";

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

interface AdSidebarListProps {
  position: string;
  limit?: number;
  className?: string;
  showPlaceholder?: boolean;
}

export default function AdSidebarList({ 
  position, 
  limit = 15, 
  className = "",
  showPlaceholder = true 
}: AdSidebarListProps) {
  const [ads, setAds] = useState<Ad[]>([]);
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
        
        // Sidebar ads همیشه sidebarEnabled را چک می‌کند
        setPositionEnabled(data.sidebarEnabled !== false);
      })
      .catch(() => {
        setAdsEnabled(true);
        setPlaceholderEnabled(true);
        setPositionEnabled(true);
      });

    // دریافت تبلیغات
    fetch(`/api/v1/public/ads?position=${encodeURIComponent(position)}&limit=${limit}`)
      .then((res) => res.json())
      .then((data: Ad[] | Ad | null) => {
        if (Array.isArray(data)) {
          setAds(data);
        } else if (data) {
          setAds([data]);
        } else {
          setAds([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ads:", err);
        setAds([]);
        setLoading(false);
      });
  }, [position, limit]);

  if (loading) {
    return null;
  }

  // اگر تبلیغات غیرفعال هستند یا موقعیت خاص غیرفعال است، چیزی نمایش نده
  if (!adsEnabled || !positionEnabled) {
    return null;
  }

      // اگر تبلیغی نیست و showPlaceholder و placeholderEnabled فعال هستند، متن جایگزین نمایش بده
      if (ads.length === 0 && showPlaceholder && placeholderEnabled) {
    return (
      <div className={`ad-sidebar-list ${className} space-y-3 sm:space-y-4`}>
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 md:p-4 min-h-[80px] sm:min-h-[100px]">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
              جای تبلیغ شما
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs mt-1">
              {position}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const renderAd = (ad: Ad) => {
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
      <div key={ad.id} className="ad-item w-full">
        {adContent()}
      </div>
    );
  };

  // اگر فقط یک تبلیغ داریم، از AdBanner استفاده کن
  if (ads.length === 1) {
    return (
      <div className={`ad-sidebar-list ${className}`}>
        {renderAd(ads[0])}
      </div>
    );
  }

  return (
    <div className={`ad-sidebar-list ${className} space-y-3 sm:space-y-4`}>
      {ads.map(renderAd)}
    </div>
  );
}

