"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/Admin/ui/badge/Badge";
import Input from "@/components/Admin/form/input/InputField";
import Select from "@/components/Admin/form/Select";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import { Modal } from "@/components/Admin/ui/modal";
import AdPreview from "@/components/Admin/ads/AdPreview";

interface Ad {
  id: number;
  title?: string | null;
  position: string;
  type: "IMAGE" | "GIF" | "HTML" | "SCRIPT";
  image_url?: string | null;
  is_active: boolean;
  click_count: number;
  view_count: number;
  priority: number;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

export default function AdsListPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAds, setSelectedAds] = useState<number[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/content/ads")
      .then((res) => res.json())
      .then((data) => {
        setAds(data);
        setFilteredAds(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching ads:", err);
        setLoading(false);
      });
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...ads];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (ad) =>
          ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          positionLabels[ad.position]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Position filter
    if (positionFilter) {
      filtered = filtered.filter((ad) => ad.position === positionFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((ad) => ad.type === typeFilter);
    }

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((ad) => ad.is_active);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((ad) => !ad.is_active);
    }

    // Date filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter((ad) => {
        const adDate = new Date(ad.created_at);
        return adDate >= fromDate;
      });
    }
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((ad) => {
        const adDate = new Date(ad.created_at);
        return adDate <= toDate;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "views":
          return b.view_count - a.view_count;
        case "clicks":
          return b.click_count - a.click_count;
        case "priority":
          return b.priority - a.priority;
        default:
          return 0;
      }
    });

    setFilteredAds(filtered);
  }, [ads, searchQuery, positionFilter, typeFilter, statusFilter, dateFromFilter, dateToFilter, sortBy]);

  const handleDelete = async (id: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این تبلیغ را حذف کنید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/content/ads/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAds(ads.filter((ad) => ad.id !== id));
      } else {
        alert("خطا در حذف تبلیغ");
      }
    } catch (error) {
      console.error("Error deleting ad:", error);
      alert("خطا در حذف تبلیغ");
    }
  };

  const handleBulkAction = async (action: "delete" | "activate" | "deactivate") => {
    if (selectedAds.length === 0) {
      alert("لطفاً حداقل یک تبلیغ را انتخاب کنید");
      return;
    }

    const confirmMessage =
      action === "delete"
        ? `آیا مطمئن هستید که می‌خواهید ${selectedAds.length} تبلیغ را حذف کنید؟`
        : `آیا می‌خواهید ${selectedAds.length} تبلیغ را ${action === "activate" ? "فعال" : "غیرفعال"} کنید؟`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch("/api/v1/admin/content/ads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedAds,
          action,
        }),
      });

      if (res.ok) {
        if (action === "delete") {
          setAds(ads.filter((ad) => !selectedAds.includes(ad.id)));
        } else {
          setAds(
            ads.map((ad) =>
              selectedAds.includes(ad.id)
                ? { ...ad, is_active: action === "activate" }
                : ad
            )
          );
        }
        setSelectedAds([]);
        alert("عملیات با موفقیت انجام شد");
      } else {
        alert("خطا در انجام عملیات");
      }
    } catch (error) {
      console.error("Error in bulk action:", error);
      alert("خطا در انجام عملیات");
    }
  };

  const handleExport = (format: "csv" | "excel" = "csv") => {
    const headers = ["عنوان", "موقعیت", "نوع", "وضعیت", "بازدید", "کلیک", "CTR", "اولویت", "تاریخ ایجاد"];
    const rows = filteredAds.map((ad) => [
      ad.title || "",
      positionLabels[ad.position] || ad.position,
      ad.type === "IMAGE" ? "تصویر" : ad.type === "HTML" ? "HTML" : "اسکریپت",
      ad.is_active ? "فعال" : "غیرفعال",
      ad.view_count,
      ad.click_count,
      calculateCTR(ad) + "%",
      ad.priority,
      new Date(ad.created_at).toLocaleDateString("fa-IR"),
    ]);

    if (format === "csv") {
      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ads-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } else {
      // Excel format (TSV with UTF-8 BOM)
      const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
      const blob = new Blob(["\uFEFF" + tsv], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ads-${new Date().toISOString().split("T")[0]}.xls`;
      link.click();
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedAds((prev) =>
      prev.includes(id) ? prev.filter((adId) => adId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAds.length === filteredAds.length) {
      setSelectedAds([]);
    } else {
      setSelectedAds(filteredAds.map((ad) => ad.id));
    }
  };

  const positionLabels: Record<string, string> = {
    BANNER_TOP_HEADER_LEFT: "بنر بالای هدر - چپ",
    BANNER_TOP_HEADER_RIGHT: "بنر بالای هدر - راست",
    SIDEBAR_TOP: "بالای sidebar",
    SIDEBAR_MIDDLE: "وسط sidebar",
    SIDEBAR_BOTTOM: "پایین sidebar",
    CONTENT_TOP: "بالای محتوا",
    CONTENT_MIDDLE: "وسط محتوا",
    CONTENT_BOTTOM: "پایین محتوا",
    BANNER_BOTTOM: "بنر پایین صفحه",
    STICKY_BOTTOM_RIGHT: "چسبنده پایین راست",
  };

  const calculateCTR = (ad: Ad) => {
    if (ad.view_count === 0) return 0;
    return ((ad.click_count / ad.view_count) * 100).toFixed(2);
  };

  if (loading) {
    return <div className="p-4 sm:p-5 md:p-6 text-sm sm:text-base">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <PageBreadcrumb pageTitle="مدیریت تبلیغات" />
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          مدیریت تبلیغات ({filteredAds.length})
        </h2>
        <div className="flex gap-1.5 sm:gap-2">
          <Link
            href="/admin/reports?tab=ads"
            className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
          >
            گزارش‌ها
          </Link>
          <Link
            href="/admin/ads/add"
            className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
          >
            افزودن تبلیغ جدید
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Input
              type="text"
              placeholder="جستجو در عنوان و موقعیت..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Position Filter */}
          <div>
            <Select
              value={positionFilter}
              onChange={(value) => setPositionFilter(value)}
              options={[
                { value: "", label: "همه موقعیت‌ها" },
                ...Object.entries(positionLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>

          {/* Type Filter */}
          <div>
            <Select
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={[
                { value: "", label: "همه انواع" },
                { value: "IMAGE", label: "تصویر" },
                { value: "GIF", label: "GIF متحرک" },
                { value: "HTML", label: "HTML" },
                { value: "SCRIPT", label: "اسکریپت" },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "", label: "همه وضعیت‌ها" },
                { value: "active", label: "فعال" },
                { value: "inactive", label: "غیرفعال" },
              ]}
            />
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              از تاریخ
            </label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="dark:invert dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
              تا تاریخ
            </label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="dark:invert dark:[color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between flex-wrap gap-3 sm:gap-4">
          {/* Sort */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">مرتب‌سازی:</label>
            <Select
              value={sortBy}
              onChange={(value) => setSortBy(value)}
              options={[
                { value: "newest", label: "جدیدترین" },
                { value: "oldest", label: "قدیمی‌ترین" },
                { value: "views", label: "پربازدیدترین" },
                { value: "clicks", label: "پربازدیدترین کلیک" },
                { value: "priority", label: "اولویت" },
              ]}
            />
          </div>

          {/* Bulk Actions */}
          {selectedAds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => handleBulkAction("activate")}
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
              >
                فعال ({selectedAds.length})
              </button>
              <button
                onClick={() => handleBulkAction("deactivate")}
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs sm:text-sm"
              >
                غیرفعال ({selectedAds.length})
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs sm:text-sm"
              >
                حذف ({selectedAds.length})
              </button>
            </div>
          )}

          {/* Export */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto -mx-2 sm:-mx-3 md:-mx-4 lg:-mx-6">
          <div className="inline-block min-w-full align-middle px-2 sm:px-3 md:px-4 lg:px-6">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-8 sm:w-10 md:w-12">
                    <input
                      type="checkbox"
                      checked={selectedAds.length === filteredAds.length && filteredAds.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 w-3.5 h-3.5 sm:w-4 sm:h-4"
                    />
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عنوان
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    موقعیت
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    نوع
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    بازدید
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    کلیک
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    CTR
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAds.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAds.includes(ad.id)}
                        onChange={() => toggleSelect(ad.id)}
                        className="rounded border-gray-300 w-3.5 h-3.5 sm:w-4 sm:h-4"
                      />
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {ad.image_url && (ad.type === "IMAGE" || ad.type === "GIF") && (
                          <img
                            src={ad.image_url}
                            alt={ad.title || "Ad"}
                            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{ad.title || "بدون عنوان"}</span>
                      </div>
                      {/* نمایش موقعیت در موبایل */}
                      <div className="md:hidden mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {positionLabels[ad.position] || ad.position}
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {positionLabels[ad.position] || ad.position}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {ad.type === "IMAGE" ? "تصویر" : ad.type === "GIF" ? "GIF" : ad.type === "HTML" ? "HTML" : "اسکریپت"}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <Badge color={ad.is_active ? "success" : "light"}>
                        {ad.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {ad.view_count.toLocaleString()}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {ad.click_count.toLocaleString()}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell">
                      {calculateCTR(ad)}%
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        <Link
                          href={`/admin/ads/${ad.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-[10px] sm:text-xs"
                        >
                          ویرایش
                        </Link>
                        <button
                          onClick={() => setPreviewAd(ad)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-[10px] sm:text-xs text-right sm:text-left"
                        >
                          پیش‌نمایش
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-[10px] sm:text-xs text-right sm:text-left"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAds.length === 0 && (
          <div className="text-center py-8 sm:py-10 md:py-12 text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
            {ads.length === 0 ? (
              <>
                تبلیغی یافت نشد.{" "}
                <Link
                  href="/admin/ads/add"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  افزودن تبلیغ جدید
                </Link>
              </>
            ) : (
              "نتیجه‌ای با فیلترهای انتخابی یافت نشد."
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAd && (
        <Modal
          isOpen={!!previewAd}
          onClose={() => setPreviewAd(null)}
          className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl m-2 sm:m-4"
        >
          <div className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                پیش‌نمایش تبلیغ
              </h3>
              <button
                onClick={() => setPreviewAd(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl sm:text-2xl"
              >
                ✕
              </button>
            </div>
            <AdPreview ad={previewAd} />
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2">
              <Link
                href={`/admin/ads/${previewAd.id}/edit`}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm text-center"
              >
                ویرایش
              </Link>
              <button
                onClick={() => setPreviewAd(null)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 text-xs sm:text-sm"
              >
                بستن
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
