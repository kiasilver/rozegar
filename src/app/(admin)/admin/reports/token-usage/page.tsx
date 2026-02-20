"use client";

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from "@/components/Admin/common/ComponentCard";

interface PeriodStats {
  summary: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    totalRequests: number;
    avgTokensPerDay?: number;
    avgCostPerDay?: number;
  };
  byProvider: Array<{
    provider: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }>;
  byOperation: Array<{
    operation: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }>;
}

interface TokenUsageSummary {
  daily: PeriodStats;
  monthly: PeriodStats;
  yearly: PeriodStats;
}

// Helper function to get provider display info
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

export default function TokenUsageReportPage() {
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "yearly">("daily");
  const [menuAdded, setMenuAdded] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/admin/legacy/token-usage-summary");
      if (!response.ok) {
        throw new Error("Failed to fetch token usage summary");
      }
      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "خطا در دریافت آمار مصرف توکن");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // اضافه کردن منو به sidebar (یک بار)
    addMenuToSidebar();
  }, []);

  // اضافه کردن دکمه برای اجرای دستی API
  const handleManualAddMenu = async () => {
    try {
      const response = await fetch("/api/v1/admin/system/menus/ensure-token-usage-menu", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("✅ منو با موفقیت اضافه شد! لطفاً صفحه را refresh کنید.");
        window.location.reload();
      } else {
        alert(`❌ خطا: ${data.error || data.message || "خطای ناشناخته"}`);
      }
    } catch (err: any) {
      alert(`❌ خطا: ${err.message}`);
    }
  };

  const addMenuToSidebar = async () => {
    try {
      const response = await fetch("/api/v1/admin/system/menus/ensure-token-usage-menu", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMenuAdded(true);
          console.log("✅ منوی لاگ مصرف توکن به sidebar اضافه شد");
        }
      }
    } catch (err) {
      console.error("خطا در اضافه کردن منو:", err);
    }
  };

  const handleReset = async (type: "provider" | "operation" | "all", value?: string) => {
    if (!confirm(`آیا از حذف لاگ‌های ${type === "all" ? "همه" : value} اطمینان دارید؟ این عمل غیرقابل بازگشت است!`)) {
      return;
    }

    setResetting(type === "all" ? "all" : `${type}:${value}`);
    try {
      const params = new URLSearchParams();
      if (type === "all") {
        params.append("all", "true");
      } else if (type === "provider") {
        params.append("provider", value || "");
      } else if (type === "operation") {
        params.append("operation", value || "");
      }

      const response = await fetch(`/api/v1/admin/legacy/token-usage-reset?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در حذف لاگ‌ها");
      }

      const data = await response.json();
      alert(`✅ ${data.message}`);

      // بروزرسانی آمار
      await fetchSummary();
    } catch (err: any) {
      alert(`❌ خطا: ${err.message}`);
    } finally {
      setResetting(null);
    }
  };

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

  const renderPeriodStats = (period: PeriodStats, periodName: string) => {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComponentCard className="bg-blue-50 dark:bg-blue-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">کل توکن‌ها</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(period.summary.totalTokens)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Input: {formatNumber(period.summary.inputTokens)} | Output: {formatNumber(period.summary.outputTokens)}
            </div>
          </ComponentCard>

          <ComponentCard className="bg-green-50 dark:bg-green-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">هزینه کل</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(period.summary.totalCost)}
            </div>
            {period.summary.avgCostPerDay && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                متوسط روزانه: {formatCurrency(period.summary.avgCostPerDay)}
              </div>
            )}
          </ComponentCard>

          <ComponentCard className="bg-purple-50 dark:bg-purple-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">تعداد درخواست‌ها</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(period.summary.totalRequests)}
            </div>
            {period.summary.avgTokensPerDay && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                متوسط توکن/روز: {formatNumber(period.summary.avgTokensPerDay)}
              </div>
            )}
          </ComponentCard>

          <ComponentCard className="bg-orange-50 dark:bg-orange-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400">میانگین هزینه/درخواست</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {period.summary.totalRequests > 0
                ? formatCurrency(period.summary.totalCost / period.summary.totalRequests)
                : formatCurrency(0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {period.summary.totalRequests > 0
                ? `${formatNumber(period.summary.totalTokens / period.summary.totalRequests)} توکن/درخواست`
                : "بدون درخواست"}
            </div>
          </ComponentCard>
        </div>

        {/* By Provider */}
        <ComponentCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">بر اساس Provider</h3>
            <button
              onClick={() => handleReset("all")}
              disabled={resetting === "all"}
              className="px-3 py-1.5 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {resetting === "all" ? "در حال حذف..." : "🗑️ حذف همه"}
            </button>
          </div>
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
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {period.byProvider.map((stat, idx) => {
                  const providerInfo = getProviderDisplay(stat.provider);
                  const isResetting = resetting === `provider:${stat.provider}`;
                  return (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{providerInfo.icon}</span>
                          <span className={`font-medium ${providerInfo.color}`}>
                            {providerInfo.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({stat.provider})</span>
                        </div>
                      </td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.inputTokens)}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.outputTokens)}</td>
                      <td className="p-2 font-semibold text-gray-900 dark:text-gray-100">{formatNumber(stat.totalTokens)}</td>
                      <td className="p-2 text-green-600 dark:text-green-400 font-medium">{formatCurrency(stat.cost)}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.requests)}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleReset("provider", stat.provider)}
                          disabled={isResetting || resetting !== null}
                          className="px-2 py-1 text-xs bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
                          title={`حذف لاگ‌های ${providerInfo.label}`}
                        >
                          {isResetting ? "..." : "🗑️"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ComponentCard>

        {/* By Operation */}
        <ComponentCard>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">بر اساس Operation</h3>
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
                  <th className="text-right p-2 text-gray-700 dark:text-gray-300 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {period.byOperation.map((stat, idx) => {
                  const isResetting = resetting === `operation:${stat.operation}`;
                  return (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{stat.operation}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.inputTokens)}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.outputTokens)}</td>
                      <td className="p-2 font-semibold text-gray-900 dark:text-gray-100">{formatNumber(stat.totalTokens)}</td>
                      <td className="p-2 text-green-600 dark:text-green-400 font-medium">{formatCurrency(stat.cost)}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{formatNumber(stat.requests)}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleReset("operation", stat.operation)}
                          disabled={isResetting || resetting !== null}
                          className="px-2 py-1 text-xs bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
                          title={`حذف لاگ‌های ${stat.operation}`}
                        >
                          {isResetting ? "..." : "🗑️"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageBreadcrumb pageTitle="لاگ مصرف توکن" />

      <ComponentCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">لاگ مصرف توکن</h1>
            {menuAdded ? (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                ✅ منو به sidebar اضافه شد
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                  ⚠️ منو به sidebar اضافه نشده است
                </p>
                <button
                  onClick={handleManualAddMenu}
                  className="px-3 py-1.5 text-sm bg-yellow-600 dark:bg-yellow-700 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
                >
                  ➕ اضافه کردن منو به Sidebar
                </button>
              </div>
            )}
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "در حال بارگذاری..." : "🔄 بروزرسانی"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === "daily"
                ? "border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            📅 امروز
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === "monthly"
                ? "border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            📆 این ماه
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === "yearly"
                ? "border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            📅 امسال
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading && !summary && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">در حال بارگذاری آمار...</p>
          </div>
        )}

        {summary && !loading && (
          <>
            {activeTab === "daily" && renderPeriodStats(summary.daily, "امروز")}
            {activeTab === "monthly" && renderPeriodStats(summary.monthly, "این ماه")}
            {activeTab === "yearly" && renderPeriodStats(summary.yearly, "امسال")}
          </>
        )}
      </ComponentCard>
    </div>
  );
}

