"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  is_active: boolean;
}

interface AdPreviewProps {
  ad: Ad;
  onClose?: () => void;
}

export default function AdPreview({ ad, onClose }: AdPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderAdContent = () => {
    switch (ad.type) {
      case "IMAGE":
        if (!ad.image_url) return <p className="text-red-500">تصویر یافت نشد</p>;
        
        const imageElement = (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              width={ad.width || 300}
              height={ad.height || 250}
              className="object-contain"
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        );

        // Check if link_url is valid
        const isValidUrl = (url: string | null | undefined): boolean => {
          if (!url || url.trim() === '') return false;
          try {
            // Try to create URL - works for absolute URLs
            new URL(url);
            return true;
          } catch {
            // Check if it's a valid relative path (starts with /)
            return url.startsWith('/');
          }
        };

        return ad.link_url && isValidUrl(ad.link_url) ? (
          ad.link_url.startsWith('http') || ad.link_url.startsWith('//') ? (
            // External URL - use regular anchor tag
            <a
              href={ad.link_url}
              target={ad.target || "_blank"}
              rel="noopener noreferrer"
              className="block"
            >
              {imageElement}
            </a>
          ) : (
            // Internal path - use Next.js Link
            <Link
              href={ad.link_url}
              target={ad.target || "_blank"}
              rel="noopener noreferrer"
              className="block"
            >
              {imageElement}
            </Link>
          )
        ) : (
          imageElement
        );

      case "GIF":
        if (!ad.image_url) return <p className="text-red-500">GIF یافت نشد</p>;
        
        // Use regular img tag for GIF to preserve animation
        const gifElement = (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              className="object-contain"
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        );

        // Check if link_url is valid
        const isValidUrlGif = (url: string | null | undefined): boolean => {
          if (!url || url.trim() === '') return false;
          try {
            new URL(url);
            return true;
          } catch {
            return url.startsWith('/');
          }
        };

        return ad.link_url && isValidUrlGif(ad.link_url) ? (
          ad.link_url.startsWith('http') || ad.link_url.startsWith('//') ? (
            <a
              href={ad.link_url}
              target={ad.target || "_blank"}
              rel="noopener noreferrer"
              className="block"
            >
              {gifElement}
            </a>
          ) : (
            <Link
              href={ad.link_url}
              target={ad.target || "_blank"}
              rel="noopener noreferrer"
              className="block"
            >
              {gifElement}
            </Link>
          )
        ) : (
          gifElement
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
          <div className="w-full">
            {mounted && (
              <div
                dangerouslySetInnerHTML={{ __html: ad.script_code || "" }}
              />
            )}
            {!mounted && (
              <div className="p-4 bg-gray-100 rounded text-sm text-gray-600">
                در حال بارگذاری اسکریپت...
              </div>
            )}
          </div>
        );

      default:
        return <p>نوع تبلیغ نامعتبر</p>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          پیش‌نمایش تبلیغ
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
      <div className="mb-2 text-xs text-gray-500 dark:text-white">
        موقعیت: {ad.position}
      </div>
        <div className="flex justify-center items-center min-h-[200px]">
          {renderAdContent()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-white">عنوان:</span>
          <p className="font-medium text-gray-800 dark:text-white">{ad.title || "بدون عنوان"}</p>
        </div>
        <div>
          <span className="text-gray-600 dark:text-white">وضعیت:</span>
          <p className="font-medium text-gray-800 dark:text-white">{ad.is_active ? "فعال" : "غیرفعال"}</p>
        </div>
        {ad.link_url && (
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-white">لینک:</span>
            <a
              href={ad.link_url}
              target={ad.target || "_blank"}
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline block truncate"
            >
              {ad.link_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
