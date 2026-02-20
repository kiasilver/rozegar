"use client";
import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/Admin/common/LoadingSpinner";
import Link from "next/link";
import { StatCard } from "@/components/Admin/dashboard/StatCard";


// Lazy load chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AdminStats {
    totalViews: number;
    totalArticles: number;
    publishedArticles: number;
    pendingReviews: number;
    draftArticles: number;
    totalUsers: number;
    totalAuthors: number;
    totalComments: number;
    pendingComments: number;
    approvedComments?: number;
    deletedComments?: number;
    totalMediaFiles?: number;
    totalCategories?: number;
    totalOnlineUsers?: number;
    telegramSentCount?: number;
    websiteSentCount?: number;
    telegramErrorsCount?: number;
    websiteErrorsCount?: number;
    totalErrors?: number;
    totalMediaSize?: number;
    mediaBreakdown?: {
        image: number;
        video: number;
        document: number;
        other: number;
    };
    mediaCounts?: {
        image: number;
        video: number;
        document: number;
        other: number;
    };
    recentBlogs?: Array<{
        id: number;
        title: string;
        created_at: Date | string;
        status: string;
        category: string;
        author: string;
        image: string | null;
        slug?: string; // Optional now as logs usually don't have slugs
    }>;
    trends?: {
        posts: { value: number; isPositive: boolean };
        comments: { value: number; isPositive: boolean };
        media: { value: number; isPositive: boolean };
        categories: { value: number; isPositive: boolean };
        onlineUsers: { value: number; isPositive: boolean };
    };
    charts: {
        weekly: Array<{ date: string; posts: number; views: number }>;
        monthly: Array<{ month: string; posts: number; views: number }>;
    };
    categoryReport: Array<{
        id: number;
        name: string;
        slug: string;
        totalPosts: number;
        publishedPosts?: number;
        totalViews: number;
    }>;
    browsers?: Array<{
        name: string;
        count: number;
        percentage: number;
    }>;
    devices?: Array<{
        name: string;
        count: number;
        percentage: number;
    }>;
    heatmapData?: Array<{
        name: string;
        data: number[];
    }>;
    visitorsByDevice?: {
        current: number[];
        lastMonth: number[];
    };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [loading, setLoading] = useState(true);
    const [healthCheck, setHealthCheck] = useState<any>(null);

    // Helper function for formatting file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    // Helper function for formatting date
    const formatDate = (date: Date | string): string => {
        const d = new Date(date);
        return d.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };


    // Detect dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            if (typeof window !== 'undefined') {
                const isDarkMode = document.documentElement.classList.contains('dark') ||
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                setIsDark(isDarkMode);
            }
        };

        checkDarkMode();

        // Listen for theme changes
        const observer = new MutationObserver(checkDarkMode);
        if (typeof window !== 'undefined') {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', checkDarkMode);

            return () => {
                observer.disconnect();
                mediaQuery.removeEventListener('change', checkDarkMode);
            };
        }
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/v1/admin/system/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchHealthCheck = async () => {
            try {
                const res = await fetch("/api/admin/system/health"); // Updated endpoint
                if (res.ok) {
                    const data = await res.json();
                    setHealthCheck(data);
                }
            } catch (err) {
                console.error('Error fetching health check:', err);
            }
        };

        fetchStats();
        fetchHealthCheck();
        const interval = setInterval(() => {
            fetchStats();
            fetchHealthCheck();
        }, 15000); // Poll every 15s for real-time feel
        return () => clearInterval(interval);
    }, []);

    // Prepare data for useMemo hooks (before early returns to follow Rules of Hooks)
    const monthlyStatsData = stats?.charts?.monthly || [];
    const monthlyViews = monthlyStatsData.map(m => m.views || 0);
    const monthlyPosts = monthlyStatsData.map(m => m.posts || 0);

    const realDeviceData = stats?.devices || [];
    const deviceColorMap: { [key: string]: string } = {
        'Mobile': '#3b82f6',
        'Tablet': '#ff49cd',
        'Desktop': '#fdaf22'
    };
    const deviceData = [
        { name: 'Mobile', value: realDeviceData.find(d => d.name === 'Mobile')?.count || 0, color: deviceColorMap['Mobile'] },
        { name: 'Tablet', value: realDeviceData.find(d => d.name === 'Tablet')?.count || 0, color: deviceColorMap['Tablet'] },
        { name: 'Desktop', value: realDeviceData.find(d => d.name === 'Desktop')?.count || 0, color: deviceColorMap['Desktop'] }
    ].filter(d => d.value > 0);
    const totalDevices = deviceData.reduce((sum, item) => sum + item.value, 0);

    // All useMemo hooks must be called before early returns (Rules of Hooks)
    const audienceChartOptions: any = useMemo(() => ({
        chart: {
            type: 'bar' as const,
            height: 345,
            toolbar: { show: false },
            fontFamily: 'IRANYekanX, sans-serif'
        },
        stroke: {
            show: true,
            width: [0, 1.1],
            colors: ['transparent'],
            curve: 'straight',
            dashArray: [0, 2]
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: monthlyStatsData.map(m => {
                // Extract month name from Persian date string
                const match = m.month?.match(/(\d{4}|\w+)/g);
                if (match && match.length >= 2) {
                    return match[0]; // Return month name
                }
                return m.month || '';
            }).slice(0, 12) || [],
            labels: {
                style: {
                    fontFamily: 'IRANYekanX',
                    fontSize: '12px',
                    colors: isDark ? '#d1d5db' : '#373d3f'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontFamily: 'IRANYekanX',
                    fontSize: '11px',
                    colors: isDark ? '#d1d5db' : '#373d3f'
                }
            },
            min: 0,
            tickAmount: 4
        },
        fill: {
            opacity: 1
        },
        grid: {
            borderColor: isDark ? '#374151' : '#f1f1f1',
            strokeDashArray: 3,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        colors: ['#3b82f6', '#ff49cd'],
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            style: {
                fontFamily: 'IRANYekanX',
                fontSize: '12px'
            },
            shared: true,
            intersect: false
        }
    }), [isDark, monthlyStatsData]);

    const deviceChartOptions = useMemo(() => ({
        chart: {
            type: 'donut' as const,
            height: 267,
        },
        labels: deviceData.map(d => d.name),
        colors: deviceData.map(d => d.color),
        legend: {
            show: false
        },
        dataLabels: {
            enabled: false
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '14px',
                            fontWeight: 400,
                            color: isDark ? '#d1d5db' : '#495057',
                        },
                        value: {
                            show: true,
                            fontSize: '22px',
                            fontWeight: 600,
                            color: isDark ? '#f3f4f6' : '#373d3f',
                        },
                        total: {
                            show: true,
                            label: 'Total Audience',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: isDark ? '#d1d5db' : '#495057',
                            formatter: () => totalDevices.toString()
                        }
                    }
                }
            }
        }
    }), [isDark, deviceData, totalDevices]);

    // Heatmap Chart Options for Users By Time Of Week
    const heatmapChartOptions: any = useMemo(() => ({
        chart: {
            type: 'heatmap' as const,
            height: 262,
            toolbar: { show: false }
        },
        dataLabels: {
            enabled: false
        },
        colors: ['#adeece'],
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                colorScale: {
                    ranges: isDark ? [
                        { from: 0, to: 20, color: '#1f2937' },
                        { from: 21, to: 40, color: '#374151' },
                        { from: 41, to: 60, color: '#4b5563' },
                        { from: 61, to: 80, color: '#059669' },
                        { from: 81, to: 100, color: '#10b981' }
                    ] : [
                        { from: 0, to: 20, color: '#f7fdfa' },
                        { from: 21, to: 40, color: '#e8faf1' },
                        { from: 41, to: 60, color: '#d4f5e7' },
                        { from: 61, to: 80, color: '#b8eed5' },
                        { from: 81, to: 100, color: '#53d484' }
                    ]
                }
            }
        },
        xaxis: {
            categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            labels: {
                style: {
                    fontSize: '11px',
                    fontWeight: 600,
                    colors: isDark ? '#d1d5db' : '#8c9097'
                }
            }
        },
        yaxis: {
            categories: ['1Am', '4Am', '8Am', '12Am', '3Pm', '7Pm', '12Pm'],
            labels: {
                style: {
                    fontSize: '11px',
                    fontWeight: 600,
                    colors: isDark ? '#d1d5db' : '#8c9097'
                }
            }
        },
        grid: {
            borderColor: isDark ? '#374151' : '#f2f5f7',
            padding: {
                right: 20
            }
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            style: {
                fontFamily: 'IRANYekanX',
                fontSize: '12px'
            }
        }
    }), [isDark]);

    // Total Visitors Chart Options
    const visitorsChartOptions: any = useMemo(() => ({
        chart: {
            type: 'bar' as const,
            height: 310,
            toolbar: { show: false },
            fontFamily: 'IRANYekanX, sans-serif',
            stacked: false
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '40%',
                borderRadius: 0,
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 0,
        },
        xaxis: {
            categories: ['Mobile', 'Desktop', 'Tablet', 'iPad pro', 'iPhone', 'Other'],
            labels: {
                style: {
                    fontFamily: 'IRANYekanX',
                    fontSize: '13px',
                    fontWeight: 500,
                    colors: isDark ? '#d1d5db' : '#373d3f'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontFamily: 'IRANYekanX',
                    fontSize: '11px',
                    colors: isDark ? '#d1d5db' : '#373d3f'
                }
            },
            min: 0,
            tickAmount: 5
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.5,
                gradientToColors: ['#06b6d4', undefined], // cyan-500 (info) for first series, none for second
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 0.6,
                stops: [0, 20, 100]
            }
        },
        colors: ['#3b82f6', '#e5e7eb'], // primary for Current, light gray for Last Month
        grid: {
            borderColor: isDark ? '#374151' : '#e5e7eb',
            strokeDashArray: 5,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        legend: {
            show: true,
            position: 'bottom',
            horizontalAlign: 'center',
            fontFamily: 'IRANYekanX',
            fontSize: '12px',
            fontWeight: 400,
            labels: {
                colors: isDark ? '#d1d5db' : '#374151'
            },
            markers: {
                shape: 'square'
            }
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            style: {
                fontFamily: 'IRANYekanX',
                fontSize: '12px'
            },
            y: {
                formatter: (val: number) => `${val.toLocaleString('fa-IR')} بازدیدکننده`
            }
        }
    }), [isDark]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" text="در حال بارگذاری آمار..." />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-lg text-red-600 dark:text-red-400">خطا در بارگذاری آمار</div>
            </div>
        );
    }

    const displayStats = {
        ...stats,
        totalViews: stats.totalViews || 0,
        totalArticles: stats.totalArticles || 0,
        totalAuthors: stats.totalAuthors || 0,
        totalCategories: stats.totalCategories || 0,
        totalMediaFiles: stats.totalMediaFiles || 0,
        totalOnlineUsers: stats.totalOnlineUsers || 0,
        trends: stats.trends || {
            posts: { value: 0, isPositive: true },
            comments: { value: 0, isPositive: true },
            media: { value: 0, isPositive: true },
            categories: { value: 0, isPositive: false },
            onlineUsers: { value: 0, isPositive: true },
        },
        categoryReport: stats.categoryReport || [],
    };

    // Calculate total views across all categories for percentage
    const totalCategoryViews = (stats.categoryReport || []).reduce((sum: number, cat: any) => sum + (cat.totalViews || 0), 0);

    // Chart Series (can be calculated after early returns since they're not hooks)
    const audienceChartSeries: any = [
        {
            name: 'بازدید',
            type: 'column',
            data: monthlyViews.slice(0, 12)
        },
        {
            name: 'مقالات',
            type: 'line',
            data: monthlyPosts.slice(0, 12)
        }
    ];

    const deviceChartSeries = deviceData.map(d => d.value);

    // Heatmap data - استفاده از داده‌های واقعی
    const heatmapSeries = stats?.heatmapData || [
        { name: '1Am', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '4Am', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '8Am', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '12Am', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '3Pm', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '7Pm', data: [0, 0, 0, 0, 0, 0, 0] },
        { name: '12Pm', data: [0, 0, 0, 0, 0, 0, 0] }
    ];

    // Visitors Chart Series - استفاده از داده‌های واقعی
    const visitorsDeviceData = stats?.visitorsByDevice || { current: [], lastMonth: [] };
    const visitorsChartSeries: any = [
        {
            name: 'فعلی',
            data: visitorsDeviceData.current.length > 0 ? visitorsDeviceData.current : [0, 0, 0, 0, 0, 0],
            color: '#3b82f6' // primary color
        },
        {
            name: 'ماه گذشته',
            data: visitorsDeviceData.lastMonth.length > 0 ? visitorsDeviceData.lastMonth : [0, 0, 0, 0, 0, 0],
            color: '#e5e7eb' // light gray
        }
    ];

    return (
        <div className="w-full">
            {/* Page Header - Vyzor Style */}
            <div className="mb-3 flex flex-wrap items-center justify-between">
                <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-0">تحلیل و آمار</h1>
                <ol className="flex items-center gap-2 mb-0 list-none">
                    <li>
                        <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 text-sm">
                            داشبورد
                        </Link>
                    </li>
                    <li className="text-gray-500 dark:text-gray-300">/</li>
                    <li className="text-gray-800 dark:text-gray-100 text-sm" aria-current="page">تحلیل و آمار</li>
                </ol>
            </div>

            {/* Row 1 - Stats Cards + Sessions By Device + Audience Metrics + Browser Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-4">
                {/* Left Column - col-xxl-9 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-9">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
                        {/* 4 KPI Cards */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-3">
                            <StatCard
                                title="تعداد خبرهای درست شده"
                                value={displayStats.publishedArticles || 0}
                                trend={{
                                    value: displayStats.trends?.posts?.value || 0,
                                    isPositive: displayStats.trends?.posts?.isPositive ?? true,
                                    period: "امسال"
                                }}
                                iconBgColor="primary"
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
                            <StatCard
                                title="تعداد خبر ارسال تلگرام"
                                value={displayStats.telegramSentCount || 0}
                                trend={{
                                    value: 0,
                                    isPositive: true,
                                    period: "امسال"
                                }}
                                iconBgColor="secondary"
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 3.105l-17.894 7.421c-1.153.478-1.153 1.913 0 2.391l5.22 2.168 4.043-2.734 6.601 5.729c.997.997 2.654.33 2.654-1.103V4.506c0-1.433-1.657-2.1-2.654-1.103l-4.043 2.735-5.22-2.168c-1.153-.478-2.296.189-1.997 1.298l1.75 8.338c.24 1.144 1.764 1.676 2.755.982l3.415-2.31 3.608 3.13c.574.574 1.503.574 2.077 0l4.02-4.02c.574-.574.574-1.503 0-2.077l-3.608-3.13 3.415-2.31c.991-.694 1.177-2.107.542-3.05z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
                            <StatCard
                                title="تعداد خبرهای ارسال وب‌سایت"
                                value={displayStats.websiteSentCount || 0}
                                trend={{
                                    value: displayStats.trends?.posts?.value || 0,
                                    isPositive: displayStats.trends?.posts?.isPositive ?? true,
                                    period: "امسال"
                                }}
                                iconBgColor="success"
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
                            <StatCard
                                title="تعداد ارورهای خبرها"
                                value={displayStats.telegramErrorsCount || 0}
                                trend={{
                                    value: 0,
                                    isPositive: false,
                                    period: "امسال"
                                }}
                                iconBgColor="danger"
                                icon={
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                }
                            />
                        </div>

                        {/* Sessions By Device - col-xxl-4 equivalent */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">جلسات بر اساس دستگاه</h3>
                                    <button className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 px-2 py-1 flex items-center gap-1">
                                        مشاهده همه
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                {deviceData.length > 0 ? (
                                    <>
                                        <div className="p-4">
                                            {typeof window !== 'undefined' && (
                                                <Chart
                                                    options={deviceChartOptions}
                                                    series={deviceChartSeries}
                                                    type="donut"
                                                    height={267}
                                                />
                                            )}
                                        </div>
                                        <div className="border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
                                            {deviceData.map((device, index) => (
                                                <div key={index} className="p-3 text-center">
                                                    <h5 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{device.value}</h5>
                                                    <span className="text-xs text-gray-600 dark:text-gray-300 block">{device.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="text-center">
                                            <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">پس از فعال‌سازی سیستم آنالیتیکس، اطلاعات دستگاه‌ها نمایش داده می‌شود</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audience Metrics - col-xxl-8 equivalent */}
                        <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-8">
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">معیارهای مخاطبان</h3>
                                </div>
                                {monthlyStatsData.length > 0 ? (
                                    <div className="p-4">
                                        {typeof window !== 'undefined' && (
                                            <Chart
                                                options={audienceChartOptions}
                                                series={audienceChartSeries}
                                                type="bar"
                                                height={345}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-8" style={{ minHeight: 345 }}>
                                        <div className="text-center">
                                            <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">پس از ثبت بازدید مقالات، نمودار معیارها نمایش داده می‌شود</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Browser Insights - col-xxl-3 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">بینش مرورگر</h3>
                        </div>
                        <div className="p-4">
                            {(stats?.browsers || []).length > 0 ? (
                                <ul className="space-y-4">
                                    {(stats?.browsers || []).slice(0, 6).map((browser, index) => (
                                        <li key={index}>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{browser.name.charAt(0)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{browser.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">{browser.count.toLocaleString()}</div>
                                                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${browser.percentage}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">پس از فعال‌سازی آنالیتیکس، آمار مرورگرها نمایش داده می‌شود</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2 - Visitors By Countries + Top Campaigns + Users By Time Of Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-4">
                {/* Visitors By Countries - col-xxl-4 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">بازدیدکنندگان بر اساس کشور</h3>
                    </div>
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-gray-500 dark:text-gray-400">سیستم ردیابی بازدید فعال نشده است</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">برای نمایش آمار کشورها نیاز به فعال‌سازی analytics است</p>
                        </div>
                    </div>
                </div>

                {/* Top Campaigns - col-xxl-5 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">دسته‌بندی‌های برتر</h3>
                        <Link href="/admin/blog/category" className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 px-2 py-1 flex items-center gap-1">
                            مشاهده همه
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">دسته‌بندی</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">تعداد خبر</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">درصد</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">وضعیت</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">عملیات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {(stats.categoryReport || []).slice(0, 5).map((cat, index) => {
                                    // Category icon colors
                                    const catColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                                    const catColor = catColors[index % catColors.length];

                                    return (
                                        <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded ${catColor} flex items-center justify-center overflow-hidden shrink-0`}>
                                                        <span className="text-xs font-bold text-white">{cat.name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{cat.name}</p>
                                                        <span className="text-xs text-gray-600 dark:text-gray-300">دسته‌بندی</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                                                {(cat.totalPosts || 0).toLocaleString('fa-IR')}
                                            </td>
                                            <td className="px-4 py-3 text-blue-600 dark:text-blue-400">
                                                {totalCategoryViews > 0 ? ((cat.totalViews / totalCategoryViews) * 100).toFixed(1) : 0}%
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${(cat as any).publishedPosts > 0
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {(cat as any).publishedPosts > 0 ? `${((cat as any).publishedPosts || 0).toLocaleString('fa-IR')} منتشر شده` : 'بدون انتشار'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link href="/admin/blog/category" className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Users By Time Of Week - col-xxl-3 equivalent */}
                <div className="col-span-12 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">کاربران بر اساس زمان هفته</h3>
                    </div>
                    {(stats?.heatmapData || []).length > 0 ? (
                        <div className="p-0">
                            {typeof window !== 'undefined' && (
                                <Chart
                                    options={heatmapChartOptions}
                                    series={heatmapSeries}
                                    type="heatmap"
                                    height={277}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-8" style={{ minHeight: 277 }}>
                            <div className="text-center">
                                <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای برای نمایش وجود ندارد</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">پس از فعال‌سازی ردیابی کاربران، نقشه حرارتی نمایش داده می‌شود</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3 - Recent Blogs + Media Gallery + Health Check + Agent Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-4">
                {/* Recent Blogs - col-xxl-6 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">خبرهای اخیر</h3>
                        <Link href="/admin/blog/bloglist" className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 px-2 py-1 flex items-center gap-1">
                            مشاهده همه
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            {stats.recentBlogs && stats.recentBlogs.length > 0 ? (
                                stats.recentBlogs.map((blog) => (
                                    <Link
                                        key={blog.id}
                                        href={`/admin/blog/${blog.id}/edit`}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                                            <img
                                                src={blog.image || '/images/logo/logo.png'}
                                                alt={blog.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = '/images/logo/logo.png';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{blog.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-600 dark:text-gray-300">{blog.category}</span>
                                                <span className="text-gray-400 dark:text-gray-300">•</span>
                                                <span className="text-xs text-gray-600 dark:text-gray-300">{formatDate(blog.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${blog.status === 'PUBLISHED'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : blog.status === 'PENDING'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {blog.status === 'PUBLISHED' ? 'منتشر شده' : blog.status === 'PENDING' ? 'در انتظار' : 'پیش‌نویس'}
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-300 text-sm">خبری یافت نشد</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Media Gallery Size - col-xxl-3 equivalent */}
                <div className="col-span-12 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">آمار فایل‌های رسانه</h3>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">کل حجم:</span>
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatFileSize(displayStats.totalMediaSize || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">تعداد کل فایل:</span>
                            <span className="text-base font-bold text-gray-800 dark:text-gray-100">{(displayStats.totalMediaFiles || 0).toLocaleString('fa-IR')} فایل</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-gray-600 dark:text-gray-300">تصاویر</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({(stats?.mediaCounts?.image || 0).toLocaleString('fa-IR')} فایل)</span>
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-100">{formatFileSize(displayStats.mediaBreakdown?.image || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-gray-600 dark:text-gray-300">ویدیوها</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({(stats?.mediaCounts?.video || 0).toLocaleString('fa-IR')} فایل)</span>
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-100">{formatFileSize(displayStats.mediaBreakdown?.video || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-gray-600 dark:text-gray-300">اسناد</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({(stats?.mediaCounts?.document || 0).toLocaleString('fa-IR')} فایل)</span>
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-100">{formatFileSize(displayStats.mediaBreakdown?.document || 0)}</span>
                            </div>
                            {(stats?.mediaCounts?.other || 0) > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        <span className="text-gray-600 dark:text-gray-300">سایر</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">({(stats?.mediaCounts?.other || 0).toLocaleString('fa-IR')} فایل)</span>
                                    </div>
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{formatFileSize(displayStats.mediaBreakdown?.other || 0)}</span>
                                </div>
                            )}
                        </div>
                        <Link
                            href="/admin/media-gallery"
                            className="block mt-4 text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            مدیریت فایل‌ها →
                        </Link>
                    </div>
                </div>

                {/* API Health Check - col-xxl-3 equivalent */}
                <div className="col-span-12 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">وضعیت سیستم</h3>
                    </div>
                    <div className="p-4">
                        {healthCheck ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600 dark:text-gray-300">پردازنده ({healthCheck.system?.cpu?.cores || 0} هسته)</span>
                                        <span className="text-gray-800 dark:text-gray-100">{healthCheck.system?.cpu?.percent || 0}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${(healthCheck.system?.cpu?.percent || 0) > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${healthCheck.system?.cpu?.percent || 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600 dark:text-gray-300">رم ({healthCheck.system?.ram?.usedGB || 0} / {healthCheck.system?.ram?.totalGB || 0} GB)</span>
                                        <span className="text-gray-800 dark:text-gray-100">{healthCheck.system?.ram?.percent || 0}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${(healthCheck.system?.ram?.percent || 0) > 85 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${healthCheck.system?.ram?.percent || 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-600 dark:text-gray-300">دیسک ({healthCheck.system?.disk?.usedLabel || '0 GB'} / {healthCheck.system?.disk?.totalLabel || '0 GB'})</span>
                                        <span className="text-gray-800 dark:text-gray-100">{healthCheck.system?.disk?.percent || 0}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${(healthCheck.system?.disk?.percent || 0) > 90 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${healthCheck.system?.disk?.percent || 0}%` }}></div>
                                    </div>
                                </div>

                                {healthCheck.system?.uptime && (
                                    <div className="flex justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-300">آپتایم سیستم</span>
                                        <span className="text-gray-800 dark:text-gray-100">{healthCheck.system.uptime}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40">
                                <div className="text-sm text-gray-500">در حال دریافت اطلاعات...</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 4 - Total Visitors Chart + Agent Status & Telegram Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mb-4">
                {/* Total Visitors Chart - col-xxl-4 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-0">کل بازدیدکنندگان</h3>
                        <div className="relative">
                            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    {(stats?.visitorsByDevice?.current || []).length > 0 ? (
                        <div className="p-4 pt-2 pb-0">
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-0">
                                <span className="text-gray-600 dark:text-gray-300">{(displayStats.totalViews || 0).toLocaleString('fa-IR')}</span>
                            </h2>
                            <div className="mt-3 -mx-3">
                                {typeof window !== 'undefined' && (
                                    <Chart
                                        options={visitorsChartOptions}
                                        series={visitorsChartSeries}
                                        type="bar"
                                        height={310}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-8" style={{ minHeight: 310 }}>
                            <div className="text-center">
                                <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <p className="text-sm text-gray-500 dark:text-gray-400">سیستم ردیابی بازدید فعال نشده است</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">پس از فعال‌سازی آنالیتیکس، آمار بازدیدکنندگان نمایش داده می‌شود</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Agent Status & Telegram Channel - col-xxl-8 equivalent */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-12 xl:col-span-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">وضعیت Agent‌ها و تلگرام</h3>
                    </div>
                    <div className="p-4">
                        {healthCheck?.agent ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">وضعیت Unified Agent</span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${healthCheck.agent.isRunning
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {healthCheck.agent.isRunning ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">اتصال ربات تلگرام</span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${healthCheck.agent.telegram?.status === 'healthy'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {healthCheck.agent.telegram?.status === 'healthy' ? 'متصل' : 'قطع/خطا'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">ارسال به وب‌سایت</span>
                                    <span className={`text-xs font-medium ${healthCheck.agent.website?.enabled
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-gray-500 dark:text-gray-300'
                                        }`}>
                                        {healthCheck.agent.website?.enabled ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </div>
                                <Link
                                    href="/admin/telegram"
                                    className="block mt-4 text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                    تنظیمات تلگرام →
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-300 text-sm">در حال بررسی وضعیت...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
