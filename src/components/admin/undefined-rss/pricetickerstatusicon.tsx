'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaChartLine, FaCheckCircle, FaExclamationTriangle, FaClock, FaTelegram } from 'react-icons/fa';

interface PriceTickerLog {
    id: number;
    title: string;
    target: string;
    telegram_sent: boolean;
    telegram_status: string;
    telegram_error: string | null;
    created_at: string;
}

export default function PriceTickerStatusIcon() {
    const [enabled, setEnabled] = useState(false);
    const [scheduledHours, setScheduledHours] = useState<number[]>([10, 14, 18]);
    const [latestLog, setLatestLog] = useState<PriceTickerLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch Settings
            const settingsRes = await fetch('/api/v1/admin/settings/get?group=price-ticker');
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                if (data.settings) {
                    const isEnabled = data.settings.find((s: any) => s.key === 'price_ticker_schedule_enabled')?.value === 'true';
                    const hoursStr = data.settings.find((s: any) => s.key === 'price_ticker_schedule_hours')?.value || '10,14,18';

                    setEnabled(isEnabled);

                    const hours = hoursStr.split(',')
                        .map((h: string) => parseInt(h.trim()))
                        .filter((h: number) => !isNaN(h));
                    setScheduledHours(hours);
                }
            }

            // Fetch Logs (limit 1) where target = 'telegram' and error = 'DAILY_PRICES' (as per our scheduler)
            // Or just fetch logs containing 'قیمت‌های روز'
            const logsRes = await fetch('/api/v1/admin/automation/undefined-rss/logs?limit=10');
            if (logsRes.ok) {
                const data = await logsRes.json();
                if (data.success && data.data) {
                    const priceLogs = data.data.filter((l: any) => l.title.includes('قیمت‌های روز'));
                    if (priceLogs.length > 0) {
                        setLatestLog(priceLogs[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching Price Ticker status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Update every 1 min
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    // Determine status color/state
    const isActive = enabled;
    const hasError = latestLog && (latestLog.telegram_sent === false && latestLog.telegram_status === 'error');

    // Icon color
    let iconColor = 'text-gray-400'; // Default/Inactive
    if (isActive) {
        iconColor = hasError ? 'text-red-500' : 'text-blue-600 dark:text-blue-400';
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="relative">
            <Link
                href="/admin/setting/price-ticker"
                className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <FaChartLine
                    className={`${iconColor} transition-all duration-300 ${isActive && !hasError ? 'hover:scale-110' : ''} ${hasError ? 'animate-pulse' : ''}`}
                    size={18}
                />

                {/* Status Indicator Dot */}
                <span className={`absolute bottom-2 right-2 w-2 h-2 rounded-full border border-white dark:border-gray-900 ${isActive ? 'bg-blue-500' : 'bg-gray-400'}`}></span>

                {/* Error Badge */}
                {hasError && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                        !
                    </span>
                )}
            </Link>

            {/* Tooltip */}
            {showTooltip && (
                <>
                    {/* Desktop: Left side */}
                    <div className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 translate-y-2 mr-2 w-72 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={!!hasError}
                            latestLog={latestLog}
                            formatTime={formatTime}
                            scheduledHours={scheduledHours}
                        />
                    </div>

                    {/* Mobile: Below */}
                    <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={!!hasError}
                            latestLog={latestLog}
                            formatTime={formatTime}
                            scheduledHours={scheduledHours}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function StatusContent({ isActive, hasError, latestLog, formatTime, scheduledHours }: any) {
    return (
        <div className="space-y-3 text-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FaChartLine className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    <span>تیکر قیمت‌ها</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                </div>
            </div>

            {/* Schedule Info */}
            {isActive && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <FaClock className="text-gray-400" size={12} />
                    <span className="truncate">ارسال در ساعات: {scheduledHours.map((h: number) => h.toString().padStart(2, '0') + ':00').join(', ')}</span>
                </div>
            )}

            {/* Latest Log Info */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-2">آخرین بروزرسانی:</p>
                {latestLog ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <FaClock size={10} />
                                <span>{formatTime(latestLog.created_at)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-1 font-medium truncate" title={latestLog.title}>
                            {latestLog.title}
                        </p>

                        <div className="flex gap-2 mt-1">
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${latestLog.telegram_status === 'success' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                                <FaTelegram size={10} />
                                <span>{latestLog.telegram_status === 'success' ? 'Sent' : 'Error'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 text-center py-1">
                        هیچ ارسالی ثبت نشده است
                    </div>
                )}
            </div>
        </div>
    );
}
