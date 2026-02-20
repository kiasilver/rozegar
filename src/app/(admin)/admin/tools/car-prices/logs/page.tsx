'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FaList, FaSync, FaCheckCircle, FaExclamationTriangle, FaDatabase, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';

interface Log {
    id: number;
    title: string;
    target: string;
    telegram_sent: boolean;
    telegram_status: string | null;
    telegram_error: string | null;
    telegram_message_id: number | null;
    telegram_content: string | null;
    created_at: string;
    processed_at: string | null;
}

export default function CarPriceLogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(50);

    const fetchLogs = async (pageNum: number = page) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/admin/car-prices/logs?page=${pageNum}&limit=${limit}`);
            const data = await res.json();

            if (res.ok && data.success) {
                setLogs(data.data || []);
                setTotal(data.pagination?.total || 0);
            } else {
                toast.error(data.error || 'خطا در دریافت log ها');
            }
        } catch (error: any) {
            console.error('[CarPriceLogsPage] Error:', error);
            toast.error('خطا در ارتباط با سرور: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchLogs(newPage);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const totalPages = Math.ceil(total / limit);

    const clearErrors = async () => {
        if (!confirm('آیا مطمئن هستید که می‌خواهید تمام لاگ‌های خطا را پاک کنید؟')) return;
        try {
            const res = await fetch('/api/v1/admin/car-prices/logs?action=clear_errors', { method: 'DELETE' });
            if (res.ok) {
                toast.success('لاگ‌های خطا با موفقیت پاک شدند');
                fetchLogs(1);
            } else {
                toast.error('خطا در پاکسازی لاگ‌ها');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 dir-rtl text-right font-sans mt-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <FaList className="text-blue-600 dark:text-blue-400" />
                        Log های ارسال به تلگرام
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={clearErrors}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition flex items-center gap-2"
                    >
                        <FaExclamationTriangle />
                        پاکسازی خطاها
                    </button>
                    <button
                        onClick={() => fetchLogs(page)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        بروزرسانی
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">کل Log ها</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">موفق</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {logs.filter(l => l.telegram_status === 'success').length}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">خطا</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {logs.filter(l => l.telegram_status === 'error').length}
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <FaSync className="animate-spin mx-auto mb-4 text-2xl" />
                        در حال بارگذاری...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                        <FaDatabase className="mx-auto text-gray-300 dark:text-gray-600 text-4xl mb-4" />
                        <div className="text-gray-500 dark:text-gray-400">
                            هنوز logی ثبت نشده است
                        </div>

                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right bg-white dark:bg-gray-900">
                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">وضعیت</th>
                                        <th className="p-4">عنوان</th>
                                        <th className="p-4">پیام ID</th>
                                        <th className="p-4">خطا</th>
                                        <th className="p-4">زمان ایجاد</th>
                                        <th className="p-4">زمان پردازش</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="p-4">
                                                {log.telegram_status === 'success' ? (
                                                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                        <FaCheckCircle />
                                                        موفق
                                                    </span>
                                                ) : log.telegram_status === 'error' ? (
                                                    <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                        <FaExclamationTriangle />
                                                        خطا
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white max-w-xs truncate" title={log.title}>
                                                {log.title}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                {log.telegram_message_id || '-'}
                                            </td>
                                            <td className="p-4 text-sm text-red-600 dark:text-red-400 max-w-md">
                                                {log.telegram_error ? (
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs font-mono break-words max-h-32 overflow-y-auto">
                                                        {log.telegram_error}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatDate(log.processed_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    قبلی
                                </button>
                                <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                    صفحه {page} از {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= totalPages || loading}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    بعدی
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Back Button (Bottom Left) */}
            <div className="flex justify-end mt-6">
                <Link
                    href="/admin/tools/car-prices"
                    className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-sm"
                >
                    <span>بازگشت</span>
                    <FaArrowRight className="rotate-180" />
                </Link>
            </div>
        </div>
    );
}



