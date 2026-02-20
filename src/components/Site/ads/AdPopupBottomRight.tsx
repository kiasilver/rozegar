"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

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

export default function AdPopupBottomRight() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [positionEnabled, setPositionEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isGif, setIsGif] = useState(false);

  useEffect(() => {
    // بررسی اینکه کاربر قبلاً این تبلیغ را بسته است
    if (typeof window !== 'undefined') {
      const closedAdId = localStorage.getItem('ad_closed_popup_bottom_right');
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
        
        // بررسی نوع فایل
        if (data?.image_url) {
          const url = data.image_url.toLowerCase();
          if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.endsWith('.mov')) {
            setIsVideo(true);
          } else if (url.endsWith('.gif')) {
            setIsGif(true);
          }
        }
        
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

  useEffect(() => {
    // Auto-play video if it's a video ad
    if (isVideo && videoRef.current && isVisible && ad) {
      videoRef.current.play().catch(() => {
        // Auto-play ممکن است block شود
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isVideo, isVisible, ad]);

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
      localStorage.setItem('ad_closed_popup_bottom_right', 'true');
    }
    // توقف ویدیو در صورت وجود
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const renderAdContent = () => {
    if (isVideo && ad.image_url) {
      return (
        <div className="relative w-full">
          <video
            ref={videoRef}
            src={ad.image_url}
            className="w-full h-auto rounded-t-lg sm:max-h-[250px] md:max-h-[300px]"
            muted={isMuted}
            loop
            playsInline
            onClick={handleVideoClick}
            style={{
              maxHeight: '200px',
              objectFit: 'cover',
            }}
          />
          {/* کنترل‌های ویدیو */}
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleToggleMute}
              className="bg-black/50 hover:bg-black/70 text-white p-1 sm:p-1.5 rounded-full transition-colors"
              aria-label={isMuted ? "فعال‌سازی صدا" : "غیرفعال‌سازی صدا"}
            >
              {isMuted ? (
                <VolumeOffIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <VolumeUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
            <button
              onClick={handleVideoClick}
              className="bg-black/50 hover:bg-black/70 text-white p-1 sm:p-1.5 rounded-full transition-colors"
              aria-label={isPlaying ? "توقف" : "پخش"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (isGif && ad.image_url) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
          className="rounded-t-lg"
        >
          <img
            src={ad.image_url}
            alt={ad.title || "Advertisement"}
            className="object-contain rounded-t-lg w-full h-auto"
          />
        </div>
      );
    }

    if ((ad.type === "IMAGE" || ad.type === "GIF") && ad.image_url) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
          className="rounded-t-lg"
        >
          <img
            src={ad.image_url}
            alt={ad.title || "Advertisement"}
            className="object-contain rounded-t-lg w-full h-auto"
          />
        </div>
      );
    }

    if (ad.type === "HTML" && ad.html_content) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: ad.html_content }}
          className="w-full rounded-t-lg overflow-hidden"
        />
      );
    }

    if (ad.type === "SCRIPT" && ad.script_code) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: ad.script_code }}
          className="w-full rounded-t-lg overflow-hidden"
        />
      );
    }

    return null;
  };

  const adContent = renderAdContent();

  if (!adContent) {
    return null;
  }

  const content = ad.link_url ? (
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
      className="block"
    >
      {adContent}
    </Link>
  ) : (
    adContent
  );

  return (
    <div 
      className="fixed bottom-2 left-2 sm:bottom-4 sm:left-4 z-50 w-[calc(100vw-16px)] sm:w-[320px] md:w-[380px] lg:w-[400px] max-w-[400px] shadow-2xl rounded-lg overflow-hidden bg-gray-800 dark:bg-gray-900"
      style={{
        animation: 'slideUp 0.5s ease-out',
      }}
    >
      {/* دکمه بستن */}
      <button
        onClick={handleClose}
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 bg-black/50 hover:bg-black/70 text-white p-1 sm:p-1.5 rounded-full transition-colors"
        aria-label="بستن تبلیغ"
      >
        <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* محتوای تبلیغ */}
      <div className="bg-gray-800 dark:bg-gray-900">
        {content}
        
        {/* بخش متن و دکمه (در صورت نیاز) */}
        {(ad.title || ad.link_url) && (
          <div className="p-3 sm:p-4 bg-gray-800 dark:bg-gray-900 text-white">
            {ad.title && (
              <div className="mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-sm font-semibold mb-1">{ad.title}</h3>
                {ad.html_content && (
                  <p className="text-[10px] sm:text-xs text-gray-300 leading-relaxed line-clamp-2">
                    {ad.html_content.replace(/<[^>]*>/g, '').substring(0, 100)}
                  </p>
                )}
              </div>
            )}
            {ad.link_url && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (ad.link_url) {
                    window.open(ad.link_url, ad.target || "_blank");
                    fetch(`/api/v1/public/ads/${ad.id}/click`, { method: "POST" }).catch(
                      console.error
                    );
                  }
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm font-medium"
              >
                ثبت نام
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

