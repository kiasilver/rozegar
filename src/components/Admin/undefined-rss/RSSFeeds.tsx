'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Admin/ui/button/Button';
import InputField from '@/components/Admin/form/input/InputField';
import Select from '@/components/Admin/form/Select';
import Label from '@/components/Admin/form/Label';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

interface RSSSource {
  id: number;
  category_id: number;
  rss_url: string;
  target: string;
  priority: number;
  category?: {
    id: number;
    translations: Array<{ lang: string; name: string }>;
  };
}

interface Category {
  id: number;
  translations: Array<{ lang: string; name: string }>;
}

export default function RSSFeeds() {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newSource, setNewSource] = useState({
    category_id: '',
    rss_url: '',
    target: 'both',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sourcesRes, categoriesRes] = await Promise.all([
        fetch('/api/v1/admin/automation/undefined-rss/sources'),
        fetch('/api/v1/admin/content/categories'),
      ]);

      const sourcesData = await sourcesRes.json();
      const categoriesData = await categoriesRes.json();

      if (sourcesData.success) {
        setSources(sourcesData.data || []);
      }

      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else if (categoriesData.categories) {
        setCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const addSource = async () => {
    if (!newSource.category_id || !newSource.rss_url) {
      toast.error('لطفاً دسته و آدرس RSS را وارد کنید');
      return;
    }

    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('منبع RSS اضافه شد');
        setNewSource({ category_id: '', rss_url: '', target: 'both' });
        // Update local state directly to preserve unsaved edits in other items
        setSources((prev) => [...prev, data.data]);
      } else {
        toast.error(data.error || 'خطا در افزودن منبع RSS');
      }
    } catch (error) {
      toast.error('خطا در افزودن منبع RSS');
    }
  };

  const updateSource = (id: number, field: string, value: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // We'll update all sources that are currently in the state. 
      // Ideally we should track only changed ones, but for simplicity/robustness 
      // in this context (small list), updating all or changed ones by ID is acceptable.
      // Here we iterate and update. To be safer/optimal, we could check against original,
      // but the component doesn't keep a separate "original" copy easily without more state.
      // Let's just update all. Or better, just loop and fire requests.

      const updatePromises = sources.map((source) =>
        fetch('/api/v1/admin/automation/undefined-rss/sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: source.id,
            rss_url: source.rss_url,
            target: source.target,
            priority: source.priority
          }),
        })
      );

      await Promise.all(updatePromises);

      toast.success('تغییرات با موفقیت ذخیره شد');
      setHasChanges(false);
      // Optional: Refetch to be 100% in sync, but local state should be fine if no errors.
    } catch (error) {
      console.error('Error saving sources:', error);
      toast.error('خطا در ذخیره تغییرات');
    } finally {
      setSaving(false);
    }
  };

  const deleteSource = async (id: number) => {
    if (!confirm('آیا مطمئن هستید؟')) return;

    try {
      const res = await fetch(`/api/v1/admin/automation/undefined-rss/sources?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('منبع RSS حذف شد');
        // Update local state directly to preserve unsaved edits
        setSources((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error('خطا در حذف');
      }
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.translations?.find((t) => t.lang?.toLowerCase() === 'fa')?.name || category?.translations?.[0]?.name || 'نامشخص';
  };

  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.category_id]) {
      acc[source.category_id] = [];
    }
    acc[source.category_id].push(source);
    return acc;
  }, {} as Record<number, RSSSource[]>);

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">مدیریت منابع RSS</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          برای هر دسته می‌توانید چندین منبع RSS تعریف کنید و مشخص کنید که برای تلگرام، وبسایت یا هر دو استفاده شود.
        </p>
      </div>

      {/* Add New Source */}
      <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-semibold mb-3">افزودن منبع RSS جدید</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>دسته‌بندی</Label>
            <Select
              value={newSource.category_id}
              onChange={(val) => setNewSource({ ...newSource, category_id: val })}
              options={categories.map((cat) => ({
                value: cat.id.toString(),
                label: cat.translations?.find((t) => t.lang === 'fa')?.name || cat.translations?.[0]?.name || `دسته ${cat.id}`,
              }))}
              placeholder="انتخاب دسته"
            />
          </div>

          <div>
            <Label>آدرس RSS</Label>
            <InputField
              value={newSource.rss_url}
              onChange={(e) => setNewSource({ ...newSource, rss_url: e.target.value })}
              placeholder="https://example.com/feed"
            />
          </div>

          <div>
            <Label>هدف</Label>
            <Select
              value={newSource.target}
              onChange={(val) => setNewSource({ ...newSource, target: val })}
              options={[
                { value: 'telegram', label: 'تلگرام' },
                { value: 'website', label: 'وبسایت' },
                { value: 'both', label: 'هر دو' },
              ]}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={addSource} className="w-full">
              <Plus className="w-4 h-4 ml-2" />
              افزودن
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Sources */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">منابع RSS موجود</h3>
          {hasChanges && (
            <span className="text-sm text-amber-600 animate-pulse">
              تغییرات ذخیره نشده دارید
            </span>
          )}
        </div>

        {Object.keys(groupedSources).length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            هنوز هیچ منبع RSS تعریف نشده است
          </div>
        ) : (
          Object.entries(groupedSources).map(([categoryId, categorySources]) => (
            <div key={categoryId} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
                {getCategoryName(Number(categoryId))}
              </h4>
              <div className="space-y-2">
                {categorySources.map((source) => (
                  <div key={source.id} className="flex items-center gap-2 bg-white dark:bg-gray-900 p-3 rounded border border-gray-100 dark:border-gray-800">
                    <div className="flex-1 min-w-0">
                      <InputField
                        value={source.rss_url}
                        onChange={(e) => updateSource(source.id, 'rss_url', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={source.target}
                        onChange={(val) => updateSource(source.id, 'target', val)}
                        options={[
                          { value: 'telegram', label: 'تلگرام' },
                          { value: 'website', label: 'وبسایت' },
                          { value: 'both', label: 'هر دو' },
                        ]}
                      />
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteSource(source.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-between items-center z-10">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {hasChanges ? 'برای اعمال تغییرات دکمه ذخیره را بزنید' : 'تغییراتی برای ذخیره وجود ندارد'}
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} className="min-w-[150px]">
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </Button>
      </div>
    </div>
  );
}
