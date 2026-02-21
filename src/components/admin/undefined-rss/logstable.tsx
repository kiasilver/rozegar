'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/admin/ui/button/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FaCheckCircle, FaExclamationTriangle, FaSync, FaTrash, FaFilter } from 'react-icons/fa';

export default function LogsTable() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ target: 'all', status: 'all' });
  const [selected, setSelected] = useState<number[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0 });

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filter.target !== 'all' && { target: filter.target }),
        ...(filter.status !== 'all' && { status: filter.status }),
      });

      const res = await fetch(`/api/v1/admin/automation/undefined-rss/logs?${params}`);
      
      // Check if response is HTML (likely a redirect to login page)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          toast.error('لطفاً ابتدا وارد سیستم شوید');
          setLogs([]);
          setTotal(0);
          return;
        }
      }

      const data = await res.json();

      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.pagination?.total || 0);
      } else {
        toast.error(data.error || 'خطا در دریافت لاگ‌ها');
        setLogs([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید');
      } else {
        toast.error('خطا در دریافت لاگ‌ها');
      }
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) {
      toast.error('هیچ آیتمی انتخاب نشده');
      return;
    }

    if (!confirm(`آیا از حذف ${selected.length} آیتم اطمینان دارید؟`)) return;

    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<!doctype')) {
          toast.error('لطفاً ابتدا وارد سیستم شوید');
          return;
        }
      }

      const data = await res.json();
      if (data.success) {
        toast.success('لاگ‌ها حذف شدند');
        setSelected([]);
        fetchLogs();
      } else {
        toast.error(data.error || 'خطا در حذف لاگ‌ها');
      }
    } catch (error: any) {
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error('خطا در احراز هویت. لطفاً دوباره وارد سیستم شوید');
      } else {
        toast.error('خطا در حذف');
      }
    }
  };

  const clearErrors = async () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید تمام لاگ‌های خطا را پاک کنید؟')) return;
    // For now, since we don't have a specific "clear errors" API, we can't easily do this without fetching all IDs.
    // CarPriceLogs had a special action=clear_errors. Let's assume we might add it later or just skip for now.
    // Let's implement bulk delete only for now.
    toast.info('این قابلیت در حال حاضر فعال نیست.');
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === logs.length) {
      setSelected([]);
    } else {
      setSelected(logs.map((log) => log.id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">گزارش پردازش</h2>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500">{total} مورد</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <FaFilter className="text-gray-400 mx-2" />
            <Select value={filter.target} onValueChange={(v) => setFilter({ ...filter, target: v })}>
              <SelectTrigger className="w-[130px] h-8 border-none bg-transparent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه هدف‌ها</SelectItem>
                <SelectItem value="telegram">تلگرام</SelectItem>
                <SelectItem value="website">وبسایت</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger className="w-[130px] h-8 border-none bg-transparent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="success">موفق</SelectItem>
                <SelectItem value="failed">ناموفق</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => fetchLogs()} variant="outline" className="h-10 w-10 p-0 flex items-center justify-center rounded-lg">
            <FaSync className={loading ? 'animate-spin' : ''} />
          </Button>

          {selected.length > 0 && (
            <Button onClick={handleDelete} variant="danger" disabled={selected.length === 0}>
              <FaTrash />
              <span>حذف ({selected.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10">
                  <input type="checkbox" className="rounded" checked={selected.length === logs.length && logs.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="p-4">وضعیت</th>
                <th className="p-4">عنوان خبر</th>
                <th className="p-4">هدف</th>
                <th className="p-4">جزئیات</th>
                <th className="p-4 text-left">زمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && logs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">در حال بارگذاری...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">موردی یافت نشد</td></tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = (log.target === 'telegram' && log.telegram_sent) ||
                    (log.target === 'website' && log.website_sent) ||
                    (log.target === 'both' && (log.telegram_sent || log.website_sent)); // Partial success is success?

                  const isError = !isSuccess; // Simplified

                  return (
                    <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selected.includes(log.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" className="rounded" checked={selected.includes(log.id)} onChange={() => toggleSelect(log.id)} />
                      </td>
                      <td className="p-4">
                        {isError ? (
                          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
                            <FaExclamationTriangle /> ناموفق
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
                            <FaCheckCircle /> موفق
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="max-w-md">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={log.title}>{log.title}</p>
                          <a href={log.original_url} target="_blank" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">{log.original_url}</a>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                          {log.target}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-xs">
                          {log.telegram_status && (
                            <div className={`flex items-center gap-1 ${log.telegram_sent ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-16">تلگرام:</span>
                              <span>{log.telegram_sent ? `Sent (${log.telegram_message_id})` : log.telegram_error?.substring(0, 20)}</span>
                            </div>
                          )}
                          {log.website_status && (
                            <div className={`flex items-center gap-1 ${log.website_sent ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-16">وبسایت:</span>
                              <span>{log.website_sent ? `Post ID: ${log.website_blog_id}` : log.website_error?.substring(0, 20)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-left text-xs text-gray-500 font-mono">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500">
            نمایش {(page - 1) * 50 + 1} تا {Math.min(page * 50, total)} از {total}
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" size="sm">
              قبلی
            </Button>
            <Button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} variant="outline" size="sm">
              بعدی
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
