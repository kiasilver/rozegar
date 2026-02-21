"use client";

import { useEffect, useState } from "react";
import { useAlert } from "@/context/admin/alertcontext";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import Label from "@/components/admin/form/label";
import Input from "@/components/admin/form/input/inputfield";
import Checkbox from "@/components/admin/form/input/checkbox";
import Button from "@/components/admin/ui/button/button";

interface Newspaper {
  name: string;
  url: string;
  pdfUrl?: string;
  englishName?: string;
}

export default function NewspaperPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rssUrl, setRssUrl] = useState("https://www.pishkhan.com?type=economics");
  const [downloadTime, setDownloadTime] = useState("07:30");
  const [newspapers, setNewspapers] = useState<Newspaper[]>([]);
  const [newspaperCount, setNewspaperCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [lastDownloadDate, setLastDownloadDate] = useState<string | null>(null);
  const [lastDownloadTime, setLastDownloadTime] = useState<string | null>(null);
  const [archiveDays, setArchiveDays] = useState(15);

  useEffect(() => {
    fetchSettings();
    fetchLastDownloadInfo();
  }, []);

  const fetchLastDownloadInfo = async () => {
    try {
      const response = await fetch("/api/v1/admin/content/newspapers/last-download");
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          console.error('Last download API returned HTML instead of JSON');
          return;
        }
      }
      if (response.ok) {
        const data = await response.json();
        setLastDownloadDate(data.lastDownloadDate || null);
        setLastDownloadTime(data.lastDownloadTime || null);
      }
    } catch (error) {
      console.error("Error fetching last download info:", error);
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.error('JSON parsing error - likely HTML response');
      }
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/admin/content/newspapers");
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          console.error('Settings API returned HTML instead of JSON');
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }
      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled || false);
        setRssUrl(data.rssUrl || "https://www.pishkhan.com?type=economics");
        setDownloadTime(data.downloadTime || "07:30");
        setArchiveDays(data.archiveDays || 15);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
      } else {
        showAlert("خطا در دریافت تنظیمات", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("💾 ذخیره تنظیمات:", { enabled, rssUrl });
      const response = await fetch("/api/v1/admin/content/newspapers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          rssUrl,
          downloadTime,
          archiveDays,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        console.log("✅ تنظیمات ذخیره شد:", data);
        showAlert("تنظیمات با موفقیت ذخیره شد", "success");
        // به‌روزرسانی تنظیمات از سرور برای اطمینان
        await fetchSettings();
      } else {
        let data;
        try {
          data = await response.json();
        } catch {
          data = { error: 'خطا در ذخیره تنظیمات' };
        }
        console.error("❌ خطا در ذخیره:", data);
        showAlert(data.error || "خطا در ذخیره تنظیمات", "error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showAlert("خطا در ذخیره تنظیمات", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      // ابتدا تنظیمات را ذخیره کن تا URL جدید در دیتابیس ثبت شود
      await fetch("/api/v1/admin/content/newspapers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          rssUrl,
          downloadTime,
        }),
      });

      // سپس تست را انجام بده - با forceDownload=true تا PDF‌های جدید دانلود شوند
      const response = await fetch("/api/v1/public/newspapers?forceDownload=true");
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNewspapers(data.newspapers || []);
          setNewspaperCount(data.count || 0);
          showAlert(
            `✅ ${data.count} روزنامه با موفقیت دریافت شد`,
            "success"
          );
        } else {
          showAlert(
            data.message || "خطا در دریافت روزنامه‌ها",
            "error"
          );
        }
      } else {
        showAlert("خطا در دریافت روزنامه‌ها", "error");
      }
    } catch (error) {
      console.error("Error testing newspapers:", error);
      showAlert("خطا در تست دریافت روزنامه‌ها", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleDownloadPDFs = async () => {
    try {
      setDownloading(true);
      showAlert("در حال دانلود PDF روزنامه‌ها... این فرآیند ممکن است چند دقیقه طول بکشد", "info");

      const response = await fetch("/api/v1/admin/content/newspapers/download-pdfs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showAlert(
            `✅ ${data.result?.newspapersWithPDF || 0} PDF با موفقیت دانلود شد`,
            "success"
          );
          // به‌روزرسانی اطلاعات آخرین دانلود
          await fetchLastDownloadInfo();
          // به‌روزرسانی لیست روزنامه‌ها
          await handleTest();
        } else {
          showAlert(
            data.message || "خطا در دانلود PDF‌ها",
            "error"
          );
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'خطا در دانلود PDF‌ها' };
        }
        showAlert(
          errorData.error || "خطا در دانلود PDF‌ها",
          "error"
        );
      }
    } catch (error) {
      console.error("Error downloading PDFs:", error);
      showAlert("خطا در دانلود PDF‌ها", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAllPDFs = async () => {
    if (!confirm("⚠️ هشدار: آیا مطمئن هستید که می‌خواهید همه PDF های روزنامه‌ها را حذف کنید؟ این عمل غیرقابل بازگشت است!")) {
      return;
    }

    try {
      setDeletingAll(true);
      showAlert("در حال پاک کردن همه PDF ها...", "info");

      const response = await fetch("/api/v1/admin/content/newspapers/delete-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showAlert(
            `✅ ${data.deletedCount} فایل با موفقیت حذف شد`,
            "success"
          );
        } else {
          showAlert(
            data.message || "خطا در پاک کردن فایل‌ها",
            "error"
          );
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'خطا در پاک کردن فایل‌ها' };
        }
        showAlert(
          errorData.error || "خطا در پاک کردن فایل‌ها",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting all PDFs:", error);
      showAlert("خطا در پاک کردن فایل‌ها", "error");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleCleanupOldPDFs = async () => {
    if (!confirm(`آیا مطمئن هستید که می‌خواهید PDF های قدیمی‌تر از ${archiveDays} روز را حذف کنید؟`)) {
      return;
    }

    try {
      setCleaning(true);
      showAlert("در حال پاک کردن PDF های قدیمی...", "info");

      const response = await fetch("/api/v1/admin/content/newspapers/cleanup-old", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          showAlert("خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید", "error");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showAlert(
            `✅ ${data.deletedCount} فایل قدیمی با موفقیت حذف شد`,
            "success"
          );
        } else {
          showAlert(
            data.message || "خطا در پاک کردن فایل‌ها",
            "error"
          );
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'خطا در پاک کردن فایل‌ها' };
        }
        showAlert(
          errorData.error || "خطا در پاک کردن فایل‌ها",
          "error"
        );
      }
    } catch (error) {
      console.error("Error cleaning up old PDFs:", error);
      showAlert("خطا در پاک کردن فایل‌ها", "error");
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="روزنامه اقتصاد روز" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb pageTitle="روزنامه اقتصاد روز" />
        <a
          href="/newspaper-kiosk"
          target="_blank"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          مشاهده کیوسک دیجیتال
        </a>
      </div>

      {/* تنظیمات اصلی */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
          تنظیمات روزنامه اقتصاد روز
        </h3>

        <div className="space-y-6">
          {/* فعال/غیرفعال */}
          <div className="flex items-center justify-between">
            <Label className="mb-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                فعال کردن روزنامه‌ها
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                با فعال کردن این گزینه، روزنامه‌ها در صفحه اصلی نمایش داده می‌شوند
              </p>
            </Label>
            <Checkbox
              checked={enabled}
              onChange={(checked) => setEnabled(checked)}
            />
          </div>

          {/* URL RSS */}
          <div>
            <Label>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                آدرس RSS / صفحه روزنامه‌ها
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
                آدرس صفحه pishkhan.com که روزنامه‌های اقتصادی از آن دریافت می‌شوند (باید شامل type=economics باشد)
              </p>
              <Input
                type="text"
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder="https://www.pishkhan.com?date=14040916&type=economics"
                className="w-full"
              />
            </Label>
          </div>

          {/* تنظیم ساعت دانلود خودکار */}
          <div>
            <Label>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ساعت دانلود خودکار (به وقت تهران)
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
                ساعت اجرای cron job برای دانلود خودکار PDF روزنامه‌ها (فرمت: HH:MM)
              </p>
              <Input
                type="time"
                value={downloadTime}
                onChange={(e) => setDownloadTime(e.target.value)}
                className="w-full max-w-xs dark:[color-scheme:dark]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⏰ پیشنهاد: ساعت 7:30 صبح (یک ساعت بعد از به‌روزرسانی روزنامه‌ها)
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ برای فعال شدن، باید cron job را در سرور تنظیم کنید (راهنمای کامل در فایل NEWSPAPER_AUTO_DOWNLOAD_README.md)
              </p>
            </Label>
          </div>

          {/* تنظیم تعداد روزهای آرشیو */}
          <div>
            <Label>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                تعداد روزهای آرشیو (برای کیوسک دیجیتال)
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
                تعداد روزهایی که روزنامه‌ها در کیوسک دیجیتال نمایش داده می‌شوند (پیش‌فرض: 15 روز)
              </p>
              <Input
                type="number"
                value={archiveDays}
                onChange={(e) => setArchiveDays(parseInt(e.target.value) || 15)}
                min={1}
                max={365}
                className="w-full max-w-xs"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                📅 روزنامه‌های {archiveDays} روز گذشته در کیوسک دیجیتال نمایش داده می‌شوند
              </p>
            </Label>
          </div>

          {/* اطلاعات آخرین دانلود */}
          {(lastDownloadDate || lastDownloadTime) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                آخرین دانلود PDF
              </h4>
              {lastDownloadDate && (
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  تاریخ: {lastDownloadDate}
                </p>
              )}
              {lastDownloadTime && (
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  زمان: {new Date(lastDownloadTime).toLocaleString('fa-IR')}
                </p>
              )}
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="flex items-center gap-4 pt-4 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-6"
            >
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
            <Button
              onClick={handleTest}
              disabled={testing || !enabled}
              variant="outline"
              className="px-6"
            >
              {testing ? "در حال تست..." : "تست دریافت روزنامه‌ها"}
            </Button>
            <Button
              onClick={handleDownloadPDFs}
              disabled={downloading || !enabled}
              variant="outline"
              className="px-6 bg-green-50 hover:bg-green-100 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
            >
              {downloading ? "در حال دانلود PDF‌ها..." : "دانلود خودکار PDF‌ها"}
            </Button>
            <Button
              onClick={handleCleanupOldPDFs}
              disabled={cleaning || !enabled}
              variant="outline"
              className="px-6 bg-red-50 hover:bg-red-100 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
            >
              {cleaning ? "در حال پاک کردن..." : `پاک کردن PDF های قدیمی (${archiveDays}+ روز)`}
            </Button>
            <Button
              onClick={handleDeleteAllPDFs}
              disabled={deletingAll || !enabled}
              variant="outline"
              className="px-6 bg-red-600 hover:bg-red-700 border-red-600 text-white dark:bg-red-900 dark:border-red-800 dark:text-red-100"
            >
              {deletingAll ? "در حال پاک کردن..." : "🗑️ پاک کردن همه PDF ها"}
            </Button>
          </div>
        </div>
      </div>

      {/* نمایش نتایج تست */}
      {newspaperCount > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            نتایج تست ({newspaperCount} روزنامه)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newspapers.map((paper, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <div className="aspect-[220/280] w-full mb-2 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  <img
                    src={paper.url}
                    alt={paper.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                  {paper.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

