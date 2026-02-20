'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaRobot, FaCheckCircle, FaExclamationTriangle, FaClock, FaTelegram, FaGlobe, FaPowerOff, FaSync } from 'react-icons/fa';
import Switch from '@/components/Admin/form/switch/Switch'; // Assuming Switch component exists or I use a simple one
// Actually, I should check if Switch exists at standard path or use a simple HTML checkbox styled.
// "src/components/Admin/form/switch/Switch" was used in GeneralSettings. Let's use it.
import { toast } from 'sonner';

interface RSSSettings {
    id: number;
    is_active: boolean;
    telegram_enabled: boolean;
    website_enabled: boolean;
    check_interval: number;
    last_check_at: string | null;
    status_message: string | null;
}

interface RSSLog {
    id: number;
    title: string;
    target: string;
    telegram_sent: boolean;
    telegram_status: string;
    telegram_error: string | null;
    website_sent: boolean;
    website_status: string;
    website_error: string | null;
    created_at: string;
}

export default function AIContentStatusIcon() {
    const [settings, setSettings] = useState<RSSSettings | null>(null);
    const [latestLog, setLatestLog] = useState<RSSLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);
    const [nextCheck, setNextCheck] = useState<string>('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Update every 10s for status
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!settings?.last_check_at || !settings?.check_interval) {
            setNextCheck('');
            setProgress(0);
            return;
        }

        const updateTimer = () => {
            const lastCheck = new Date(settings.last_check_at!).getTime();
            const intervalMs = settings.check_interval * 60 * 1000;
            const nextCheckTime = lastCheck + intervalMs;
            const now = Date.now();
            const diff = nextCheckTime - now;

            if (diff <= 0) {
                setNextCheck('در حال بررسی...');
                setProgress(100);
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setNextCheck(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);

                const elapsed = now - lastCheck;
                const pct = Math.min(100, Math.max(0, (elapsed / intervalMs) * 100));
                setProgress(pct);
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);

    }, [settings?.last_check_at, settings?.check_interval]);

    const fetchData = async () => {
        try {
            // Fetch Settings
            const settingsRes = await fetch('/api/v1/admin/automation/undefined-rss/settings');
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                if (data.success) setSettings(data.data);
            }

            // Fetch Logs (limit 1)
            const logsRes = await fetch('/api/v1/admin/automation/undefined-rss/logs?limit=1');
            if (logsRes.ok) {
                const data = await logsRes.json();
                if (data.success && data.data.length > 0) {
                    setLatestLog(data.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching AI status:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (checked: boolean) => {
        if (!settings) return;

        // Optimistic update
        const oldState = settings.is_active;
        setSettings({ ...settings, is_active: checked });

        try {
            const res = await fetch('/api/v1/admin/automation/undefined-rss/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: checked }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(checked ? 'سیستم فعال شد' : 'سیستم غیرفعال شد');
                setSettings(data.data);
            } else {
                setSettings({ ...settings, is_active: oldState });
                toast.error('خطا در تغییر وضعیت');
            }
        } catch (e) {
            setSettings({ ...settings, is_active: oldState });
            toast.error('خطا در ارتباط با سرور');
        }
    };

    const forceCheck = async () => {
        // This is a bit tricky, we don't have a specific endpoint to force check nicely yet.
        // We can stick to just UI for now or call a function. 
        // Let's postpone "Check Now" button to avoid complexity, user just asked for status/countdown.
        // But a "Refresh Status" button is useful.
        fetchData();
        toast.success('وضعیت بروزرسانی شد');
    };

    if (loading) return null;

    // Determine status color/state
    const isActive = settings?.is_active || false;
    const hasError = latestLog && (
        (latestLog.telegram_sent && latestLog.telegram_status === 'error') ||
        (latestLog.website_sent && latestLog.website_status === 'error')
    );

    // Icon color
    let iconColor = 'text-gray-400'; // Default/Inactive
    if (isActive) {
        iconColor = hasError ? 'text-red-500' : 'text-purple-600 dark:text-purple-400';
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
                href="/admin/rss-unified?tab=logs"
                className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <FaRobot
                    className={`${iconColor} transition-all duration-300 ${isActive && !hasError ? 'hover:scale-110' : ''} ${hasError ? 'animate-pulse' : ''}`}
                    size={20}
                />

                {/* Status Indicator Dot */}
                <span className={`absolute bottom-2 right-2 w-2 h-2 rounded-full border border-white dark:border-gray-900 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>

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
                    <div className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 translate-y-2 mr-2 w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={!!hasError}
                            latestLog={latestLog}
                            formatTime={formatTime}
                            settings={settings}
                            toggleActive={toggleActive}
                            nextCheck={nextCheck}
                            progress={progress}
                            forceCheck={forceCheck}
                        />
                    </div>

                    {/* Mobile: Below */}
                    <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-[9999] text-right">
                        <StatusContent
                            isActive={isActive}
                            hasError={!!hasError}
                            latestLog={latestLog}
                            formatTime={formatTime}
                            settings={settings}
                            toggleActive={toggleActive}
                            nextCheck={nextCheck}
                            progress={progress}
                            forceCheck={forceCheck}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function StatusContent({ isActive, hasError, latestLog, formatTime, settings, toggleActive, nextCheck, progress, forceCheck }: any) {
    return (
        <div className="space-y-3 text-sm">
            {/* Header with Switch */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FaRobot className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                    <span>ربات هوشمند</span>
                </div>

                {/* Simple Toggle - Assuming we don't need the full form Switch component complexity here or referencing it is fine */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{isActive ? 'فعال' : 'غیرفعال'}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => toggleActive(e.target.checked)} />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </div>

            {/* Current Status Message */}
            {settings?.is_active && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <FaSync className={settings.status_message?.includes('Processing') ? 'animate-spin text-blue-500' : 'text-gray-400'} size={12} />
                    <span className="truncate">{settings.status_message || 'آماده به کار'}</span>
                </div>
            )}

            {/* Next Check Progress */}
            {settings?.is_active && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>بررسی بعدی:</span>
                        <span className="font-mono">{nextCheck || '--:--'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Latest Log Info */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-2">آخرین پردازش:</p>
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
                            <StatusBadge status={latestLog.telegram_status} type="telegram" />
                            <StatusBadge status={latestLog.website_status} type="website" />
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 text-center py-1">
                        هیچ فعالیتی ثبت نشده است
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
                <button onClick={forceCheck} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    بروزرسانی وضعیت
                </button>
                <Link href="/admin/rss-unified?tab=logs" className="text-purple-600 dark:text-purple-400 hover:underline">
                    مشاهده لاگ‌ها
                </Link>
            </div>
        </div>
    );
}

function StatusBadge({ status, type }: { status: string, type: 'telegram' | 'website' }) {
    if (!status) return null;

    // inactive/null check
    const isSuccess = status === 'success';
    const isError = status === 'error';
    const Icon = type === 'telegram' ? FaTelegram : FaGlobe;

    // If status is "idle" or something else, handle gracefully? 
    // Usually log has success/error.

    const colorClass = isSuccess ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
        isError ? 'text-red-600 bg-red-50 dark:bg-red-900/20' :
            'text-gray-400 bg-gray-50 dark:bg-gray-800';

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${colorClass}`}>
            <Icon size={10} />
            <span>{isSuccess ? 'Sent' : isError ? 'Error' : '-'}</span>
        </div>
    );
}
