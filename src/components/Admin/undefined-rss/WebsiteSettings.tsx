'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Admin/ui/button/Button';
import Input from '@/components/Admin/form/input/InputField';
import Label from '@/components/Admin/form/Label';
import Switch from '@/components/Admin/form/switch/Switch';
import Select from '@/components/Admin/form/Select';
import { toast } from 'sonner';

export default function WebsiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

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
        toast.success('تنظیمات وبسایت ذخیره شد');
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
      const res = await fetch('/api/v1/admin/automation/undefined-rss/website/start', {
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
        <h2 className="text-2xl font-bold mb-4">تنظیمات وبسایت</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Switch
            label="فعال‌سازی وبسایت"
            defaultChecked={settings?.website_enabled || false}
            onChange={(checked) =>
              setSettings({ ...settings, website_enabled: checked })
            }
          />
        </div>

        <div>
          <Label>زبان</Label>
          <Select
            value={settings?.website_language || 'fa'}
            onChange={(value) =>
              setSettings({ ...settings, website_language: value })
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
            value={settings?.website_content_length || 'medium'}
            onChange={(value) =>
              setSettings({ ...settings, website_content_length: value })
            }
            options={[
              { value: 'short', label: 'کوتاه (حدود 500 کلمه)' },
              { value: 'medium', label: 'استاندارد (حدود 700 کلمه)' },
              { value: 'long', label: 'جامع و طولانی (بالای 1000 کلمه)' }
            ]}
          />
        </div>

        <div>
          <Label>لحن</Label>
          <Select
            value={settings?.website_tone || 'reporter_analytical'}
            onChange={(value) =>
              setSettings({ ...settings, website_tone: value })
            }
            options={[
              { value: 'reporter', label: 'خبرنگار حرفه‌ای' },
              { value: 'reporter_analytical', label: 'خبرنگار + تحلیل' },
              { value: 'reporter_opinion', label: 'خبرنگار + نظر' }
            ]}
          />
        </div>

        <div>
          <Switch
            label="تقویت محتوا (افزودن تحلیل)"
            defaultChecked={settings?.website_enhance_content || false}
            onChange={(checked) =>
              setSettings({ ...settings, website_enhance_content: checked })
            }
          />
        </div>

        <div>
          <Switch
            label="SEO اجباری"
            defaultChecked={settings?.website_force_seo || false}
            onChange={(checked) =>
              setSettings({ ...settings, website_force_seo: checked })
            }
          />
        </div>

        <div>
          <Switch
            label="واترمارک"
            defaultChecked={settings?.website_enable_watermark || false}
            onChange={(checked) =>
              setSettings({ ...settings, website_enable_watermark: checked })
            }
          />
        </div>
      </div>

      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-end gap-2 z-10">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </Button>
        <Button
          variant={settings?.website_auto_start ? 'danger' : 'primary'}
          onClick={() => handleAutoStart(!settings?.website_auto_start)}
        >
          {settings?.website_auto_start ? 'توقف خودکار' : 'شروع خودکار'}
        </Button>
      </div>
    </div>
  );
}
