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

interface AdHeaderListProps {
  position: string;
  limit?: number;
  className?: string;
  showPlaceholder?: boolean;
}

export default function AdHeaderList({ 
  position, 
  limit = 2, 
  className = "",
  showPlaceholder = true 
}: AdHeaderListProps) {
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
        
        // Header ads همیشه headerEnabled را چک می‌کند
        setPositionEnabled(data.headerEnabled !== false);
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
      <div className={`ad-header-list ${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[80px] w-full`}>
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
            جای تبلیغ شما
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">
            {position}
          </p>
        </div>
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const renderAdContent = (ad: Ad) => {
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
            className="rounded"
          >
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              className="object-contain rounded"
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

  // اگر limit=1 باشد، wrapper ساده‌تری استفاده کن
  if (limit === 1) {
    if (ads.length === 0 && showPlaceholder && placeholderEnabled) {
      return (
        <div className={`ad-header-list ${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[80px] w-full`}>
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
              جای تبلیغ شما
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">
              {position}
            </p>
          </div>
        </div>
      );
    }
    if (ads.length === 0) {
      return null;
    }
    return (
      <div className={`ad-header-list ${className}`}>
        {renderAdContent(ads[0])}
      </div>
    );
  }

  return (
    <div className={`ad-header-list ${className} flex items-center justify-center gap-4`}>
      {ads.map((ad) => (
        <div key={ad.id} className="ad-item flex-1 min-w-0 max-w-[50%]">
          {renderAdContent(ad)}
        </div>
      ))}
      {/* اگر کمتر از 2 تبلیغ داریم، placeholder نمایش بده */}
      {ads.length < limit && showPlaceholder && placeholderEnabled && (
        Array.from({ length: limit - ads.length }).map((_, index) => (
          <div key={`placeholder-${index}`} className="flex-1 min-w-0 max-w-[50%] flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[80px]">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                جای تبلیغ شما
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

