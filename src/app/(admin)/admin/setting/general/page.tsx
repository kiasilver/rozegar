"use client";
import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import FileInput from "@/components/Admin/form/input/FileInput";
import TextArea from "@/components/Admin/form/input/TextArea";
import ComponentCard from '@/components/Admin/common/ComponentCard';
import Label from '@/components/Admin/form/Label';
import Input from '@/components/Admin/form/input/InputField';
import Select from '@/components/Admin/form/Select';
import Button from '@/components/Admin/ui/button/Button';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAlert } from "@/context/Admin/AlertContext";
import Image from 'next/image';
import { useModal } from "@/hooks/Admin/useModal";
import MediaGalleryModal from "@/components/Admin/media/MediaGalleryModal";

// Timezone options
const timezoneOptions = [
  { value: "UTC+3:30", label: "UTC+3:30 (ایران)" },
  { value: "UTC+0:00", label: "UTC+0:00 (گرینویچ)" },
  { value: "UTC+1:00", label: "UTC+1:00" },
  { value: "UTC+2:00", label: "UTC+2:00" },
  { value: "UTC+3:00", label: "UTC+3:00" },
  { value: "UTC+4:00", label: "UTC+4:00" },
  { value: "UTC+5:00", label: "UTC+5:00" },
  { value: "UTC+5:30", label: "UTC+5:30" },
  { value: "UTC+6:00", label: "UTC+6:00" },
  { value: "UTC+7:00", label: "UTC+7:00" },
  { value: "UTC+8:00", label: "UTC+8:00" },
  { value: "UTC+9:00", label: "UTC+9:00" },
  { value: "UTC+10:00", label: "UTC+10:00" },
  { value: "UTC-5:00", label: "UTC-5:00" },
  { value: "UTC-6:00", label: "UTC-6:00" },
  { value: "UTC-7:00", label: "UTC-7:00" },
  { value: "UTC-8:00", label: "UTC-8:00" },
];

