"use client";
import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import ComponentCard from '@/components/Admin/common/ComponentCard';
import Label from '@/components/Admin/form/Label';
import Input from '@/components/Admin/form/input/InputField';
import Button from '@/components/Admin/ui/button/Button';
import { useAlert } from "@/context/Admin/AlertContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PriceTickerSettings from '@/components/Admin/undefined-rss/PriceTickerSettings';

export default function PriceTickerSettingsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState("website");

  // Website Settings State
  const [enabled, setEnabled] = useState(true);
  const [showStockIndex, setShowStockIndex] = useState(true);
  const [showDollar, setShowDollar] = useState(true);
  const [showGold, setShowGold] = useState(true);
  const [showGoldOunce, setShowGoldOunce] = useState(false);
  const [showGoldMithqal, setShowGoldMithqal] = useState(false);
  const [showCoin, setShowCoin] = useState(true);
  const [showEuro, setShowEuro] = useState(true);
  const [showDirham, setShowDirham] = useState(true);
  const [showBitcoin, setShowBitcoin] = useState(true);
  const [showTether, setShowTether] = useState(false);
  const [showBrentOil, setShowBrentOil] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('30');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/settings/price-ticker');

      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled !== false);
        setShowStockIndex(data.show_stock_index !== false);
        setShowDollar(data.show_dollar !== false);
        setShowGold(data.show_gold !== false);
        setShowGoldOunce(data.show_gold_ounce === true);
        setShowGoldMithqal(data.show_gold_mithqal === true);
        setShowCoin(data.show_coin !== false);
        setShowEuro(data.show_euro !== false);
        setShowDirham(data.show_dirham !== false);
        setShowBitcoin(data.show_bitcoin !== false);
        setShowTether(data.show_tether === true);
        setShowBrentOil(data.show_brent_oil === true);
        setApiUrl(data.api_url || '');
        setRefreshInterval(data.refresh_interval || '30');
      }
    } catch (error) {
      console.error('Error fetching price ticker settings:', error);
      showAlert('خطا در دریافت تنظیمات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebsite = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/price-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          show_stock_index: showStockIndex,
          show_dollar: showDollar,
          show_gold: showGold,
          show_gold_ounce: showGoldOunce,
          show_gold_mithqal: showGoldMithqal,
          show_coin: showCoin,
          show_euro: showEuro,
          show_dirham: showDirham,
          show_bitcoin: showBitcoin,
          show_tether: showTether,
          show_brent_oil: showBrentOil,
          api_url: apiUrl,
          refresh_interval: refreshInterval,
        }),
      });

      if (res.ok) {
        showAlert('تنظیمات نوار قیمت وبسایت با موفقیت ذخیره شد', 'success');
      } else {
        showAlert('خطا در ذخیره تنظیمات', 'error');
      }
    } catch (error) {
      console.error('Error saving price ticker settings:', error);
      showAlert('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSaving(false);
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
      <PageBreadcrumb pageTitle="تنظیمات قیمت‌ها" />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="website">وبسایت</TabsTrigger>
          <TabsTrigger value="telegram">تلگرام</TabsTrigger>
        </TabsList>

        <TabsContent value="website">
          <div className="space-y-6">
            {/* General Settings */}
            <ComponentCard title="تنظیمات عمومی وبسایت">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>فعال‌سازی نوار قیمت در سایت</Label>
                  <Checkbox
                    checked={enabled}
                    onChange={(checked) => setEnabled(checked)}
                  />
                </div>

                <div>
                  <Label>URL API (اختیاری - در صورت خالی بودن از API پیش‌فرض استفاده می‌شود)</Label>
                  <Input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.example.com/prices"
                  />
                </div>

                <div>
                  <Label>فاصله زمانی به‌روزرسانی (ثانیه)</Label>
                  <Input
                    type="number"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    placeholder="30"
                    min="10"
                    max="300"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    قیمت‌ها هر {refreshInterval} ثانیه یکبار به‌روز می‌شوند
                  </p>
                </div>
              </div>
            </ComponentCard>

            {/* Display Options */}
            <ComponentCard title="گزینه‌های نمایش">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>شاخص کل بورس</Label>
                  <Checkbox
                    checked={showStockIndex}
                    onChange={(checked) => setShowStockIndex(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>دلار آمریکا</Label>
                  <Checkbox
                    checked={showDollar}
                    onChange={(checked) => setShowDollar(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>گرم طلای ۱۸ عیار</Label>
                  <Checkbox
                    checked={showGold}
                    onChange={(checked) => setShowGold(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>انس طلا</Label>
                  <Checkbox
                    checked={showGoldOunce}
                    onChange={(checked) => setShowGoldOunce(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>مثقال طلا</Label>
                  <Checkbox
                    checked={showGoldMithqal}
                    onChange={(checked) => setShowGoldMithqal(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>سکه</Label>
                  <Checkbox
                    checked={showCoin}
                    onChange={(checked) => setShowCoin(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>یورو</Label>
                  <Checkbox
                    checked={showEuro}
                    onChange={(checked) => setShowEuro(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>درهم امارات</Label>
                  <Checkbox
                    checked={showDirham}
                    onChange={(checked) => setShowDirham(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>بیت کوین</Label>
                  <Checkbox
                    checked={showBitcoin}
                    onChange={(checked) => setShowBitcoin(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>تتر</Label>
                  <Checkbox
                    checked={showTether}
                    onChange={(checked) => setShowTether(checked)}
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <Label>نفت برنت</Label>
                  <Checkbox
                    checked={showBrentOil}
                    onChange={(checked) => setShowBrentOil(checked)}
                  />
                </div>
              </div>
            </ComponentCard>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveWebsite}
                disabled={saving}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات وبسایت'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="telegram">
          <PriceTickerSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
