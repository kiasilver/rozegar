'use client';

import { useState, useEffect } from 'react';
import Button from "@/components/admin/ui/button/button";
import Input from "@/components/admin/form/input/inputfield";
import Label from '@/components/admin/form/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Category {
  id: number;
  translations: { name: string; lang: string }[];
  children?: Category[];
}

export default function ManualSend() {
  const [sending, setSending] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [form, setForm] = useState({
    url: '',
    title: '',
    categoryId: 0,
    telegram: true,
    website: true,
    customPrompt: '',
  });

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/v1/admin/content/blogs/category');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
          // Set default to first category if available
          if (data.length > 0) {
            setForm((prev) => ({ ...prev, categoryId: data[0].id }));
          }
        }
      } catch {
        toast.error('خطا در دریافت دسته‌بندی‌ها');
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Helper to get category name from translations
  const getCategoryName = (cat: Category): string => {
    const faTranslation = cat.translations?.find((t) => t.lang === 'FA');
    if (faTranslation) return faTranslation.name;
    return cat.translations?.[0]?.name || `دسته‌بندی ${cat.id}`;
  };

  // Flatten categories for the select (parent + children)
  const flattenCategories = (cats: Category[], prefix = ''): { id: number; label: string }[] => {
    const result: { id: number; label: string }[] = [];
    for (const cat of cats) {
      result.push({ id: cat.id, label: `${prefix}${getCategoryName(cat)}` });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, `${prefix}── `));
      }
    }
    return result;
  };

  // Only show top-level categories (those without parent), children are nested
  const topLevelCategories = categories.filter(
    (cat) => !categories.some((other) => other.children?.some((child) => child.id === cat.id))
  );
  const flatCategories = flattenCategories(topLevelCategories);

  const handleSend = async () => {
    if (!form.url || !form.title) {
      toast.error('URL و عنوان الزامی است');
      return;
    }
    if (!form.categoryId) {
      toast.error('لطفاً یک دسته‌بندی انتخاب کنید');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/v1/admin/automation/undefined-rss/manual-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('ارسال با موفقیت انجام شد');

        // Show detailed results
        if (data.data.telegram?.success) {
          toast.success(`تلگرام: پیام ${data.data.telegram.messageId}`);
        }
        if (data.data.blog?.success) {
          toast.success(`وبسایت: بلاگ ${data.data.blog.blogId}`);
        }

        // Reset form
        setForm({
          url: '',
          title: '',
          categoryId: flatCategories[0]?.id || 0,
          telegram: true,
          website: true,
          customPrompt: '',
        });
      } else {
        toast.error(data.error || 'خطا در ارسال');
      }
    } catch (error: any) {
      toast.error('خطا در ارسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">ارسال دستی</h2>
        <p className="text-gray-600">یک خبر را به صورت دستی پردازش و ارسال کنید</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>URL خبر *</Label>
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://example.com/news/123"
          />
        </div>

        <div>
          <Label>عنوان *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان خبر"
          />
        </div>

        <div>
          <Label>دسته‌بندی</Label>
          {loadingCategories ? (
            <div className="h-11 flex items-center text-sm text-gray-400 dark:text-gray-500">
              در حال بارگذاری دسته‌بندی‌ها...
            </div>
          ) : (
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            >
              <option value={0} disabled>
                انتخاب دسته‌بندی...
              </option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.telegram}
              onCheckedChange={(checked) => setForm({ ...form, telegram: checked })}
            />
            <Label>ارسال به تلگرام</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.website}
              onCheckedChange={(checked) => setForm({ ...form, website: checked })}
            />
            <Label>انتشار در وبسایت</Label>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex justify-end z-10">
        <Button onClick={handleSend} disabled={sending} size="lg" className="bg-blue-900 hover:bg-blue-800 text-white dark:bg-primary dark:hover:bg-primary/90">
          {sending ? 'در حال پردازش...' : 'پردازش و ارسال'}
        </Button>
      </div>
    </div>
  );
}

