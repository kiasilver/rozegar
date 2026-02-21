"use client";
import React, { useEffect, useState } from "react";
import Badge from "@/components/admin/ui/badge/badge";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import dynamic from "next/dynamic";
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArticleIcon from '@mui/icons-material/Article';
import PendingIcon from '@mui/icons-material/Pending';
import DraftIcon from '@mui/icons-material/Drafts';

// Lazy load chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AuthorStats {
    totalViews: number;
    publishedCount: number;
    pendingCount: number;
    draftCount: number;
    totalCount: number;
    timeStats: {
        today: { posts: number; views: number };
        week: { posts: number; views: number };
        month: { posts: number; views: number };
        year: { posts: number; views: number };
    };
    charts: {
        weekly: Array<{ date: string; posts: number; views: number }>;
        monthly: Array<{ month: string; posts: number; views: number }>;
    };
    recentBlogs: any[];
    topViewed: any[];
}

export default function AuthorDashboard() {
    const [stats, setStats] = useState<AuthorStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<'weekly' | 'monthly'>('weekly');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/v1/admin/content/profile-stats");
                if (res.ok) {
                    const data = await res.json();
                    // Validate data structure and provide fallback
                    if (data && typeof data === 'object' && !data.error) {
                        // Ensure all required fields exist with fallback values
                        const validatedData: AuthorStats = {
                            totalViews: data.totalViews || 0,
                            publishedCount: data.publishedCount || 0,
                            pendingCount: data.pendingCount || 0,
                            draftCount: data.draftCount || 0,
                            totalCount: data.totalCount || 0,
                            timeStats: data.timeStats || {
                                today: { posts: 0, views: 0 },
                                week: { posts: 0, views: 0 },
                                month: { posts: 0, views: 0 },
                                year: { posts: 0, views: 0 }
                            },
                            charts: {
                                weekly: Array.isArray(data.charts?.weekly) ? data.charts.weekly : [],
                                monthly: Array.isArray(data.charts?.monthly) ? data.charts.monthly : []
                            },
                            recentBlogs: Array.isArray(data.recentBlogs) ? data.recentBlogs : [],
                            topViewed: Array.isArray(data.topViewed) ? data.topViewed : []
                        };
                        setStats(validatedData);
                    } else {
                        console.error("Invalid data structure or error in response:", data);
                    }
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Error fetching stats:", res.status, errorData);
                    // Show more detailed error message
                    if (res.status === 401) {
                        console.error("Unauthorized - Please login again");
                    } else if (res.status === 403) {
                        console.error("Forbidden - You don't have permission");
                    } else if (res.status === 500) {
                        console.error("Server error:", errorData);
                    }
                }
            } catch (err) {
                console.error("Error fetching author stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-lg text-gray-600 dark:text-gray-400">در حال بارگذاری...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="space-y-6">
                <PageBreadcrumb pageTitle="داشبورد" />
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <div className="text-lg text-red-600 dark:text-red-400">خطا در بارگذاری آمار</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        لطفاً صفحه را refresh کنید یا با مدیر سیستم تماس بگیرید.
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        بارگذاری مجدد
                    </button>
                </div>
            </div>
        );
    }

    // تنظیمات چارت هفتگی
    const weeklyChartOptions = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: { show: false },
            fontFamily: 'IRANYekanX, sans-serif'
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: stats.charts.weekly.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
            }),
            labels: {
                style: {
                    fontFamily: 'IRANYekanX'
                }
            }
        },
        yaxis: [
            {
                title: {
                    text: 'تعداد پست',
                    style: { fontFamily: 'IRANYekanX' }
                }
            },
            {
                opposite: true,
                title: {
                    text: 'بازدید',
                    style: { fontFamily: 'IRANYekanX' }
                }
            }
        ],
        tooltip: {
            style: { fontFamily: 'IRANYekanX' }
        },
        legend: {
            fontFamily: 'IRANYekanX'
        },
        colors: ['#3b82f6', '#10b981']
    };

    const weeklyChartSeries = [
        {
            name: 'پست‌ها',
            type: 'column',
            data: stats.charts.weekly.map(item => item.posts)
        },
        {
            name: 'بازدیدها',
            type: 'line',
            data: stats.charts.weekly.map(item => item.views)
        }
    ];

    // تنظیمات چارت ماهانه
    const monthlyChartOptions = {
        chart: {
            type: 'bar',
            height: 350,
            toolbar: { show: false },
            fontFamily: 'IRANYekanX, sans-serif'
        },
        xaxis: {
            categories: stats.charts.monthly.map(item => item.month),
            labels: {
                style: {
                    fontFamily: 'IRANYekanX'
                },
                rotate: -45,
                rotateAlways: true
            }
        },
        yaxis: {
            title: {
                text: 'تعداد',
                style: { fontFamily: 'IRANYekanX' }
            }
        },
        tooltip: {
            style: { fontFamily: 'IRANYekanX' }
        },
        legend: {
            fontFamily: 'IRANYekanX'
        },
        colors: ['#3b82f6', '#10b981']
    };

    const monthlyChartSeries = [
        {
            name: 'پست‌ها',
            data: stats.charts.monthly.map(item => item.posts)
        },
        {
            name: 'بازدیدها',
            data: stats.charts.monthly.map(item => item.views)
        }
    ];

    return (
        <div className="space-y-6">
            <PageBreadcrumb pageTitle="داشبورد نویسنده" />
            
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">داشبورد</h2>
                <button
                    onClick={() => {
                        const csv = [
                            ["عنوان", "وضعیت", "بازدید", "تاریخ"].join(","),
                            ...stats.recentBlogs.map((blog) =>
                                [
                                    blog.translations[0]?.title || "بدون عنوان",
                                    blog.status === "PUBLISHED" ? "منتشر شده" : blog.status === "PENDING" ? "در انتظار" : "پیش‌نویس",
                                    blog.view_count,
                                    new Date(blog.created_at).toLocaleDateString("fa-IR"),
                                ].join(",")
                            ),
                        ].join("\n");

                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = `author-report-${new Date().toISOString().split("T")[0]}.csv`;
                        link.click();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                    Export CSV
                </button>
            </div>

            {/* کارت‌های آمار کلی */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {/* کل بازدیدها */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-xl dark:bg-blue-900/50">
                            <VisibilityIcon className="text-blue-500" style={{ fontSize: '20px' }} />
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">کل بازدیدها</span>
                            <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                                {stats.totalViews.toLocaleString('fa-IR')}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* منتشر شده */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-xl dark:bg-green-900/50">
                            <ArticleIcon className="text-green-500" style={{ fontSize: '20px' }} />
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">منتشر شده</span>
                            <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                                {stats.publishedCount}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* در انتظار */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-xl dark:bg-orange-900/50">
                            <PendingIcon className="text-orange-500" style={{ fontSize: '20px' }} />
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">در انتظار</span>
                            <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                                {stats.pendingCount}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* پیش‌نویس */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-xl dark:bg-gray-800">
                            <DraftIcon className="text-gray-500" style={{ fontSize: '20px' }} />
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">پیش‌نویس</span>
                            <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                                {stats.draftCount}
                            </h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* آمار زمانی */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="text-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">امروز</span>
                        <div className="mt-2">
                            <div className="text-lg font-bold text-gray-800 dark:text-white">
                                {stats.timeStats.today.posts} پست
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {stats.timeStats.today.views.toLocaleString('fa-IR')} بازدید
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="text-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">این هفته</span>
                        <div className="mt-2">
                            <div className="text-lg font-bold text-gray-800 dark:text-white">
                                {stats.timeStats.week.posts} پست
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {stats.timeStats.week.views.toLocaleString('fa-IR')} بازدید
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="text-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">این ماه</span>
                        <div className="mt-2">
                            <div className="text-lg font-bold text-gray-800 dark:text-white">
                                {stats.timeStats.month.posts} پست
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {stats.timeStats.month.views.toLocaleString('fa-IR')} بازدید
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="text-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">امسال</span>
                        <div className="mt-2">
                            <div className="text-lg font-bold text-gray-800 dark:text-white">
                                {stats.timeStats.year.posts} پست
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {stats.timeStats.year.views.toLocaleString('fa-IR')} بازدید
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* چارت */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        نمودار فعالیت
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setChartType('weekly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                chartType === 'weekly'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            هفتگی
                        </button>
                        <button
                            onClick={() => setChartType('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                chartType === 'monthly'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                        >
                            ماهانه
                        </button>
                    </div>
                </div>
                {typeof window !== 'undefined' && (
                    <Chart
                        // @ts-ignore - ApexCharts type issue
                        options={chartType === 'weekly' ? weeklyChartOptions : monthlyChartOptions}
                        series={chartType === 'weekly' ? weeklyChartSeries : monthlyChartSeries}
                        type={chartType === 'weekly' ? 'line' : 'bar'}
                        height={350}
                    />
                )}
            </div>

            {/* پربازدیدترین پست‌ها */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-6 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pb-6">
                <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
                    پربازدیدترین پست‌های من
                </h3>
                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عنوان</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بازدید</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stats.topViewed.map((blog) => (
                                    <tr key={blog.id}>
                                        <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                                            {blog.translations[0]?.title || "بدون عنوان"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {blog.view_count.toLocaleString('fa-IR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* پست‌های اخیر */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-6 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pb-6">
                <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
                    پست‌های اخیر من
                </h3>
                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عنوان</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بازدید</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stats.recentBlogs.map((blog) => (
                                    <tr key={blog.id}>
                                        <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                                            {blog.translations[0]?.title || "بدون عنوان"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <Badge color={blog.status === "PUBLISHED" ? "success" : blog.status === "PENDING" ? "warning" : "light"}>
                                                {blog.status === "PUBLISHED" ? "منتشر شده" : blog.status === "PENDING" ? "در انتظار" : "پیش‌نویس"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {blog.view_count.toLocaleString('fa-IR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(blog.created_at).toLocaleDateString("fa-IR")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
