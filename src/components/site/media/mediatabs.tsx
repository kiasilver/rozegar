"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface MediaTabsProps {
  activeTab: 'video' | 'infographic';
}

export default function MediaTabs({ activeTab }: MediaTabsProps) {
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') || '1';

  return (
    <div className="flex text-sm justify-center pb-4 gap-3 sm:gap-4 mb-6 border-b border-gray-200">
      <Link
        href={`/media?tab=video&page=${currentPage}`}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'video'
            ? 'bg-blue-600 text-white font-semibold'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        ویدیو
      </Link>
      <Link
        href={`/media?tab=infographic&page=${currentPage}`}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'infographic'
            ? 'bg-blue-600 text-white font-semibold'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        اینفوگرافی
      </Link>
    </div>
  );
}

