"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ShortLinkButtonProps {
  shortLink: string;
  code?: string;
}

export default function ShortLinkButton({ shortLink, code }: ShortLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  const fullShortLink = `${baseUrl}/${shortLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullShortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {code && (
        <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-mono">
          کد: {code}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        title="کپی لینک کوتاه"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            کپی شد!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            کپی لینک کوتاه
          </>
        )}
      </button>
    </div>
  );
}

