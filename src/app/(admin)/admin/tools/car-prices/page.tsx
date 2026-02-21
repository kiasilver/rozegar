'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { FaClock, FaTelegram, FaGlobe, FaEdit, FaTrash, FaDatabase, FaPlus, FaTimes, FaSync, FaList, FaImage } from 'react-icons/fa';
import MediaGalleryModal from '@/components/admin/media/mediagallerymodal';

interface CarPriceSetting {
    id: number;
    is_active: boolean;
    schedule_time: string;
    schedule_type: 'daily' | 'interval';
    interval_hours: number;
    telegram_enabled: boolean;
    website_enabled: boolean;
    last_run: string | null;
}

interface CarPriceSource {
    id: number;
    name: string;
    url: string;
    is_active: boolean;
    telegram_enabled: boolean;
    order: number;
    schedule_time: string | null;
    telegram_image: string | null;
    last_run_at: string | null;
    last_status: string | null;
    consecutive_errors: number;
}

export default function CarPricesPage() {
    const [settings, setSettings] = useState<CarPriceSetting | null>(null);
    const [sources, setSources] = useState<CarPriceSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceUrl, setNewSourceUrl] = useState('');
    const [newSourceTime, setNewSourceTime] = useState('');
    const [newSourceImage, setNewSourceImage] = useState('');
    const [editingSource, setEditingSource] = useState<CarPriceSource | null>(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Fetch initial data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [settingsRes, sourcesRes] = await Promise.all([
                fetch('/api/v1/admin/car-prices/settings'),
                fetch('/api/v1/admin/car-prices/sources')
            ]);

            if (settingsRes.ok) setSettings(await settingsRes.json());
            if (sourcesRes.ok) setSources(await sourcesRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateSettings = async () => {
        if (!settings) return;
        try {
            setProcessing(true);
            const res = await fetch('/api/v1/admin/car-prices/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                const updated = await res.json();
                setSettings(updated);
                toast.success('تنظیمات با موفقیت ذخیره شد');
            } else {
                toast.error('خطا در ذخیره تنظیمات');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        } finally {
            setProcessing(false);
        }
    };

    const handleEdit = (source: CarPriceSource) => {
        setEditingSource(source);
        setNewSourceName(source.name);
        setNewSourceUrl(source.url);
        setNewSourceTime(source.schedule_time || '');
        setNewSourceImage(source.telegram_image || '');
    };

    const cancelEdit = () => {
        setEditingSource(null);
        setNewSourceName('');
        setNewSourceUrl('');
        setNewSourceTime('');
        setNewSourceImage('');
    };

    const saveSource = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setProcessing(true);

            const url = editingSource
                ? `/api/v1/admin/car-prices/sources/${editingSource.id}`
                : '/api/v1/admin/car-prices/sources';

            const method = editingSource ? 'PUT' : 'POST';

            const payload = {
                name: newSourceName,
                url: newSourceUrl,
                schedule_time: newSourceTime || null,
                telegram_image: newSourceImage || null
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(editingSource ? 'منبع ویرایش شد' : 'منبع اضافه شد');
                setNewSourceName('');
                setNewSourceUrl('');
                setNewSourceTime('');
                setEditingSource(null);
                fetchData();
            } else {
                toast.error('خطا در ذخیره منبع');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        } finally {
            setProcessing(false);
        }
    };

    // ... (rest of helper functions remain similar, will update table rendering below)

    const deleteSource = async (id: number) => {
        if (!confirm('آیا از حذف این منبع اطمینان دارید؟')) return;
        try {
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('منبع حذف شد');
                setSources(sources.filter(s => s.id !== id));
            } else {
                toast.error('خطا در حذف منبع');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        }
    };

    const toggleSourceActive = async (id: number, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            });
            if (res.ok) {
                toast.success('وضعیت ربات بروزرسانی شد');
                // Optimistic update
                setSources(sources.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
            } else {
                toast.error('خطا در تغییر وضعیت');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        }
    };

    const toggleSourceTelegram = async (id: number, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_enabled: !currentStatus }),
            });
            if (res.ok) {
                toast.success('وضعیت تلگرام بروزرسانی شد');
                // Optimistic update
                setSources(sources.map(s => s.id === id ? { ...s, telegram_enabled: !currentStatus } : s));
            } else {
                toast.error('خطا در تغییر وضعیت');
            }
        } catch (error) {
            toast.error('خطا در ارتباط با سرور');
        }
    };

    const runNow = async () => {
        try {
            setProcessing(true);
            toast.loading('در حال اجرای ربات... این عملیات ممکن است زمان‌بر باشد.', { id: 'run-job' });
            const res = await fetch('/api/v1/admin/car-prices/run', { method: 'POST' });
            toast.dismiss('run-job');
            if (res.ok) {
                toast.success('ربات با موفقیت اجرا شد');
                fetchData(); // Update last run
            } else {
                toast.error('خطا در اجرای ربات');
            }
        } catch (error) {
            toast.dismiss('run-job');
            toast.error('خطا در ارتباط با سرور');
        } finally {
            setProcessing(false);
        }
    };

    const testTelegram = async (id: number, name: string) => {
        try {
            setProcessing(true);
            toast.loading(`در حال ارسال به تلگرام برای ${name}...`, { id: 'test-telegram' });
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}/test-telegram`, { method: 'POST' });
            toast.dismiss('test-telegram');
            if (res.ok) {
                toast.success('پیام به تلگرام ارسال شد');
            } else {
                const data = await res.json();
                toast.error(`خطا: ${data.error}`);
            }
        } catch (error) {
            toast.dismiss('test-telegram');
            toast.error('خطا در ارسال به تلگرام');
        } finally {
            setProcessing(false);
        }
    };

    const updateWebsite = async (id: number, name: string) => {
        try {
            setProcessing(true);
            toast.loading(`در حال بروزرسانی وبسایت برای ${name}...`, { id: 'update-website' });
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}/update-website`, { method: 'POST' });
            toast.dismiss('update-website');
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'وبسایت با موفقیت بروزرسانی شد');
            } else {
                const data = await res.json();
                toast.error(`خطا: ${data.error}`);
            }
        } catch (error) {
            toast.dismiss('update-website');
            toast.error('خطا در بروزرسانی وبسایت');
        } finally {
            setProcessing(false);
        }
    };

    const manualUpdate = async (id: number, name: string) => {
        try {
            setProcessing(true);
            toast.loading(`در حال دریافت قیمت‌ها از ${name}...`, { id: 'manual-update' });
            const res = await fetch(`/api/v1/admin/car-prices/sources/${id}/update`, { method: 'POST' });
            toast.dismiss('manual-update');
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'قیمت‌ها با موفقیت بروزرسانی شد');
                fetchData();
            } else {
                const data = await res.json();
                toast.error(`خطا: ${data.error}`);
            }
        } catch (error) {
            toast.dismiss('manual-update');
            toast.error('خطا در ارتباط با سرور');
        } finally {
            setProcessing(false);
        }
    };


    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 dir-rtl text-right font-sans">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FaDatabase className="text-blue-600 dark:text-blue-400" />
                    مدیریت قیمت خودرو
                </h1>
                <Link
                    href="/admin/tools/car-prices/logs"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                    <FaList />
                    مشاهده Log ها
                </Link>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <FaClock className="text-gray-500 dark:text-white" />
                        تنظیمات زمان‌بندی ربات
                    </h2>
                </div>

                {settings && (
                    <div className="space-y-8">
                        {/* Main Settings Checkboxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <label htmlFor="is_active" className="font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                                    وضعیت کلی ربات (فعال/غیرفعال)
                                </label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        className="sr-only peer"
                                        checked={settings.is_active ?? false}
                                        onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                                    />
                                    <div className={`w-12 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 transition-colors dir-ltr ${settings.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${settings.is_active ? 'translate-x-6 border-white' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Schedule Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="col-span-1 md:col-span-2 text-gray-800 dark:text-gray-200 font-medium mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                                زمان‌بندی اجرا
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">نوع زمان‌بندی</label>
                                <div className="relative">
                                    <select
                                        value={settings.schedule_type || 'daily'}
                                        onChange={(e) => setSettings({ ...settings, schedule_type: e.target.value as 'daily' | 'interval' })}
                                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        <option value="daily">روزانه (ساعت مشخص)</option>
                                        <option value="interval">دوره ای (هر چند ساعت)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {settings.schedule_type === 'interval' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">بازه اجرا (ساعت)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={settings.interval_hours || 24}
                                            onChange={(e) => setSettings({ ...settings, interval_hours: parseInt(e.target.value) || 1 })}
                                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center dir-ltr focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">ساعت یکبار</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">زمان اجرا (دقیق)</label>
                                    <input
                                        type="time"
                                        value={settings.schedule_time}
                                        onChange={(e) => setSettings({ ...settings, schedule_time: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center dir-ltr focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Export Checkboxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition bg-white dark:bg-gray-900">
                                <span className="flex items-center gap-3 font-medium text-gray-700 dark:text-gray-200">
                                    <FaTelegram className="text-blue-500 text-xl" />
                                    ارسال به تلگرام (تنظیم کلی)
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settings.telegram_enabled}
                                    onChange={(e) => setSettings({ ...settings, telegram_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60">
                                <span className="flex items-center gap-3 font-medium text-gray-500 dark:text-gray-400">
                                    <FaGlobe className="text-gray-400 text-xl" />
                                    ارسال به وبسایت (غیرفعال)
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">صفحه خودکار آپدیت می‌شود</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                آخرین اجرا: {settings.last_run ? new Date(settings.last_run).toLocaleString('fa-IR') : 'هرگز'}
                            </span>
                            <button
                                onClick={updateSettings}
                                disabled={processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg transition disabled:opacity-50 font-bold shadow-md hover:shadow-lg text-base"
                            >
                                ذخیره تنظیمات
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sources Card */}
            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400"><FaDatabase /></span>
                        لیست منابع
                    </h2>
                    <button
                        onClick={runNow}
                        disabled={processing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition disabled:opacity-50 text-sm font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <FaSync className={processing ? "animate-spin" : ""} />
                        بروزرسانی همه منابع
                    </button>
                </div>

                {/* Add/Edit Source Form */}
                <form onSubmit={saveSource} className="mb-8 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-4 items-end">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">نام شرکت (مثال: مدیران خودرو)</label>
                            <input
                                type="text"
                                value={newSourceName}
                                onChange={(e) => setNewSourceName(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="نام نمایشی..."
                                required
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">URL</label>
                            <input
                                type="url"
                                value={newSourceUrl}
                                onChange={(e) => setNewSourceUrl(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left dir-ltr focus:ring-2 focus:ring-blue-500"
                                placeholder="https://bama.ir/price?..."
                                dir="ltr"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">زمان اجرا (اختیاری)</label>
                            <input
                                type="time"
                                value={newSourceTime}
                                onChange={(e) => setNewSourceTime(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center dir-ltr focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <div className="w-full">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">مسیر تصویر تلگرام (اختیاری - مثال: /images/Car/irankhodro.jpg)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSourceImage}
                                onChange={(e) => setNewSourceImage(e.target.value)}
                                className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left dir-ltr focus:ring-2 focus:ring-blue-500"
                                placeholder="/images/Car/..."
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setIsGalleryOpen(true)}
                                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                                title="انتخاب از گالری"
                            >
                                <FaImage />
                                <span className="hidden sm:inline">گالری</span>
                            </button>
                        </div>
                        {newSourceImage && (
                            <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img
                                    src={newSourceImage}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-2">
                        {editingSource && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-3 rounded-lg transition whitespace-nowrap font-medium flex items-center justify-center gap-2"
                            >
                                <FaTimes /> انصراف
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`${editingSource ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-3 rounded-lg transition disabled:opacity-50 whitespace-nowrap font-medium flex items-center justify-center gap-2 w-full md:w-auto shadow-md`}
                        >
                            {editingSource ? <><FaEdit /> ذخیره</> : <><FaPlus /> افزودن</>}
                        </button>
                    </div>
                </form>

                {/* List */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table className="w-full text-right bg-white dark:bg-gray-900">
                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-4 w-1/4">نام</th>
                                <th className="p-4 w-1/4">URL</th>
                                <th className="p-4 w-[100px] text-center">زمان</th>
                                <th className="p-4 w-[120px] text-center">وضعیت ربات</th>
                                <th className="p-4 w-[120px] text-center">انتشار تلگرام</th>
                                <th className="p-4 w-[150px] text-center">آخرین اجرا</th>
                                <th className="p-4 w-[100px] text-center">وضعیت</th>
                                <th className="p-4 text-center min-w-[200px]">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sources.map(source => (
                                <tr key={source.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{source.name}</td>
                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400 dir-ltr text-left">
                                        <a href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-400 hover:underline max-w-[200px] truncate" title={source.url}>
                                            <FaGlobe className="shrink-0" />
                                            {source.url.replace('https://bama.ir/price', '...')}
                                        </a>
                                    </td>
                                    <td className="p-4 text-center text-sm font-mono text-gray-600 dark:text-gray-300">
                                        {source.schedule_time || '-'}
                                    </td>

                                    {/* Status Toggle */}
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleSourceActive(source.id, source.is_active)}
                                            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${source.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            title={source.is_active ? 'فعال' : 'غیرفعال'}
                                        >
                                            <span className={`${source.is_active ? '-translate-x-1' : '-translate-x-6'} inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`} />
                                        </button>
                                    </td>

                                    {/* Telegram Toggle */}
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleSourceTelegram(source.id, source.telegram_enabled)}
                                            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${source.telegram_enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            title={source.telegram_enabled ? 'ارسال فعال' : 'ارسال غیرفعال'}
                                        >
                                            <span className={`${source.telegram_enabled ? '-translate-x-1' : '-translate-x-6'} inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow-sm`} />
                                        </button>
                                    </td>

                                    <td className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
                                        {source.last_run_at ? new Date(source.last_run_at).toLocaleString('fa-IR') : '-'}
                                    </td>

                                    <td className="p-4 text-center">
                                        {source.last_status === 'success' && (
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">موفق</span>
                                        )}
                                        {source.last_status === 'error' && (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200">خطا</span>
                                                {source.consecutive_errors > 0 && (
                                                    <span className="text-[10px] text-red-500">({source.consecutive_errors} تلاش)</span>
                                                )}
                                            </div>
                                        )}
                                        {(!source.last_status || source.last_status === 'pending') && (
                                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full border border-gray-200">-</span>
                                        )}
                                    </td>

                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => updateWebsite(source.id, source.name)}
                                                    disabled={processing}
                                                    className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition p-2 rounded disabled:opacity-50"
                                                    title="بروزرسانی دستی سایت"
                                                >
                                                    <FaGlobe size={18} />
                                                </button>
                                                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                                <button
                                                    onClick={() => manualUpdate(source.id, source.name)}
                                                    disabled={processing}
                                                    className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition p-2 rounded disabled:opacity-50"
                                                    title="بروزرسانی دستی قیمت‌ها"
                                                >
                                                    <FaSync size={18} />
                                                </button>
                                                <button
                                                    onClick={() => testTelegram(source.id, source.name)}
                                                    disabled={processing}
                                                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition p-2 rounded disabled:opacity-50"
                                                    title="ارسال تستی به تلگرام"
                                                >
                                                    <FaTelegram size={18} />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(source)}
                                                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                                                    title="ویرایش"
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteSource(source.id)}
                                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    title="حذف"
                                                >
                                                    <FaTrash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sources.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center gap-3">
                                        <FaDatabase size={48} className="text-gray-300 dark:text-gray-600" />
                                        <span className="text-lg">هنوز منبعی اضافه نشده است.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Media Gallery Modal */}
            <MediaGalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={(url) => {
                    setNewSourceImage(url);
                    setIsGalleryOpen(false);
                }}
                accept="image"
            />

        </div>
    );
}
