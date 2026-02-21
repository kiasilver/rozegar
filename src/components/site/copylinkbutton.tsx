"use client";

interface CopyLinkButtonProps {
  url: string;
}

export default function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      navigator.clipboard.writeText(fullUrl);
      alert('لینک کپی شد!');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      aria-label="کپی لینک"
      title="کپی لینک"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  );
}

