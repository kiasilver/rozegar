"use client";

import React, { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from "@/components/Admin/common/ComponentCard";
import dynamic from "next/dynamic";
import { exportToCSV } from "@/lib/utils/export-utils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ReportsData {
  ads?: any;
  authors?: any[];
  analytics?: any;
  agent?: any;
  categories?: any;
  comments?: any;
  tokenUsage?: any;
}

type TabType = "agent" | "ads" | "token-usage" | "analytics" | "categories" | "comments";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportsData>({});
  const [activeTab, setActiveTab] = useState<TabType>("agent");
  const [dateRange, setDateRange] = useState("30d");
  const [tokenPeriod, setTokenPeriod] = useState<"daily" | "monthly" | "yearly">("daily");

  // Check URL params for tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["agent", "ads", "token-usage", "analytics", "categories", "comments"].includes(tab)) {
        setActiveTab(tab as TabType);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === "token-usage") {
      fetchTokenUsage();
    } else {
      fetchReports();
    }
  }, [dateRange, activeTab, tokenPeriod]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange !== "all") {
        const now = new Date();
        let days = 30;
        if (dateRange === "7d") days = 7;
        else if (dateRange === "90d") days = 90;
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        params.set("startDate", startDate.toISOString());
        params.set("endDate", now.toISOString());
      }

      if (activeTab === "agent") {
        const res = await fetch("/api/v1/admin/system/reports/agent");
        const data = await res.json();
        if (data.success) {
          setReports({ agent: data.data });
        }
      } else if (activeTab === "ads") {
        const res = await fetch(`/api/v1/admin/system/reports?type=ads&${params.toString()}`);
        const data = await res.json();
        setReports({ ads: data });
      } else if (activeTab === "analytics") {
        const res = await fetch(`/api/v1/admin/system/reports?type=analytics&${params.toString()}`);
        const data = await res.json();
        setReports({ analytics: data });
      } else if (activeTab === "categories") {
        const res = await fetch(`/api/v1/admin/system/reports/categories?${params.toString()}`);
        const data = await res.json();
        setReports({ categories: data });
      } else if (activeTab === "comments") {
        const res = await fetch(`/api/v1/admin/system/reports/comments?${params.toString()}`);
        const data = await res.json();
        setReports({ comments: data });
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/legacy/token-usage-summary");
      const data = await res.json();
      if (data.success) {
        setReports({ tokenUsage: data });
      }
    } catch (error) {
      console.error("Error fetching token usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: string) => {
    if (type === "agent" && reports.agent) {
      exportToCSV(
        reports.agent.byCategory?.map((cat: any) => ({
          دسته‌بندی: cat.name,
          تعداد: cat.count,
        })) || [],
        "agent-report-categories"
      );
    } else if (type === "ads" && reports.ads) {
      exportToCSV(
        reports.ads.ads?.map((ad: any) => ({
          عنوان: ad.title || "بدون عنوان",
          موقعیت: ad.position,
          کلیک: ad.click_count,
          نمایش: ad.view_count,
          "CTR (%)": ad.ctr?.toFixed(2) || "0",
          وضعیت: ad.is_active ? "فعال" : "غیرفعال",
        })) || [],
        "ads-report"
      );
    } else if (type === "analytics" && reports.analytics) {
      exportToCSV(
        reports.analytics.byDate?.map((item: any) => ({
          تاریخ: item.date,
          مقالات: item.posts,
          بازدیدها: item.views,
        })) || [],
        "analytics-report"
      );
    } else if (type === "categories" && reports.categories) {
      exportToCSV(
        reports.categories.map((cat: any) => ({
          دسته‌بندی: cat.name,
          "تعداد مقالات": cat.totalPosts,
          "کل بازدیدها": cat.totalViews,
          "میانگین بازدید": cat.averageViews,
        })) || [],
        "categories-report"
      );
    } else if (type === "comments" && reports.comments) {
      exportToCSV(
        reports.comments.comments?.map((comment: any) => ({
          "عنوان مقاله": comment.blogTitle,
          "نام کاربر": comment.userName,
          "محتوا": comment.content,
          "وضعیت": comment.isApproved ? "تایید شده" : "در انتظار",
          "تاریخ": comment.createdAt,
        })) || [],
        "comments-report"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600 dark:text-gray-300">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="گزارش‌های جامع" />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { id: "agent", label: "گزارش Agent" },
            { id: "ads", label: "گزارش تبلیغات" },
            { id: "token-usage", label: "لاگ مصرف توکن" },
            { id: "analytics", label: "گزارش Analytics" },
            { id: "categories", label: "گزارش دسته‌بندی‌ها" },
            { id: "comments", label: "گزارش نظرات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {activeTab !== "token-usage" && (
        <ComponentCard title="فیلترها">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                بازه زمانی
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="7d">۷ روز گذشته</option>
                <option value="30d">۳۰ روز گذشته</option>
                <option value="90d">۹۰ روز گذشته</option>
                <option value="all">همه زمان‌ها</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleExport(activeTab)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                خروجی CSV
              </button>
            </div>
          </div>
        </ComponentCard>
      )}

      {/* Token Usage Period Selector */}
      {activeTab === "token-usage" && (
        <ComponentCard title="بازه زمانی">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTokenPeriod("daily")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tokenPeriod === "daily"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              📅 امروز
            </button>
            <button
              onClick={() => setTokenPeriod("monthly")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tokenPeriod === "monthly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              📆 این ماه
            </button>
            <button
              onClick={() => setTokenPeriod("yearly")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tokenPeriod === "yearly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              📅 امسال
            </button>
          </div>
        </ComponentCard>
      )}

      {/* Reports Content */}
      {activeTab === "agent" && reports.agent && (
        <AgentReportView data={reports.agent} />
      )}

      {activeTab === "ads" && reports.ads && (
        <AdsReportView data={reports.ads} />
      )}

      {activeTab === "token-usage" && reports.tokenUsage && (
        <TokenUsageReportView data={reports.tokenUsage} period={tokenPeriod} />
      )}

      {activeTab === "analytics" && reports.analytics && (
        <AnalyticsReportView data={reports.analytics} />
      )}

      {activeTab === "categories" && reports.categories && (
        <CategoriesReportView data={reports.categories} />
      )}

      {activeTab === "comments" && reports.comments && (
        <CommentsReportView data={reports.comments} />
      )}
    </div>
  );
}

// Agent Report View
function AgentReportView({ data }: { data: any }) {
  const performance = data.performance || {};
  const byCategory = data.byCategory || [];
  const byRssFeed = data.byRssFeed || [];
  const dailyStats = data.dailyStats || [];

  // Chart options for daily stats
  const dailyChartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: false },
    },
    xaxis: {
      categories: dailyStats.map((stat: any) =>
        new Date(stat.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })
      ) || [],
    },
    yaxis: {
      title: { text: "تعداد مقالات" },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const },
    colors: ["#3b82f6"],
  };

  const dailyChartSeries = [
    {
      name: "مقالات ساخته شده",
      data: dailyStats.map((stat: any) => stat.count) || [],
    },
  ];

  // Category chart
  const categoryChartOptions = {
    chart: {
      type: "bar" as const,
      height: 400,
      toolbar: { show: false },
    },
    xaxis: {
      categories: byCategory.slice(0, 10).map((cat: any) => cat.name) || [],
    },
    yaxis: {
      title: { text: "تعداد مقالات" },
    },
    dataLabels: { enabled: true },
    colors: ["#10b981"],
  };

  const categoryChartSeries = [
    {
      name: "مقالات",
      data: byCategory.slice(0, 10).map((cat: any) => cat.count) || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ComponentCard className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">کل مقالات ساخته شده</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {performance.totalArticles?.toLocaleString("fa-IR") || 0}
          </div>
        </ComponentCard>

        <ComponentCard className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">مقالات ۳۰ روز گذشته</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {performance.recentArticles?.toLocaleString("fa-IR") || 0}
          </div>
        </ComponentCard>

        <ComponentCard className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">میانگین روزانه</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {performance.averagePerDay?.toFixed(1) || "0"}
          </div>
        </ComponentCard>

        <ComponentCard className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">نرخ موفقیت</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {performance.successRate?.toFixed(1) || "0"}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {performance.totalSuccess || 0} موفق / {performance.totalErrors || 0} خطا
          </div>
        </ComponentCard>
      </div>

      {/* Daily Stats Chart */}
      {dailyStats.length > 0 && (
        <ComponentCard title="روند روزانه مقالات (۳۰ روز گذشته)">
          {typeof window !== "undefined" && ReactApexChart && (
            <ReactApexChart
              options={dailyChartOptions}
              series={dailyChartSeries}
              type="line"
              height={350}
            />
          )}
        </ComponentCard>
      )}

      {/* Articles by Category */}
      <ComponentCard title="تعداد مقالات بر اساس دسته‌بندی">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    دسته‌بندی
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    تعداد
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    نمودار
                  </th>
                </tr>
              </thead>
              <tbody>
                {byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      هیچ داده‌ای یافت نشد
                    </td>
                  </tr>
                ) : (
                  byCategory.map((cat: any) => {
                    const percentage = performance.totalArticles > 0
                      ? ((cat.count / performance.totalArticles) * 100).toFixed(1)
                      : '0';
                    return (
                      <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                          {cat.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                          {cat.count.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(parseFloat(percentage), 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="mr-2 text-xs text-gray-500 dark:text-gray-400">
                              {percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {byCategory.length > 0 && (
            <div>
              {typeof window !== "undefined" && ReactApexChart && (
                <ReactApexChart
                  options={categoryChartOptions}
                  series={categoryChartSeries}
                  type="bar"
                  height={400}
                />
              )}
            </div>
          )}
        </div>
      </ComponentCard>

      {/* RSS Feeds Stats */}
      <ComponentCard title="بیشترین خبرها از RSS Feed ها">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  منبع RSS
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  تعداد مقالات
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  نمودار
                </th>
              </tr>
            </thead>
            <tbody>
              {byRssFeed.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    هیچ داده‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                byRssFeed.map((feed: any, index: number) => {
                  const maxCount = byRssFeed[0]?.count || 1;
                  const percentage = ((feed.count / maxCount) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {feed.domain}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md" title={feed.url}>
                          {feed.url}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                        {feed.count.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(parseFloat(percentage), 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ComponentCard>
    </div>
  );
}

// Token Usage Report View
function TokenUsageReportView({ data, period }: { data: any; period: "daily" | "monthly" | "yearly" }) {
  const periodData = data[period] || {};
  const summary = periodData.summary || {};
  const byProvider = periodData.byProvider || [];
  const byOperation = periodData.byOperation || [];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fa-IR").format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  };

  const getProviderDisplay = (provider: string) => {
    const providerMap: Record<string, { label: string; color: string; icon: string }> = {
      backboard: { label: "Backboard.io", color: "text-blue-600 dark:text-blue-400", icon: "🔷" },
      gemini: { label: "Google Gemini", color: "text-purple-600 dark:text-purple-400", icon: "💎" },
      openai: { label: "OpenAI", color: "text-green-600 dark:text-green-400", icon: "🤖" },
      cursor: { label: "Cursor", color: "text-orange-600 dark:text-orange-400", icon: "⚡" },
      custom: { label: "Custom AI", color: "text-gray-600 dark:text-gray-400", icon: "🔧" },
      huggingface: { label: "HuggingFace", color: "text-yellow-600 dark:text-yellow-400", icon: "🤗" },
    };
    
    return providerMap[provider.toLowerCase()] || { 
      label: provider, 
      color: "text-gray-900 dark:text-gray-100", 
      icon: "📊" 
    };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComponentCard className="bg-blue-50 dark:bg-blue-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">کل توکن‌ها</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(summary.totalTokens || 0)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Input: {formatNumber(summary.inputTokens || 0)} | Output: {formatNumber(summary.outputTokens || 0)}
          </div>
        </ComponentCard>

        <ComponentCard className="bg-green-50 dark:bg-green-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">هزینه کل</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summary.totalCost || 0)}
          </div>
          {summary.avgCostPerDay && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              متوسط روزانه: {formatCurrency(summary.avgCostPerDay)}
            </div>
          )}
        </ComponentCard>

        <ComponentCard className="bg-purple-50 dark:bg-purple-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">تعداد درخواست‌ها</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatNumber(summary.totalRequests || 0)}
          </div>
          {summary.avgTokensPerDay && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              متوسط توکن/روز: {formatNumber(summary.avgTokensPerDay)}
            </div>
          )}
        </ComponentCard>

        <ComponentCard className="bg-orange-50 dark:bg-orange-900/20">
          <div className="text-sm text-gray-600 dark:text-gray-400">میانگین هزینه/درخواست</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summary.totalRequests > 0
              ? formatCurrency((summary.totalCost || 0) / summary.totalRequests)
              : formatCurrency(0)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {summary.totalRequests > 0
              ? `${formatNumber((summary.totalTokens || 0) / summary.totalRequests)} توکن/درخواست`
              : "بدون درخواست"}
          </div>
        </ComponentCard>
      </div>

      {/* By Provider */}
      <ComponentCard title="بر اساس Provider">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Provider</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Input Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Output Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cost</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Requests</th>
              </tr>
            </thead>
            <tbody>
              {byProvider.map((stat: any, idx: number) => {
                const providerInfo = getProviderDisplay(stat.provider);
                return (
                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{providerInfo.icon}</span>
                        <span className={`font-medium ${providerInfo.color}`}>
                          {providerInfo.label}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.inputTokens || 0)}</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.outputTokens || 0)}</td>
                    <td className="p-2 font-semibold text-gray-900 dark:text-gray-100">{formatNumber(stat.totalTokens || 0)}</td>
                    <td className="p-2 text-green-600 dark:text-green-400 font-medium">{formatCurrency(stat.cost || 0)}</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.requests || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ComponentCard>

      {/* By Operation */}
      <ComponentCard title="بر اساس Operation">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Operation</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Input Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Output Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Total Tokens</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Cost</th>
                <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">Requests</th>
              </tr>
            </thead>
            <tbody>
              {byOperation.map((stat: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{stat.operation}</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.inputTokens || 0)}</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.outputTokens || 0)}</td>
                  <td className="p-2 font-semibold text-gray-900 dark:text-gray-100">{formatNumber(stat.totalTokens || 0)}</td>
                  <td className="p-2 text-green-600 dark:text-green-400 font-medium">{formatCurrency(stat.cost || 0)}</td>
                  <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.requests || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentCard>
    </div>
  );
}

// Ads Report View
function AdsReportView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ComponentCard title="کل تبلیغات">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.summary?.totalAds || 0}
          </div>
        </ComponentCard>
        <ComponentCard title="تبلیغات فعال">
          <div className="text-3xl font-bold text-green-600">
            {data.summary?.activeAds || 0}
          </div>
        </ComponentCard>
        <ComponentCard title="کل کلیک‌ها">
          <div className="text-3xl font-bold text-blue-600">
            {(data.summary?.totalClicks || 0).toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
        <ComponentCard title="کل نمایش‌ها">
          <div className="text-3xl font-bold text-purple-600">
            {(data.summary?.totalViews || 0).toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
        <ComponentCard title="میانگین CTR">
          <div className="text-3xl font-bold text-orange-600">
            {(data.summary?.averageCTR || 0).toFixed(2)}%
          </div>
        </ComponentCard>
      </div>

      {data.byPosition && Object.keys(data.byPosition).length > 0 && (
        <ComponentCard title="عملکرد بر اساس موقعیت">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">موقعیت</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تعداد</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">کلیک</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">نمایش</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">CTR</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byPosition).map(([position, stats]: [string, any]) => {
                  const ctr = stats.views > 0 ? ((stats.clicks / stats.views) * 100).toFixed(2) : "0";
                  return (
                    <tr key={position} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{position}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{stats.count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{stats.clicks.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{stats.views.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ctr}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      )}
    </div>
  );
}

// Analytics Report View
function AnalyticsReportView({ data }: { data: any }) {
  const chartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: false },
    },
    xaxis: {
      categories: data.byDate?.map((item: any) =>
        new Date(item.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" })
      ) || [],
    },
    yaxis: {
      title: { text: "تعداد" },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const },
    colors: ["#3b82f6", "#10b981"],
  };

  const chartSeries = [
    {
      name: "مقالات",
      data: data.byDate?.map((item: any) => item.posts) || [],
    },
    {
      name: "بازدیدها",
      data: data.byDate?.map((item: any) => item.views) || [],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComponentCard title="کل مقالات">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.summary?.totalPosts || 0}
          </div>
        </ComponentCard>
        <ComponentCard title="کل بازدیدها">
          <div className="text-3xl font-bold text-blue-600">
            {(data.summary?.totalViews || 0).toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
        <ComponentCard title="میانگین بازدید">
          <div className="text-3xl font-bold text-green-600">
            {(data.summary?.averageViews || 0).toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
      </div>

      <ComponentCard title="روند مقالات و بازدیدها">
        {typeof window !== "undefined" && ReactApexChart && (
          <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
        )}
      </ComponentCard>

      {data.byCategory && Object.keys(data.byCategory).length > 0 && (
        <ComponentCard title="عملکرد بر اساس دسته‌بندی">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">دسته‌بندی</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">مقالات</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">بازدیدها</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.byCategory).map(([category, stats]: [string, any]) => (
                  <tr key={category} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{stats.posts}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{stats.views.toLocaleString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      )}
    </div>
  );
}

// Categories Report View
function CategoriesReportView({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <ComponentCard title="گزارش دسته‌بندی‌ها">
        <p className="text-gray-600 dark:text-gray-400">هیچ داده‌ای یافت نشد</p>
      </ComponentCard>
    );
  }

  return (
    <div className="space-y-6">
      <ComponentCard title="گزارش دسته‌بندی‌ها">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">دسته‌بندی</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تعداد مقالات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">کل بازدیدها</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">میانگین بازدید</th>
              </tr>
            </thead>
            <tbody>
              {data.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{cat.totalPosts}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{cat.totalViews.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{cat.averageViews.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentCard>
    </div>
  );
}

// Comments Report View
function CommentsReportView({ data }: { data: any }) {
  const summary = data.summary || {};
  const byDate = data.byDate || [];
  const comments = data.comments || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComponentCard title="کل نظرات">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {summary.totalComments || 0}
          </div>
        </ComponentCard>
        <ComponentCard title="تایید شده">
          <div className="text-3xl font-bold text-green-600">
            {summary.approvedComments || 0}
          </div>
        </ComponentCard>
        <ComponentCard title="در انتظار">
          <div className="text-3xl font-bold text-yellow-600">
            {summary.pendingComments || 0}
          </div>
        </ComponentCard>
      </div>

      {byDate.length > 0 && (
        <ComponentCard title="روند نظرات">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تاریخ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">کل</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تایید شده</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">در انتظار</th>
                </tr>
              </thead>
              <tbody>
                {byDate.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {new Date(item.date).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.total}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{item.approved}</td>
                    <td className="px-4 py-3 text-sm text-yellow-600">{item.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      )}

      <ComponentCard title="آخرین نظرات">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">مقاله</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">کاربر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">محتوا</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">وضعیت</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {comments.slice(0, 20).map((comment: any) => (
                <tr key={comment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{comment.blogTitle}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{comment.userName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{comment.content}...</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      comment.isApproved
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}>
                      {comment.isApproved ? "تایید شده" : "در انتظار"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentCard>
    </div>
  );
}
