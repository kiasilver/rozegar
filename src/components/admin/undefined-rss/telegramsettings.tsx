'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/admin/ui/button/button";
import Input from "@/components/admin/form/input/inputfield";
import Label from '@/components/admin/form/label';
import Switch from '@/components/admin/form/switch/switch';
import Select from '@/components/admin/form/select';
import { toast } from 'sonner';

export default function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: settings.telegram_bot_token,
          channelId: settings.telegram_channel_id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('اتصال برقرار است! پیام تست ارسال شد.');
      } else {
        toast.error(`خطا در اتصال: ${data.error}`);
      }
    } catch (error: any) {
      toast.error('خطا در تست اتصال');
    } finally {
      setTesting(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
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
      const res = await fetch('/api/v1/admin/automation/undefined-rss/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تنظیمات تلگرام ذخیره شد');
      } else {
        toast.error(data.error);
      }
    } catch (error: any) {
      toast.error('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoStart = async (start: boolean) => {
    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: start ? 'start' : 'stop' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(start ? 'شروع خودکار فعال شد' : 'شروع خودکار متوقف شد');
        fetchSettings();
      }
    } catch (error: any) {
      toast.error('خطا');
    }
  };

  if (loading) return <div>در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">تنظیمات تلگرام</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Switch
            label="فعال‌سازی تلگرام"
            defaultChecked={settings?.telegram_enabled || false}
            onChange={(checked) =>
              setSettings({ ...settings, telegram_enabled: checked })
            }
          />
        </div>

        <div>
          <Label>Bot Token</Label>
          <Input
            type="password"
            value={settings?.telegram_bot_token || ''}
            onChange={(e) =>
              setSettings({ ...settings, telegram_bot_token: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Channel ID</Label>
          <Input
            value={settings?.telegram_channel_id || ''}
            onChange={(e) =>
              setSettings({ ...settings, telegram_channel_id: e.target.value })
            }
            placeholder="@channel_name or -1001234567890"
          />
        </div>

        <div>
          <Label>زبان</Label>
          <Select
            value={settings?.telegram_language || 'fa'}
            onChange={(value) =>
              setSettings({ ...settings, telegram_language: value })
            }
            options={[
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'انگلیسی' }
            ]}
          />
        </div>

        <div>
          <Label>طول محتوا</Label>
          <Select
            value={settings?.telegram_content_length || 'medium'}
            onChange={(value) =>
              setSettings({ ...settings, telegram_content_length: value })
            }
            options={[
              { value: 'short', label: 'کوتاه (300 تا 500 کاراکتر)' },
              { value: 'medium', label: 'متوسط (600 تا 900 کاراکتر)' },
              { value: 'long', label: 'بلند (1000 تا 1500 کاراکتر)' }
            ]}
          />
        </div>

        <Switch
          label="واترمارک"
          defaultChecked={settings?.telegram_enable_watermark || false}
          onChange={(checked) =>
            setSettings({ ...settings, telegram_enable_watermark: checked })
          }
        />
      </div>

      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-end gap-2 z-10">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={testing || !settings?.telegram_bot_token || !settings?.telegram_channel_id}
        >
          {testing ? 'در حال تست...' : 'تست اتصال'}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </Button>
        <Button
          variant={settings?.telegram_auto_start ? 'danger' : 'primary'}
          onClick={() => handleAutoStart(!settings?.telegram_auto_start)}
        >
          {settings?.telegram_auto_start ? 'توقف خودکار' : 'شروع خودکار'}
        </Button>
      </div>
    </div>
  );
}
