"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdPreview from "@/components/Admin/ads/AdPreview";
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
  click_count: number;
  view_count: number;
  priority: number;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

export default function AdPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    fetch(`/api/admin/ads/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setAd(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ad:", err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="p-6">در حال بارگذاری...</div>;
  }

  if (!ad) {
    return (
      <div className="p-6">
        <p className="text-red-600">تبلیغ یافت نشد</p>
        <Link href="/admin/ads" className="text-blue-600 hover:underline mt-4 block">
          بازگشت به لیست تبلیغات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          پیش‌نمایش تبلیغ
        </h2>
        <div className="flex gap-2">
          <Link
            href={`/admin/ads/${ad.id}/edit`}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ویرایش
          </Link>
          <Link
            href="/admin/ads"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            بازگشت
          </Link>
        </div>
      </div>

      <AdPreview ad={ad} />

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          آمار تبلیغ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">بازدید</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {ad.view_count.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">کلیک</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {ad.click_count.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">CTR</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {ad.view_count > 0
                ? ((ad.click_count / ad.view_count) * 100).toFixed(2)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">اولویت</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {ad.priority}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
