'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/admin/ui/button/button';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import Label from '@/components/admin/form/label';

export default function PriceTickerSettings() {
    const [sending, setSending] = useState(false);
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [selectedHours, setSelectedHours] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial load
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/v1/admin/settings/get?group=price-ticker');
                const data = await res.json();
                if (data.settings) {
                    const enabled = data.settings.find((s: any) => s.key === 'price_ticker_schedule_enabled')?.value === 'true';
                    const hoursStr = data.settings.find((s: any) => s.key === 'price_ticker_schedule_hours')?.value || '10,14,18';

                    setScheduleEnabled(enabled);

                    // Parse hours
                    const hours = hoursStr.split(',')
                        .map((h: string) => parseInt(h.trim()))
                        .filter((h: number) => !isNaN(h) && h >= 0 && h <= 23);

                    setSelectedHours(hours.length > 0 ? hours : [10, 14, 18]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const toggleHour = (hour: number) => {
        if (selectedHours.includes(hour)) {
            setSelectedHours(prev => prev.filter(h => h !== hour));
        } else {
            setSelectedHours(prev => [...prev, hour].sort((a, b) => a - b));
        }
    };

    const saveSettings = async () => {
        try {
            const res = await fetch('/api/v1/admin/settings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_name: 'price-ticker',
                    settings: [
                        { key: 'price_ticker_schedule_enabled', value: String(scheduleEnabled) },
                        { key: 'price_ticker_schedule_hours', value: selectedHours.join(',') }
                    ]
                })
            });
            if (res.ok) {
                toast.success('تنظیمات زمان‌بندی ذخیره شد');
            } else {
                toast.error('خطا در ذخیره تنظیمات');
            }
        } catch (e) {
            toast.error('خطا در ارتباط با سرور');
        }
    };

    const handleSendNow = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/v1/admin/automation/telegram/send-daily-prices', {
                method: 'POST',
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('قیمت‌ها با موفقیت به تلگرام ارسال شد');
            } else {
                toast.error(data.error || 'خطا در ارسال قیمت‌ها');
            }
        } catch (error) {
            toast.error('خطا در برقراری ارتباط با سرور');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div>در حال بارگذاری...</div>;

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">تنظیمات ارسال تلگرام</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    مدیریت ارسال قیمت‌های روزانه به کانال تلگرام.
                </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    ارسال خودکار (زمان‌بندی شده)
                </h3>

                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <Label className="text-base">فعال‌سازی ارسال خودکار</Label>
                        <Switch
                            checked={scheduleEnabled}
                            onCheckedChange={setScheduleEnabled}
                        />
                    </div>

                    {scheduleEnabled && (
                        <div className="space-y-3">
                            <Label>ساعات ارسال:</Label>
                            <p className="text-sm text-gray-500 mb-2">
                                ربات در ساعات انتخاب شده، قیمت‌ها را ارسال خواهد کرد. (دقت ارسال حدود ±۵ دقیقه)
                            </p>

                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                {hours.map(hour => {
                                    const isSelected = selectedHours.includes(hour);
                                    return (
                                        <button
                                            key={hour}
                                            onClick={() => toggleHour(hour)}
                                            className={`
                                                px-2 py-3 rounded-md text-sm font-medium transition-all
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                                            `}
                                        >
                                            {hour.toString().padStart(2, '0')}:00
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                ساعات انتخاب شده: {selectedHours.map(h => h.toString().padStart(2, '0') + ':00').join(' - ')}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button onClick={saveSettings} className="bg-green-600 hover:bg-green-700 text-white px-8">
                            ذخیره تنظیمات
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    ارسال دستی
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        دریافت لحظه‌ای قیمت‌ها و ارسال به کانال با تصویر فصل جاری.
                    </p>
                    <Button
                        onClick={handleSendNow}
                        disabled={sending}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px]"
                    >
                        {sending ? 'در حال ارسال...' : 'ارسال هم‌اکنون'}
                    </Button>
                </div>
            </div>

            <div className="text-xs text-gray-400 text-center mt-8">
                نیاز به تنظیم Cron Job برای آدرس: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">/api/webhooks/cron/price-ticker</code>
            </div>
        </div>
    );
}
