'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaNewspaper, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'sonner';

interface NewspaperSettings {
    enabled: boolean;
    rssUrl: string;
    downloadTime: string;
    archiveDays: number;
}

export default function NewspaperStatusIcon() {
    const [settings, setSettings] = useState<NewspaperSettings | null>(null);
    const [lastDownload, setLastDownload] = useState<{ date: string | null, time: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Fetch Settings
            const settingsRes = await fetch('/api/v1/admin/content/newspapers');
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings({
                    enabled: data.enabled,
                    rssUrl: data.rssUrl,
                    downloadTime: data.downloadTime,
                    archiveDays: data.archiveDays
                });
            }

            // Fetch Last Download info
            const lastDownloadRes = await fetch('/api/v1/admin/content/newspapers/last-download');
            if (lastDownloadRes.ok) {
                const data = await lastDownloadRes.json();
                if (data.success) {
                    setLastDownload({
                        date: data.lastDownloadDate,
                        time: data.lastDownloadTime
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching newspaper status:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (checked: boolean) => {
        if (!settings) return;

        const oldState = settings.enabled;
        setSettings({ ...settings, enabled: checked });

        try {
            const res = await fetch('/api/v1/admin/content/newspapers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, enabled: checked }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(checked ? 'دانلود روزنامه فعال شد' : 'دانلود روزنامه غیرفعال شد');
            } else {
                setSettings({ ...settings, enabled: oldState });
                toast.error('خطا در تغییر وضعیت');
            }
        } catch (e) {
            setSettings({ ...settings, enabled: oldState });
            toast.error('خطا در ارتباط با سرور');
        }
    };

    if (loading) return null;

    const isActive = settings?.enabled || false;

    // Check if we missed today's download (if it's past the download time)
    let hasError = false;
    const now = new Date();
    const persianDateToday = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'persian'
    }).format(now);

    if (isActive && settings?.downloadTime) {
        // Did we download today?
        if (lastDownload?.date !== persianDateToday) {
            const [hours, minutes] = settings.downloadTime.split(':').map(Number);
            const downloadDate = new Date();
            downloadDate.setHours(hours, minutes, 0, 0);

            // If we are past the download time and haven't downloaded today's yet
            if (now.getTime() > downloadDate.getTime()) {
                hasError = true;
            }
        }
    }

    let iconColor = 'text-gray-400';
    if (isActive) {
        iconColor = hasError ? 'text-red-500' : 'text-blue-600 dark:text-blue-400';
    }

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="relative">
            <Link
                href="/admin/newspaper"
                className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <FaNewspaper
                    className={`${iconColor} transition-all duration-300 ${isActive && !hasError ? 'hover:scale-110' : ''} ${hasError ? 'animate-pulse' : ''}`}
                    size={20}
                />

                {/* Status Indicator Dot */}
                <span className={`absolute bottom-2 right-2 w-2 h-2 rounded-full border border-white dark:border-gray-900 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>

                {/* Warning Badge */}
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
                    <div className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 translate-y-2 mr-2 w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={hasError}
                            lastDownload={lastDownload}
                            formatTime={formatTime}
                            settings={settings}
                            toggleActive={toggleActive}
                        />
                    </div>

                    {/* Mobile: Below */}
                    <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={hasError}
                            lastDownload={lastDownload}
                            formatTime={formatTime}
                            settings={settings}
                            toggleActive={toggleActive}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function StatusContent({ isActive, hasError, lastDownload, formatTime, settings, toggleActive }: any) {
    return (
        <div className="space-y-3 text-sm">
            {/* Header with Switch */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FaNewspaper className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    <span>کیوسک دیجیتال (روزنامه)</span>
                </div>

                {/* Simple Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{isActive ? 'فعال' : 'غیرفعال'}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => toggleActive(e.target.checked)} />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Current Status Message */}
            {settings?.enabled && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs flex items-center gap-2">
                    {hasError ? (
                        <>
                            <FaExclamationTriangle className="text-red-500" size={12} />
                            <span className="text-red-600 dark:text-red-400 truncate">تأخیر در دریافت روزنامه امروز</span>
                        </>
                    ) : (
                        <>
                            <FaCheckCircle className="text-green-500" size={12} />
                            <span className="text-green-600 dark:text-green-400 truncate">بروزرسانی روزنامه‌ها موفقیت‌آمیز</span>
                        </>
                    )}
                </div>
            )}

            {/* Next Check Time Config */}
            {settings?.enabled && (
                <div className="flex justify-between text-xs text-gray-500">
                    <span>زمان تنظیم شده برای دریافت:</span>
                    <span className="font-mono">{settings.downloadTime || '--:--'}</span>
                </div>
            )}

            {/* Latest Download Info */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-2">آخرین دریافت PDF:</p>
                {lastDownload?.date || lastDownload?.time ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{lastDownload.date || 'نامشخص'}</span>
                            <div className="flex items-center gap-1">
                                <FaClock size={10} />
                                <span>{formatTime(lastDownload.time)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 text-center py-1">
                        هیچ روزنامه‌ای دریافت نشده است
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center text-xs">
                <Link href="/admin/newspaper" className="text-blue-600 dark:text-blue-400 hover:underline">
                    تنظیمات روزنامه
                </Link>
            </div>
        </div>
    );
}
