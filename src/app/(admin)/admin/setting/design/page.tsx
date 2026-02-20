"use client";
import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from '@/components/Admin/common/ComponentCard';
import Label from '@/components/Admin/form/Label';
import Input from '@/components/Admin/form/input/InputField';
import TextArea from '@/components/Admin/form/input/TextArea';
import FileInput from "@/components/Admin/form/input/FileInput";
import Select from '@/components/Admin/form/Select';
import Button from '@/components/Admin/ui/button/Button';
import { useAlert } from "@/context/Admin/AlertContext";
import Image from 'next/image';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/Admin/ui/table";

interface DesignSettings {
  // Fonts
  primaryFont: string;
  secondaryFont: string;
  fontSize: string;
  
  // Site Colors (CSS Variables)
  sitePrimaryColor: string;      // --primary-color
  siteSecondaryColor: string;    // --secondary-color
  siteTertiaryColor: string;    // --tertiary-color
  siteQuaternaryColor: string;   // --quaternary-color
  
  // Admin Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Dark Mode Colors
  darkBackgroundColor: string;
  darkTextColor: string;

  // Site Logos
  logoHeader: string;
  logoFooter: string;

  // Dashboard Logos
  logoDashboardLight: string; // لوگو Dashboard برای حالت روشن
  logoDashboardDark: string; // لوگو Dashboard برای حالت تاریک
  logoSmallLight: string; // لوگو کوچک Sidebar Collapsed - حالت روشن
  logoSmallDark: string; // لوگو کوچک Sidebar Collapsed - حالت تاریک
}


interface FontVariant {
  weight: string;
  style: string;
  url: string;
  filename: string;
}

interface CustomFont {
  name: string;
  variants: FontVariant[];
}

