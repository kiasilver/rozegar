'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/admin/ui/button/button";
import Input from "@/components/admin/form/input/inputfield";
import Label from "@/components/admin/form/label";
import Switch from '@/components/admin/form/switch/switch';
import Select from '@/components/admin/form/select';
import { toast } from 'sonner';
import MediaGalleryModal from '@/components/admin/media/mediagallerymodal';

export default function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, aiRes] = await Promise.all([
        fetch('/api/v1/admin/automation/undefined-rss/settings'),
        fetch('/api/v1/admin/settings/ai')
      ]);

      const settingsData = await settingsRes.json();
      const aiData = await aiRes.json();

      if (settingsData.success) {
        setSettings(settingsData.data);
      }

      if (aiData.settings) {
        setAiSettings(aiData.settings);
      }
    } catch (error: any) {
      toast.error('خطا در دریافت تنظیمات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        fetch('/api/v1/admin/automation/undefined-rss/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        })
      ];

      if (aiSettings) {
        updates.push(
          fetch('/api/v1/admin/settings/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiSettings),
          })
        );
      }

      const results = await Promise.all(updates);
      const data = await results[0].json();

      if (data.success) {
        toast.success('تنظیمات ذخیره شد');
      } else {
        toast.error(data.error);
      }
    } catch (error: any) {
      toast.error('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">تنظیمات عمومی</h2>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                کنترل خودکار ساخت خبر
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {settings?.is_active
                  ? `در حال اجرا - هر ${settings?.check_interval || 30} دقیقه یک بار خبرها را بررسی می‌کند`
                  : 'غیرفعال - خبری به صورت خودکار ساخته نمی‌شود'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                label={settings?.is_active ? "فعال" : "غیرفعال"}
                checked={settings?.is_active || false}
                onChange={(checked) =>
                  setSettings((prev: any) => ({ ...prev, is_active: checked }))
                }
              />
              {settings?.is_active && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      const updated = { ...settings, is_active: false };
                      const res = await fetch('/api/v1/admin/automation/undefined-rss/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updated),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSettings(updated);
                        toast.success('سیستم متوقف شد');
                      }
                    } catch (error: any) {
                      toast.error('خطا در توقف سیستم');
                    }
                  }}
                  className="ml-2"
                >
                  ⏹️ توقف فوری
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <Switch
            label="پردازش ترکیبی (Single Call)"
            checked={settings?.enable_combined_processing ?? true}
            onChange={(checked) =>
              setSettings((prev: any) => ({ ...prev, enable_combined_processing: checked }))
            }
          />
          <p className="text-xs text-gray-500 mt-1 mr-12">
            در صورت فعال بودن، تولید محتوای تلگرام و وبسایت در یک مرحله انجام می‌شود (صرفه‌جوئی در هزینه و زمان).
            در غیر این صورت، هر کدام جداگانه پردازش می‌شوند.
          </p>
        </div>

        {/* AI Settings Section */}
        {aiSettings && (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">تنظیمات هوش مصنوعی</h3>
            <div className="space-y-4">
              <div>
                <Label>انتخاب مدل هوش مصنوعی (AI Agent)</Label>
                <Select
                  value={aiSettings.defaultProvider}
                  onChange={(value) =>
                    setAiSettings((prev: any) => ({ ...prev, defaultProvider: value }))
                  }
                  options={[
                    { value: 'cursor', label: 'Cursor Agent (Auto)' },
                    { value: 'huggingface', label: 'Hugging Face (Free)' },
                    { value: 'openai', label: 'OpenAI (GPT-3.5/4)' },
                    { value: 'gemini', label: 'Google Gemini' },
                    { value: 'backboard', label: 'Backboard.io' },
                    { value: 'custom', label: 'Custom API' },
                  ]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>فعال‌سازی Fallback</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      در صورت خطای quota یا خطای موقت، از provider دیگری استفاده شود
                    </p>
                  </div>
                  <Switch
                    label={aiSettings.enableFallback !== false ? "فعال" : "غیرفعال"}
                    checked={aiSettings.enableFallback !== false}
                    onChange={(checked) =>
                      setAiSettings((prev: any) => ({ ...prev, enableFallback: checked }))
                    }
                  />
                </div>

                {aiSettings.enableFallback !== false && (
                  <div>
                    <Label>Fallback Provider</Label>
                    <Select
                      value={aiSettings.fallbackProvider || 'backboard'}
                      onChange={(value) =>
                        setAiSettings((prev: any) => ({ ...prev, fallbackProvider: value || null }))
                      }
                      options={[
                        { value: 'backboard', label: 'Backboard.io (پیش‌فرض)' },
                        { value: 'openai', label: 'OpenAI (GPT-3.5/4)' },
                        { value: 'gemini', label: 'Google Gemini' },
                        { value: 'huggingface', label: 'Hugging Face (Free)' },
                        { value: 'cursor', label: 'Cursor Agent (Auto)' },
                        { value: 'custom', label: 'Custom API' },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* API Configurations for Selected Provider */}
            {aiSettings.defaultProvider && aiSettings.providers[aiSettings.defaultProvider] && (
              <div className="mt-4 space-y-4 border-t pt-4 dark:border-gray-700">
                <div className="space-y-2">
                  <Label>API Key ({aiSettings.providers[aiSettings.defaultProvider].label})</Label>
                  <Input
                    type="password"
                    value={aiSettings.providers[aiSettings.defaultProvider].apiKey || ''}
                    onChange={(e) => {
                      setAiSettings((prev: any) => {
                        const newProviders = { ...(prev?.providers || {}) };
                        newProviders[prev.defaultProvider] = {
                          ...(newProviders[prev.defaultProvider] || {}),
                          apiKey: e.target.value
                        };
                        return { ...prev, providers: newProviders };
                      });
                    }}
                    placeholder={`API Key برای ${aiSettings.defaultProvider}...`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {aiSettings.providers[aiSettings.defaultProvider].notes}
                  </p>
                </div>

                {/* Endpoint for Custom/Backboard */}
                {['custom', 'backboard'].includes(aiSettings.defaultProvider) && (
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      value={aiSettings.providers[aiSettings.defaultProvider].endpoint || ''}
                      onChange={(e) => {
                        setAiSettings((prev: any) => {
                          const newProviders = { ...(prev?.providers || {}) };
                          newProviders[prev.defaultProvider] = {
                            ...(newProviders[prev.defaultProvider] || {}),
                            endpoint: e.target.value
                          };
                          return { ...prev, providers: newProviders };
                        });
                      }}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                )}

                {/* Model Selection for Gemini */}
                {aiSettings.defaultProvider === 'gemini' && (
                  <div className="space-y-2">
                    <Label>انتخاب مدل Gemini</Label>
                    <Select
                      value={aiSettings.providers.gemini?.model || 'gemini-2.5-flash'}
                      onChange={(value) => {
                        setAiSettings((prev: any) => {
                          const newProviders = { ...(prev?.providers || {}) };
                          newProviders.gemini = {
                            ...(newProviders.gemini || {}),
                            model: value || 'gemini-2.5-flash'
                          };
                          return { ...prev, providers: newProviders };
                        });
                      }}
                      options={[
                        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (بهترین تعادل - پیشنهادی)' },
                        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (سریع‌ترین)' },
                      ]}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Flash: تعادل عالی بین سرعت و کیفیت | Flash Lite: سریع‌ترین مدل
                    </p>
                  </div>
                )}

                {/* Custom Model Name */}
                {['custom'].includes(aiSettings.defaultProvider) && (
                  <div className="space-y-2">
                    <Label>Model Name</Label>
                    <Input
                      value={aiSettings.providers[aiSettings.defaultProvider].model || ''}
                      onChange={(e) => {
                        setAiSettings((prev: any) => {
                          const newProviders = { ...(prev?.providers || {}) };
                          newProviders[prev.defaultProvider] = {
                            ...(newProviders[prev.defaultProvider] || {}),
                            model: e.target.value
                          };
                          return { ...prev, providers: newProviders };
                        });
                      }}
                      placeholder="Example: gpt-4o-mini"
                    />
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              این مدل برای پردازش و خلاصه‌سازی خبرها استفاده خواهد شد.
            </p>
          </div>
        )}

        <div>
          <Label>آدرس سایت</Label>
          <Input
            value={settings?.site_url || ''}
            onChange={(e) =>
              setSettings((prev: any) => ({ ...prev, site_url: e.target.value }))
            }
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>فاصله بررسی فیدها (دقیقه)</Label>
            <Input
              type="number"
              min="5"
              value={settings?.check_interval || 30}
              onChange={(e) =>
                setSettings((prev: any) => ({ ...prev, check_interval: parseInt(e.target.value) }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">هر چند دقیقه یکبار فیدها بررسی شوند.</p>
          </div>

          <div>
            <Label>فاصله ارسال پیام (ثانیه)</Label>
            <Input
              type="number"
              min="5"
              value={settings?.publish_interval || 30}
              onChange={(e) =>
                setSettings((prev: any) => ({ ...prev, publish_interval: parseInt(e.target.value) }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">فاصله زمانی بین ارسال هر پیام (برای جلوگیری از اسپم).</p>
          </div>
        </div>

        <div>
          <Label>مسیر لوگو واترمارک</Label>
          <div className="flex gap-2">
            <Input
              value={settings?.watermark_logo_path || ''}
              onChange={(e) =>
                setSettings((prev: any) => ({ ...prev, watermark_logo_path: e.target.value }))
              }
              placeholder="/images/logo.png"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGallery(true)}
            >
              انتخاب از گالری
            </Button>
          </div>
          {settings?.watermark_logo_path && (
            <div className="mt-2">
              <img
                src={settings.watermark_logo_path}
                alt="Watermark Preview"
                className="h-16 object-contain border rounded p-1 bg-gray-50 dark:bg-gray-800"
              />
            </div>
          )}
        </div>

      </div>

      <MediaGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={(file: any) => {
          // MediaGalleryModal returns a file object, we need the url
          const fileUrl = file.url || file;
          setSettings((prev: any) => ({ ...prev, watermark_logo_path: fileUrl }));
          setShowGallery(false);
        }}
      // fileType="image"
      />

      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-end z-10">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </div >
  );
}
