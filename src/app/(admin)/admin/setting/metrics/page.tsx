"use client";
import React, { useEffect, useState } from 'react';
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import ComponentCard from '@/components/admin/common/componentcard';
import Badge from '@/components/admin/ui/badge/badge';
import Button from '@/components/admin/ui/button/button';
import { useAlert } from "@/context/admin/alertcontext";
import dynamic from 'next/dynamic';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { ResourceUsageChart } from "@/components/admin/charts/system-resource-chart";

// Lazy load chart component
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  ram: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  database: {
    responseTime: number;
    status: 'healthy' | 'slow' | 'error';
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    endpoints: Array<{ name: string; status: 'ok' | 'error'; responseTime: number }>;
  };
  issues: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    suggestion: string;
  }>;
  system: {
    platform: string;
    nodeVersion: string;
    uptime: number;
  };
}

export default function SystemMetricsPage() {
  const { showAlert } = useAlert();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMetrics();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
      }, 30000); // هر 30 ثانیه
      setRefreshInterval(interval);

      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);

        // بررسی مشکلات و ارسال Notification در صورت نیاز
        if (data.issues && data.issues.length > 0) {
          const errors = data.issues.filter((issue: any) => issue.type === 'error');
          const warnings = data.issues.filter((issue: any) => issue.type === 'warning');

          // فقط برای خطاهای جدید Notification ارسال می‌کنیم
          if (errors.length > 0) {
            for (const error of errors) {
              await fetch('/api/admin/system/metrics/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'error',
                  message: error.message,
                  suggestion: error.suggestion,
                }),
              });
            }
          }
        }
      } else {
        showAlert('خطا در دریافت متریک‌های سیستم', 'error');
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      showAlert('خطا در دریافت متریک‌های سیستم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return 'success';
      case 'warning':
      case 'slow':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'light';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
      case 'slow':
        return <WarningIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <ErrorIcon className="w-5 h-5 text-red-500" />;
      default:
        return <InfoIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <ErrorIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <WarningIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <InfoIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="متریک‌های سیستم" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-600 dark:text-gray-400">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="متریک‌های سیستم" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-red-600 dark:text-red-400">خطا در دریافت اطلاعات</div>
        </div>
      </div>
    );
  }

  // تنظیمات چارت برای منابع
  const resourceChartOptions = {
    chart: {
      type: 'radialBar' as const,
      height: 200,
      fontFamily: 'IRANYekanX, sans-serif',
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '60%',
        },
        dataLabels: {
          name: {
            fontSize: '14px',
            fontFamily: 'IRANYekanX',
          },
          value: {
            fontSize: '16px',
            fontFamily: 'IRANYekanX',
            formatter: (val: any) => {
              const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
              return `${numVal.toFixed(1)}%`;
            },
          },
        },
      },
    },
    labels: ['CPU', 'RAM', 'Disk'],
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    legend: {
      show: false,
    },
  };

  const resourceChartSeries = metrics ? [
    metrics.cpu.usage,
    metrics.ram.usage,
    metrics.disk.usage,
  ] : [0, 0, 0];

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="متریک‌های سیستم" />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg text-gray-600 dark:text-gray-400">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="متریک‌های سیستم" />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg text-red-600 dark:text-red-400">خطا در بارگذاری متریک‌ها</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="متریک‌های سیستم" />

      {/* Header با دکمه Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">متریک‌های سیستم</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">به‌روزرسانی خودکار</span>
          </label>
          <Button onClick={fetchMetrics} variant="primary" size="sm" disabled={loading}>
            <RefreshIcon className="w-4 h-4 ml-1" />
            به‌روزرسانی
          </Button>
        </div>
      </div>

      {/* اطلاعات سیستم */}
      <ComponentCard title="اطلاعات سیستم">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">پلتفرم</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.system.platform}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">نسخه Node.js</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.system.nodeVersion}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">زمان فعالیت</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.system.uptime} ساعت</div>
          </div>
        </div>
      </ComponentCard>

      {/* چارت منابع */}
      <ComponentCard title="استفاده از منابع">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <ResourceUsageChart
            value={metrics.cpu.usage}
            label="CPU"
            className="w-full"
          />
          <ResourceUsageChart
            value={metrics.ram.usage}
            label="RAM"
            className="w-full"
          />
          <ResourceUsageChart
            value={metrics.disk.usage}
            label="Disk"
            className="w-full"
          />
        </div>
      </ComponentCard>

      {/* CPU */}
      <ComponentCard title="CPU">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">مدل</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.cpu.model}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">تعداد هسته</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.cpu.cores}</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">استفاده</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">{metrics.cpu.usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${metrics.cpu.usage > 90 ? 'bg-red-500' :
                  metrics.cpu.usage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                style={{ width: `${Math.min(100, metrics.cpu.usage)}%` }}
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* RAM */}
      <ComponentCard title="RAM">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">کل</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.ram.total.toFixed(2)} GB</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">استفاده شده</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.ram.used.toFixed(2)} GB</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">آزاد</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.ram.free.toFixed(2)} GB</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">استفاده</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">{metrics.ram.usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${metrics.ram.usage > 90 ? 'bg-red-500' :
                  metrics.ram.usage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                style={{ width: `${Math.min(100, metrics.ram.usage)}%` }}
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Disk */}
      <ComponentCard title="فضای دیسک">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">کل</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.disk.total.toFixed(2)} GB</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">استفاده شده</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.disk.used.toFixed(2)} GB</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">آزاد</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">{metrics.disk.free.toFixed(2)} GB</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">استفاده</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">{metrics.disk.usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${metrics.disk.usage > 90 ? 'bg-red-500' :
                  metrics.disk.usage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                style={{ width: `${Math.min(100, metrics.disk.usage)}%` }}
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Database */}
      <ComponentCard title="دیتابیس">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.database.status)}
              <span className="text-lg font-semibold text-gray-800 dark:text-white">وضعیت</span>
            </div>
            <Badge color={getStatusColor(metrics.database.status)}>
              {metrics.database.status === 'healthy' ? 'سالم' :
                metrics.database.status === 'slow' ? 'کند' : 'خطا'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">زمان پاسخ</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">
              {metrics.database.responseTime > 0 ? `${metrics.database.responseTime}ms` : 'N/A'}
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* API Health */}
      <ComponentCard title="وضعیت API">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.api.status)}
              <span className="text-lg font-semibold text-gray-800 dark:text-white">وضعیت کلی</span>
            </div>
            <Badge color={getStatusColor(metrics.api.status)}>
              {metrics.api.status === 'healthy' ? 'سالم' :
                metrics.api.status === 'warning' ? 'هشدار' : 'خطا'}
            </Badge>
          </div>
          <div className="space-y-2">
            {metrics.api.endpoints.map((endpoint, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(endpoint.status)}
                  <span className="text-sm text-gray-800 dark:text-white">{endpoint.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={getStatusColor(endpoint.status)}>
                    {endpoint.status === 'ok' ? 'OK' : 'Error'}
                  </Badge>
                  {endpoint.responseTime > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{endpoint.responseTime}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ComponentCard>

      {/* Issues & Suggestions */}
      {metrics.issues && metrics.issues.length > 0 && (
        <ComponentCard title="مشکلات و پیشنهادات">
          <div className="space-y-3">
            {metrics.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${issue.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                  issue.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                    'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  }`}
              >
                <div className="flex items-start gap-3">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <div className={`font-semibold ${issue.type === 'error' ? 'text-red-800 dark:text-red-200' :
                      issue.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                        'text-blue-800 dark:text-blue-200'
                      }`}>
                      {issue.message}
                    </div>
                    {issue.suggestion && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <strong>پیشنهاد:</strong> {issue.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>
      )}

      {/* آخرین به‌روزرسانی */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        آخرین به‌روزرسانی: {new Date(metrics.timestamp).toLocaleString('fa-IR')}
      </div>
    </div>
  );
}