export default function DesignSettingsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [newFont, setNewFont] = useState({ name: '', file: null as File | null, weight: '400', style: 'normal' });
  const [settings, setSettings] = useState<DesignSettings>({
    primaryFont: 'IRANYekanX',
    secondaryFont: 'Arial',
    fontSize: '16px',
    sitePrimaryColor: '#bc0c00',
    siteSecondaryColor: '#9e0a00',
    siteTertiaryColor: '#EAD196',
    siteQuaternaryColor: '#EEEEEE',
    primaryColor: '#465fff',
    secondaryColor: '#6b7280',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    darkBackgroundColor: '#111827',
    darkTextColor: '#f9fafb',
    logoHeader: '',
    logoFooter: '',
    logoDashboardLight: '',
    logoDashboardDark: '',
    logoSmallLight: '',
    logoSmallDark: '',
  });

  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    fetchSettings();
    fetchCustomFonts();
  }, []);

  const fetchCustomFonts = async () => {
    try {
      const res = await fetch('/api/v1/admin/content/fonts');
      if (!res.ok) throw new Error('Failed to fetch fonts');
      const data = await res.json();
      setCustomFonts(data.fonts || []);
    } catch (error) {
      console.error('Error fetching custom fonts:', error);
    }
  };

  // Update preview when colors change - real-time
  useEffect(() => {
    const timer = setTimeout(() => {
      const iframe = document.querySelector('iframe[title="Preview Home Page"]') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage({
            type: 'UPDATE_COLORS',
            colors: {
              bg: settings.backgroundColor,
              text: settings.textColor,
              darkBg: settings.darkBackgroundColor,
              darkText: settings.darkTextColor,
              sitePrimary: settings.sitePrimaryColor,
              siteSecondary: settings.siteSecondaryColor,
            }
          }, '*');
        } catch (e) {
          // Fallback: refresh iframe URL
          const newUrl = `/?preview=true&bg=${encodeURIComponent(settings.backgroundColor)}&text=${encodeURIComponent(settings.textColor)}&darkBg=${encodeURIComponent(settings.darkBackgroundColor)}&darkText=${encodeURIComponent(settings.darkTextColor)}&sitePrimary=${encodeURIComponent(settings.sitePrimaryColor)}&siteSecondary=${encodeURIComponent(settings.siteSecondaryColor)}&t=${Date.now()}`;
          iframe.src = newUrl;
        }
      }
    }, 100); // Debounce 100ms

    return () => clearTimeout(timer);
  }, [settings.backgroundColor, settings.textColor, settings.darkBackgroundColor, settings.darkTextColor, settings.sitePrimaryColor, settings.siteSecondaryColor]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/settings/design');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      
      setSettings({
        primaryFont: data.primaryFont || 'IRANYekanX',
        secondaryFont: data.secondaryFont || 'Arial',
        fontSize: data.fontSize || '16px',
        sitePrimaryColor: data.sitePrimaryColor || '#bc0c00',
        siteSecondaryColor: data.siteSecondaryColor || '#9e0a00',
        siteTertiaryColor: data.siteTertiaryColor || '#EAD196',
        siteQuaternaryColor: data.siteQuaternaryColor || '#EEEEEE',
        primaryColor: data.primaryColor || '#465fff',
        secondaryColor: data.secondaryColor || '#6b7280',
        accentColor: data.accentColor || '#f59e0b',
        backgroundColor: data.backgroundColor || '#ffffff',
        textColor: data.textColor || '#1f2937',
        darkBackgroundColor: data.darkBackgroundColor || '#111827',
        darkTextColor: data.darkTextColor || '#f9fafb',
        logoHeader: data.logoHeader || '/logo/rozmaregi.png',
        logoFooter: data.logoFooter || '/logo/rozmaregi.png',
        logoDashboardLight: data.logoDashboardLight || '',
        logoDashboardDark: data.logoDashboardDark || '',
        logoSmallLight: data.logoSmallLight || '/images/logo/logo.png',
        logoSmallDark: data.logoSmallDark || '/images/logo/logo-dark.png',
      });
    } catch (error) {
      console.error('Error fetching design settings:', error);
      showAlert('خطا در دریافت تنظیمات', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      // Save design settings
      const res = await fetch('/api/v1/admin/settings/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // Immediately apply colors to CSS variables and cache in localStorage
      const root = document.documentElement;
      if (settings.sitePrimaryColor) {
        root.style.setProperty('--primary-color', settings.sitePrimaryColor);
      }
      if (settings.siteSecondaryColor) {
        root.style.setProperty('--secondary-color', settings.siteSecondaryColor);
      }
      if (settings.siteTertiaryColor) {
        root.style.setProperty('--tertiary-color', settings.siteTertiaryColor);
      }
      if (settings.siteQuaternaryColor) {
        root.style.setProperty('--quaternary-color', settings.siteQuaternaryColor);
      }

      // Cache colors in localStorage for instant load on next page refresh
      localStorage.setItem('siteColors', JSON.stringify({
        sitePrimaryColor: settings.sitePrimaryColor,
        siteSecondaryColor: settings.siteSecondaryColor,
        siteTertiaryColor: settings.siteTertiaryColor,
        siteQuaternaryColor: settings.siteQuaternaryColor,
      }));

      showAlert('تنظیمات با موفقیت ذخیره شد', 'success');
    } catch (error) {
      console.error('Error saving design settings:', error);
      showAlert('خطا در ذخیره تنظیمات: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleFileUpload = async (key: keyof DesignSettings, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);

    try {
      const res = await fetch('/api/v1/admin/settings/design/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload file');

      const data = await res.json();
      setSettings(prev => ({ ...prev, [key]: data.url }));
      showAlert('تصویر با موفقیت آپلود شد', 'success');
    } catch (error) {
      console.error('Error uploading file:', error);
      showAlert('خطا در آپلود تصویر', 'error');
    }
  };

  const handleFontUpload = async () => {
    if (!newFont.name.trim() || !newFont.file) {
      showAlert('نام فونت و فایل فونت الزامی است', 'error');
      return;
    }

    setUploadingFont(true);
    try {
      const formData = new FormData();
      formData.append('file', newFont.file);
      formData.append('fontName', newFont.name);
      formData.append('fontWeight', newFont.weight);
      formData.append('fontStyle', newFont.style);

      const res = await fetch('/api/v1/admin/content/fonts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload font');
      }

      showAlert('فونت با موفقیت آپلود شد', 'success');
      setNewFont({ name: '', file: null, weight: '400', style: 'normal' });
      fetchCustomFonts();
    } catch (error) {
      console.error('Error uploading font:', error);
      showAlert('خطا در آپلود فونت: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setUploadingFont(false);
    }
  };

  const handleDeleteFont = async (fontName: string) => {
    if (!confirm(`آیا از حذف فونت "${fontName}" اطمینان دارید؟`)) return;

    try {
      const res = await fetch(`/api/v1/admin/content/fonts?name=${encodeURIComponent(fontName)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete font');

      showAlert('فونت با موفقیت حذف شد', 'success');
      fetchCustomFonts();
    } catch (error) {
      console.error('Error deleting font:', error);
      showAlert('خطا در حذف فونت', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-300">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="تنظیمات طراحی" />

      {/* Font Settings */}
      <ComponentCard title="تنظیمات فونت">
        <div className="space-y-6">
          {/* Upload New Font */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-4 text-gray-800 dark:text-white">آپلود فونت جدید</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="fontName">نام فونت</Label>
                <Input
                  type="text"
                  value={newFont.name}
                  onChange={(e) => setNewFont(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثلاً MyCustomFont"
                />
              </div>
              <div>
                <Label htmlFor="fontWeight">وزن فونت</Label>
                <Select
                  options={[
                    { value: '100', label: '100 (Thin)' },
                    { value: '200', label: '200 (Extra Light)' },
                    { value: '300', label: '300 (Light)' },
                    { value: '400', label: '400 (Normal/Regular)' },
                    { value: '500', label: '500 (Medium)' },
                    { value: '600', label: '600 (Semi Bold)' },
                    { value: '700', label: '700 (Bold)' },
                    { value: '800', label: '800 (Extra Bold)' },
                    { value: '900', label: '900 (Black/Heavy)' },
                  ]}
                  value={newFont.weight}
                  onChange={(value) => setNewFont(prev => ({ ...prev, weight: value }))}
                  placeholder="انتخاب وزن"
                />
              </div>
              <div>
                <Label htmlFor="fontStyle">سبک فونت</Label>
                <Select
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'italic', label: 'Italic' },
                    { value: 'oblique', label: 'Oblique' },
                  ]}
                  value={newFont.style}
                  onChange={(value) => setNewFont(prev => ({ ...prev, style: value }))}
                  placeholder="انتخاب سبک"
                />
              </div>
              <div>
                <Label htmlFor="fontFile">فایل فونت</Label>
                <FileInput
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewFont(prev => ({ ...prev, file }));
                    }
                  }}
                  accept=".woff,.woff2,.ttf,.otf,.eot"
                />
                {newFont.file && (
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    {newFont.file.name}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleFontUpload} disabled={uploadingFont || !newFont.name || !newFont.file}>
                {uploadingFont ? 'در حال آپلود...' : 'آپلود فونت'}
              </Button>
            </div>
          </div>

          {/* Font Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryFont">فونت اصلی</Label>
              <Select
                options={[
                  { value: 'IRANYekanX', label: 'IRANYekanX (سیستم)' },
                  { value: 'Vazir', label: 'Vazir (سیستم)' },
                  { value: 'Arial', label: 'Arial (سیستم)' },
                  { value: 'Tahoma', label: 'Tahoma (سیستم)' },
                  { value: 'Times New Roman', label: 'Times New Roman (سیستم)' },
                  { value: 'Courier New', label: 'Courier New (سیستم)' },
                  { value: 'Georgia', label: 'Georgia (سیستم)' },
                  { value: 'Verdana', label: 'Verdana (سیستم)' },
                  ...customFonts.map(font => ({
                    value: font.name,
                    label: `${font.name} (آپلود شده - ${font.variants.length} وزن)`,
                  })),
                ]}
                value={settings.primaryFont}
                onChange={(value) => setSettings(prev => ({ ...prev, primaryFont: value }))}
                placeholder="انتخاب فونت"
              />
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                فونت فعلی: {settings.primaryFont}
              </p>
            </div>
            <div>
              <Label htmlFor="secondaryFont">فونت ثانویه</Label>
              <Select
                options={[
                  { value: 'Arial', label: 'Arial (سیستم)' },
                  { value: 'Tahoma', label: 'Tahoma (سیستم)' },
                  { value: 'Times New Roman', label: 'Times New Roman (سیستم)' },
                  { value: 'Courier New', label: 'Courier New (سیستم)' },
                  { value: 'Georgia', label: 'Georgia (سیستم)' },
                  { value: 'Verdana', label: 'Verdana (سیستم)' },
                  { value: 'IRANYekanX', label: 'IRANYekanX (سیستم)' },
                  { value: 'Vazir', label: 'Vazir (سیستم)' },
                  ...customFonts.map(font => ({
                    value: font.name,
                    label: `${font.name} (آپلود شده - ${font.variants.length} وزن)`,
                  })),
                ]}
                value={settings.secondaryFont}
                onChange={(value) => setSettings(prev => ({ ...prev, secondaryFont: value }))}
                placeholder="انتخاب فونت"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fontSize">اندازه فونت پیش‌فرض</Label>
            <Input
              type="text"
              value={settings.fontSize}
              onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value }))}
              placeholder="مثلاً 16px"
            />
          </div>

          {/* Custom Fonts List */}
          {customFonts.length > 0 && (
            <div>
              <Label className="mb-3 block">فونت‌های آپلود شده:</Label>
              <div className="space-y-3">
                {customFonts.map((font) => (
                  <div key={font.name} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-800 dark:text-white">{font.name}</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          {font.variants.length} وزن/سبک
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFont(font.name)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <DeleteOutlineIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {font.variants.map((variant, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                        >
                          {variant.weight} {variant.style}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

      {/* Preview Section */}
      <ComponentCard title="پیش‌نمایش صفحه اصلی">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              تغییرات به صورت real-time در پیش‌نمایش نمایش داده می‌شود
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
            >
              باز کردن در تب جدید →
            </a>
          </div>
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            <iframe
              key={`preview-${previewKey}`}
              src={`/?preview=true&bg=${encodeURIComponent(settings.backgroundColor)}&text=${encodeURIComponent(settings.textColor)}&darkBg=${encodeURIComponent(settings.darkBackgroundColor)}&darkText=${encodeURIComponent(settings.darkTextColor)}&sitePrimary=${encodeURIComponent(settings.sitePrimaryColor)}&siteSecondary=${encodeURIComponent(settings.siteSecondaryColor)}`}
              className="w-full h-[600px] border-0"
              style={{
                backgroundColor: settings.backgroundColor,
              }}
              title="Preview Home Page"
            />
          </div>
        </div>
      </ComponentCard>

      {/* Site Colors Settings */}
      <ComponentCard title="تنظیمات رنگ سایت (CSS Variables)">
        {/* Color Palette Suggestions */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Label className="mb-3 block">پالت‌های رنگی آماده:</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'قرمز (فعلی)', primary: '#bc0c00', secondary: '#9e0a00', tertiary: '#EAD196', quaternary: '#EEEEEE' },
              { name: 'آبی و طلایی', primary: '#102E50', secondary: '#F5C45E', tertiary: '#E78B48', quaternary: '#BE3D2A' },
              { name: 'آبی و فیروزه‌ای', primary: '#205781', secondary: '#4F959D', tertiary: '#98D2C0', quaternary: '#F6F8D5' },
              { name: 'فیروزه‌ای', primary: '#034C53', secondary: '#007074', tertiary: '#F38C79', quaternary: '#FFC1B4' },
              { name: 'سبز', primary: '#1B4332', secondary: '#2D6A4F', tertiary: '#52B788', quaternary: '#D8F3DC' },
              { name: 'بنفش', primary: '#3D1A78', secondary: '#6B46C1', tertiary: '#A78BFA', quaternary: '#EDE9FE' },
              { name: 'نارنجی', primary: '#B45309', secondary: '#D97706', tertiary: '#F59E0B', quaternary: '#FEF3C7' },
              { name: 'خاکستری', primary: '#1F2937', secondary: '#4B5563', tertiary: '#9CA3AF', quaternary: '#F3F4F6' },
            ].map((palette, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    sitePrimaryColor: palette.primary,
                    siteSecondaryColor: palette.secondary,
                    siteTertiaryColor: palette.tertiary,
                    siteQuaternaryColor: palette.quaternary,
                  }));
                }}
                className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-right"
              >
                <div className="flex gap-1 mb-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.primary }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.secondary }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.tertiary }} />
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: palette.quaternary }} />
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{palette.name}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="sitePrimaryColor">رنگ اصلی سایت (Primary)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={settings.sitePrimaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, sitePrimaryColor: e.target.value }))}
                placeholder="#bc0c00"
              />
              <input
                type="color"
                value={settings.sitePrimaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, sitePrimaryColor: e.target.value }))}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="siteSecondaryColor">رنگ ثانویه سایت (Secondary)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={settings.siteSecondaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteSecondaryColor: e.target.value }))}
                placeholder="#9e0a00"
              />
              <input
                type="color"
                value={settings.siteSecondaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteSecondaryColor: e.target.value }))}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="siteTertiaryColor">رنگ سوم سایت (Tertiary)</Label>
            <div className="flex gap-2">
              <Input
                id="siteTertiaryColor"
                type="text"
                value={settings.siteTertiaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteTertiaryColor: e.target.value }))}
                placeholder="#EAD196"
              />
              <input
                type="color"
                value={settings.siteTertiaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteTertiaryColor: e.target.value }))}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="siteQuaternaryColor">رنگ چهارم سایت (Quaternary)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={settings.siteQuaternaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteQuaternaryColor: e.target.value }))}
                placeholder="#EEEEEE"
              />
              <input
                type="color"
                value={settings.siteQuaternaryColor}
                onChange={(e) => setSettings(prev => ({ ...prev, siteQuaternaryColor: e.target.value }))}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Logo Settings */}
      <ComponentCard title="تنظیمات لوگو">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>لوگو Header (فعلی)</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoHeader', file);
                }}
                accept="image/*"
              />
              {settings.logoHeader && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoHeader}
                    alt="Header Logo"
                    width={200}
                    height={50}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-white p-2"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>لوگو Footer (فعلی)</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoFooter', file);
                }}
                accept="image/*"
              />
              {settings.logoFooter && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoFooter}
                    alt="Footer Logo"
                    width={200}
                    height={50}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-white p-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Dashboard Logo Settings */}
      <ComponentCard title="لوگو Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>لوگو Dashboard - حالت روشن</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoDashboardLight', file);
                }}
                accept="image/*"
              />
              {settings.logoDashboardLight && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoDashboardLight}
                    alt="Dashboard Logo Light"
                    width={200}
                    height={50}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-white p-2"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>لوگو Dashboard - حالت تاریک</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoDashboardDark', file);
                }}
                accept="image/*"
              />
              {settings.logoDashboardDark && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoDashboardDark}
                    alt="Dashboard Logo Dark"
                    width={200}
                    height={50}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-gray-800 p-2"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>لوگو کوچک (Sidebar Collapsed) - حالت روشن</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoSmallLight', file);
                }}
                accept="image/*"
              />
              {settings.logoSmallLight && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoSmallLight}
                    alt="Small Logo Light"
                    width={40}
                    height={40}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-white p-2"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>لوگو کوچک (Sidebar Collapsed) - حالت تاریک</Label>
              <FileInput
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoSmallDark', file);
                }}
                accept="image/*"
              />
              {settings.logoSmallDark && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">پیش‌نمایش:</p>
                  <Image
                    src={settings.logoSmallDark}
                    alt="Small Logo Dark"
                    width={40}
                    height={40}
                    className="border border-gray-200 rounded dark:border-gray-700 object-contain bg-gray-800 p-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ComponentCard>


      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </Button>
      </div>
    </div>
  );
}


