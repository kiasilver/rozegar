"use client";
import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import Label from "@/components/admin/form/label";
import Input from "@/components/admin/form/input/inputfield";
import Button from "@/components/admin/ui/button/button";
import Checkbox from "@/components/admin/form/input/checkbox";

interface RSSBlog {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  source_url: string | null;
}

export default function RSSSyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("https://www.eghtesadonline.com/fa/updates/allnews");
  const [maxItems, setMaxItems] = useState(10);
  const [rssBlogs, setRssBlogs] = useState<RSSBlog[]>([]);
  const [selectedBlogs, setSelectedBlogs] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRSSBlogs();
  }, []);

  const fetchRSSBlogs = async () => {
    try {
      const res = await fetch("/api/v1/admin/automation/undefined-rss");
      if (res.ok) {
        const data = await res.json();
        setRssBlogs(data.blogs || []);
      }
    } catch (err) {
      console.error("Error fetching RSS blogs:", err);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/admin/automation/undefined-rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          maxItemsPerCategory: maxItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "خطا در sync RSS");
      }

      setResult(data);
      fetchRSSBlogs(); // Refresh list
    } catch (err: any) {
      setError(err.message || "خطا در sync RSS");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedBlogs.length === 0) {
      alert("لطفاً حداقل یک آیتم را انتخاب کنید");
      return;
    }

    if (!confirm(`آیا از حذف ${selectedBlogs.length} آیتم RSS اطمینان دارید؟`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/v1/admin/automation/undefined-rss/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blogIds: selectedBlogs }),
      });

      if (!response.ok) {
        throw new Error("خطا در حذف آیتم‌ها");
      }

      alert(`${selectedBlogs.length} آیتم با موفقیت حذف شد`);
      setSelectedBlogs([]);
      setSelectAll(false);
      fetchRSSBlogs();
    } catch (err: any) {
      setError(err.message || "خطا در حذف آیتم‌ها");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("آیا از حذف تمام آیتم‌های RSS اطمینان دارید؟ این عمل غیرقابل بازگشت است!")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/v1/admin/automation/undefined-rss/delete-all", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("خطا در حذف تمام آیتم‌ها");
      }

      const data = await response.json();
      alert(`${data.deleted} آیتم با موفقیت حذف شد`);
      setSelectedBlogs([]);
      setSelectAll(false);
      fetchRSSBlogs();
    } catch (err: any) {
      setError(err.message || "خطا در حذف تمام آیتم‌ها");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBlogs([]);
    } else {
      setSelectedBlogs(rssBlogs.map(blog => blog.id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleBlog = (blogId: number) => {
    if (selectedBlogs.includes(blogId)) {
      setSelectedBlogs(selectedBlogs.filter(id => id !== blogId));
    } else {
      setSelectedBlogs([...selectedBlogs, blogId]);
    }
  };

  useEffect(() => {
    // Update selectAll when selectedBlogs changes
    if (rssBlogs.length > 0) {
      setSelectAll(selectedBlogs.length === rssBlogs.length && selectedBlogs.length > 0);
    } else {
      setSelectAll(false);
    }
  }, [selectedBlogs, rssBlogs]);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="همگام‌سازی RSS" />

      <div className="bg-white dark:bg-white/[0.03] rounded-lg shadow dark:border dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          همگام‌سازی RSS از اقتصادآنلاین
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              آدرس RSS Feed
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
              placeholder="https://www.eghtesadonline.com/fa/updates/allnews"
            />
          </div>

          <div>
            <Label htmlFor="maxItems">تعداد آیتم‌ها برای هر دسته‌بندی (پیش‌فرض)</Label>
            <Input
              id="maxItems"
              type="number"
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value) || 10)}
              min={1}
              max={50}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              می‌توانید برای هر دسته‌بندی تعداد خاصی تنظیم کنید
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSync}
              disabled={loading}
            >
              {loading ? "در حال همگام‌سازی..." : "شروع همگام‌سازی"}
            </Button>
          </div>
        </div>

        {/* RSS Blogs List */}
        {rssBlogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                آیتم‌های RSS ({rssBlogs.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteSelected}
                  disabled={deleting || selectedBlogs.length === 0}
                  variant="outline"
                  size="sm"
                >
                  {deleting ? "در حال حذف..." : `حذف انتخاب شده (${selectedBlogs.length})`}
                </Button>
                <Button
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  {deleting ? "در حال حذف..." : "حذف همه"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  انتخاب همه
                </span>
              </div>
              {rssBlogs.map((blog) => (
                <div
                  key={blog.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Checkbox
                    checked={selectedBlogs.includes(blog.id)}
                    onChange={() => handleToggleBlog(blog.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {blog.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(blog.created_at).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            <div className="flex items-center gap-2">
              <span>❌</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
            <h3 className="font-semibold mb-2">✅ همگام‌سازی با موفقیت انجام شد!</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                📊 تعداد کل آیتم‌ها: <span className="font-semibold">{result.totalItems}</span>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                📁 تعداد دسته‌بندی‌ها: <span className="font-semibold">{result.categories}</span>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                ✅ آیتم‌های ایجاد شده: <span className="font-semibold text-green-600 dark:text-green-400">{result.created}</span>
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                ⏭️ آیتم‌های رد شده (تکراری): <span className="font-semibold text-gray-600 dark:text-gray-400">{result.skipped}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
