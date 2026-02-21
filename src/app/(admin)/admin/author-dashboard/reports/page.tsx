"use client";

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import ComponentCard from "@/components/admin/common/componentcard";
import Link from "next/link";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/admin/common/loadingspinner";
import ErrorAlert from "@/components/admin/common/erroralert";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AuthorPerformanceReport {
  summary: {
    totalPosts: number;
    totalViews: number;
    averageViews: number;
  };
  topPosts: Array<{
    id: number;
    title: string;
    slug: string;
    views: number;
    category: string;
    publishedAt: Date | null;
  }>;
  byDate: Array<{
    date: string;
    posts: number;
    views: number;
  }>;
  posts: Array<{
    id: number;
    title: string;
    views: number;
    publishedAt: Date | null;
  }>;
}

export default function AuthorReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AuthorPerformanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("type", "author-performance");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/admin/system/reports?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setReport(data);
      } else {
        setError(data.error || "خطا در دریافت گزارش");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="در حال بارگذاری گزارش..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="گزارش عملکرد" />
        <ErrorAlert message={error} />
      </div>
    );
  }

  if (!report) {
    return null;
  }

  // Chart options
  const chartOptions = {
    chart: {
      type: "line" as const,
      height: 350,
      toolbar: { show: false },
      fontFamily: "IRANYekanX, sans-serif",
    },
    stroke: {
      curve: "smooth" as const,
      width: 3,
    },
    xaxis: {
      categories: report.byDate.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
      }),
      labels: {
        style: {
          fontFamily: "IRANYekanX",
        },
      },
    },
    yaxis: [
      {
        title: {
          text: "تعداد پست",
          style: { fontFamily: "IRANYekanX" },
        },
      },
      {
        opposite: true,
        title: {
          text: "بازدید",
          style: { fontFamily: "IRANYekanX" },
        },
      },
    ],
    tooltip: {
      theme: "dark" as const,
    },
    legend: {
      fontFamily: "IRANYekanX",
    },
  };

  const chartSeries = [
    {
      name: "تعداد پست",
      type: "column" as const,
      data: report.byDate.map((item) => item.posts),
    },
    {
      name: "بازدید",
      type: "line" as const,
      data: report.byDate.map((item) => item.views),
    },
  ];

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="گزارش عملکرد" />

      {/* Filters */}
      <ComponentCard title="فیلترها">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              از تاریخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تا تاریخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </ComponentCard>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComponentCard title="کل مقالات">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {report.summary.totalPosts}
          </div>
        </ComponentCard>
        <ComponentCard title="کل بازدیدها">
          <div className="text-3xl font-bold text-blue-600">
            {report.summary.totalViews.toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
        <ComponentCard title="میانگین بازدید">
          <div className="text-3xl font-bold text-green-600">
            {report.summary.averageViews.toLocaleString("fa-IR")}
          </div>
        </ComponentCard>
      </div>

      {/* Chart */}
      {report.byDate.length > 0 && (
        <ComponentCard title="نمودار عملکرد">
          <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
        </ComponentCard>
      )}

      {/* Top Posts */}
      <ComponentCard title="پربازدیدترین مقالات">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  عنوان
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  دسته‌بندی
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  بازدید
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  تاریخ انتشار
                </th>
              </tr>
            </thead>
            <tbody>
              {report.topPosts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {post.category}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {post.views.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("fa-IR")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentCard>

      {/* All Posts */}
      <ComponentCard title="همه مقالات">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  عنوان
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  بازدید
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  تاریخ انتشار
                </th>
              </tr>
            </thead>
            <tbody>
              {report.posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {post.title}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {post.views.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("fa-IR")
                      : "-"}
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