export default function GeneralSettingsPage() {
  const { showAlert } = useAlert();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General Settings
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [adminPanelUrl, setAdminPanelUrl] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC+3:30");
  const [brandName, setBrandName] = useState("");
  
  // SEO Settings
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [googleSearchConsole, setGoogleSearchConsole] = useState("");
  
  // Admin Logo
  const [adminLogoDark, setAdminLogoDark] = useState("");
  const [adminLogoLight, setAdminLogoLight] = useState("");
  const [adminFavicon, setAdminFavicon] = useState("");
  
  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Ads Settings
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [adsPlaceholderEnabled, setAdsPlaceholderEnabled] = useState(true);
  const [adsHeaderEnabled, setAdsHeaderEnabled] = useState(true);
  const [adsSidebarEnabled, setAdsSidebarEnabled] = useState(true);
  const [adsBottomEnabled, setAdsBottomEnabled] = useState(true);

  // Media Gallery Modal
  const { isOpen: isMediaGalleryOpen, openModal: openMediaGallery, closeModal: closeMediaGallery } = useModal();
  const [selectedLogoType, setSelectedLogoType] = useState<'dark' | 'light' | 'favicon' | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [generalRes, seoRes, adsRes] = await Promise.all([
        fetch('/api/v1/admin/settings/general'),
        fetch('/api/v1/admin/settings/seo'),
        fetch('/api/v1/admin/settings/ads'),
      ]);

      if (generalRes.ok) {
        const general = await generalRes.json();
        setSiteTitle(general.siteTitle || "");
        setSiteDescription(general.siteDescription || "");
        setWebsiteUrl(general.websiteUrl || "");
        setAdminPanelUrl(general.adminPanelUrl || "");
        setAdminEmail(general.adminEmail || "");
        setTimezone(general.timezone || "UTC+3:30");
        setAdminLogoDark(general.adminLogoDark || "");
        setAdminLogoLight(general.adminLogoLight || "");
        setAdminFavicon(general.adminFavicon || "");
        setBrandName(general.brandName || "");
      }

      if (seoRes.ok) {
        const seo = await seoRes.json();
        setMetaTitle(seo.metaTitle || "");
        setMetaDescription(seo.metaDescription || "");
        setMetaKeywords(seo.metaKeywords || "");
        setGoogleAnalyticsId(seo.googleAnalyticsId || "");
        setGoogleSearchConsole(seo.googleSearchConsole || "");
      }

      if (adsRes.ok) {
        const ads = await adsRes.json();
        setAdsEnabled(ads.enabled !== false);
        setAdsPlaceholderEnabled(ads.placeholderEnabled !== false);
        setAdsHeaderEnabled(ads.headerEnabled !== false);
        setAdsSidebarEnabled(ads.sidebarEnabled !== false);
        setAdsBottomEnabled(ads.bottomEnabled !== false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteTitle,
          siteDescription,
          websiteUrl,
          adminPanelUrl,
          adminEmail,
          timezone,
          brandName,
        }),
      });
      if (res.ok) {
        showAlert('تنظیمات عمومی با موفقیت ذخیره شد', 'success');
      } else {
        showAlert('خطا در ذخیره تنظیمات', 'error');
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
      showAlert('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSEO = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaTitle,
          metaDescription,
          metaKeywords,
          googleAnalyticsId,
          googleSearchConsole,
        }),
      });
      if (res.ok) {
        showAlert('تنظیمات SEO با موفقیت ذخیره شد', 'success');
      } else {
        showAlert('خطا در ذخیره تنظیمات', 'error');
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      showAlert('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('لطفاً تمام فیلدها را پر کنید', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('رمز عبور جدید و تأیید آن مطابقت ندارند', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (res.ok) {
        showAlert('رمز عبور با موفقیت تغییر کرد', 'success');
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        showAlert(data.error || 'خطا در تغییر رمز عبور', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('خطا در تغییر رمز عبور', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdsSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: adsEnabled,
          placeholderEnabled: adsPlaceholderEnabled,
          headerEnabled: adsHeaderEnabled,
          sidebarEnabled: adsSidebarEnabled,
          bottomEnabled: adsBottomEnabled,
        }),
      });
      if (res.ok) {
        showAlert('تنظیمات تبلیغات با موفقیت ذخیره شد', 'success');
      } else {
        showAlert('خطا در ذخیره تنظیمات', 'error');
      }
    } catch (error) {
      console.error('Error saving ads settings:', error);
      showAlert('خطا در ذخیره تنظیمات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFromGallery = (type: 'dark' | 'light' | 'favicon') => {
    setSelectedLogoType(type);
    openMediaGallery();
  };

  const handleGallerySelect = async (url: string) => {
    if (selectedLogoType) {
      try {
        // ذخیره در دیتابیس
        const settingKey = selectedLogoType === 'dark' ? 'admin_logo_dark' : selectedLogoType === 'light' ? 'admin_logo_light' : 'admin_favicon';
        const res = await fetch('/api/v1/admin/settings/general', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [settingKey]: url,
          }),
        });

        if (res.ok) {
          // به‌روزرسانی state
          if (selectedLogoType === 'dark') {
            setAdminLogoDark(url);
          } else if (selectedLogoType === 'light') {
            setAdminLogoLight(url);
          } else if (selectedLogoType === 'favicon') {
            setAdminFavicon(url);
          }
          showAlert('لوگو با موفقیت انتخاب شد', 'success');
        } else {
          showAlert('خطا در ذخیره لوگو', 'error');
        }
      } catch (error) {
        console.error('Error saving logo:', error);
        showAlert('خطا در ذخیره لوگو', 'error');
      }
    }
    setSelectedLogoType(null);
  };

  const handleLogoUpload = async (type: 'dark' | 'light' | 'favicon', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/v1/admin/settings/logo', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'dark') setAdminLogoDark(data.url);
        else if (type === 'light') setAdminLogoLight(data.url);
        else if (type === 'favicon') setAdminFavicon(data.url);
        showAlert('لوگو با موفقیت آپلود شد', 'success');
      } else {
        showAlert('خطا در آپلود لوگو', 'error');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      showAlert('خطا در آپلود لوگو', 'error');
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
      <PageBreadcrumb pageTitle="تنظیمات عمومی" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          {/* General Settings */}
          <ComponentCard title="تنظیمات عمومی">
            <div className="space-y-6">
              <div>
                <Label>عنوان سایت</Label>
                <Input 
                  type="text" 
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="عنوان سایت"
                />
              </div>
              <div>
                <Label>توضیحات سایت</Label>
                <TextArea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  rows={3}
                  placeholder="توضیحات کوتاه سایت"
                />
              </div>
              <div>
                <Label>آدرس وب‌سایت</Label>
                <Input 
                  type="text" 
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label>آدرس پنل مدیریت</Label>
                <Input 
                  type="text" 
                  value={adminPanelUrl}
                  onChange={(e) => setAdminPanelUrl(e.target.value)}
                  placeholder="https://example.com/admin"
                />
              </div>
              <div>
                <Label>ایمیل مدیریت</Label>
                <div className="relative">
                  <Input
                    placeholder="admin@example.com"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="pl-[62px]"
                  />
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-300">
                    <EmailOutlinedIcon className="w-5 h-5" />
                  </span>
                </div>
              </div>
              <div>
                <Label>منطقه زمانی</Label>
                <Select
                  options={timezoneOptions}
                  value={timezone}
                  onChange={(value) => setTimezone(value)}
                  placeholder="انتخاب منطقه زمانی"
                />
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                  تمام تاریخ‌های مقالات بر اساس این منطقه زمانی نمایش داده می‌شوند
                </p>
              </div>
              <div>
                <Label>نام برند (White Label)</Label>
                <Input 
                  type="text" 
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="نام برند برای استفاده در Agent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                  نام برند برای استفاده در Agent و White Label (اختیاری)
                </p>
              </div>
              
              <Button onClick={handleSaveGeneral} disabled={saving} className="w-full">
                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات عمومی'}
              </Button>
            </div>
          </ComponentCard>

          {/* SEO Settings */}
          <ComponentCard title="تنظیمات SEO">
            <div className="space-y-6">
              <div>
                <Label>عنوان متا (Meta Title)</Label>
                <Input 
                  type="text" 
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="عنوان پیش‌فرض برای صفحات"
                />
              </div>
              <div>
                <Label>Meta Description سایت</Label>
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">توضیحات متا (برای SEO)</p>
                <TextArea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="پایگاه خبری «روزمرگی اقتصاد» با نگاهی دقیق به تحولات اقتصادی ایران، به ویژه در حوزه مسکن و شهرسازی، راه و ترابری و قیمت‌های روز، شما را در جریان آخرین اخبار و تحلیل‌ها قرار می‌دهد."
                />
              </div>
              <div>
                <Label>کلمات کلیدی (Meta Keywords)</Label>
                <Input 
                  type="text" 
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="کلمات کلیدی با کاما جدا شده"
                />
              </div>
              <div>
                <Label>Google Analytics ID</Label>
                <Input 
                  type="text" 
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <Label>Google Search Console</Label>
                <Input 
                  type="text" 
                  value={googleSearchConsole}
                  onChange={(e) => setGoogleSearchConsole(e.target.value)}
                  placeholder="کد تأیید Search Console"
                />
              </div>
              <Button onClick={handleSaveSEO} disabled={saving} className="w-full">
                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات SEO'}
              </Button>
            </div>
          </ComponentCard>

          {/* Change Password */}
          <ComponentCard title="تغییر رمز عبور SuperAdmin">
            <div className="space-y-6">
              <div>
                <Label>رمز عبور فعلی</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="رمز عبور فعلی"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <VisibilityIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                    ) : (
                      <VisibilityOffIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label>رمز عبور جدید</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید"
                />
              </div>
              <div>
                <Label>تأیید رمز عبور جدید</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تأیید رمز عبور جدید"
                />
              </div>
              <Button onClick={handleSavePassword} disabled={saving} className="w-full">
                {saving ? 'در حال تغییر...' : 'تغییر رمز عبور'}
              </Button>
            </div>
          </ComponentCard>

          {/* Ads Settings */}
          <ComponentCard title="تنظیمات تبلیغات">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={adsEnabled} 
                  onChange={setAdsEnabled}
                  disabled={saving}
                />
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  فعال‌سازی تبلیغات در سایت
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={adsPlaceholderEnabled} 
                  onChange={setAdsPlaceholderEnabled}
                  disabled={saving}
                />
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  نمایش "جای تبلیغ شما" در صورت نبود تبلیغ
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-white">
                  غیرفعال‌سازی تبلیغات در موقعیت‌های خاص:
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={adsHeaderEnabled} 
                      onChange={setAdsHeaderEnabled}
                      disabled={saving}
                    />
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      فعال‌سازی تبلیغات در Header
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={adsSidebarEnabled} 
                      onChange={setAdsSidebarEnabled}
                      disabled={saving}
                    />
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      فعال‌سازی تبلیغات در Sidebar
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={adsBottomEnabled} 
                      onChange={setAdsBottomEnabled}
                      disabled={saving}
                    />
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      فعال‌سازی تبلیغات در Bottom
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveAdsSettings} disabled={saving} className="w-full">
                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات تبلیغات'}
              </Button>
            </div>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          {/* Admin Logo */}
          <ComponentCard title="لوگوی پنل مدیریت">
            <div className="space-y-6">
              <div>
                <Label>لوگوی تاریک (Dark Mode)</Label>
                <div className="flex gap-2 mb-2">
                  <FileInput 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload('dark', file);
                    }}
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectFromGallery('dark')}
                  >
                    انتخاب از گالری
                  </Button>
                </div>
                {adminLogoDark && (
                  <div className="mt-2">
                    <Image
                      src={adminLogoDark}
                      alt="Admin Logo Dark"
                      width={200}
                      height={60}
                      className="border border-gray-200 rounded dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>لوگوی روشن (Light Mode)</Label>
                <div className="flex gap-2 mb-2">
                  <FileInput 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload('light', file);
                    }}
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectFromGallery('light')}
                  >
                    انتخاب از گالری
                  </Button>
                </div>
                {adminLogoLight && (
                  <div className="mt-2">
                    <Image
                      src={adminLogoLight}
                      alt="Admin Logo Light"
                      width={200}
                      height={60}
                      className="border border-gray-200 rounded dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Favicon</Label>
                <div className="flex gap-2 mb-2">
                  <FileInput 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload('favicon', file);
                    }}
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectFromGallery('favicon')}
                  >
                    انتخاب از گالری
                  </Button>
                </div>
                {adminFavicon && (
                  <div className="mt-2">
                    <Image
                      src={adminFavicon}
                      alt="Favicon"
                      width={32}
                      height={32}
                      className="border border-gray-200 rounded dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>

      {/* Media Gallery Modal */}
      <MediaGalleryModal
        isOpen={isMediaGalleryOpen}
        onClose={closeMediaGallery}
        onSelect={handleGallerySelect}
        accept="image"
      />
    </div>
  );
}
