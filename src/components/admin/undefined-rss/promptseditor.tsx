'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/admin/ui/button/button";
import TextArea from '@/components/admin/form/input/textarea';
import Label from '@/components/admin/form/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/admin/ui/tabs/tabs';
import { toast } from 'sonner';
import {
  DEFAULT_TELEGRAM_PROMPT,
  DEFAULT_WEBSITE_PROMPT,
  DEFAULT_MANUAL_PROMPT,
  DEFAULT_COMBINED_PROMPT
} from '@/lib/automation/undefined-rss/improved-prompts';

interface AIPrompt {
  id: number;
  key: string;
  target: string;
  prompt_type: string;
  content: string;
  is_active: boolean;
}

const TARGET_LABELS: Record<string, { title: string; description: string }> = {
  telegram: { title: 'تلگرام', description: 'خلاصه‌سازی خبر برای کانال تلگرام' },
  website: { title: 'وبسایت', description: 'بازنویسی SEO شده برای وبسایت' },
  combined: { title: 'ترکیبی', description: 'پردازش همزمان تلگرام و وبسایت (یک درخواست AI)' },
  manual: { title: 'ارسال دستی', description: 'پرامپت مخصوص ارسال دستی خبر' },
};

const DEFAULT_PROMPTS: Record<string, string> = {
  telegram: DEFAULT_TELEGRAM_PROMPT,
  website: DEFAULT_WEBSITE_PROMPT,
  combined: DEFAULT_COMBINED_PROMPT,
  manual: DEFAULT_MANUAL_PROMPT,
};

export default function PromptsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<Record<string, AIPrompt | null>>({
    telegram: null,
    website: null,
    combined: null,
    manual: null,
  });
  // Track which tabs have editing enabled
  const [editing, setEditing] = useState<Record<string, boolean>>({
    telegram: false,
    website: false,
    combined: false,
    manual: false,
  });
  // Track draft content when editing
  const [drafts, setDrafts] = useState<Record<string, string>>({
    telegram: '',
    website: '',
    combined: '',
    manual: '',
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/prompts');
      const data = await res.json();
      if (data.success && data.grouped) {
        const result: Record<string, AIPrompt | null> = {
          telegram: null,
          website: null,
          combined: null,
          manual: null,
        };
        for (const target of ['telegram', 'website', 'combined', 'manual']) {
          const list = data.grouped[target];
          if (list && list.length > 0) {
            result[target] = list[0]; // Use first active prompt
          }
        }
        setCustomPrompts(result);

        // Set drafts for any existing custom prompts
        const newDrafts: Record<string, string> = {};
        const newEditing: Record<string, boolean> = {};
        for (const target of ['telegram', 'website', 'combined', 'manual']) {
          if (result[target]) {
            newDrafts[target] = result[target]!.content;
            newEditing[target] = true;
          } else {
            newDrafts[target] = '';
            newEditing[target] = false;
          }
        }
        setDrafts(newDrafts);
        setEditing(newEditing);
      }
    } catch {
      toast.error('خطا در دریافت پرامپت‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableCustom = (target: string) => {
    setEditing(prev => ({ ...prev, [target]: true }));
    setDrafts(prev => ({
      ...prev,
      [target]: customPrompts[target]?.content || DEFAULT_PROMPTS[target] || '',
    }));
  };

  const handleResetToDefault = (target: string) => {
    setEditing(prev => ({ ...prev, [target]: false }));
    setDrafts(prev => ({ ...prev, [target]: '' }));
    setCustomPrompts(prev => ({ ...prev, [target]: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const target of ['telegram', 'website', 'combined', 'manual']) {
        if (editing[target] && drafts[target]) {
          const existing = customPrompts[target];
          if (existing && existing.id > 0) {
            // Update existing
            await fetch('/api/v1/admin/automation/undefined-rss/prompts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: existing.id, content: drafts[target] }),
            });
          } else {
            // Create new
            await fetch('/api/v1/admin/automation/undefined-rss/prompts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: `${target}_custom`,
                target,
                prompt_type: target === 'combined' ? 'combined_processing' : 'summary',
                content: drafts[target],
              }),
            });
          }
        }
        // If editing is off and there was a custom prompt, we could delete it
        // For now we just don't save it
      }
      toast.success('پرامپت‌ها ذخیره شدند');
      fetchPrompts();
    } catch {
      toast.error('خطا در ذخیره پرامپت‌ها');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">در حال بارگذاری...</div>;

  const renderTab = (target: string) => {
    const meta = TARGET_LABELS[target];
    const isCustom = editing[target];
    const hasDbPrompt = customPrompts[target] !== null;

    return (
      <div className="space-y-4">
        {/* Default Prompt Info */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-600 dark:text-emerald-400 text-lg">✅</span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              پرامپت پیش‌فرض فعال است
            </span>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {meta.description}. اگر تغییری ندهید، پرامپت پیش‌فرض سیستم استفاده می‌شود.
          </p>
          <details className="mt-3">
            <summary className="text-xs text-emerald-600 dark:text-emerald-500 cursor-pointer hover:underline">
              مشاهده پرامپت پیش‌فرض
            </summary>
            <pre className="mt-2 text-xs bg-white dark:bg-gray-900 p-3 rounded border border-emerald-100 dark:border-gray-700 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto text-gray-700 dark:text-gray-300" dir="rtl">
              {DEFAULT_PROMPTS[target]}
            </pre>
          </details>
        </div>

        {/* Custom Prompt Section */}
        {!isCustom ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEnableCustom(target)}
            className="w-full border-dashed"
          >
            ✏️ سفارشی‌سازی پرامپت {meta.title}
          </Button>
        ) : (
          <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-lg">✏️</span>
                <Label className="font-semibold text-amber-800 dark:text-amber-300">
                  پرامپت سفارشی {meta.title}
                  {hasDbPrompt && <span className="text-xs mr-2 text-amber-500">(ذخیره شده در دیتابیس)</span>}
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetToDefault(target)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                بازگشت به پیش‌فرض
              </Button>
            </div>
            <TextArea
              value={drafts[target]}
              onChange={(e) => setDrafts(prev => ({ ...prev, [target]: e.target.value }))}
              rows={12}
              placeholder="پرامپت سفارشی خود را وارد کنید..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              متغیرهای قابل استفاده: {'{title}'}, {'{content}'}, {'{lengthLimit}'}, {'{targetLength}'}, {'{telegramLimit}'}, {'{websiteLimitInstruction}'}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">تنظیمات پرامپت AI</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          سیستم از پرامپت‌های پیش‌فرض بهینه‌شده استفاده می‌کند. در صورت نیاز می‌توانید آنها را سفارشی کنید.
        </p>
      </div>

      <Tabs defaultValue="telegram">
        <TabsList>
          <TabsTrigger value="telegram">تلگرام</TabsTrigger>
          <TabsTrigger value="website">وبسایت</TabsTrigger>
          <TabsTrigger value="combined">ترکیبی</TabsTrigger>
          <TabsTrigger value="manual">ارسال دستی</TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">{renderTab('telegram')}</TabsContent>
        <TabsContent value="website">{renderTab('website')}</TabsContent>
        <TabsContent value="combined">{renderTab('combined')}</TabsContent>
        <TabsContent value="manual">{renderTab('manual')}</TabsContent>
      </Tabs>

      {Object.values(editing).some(Boolean) && (
        <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-end gap-2 z-10">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره پرامپت‌های سفارشی'}
          </Button>
          <Button variant="outline" onClick={fetchPrompts}>
            بازیابی
          </Button>
        </div>
      )}
    </div>
  );
}
