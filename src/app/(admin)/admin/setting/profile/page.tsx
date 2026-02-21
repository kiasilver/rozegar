"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import ComponentCard from '@/components/admin/common/componentcard';
import Label from '@/components/admin/form/label';
import Input from '@/components/admin/form/input/inputfield';
import Button from '@/components/admin/ui/button/button';
import { useAlert } from "@/context/admin/alertcontext";
import Image from 'next/image';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  image_profile: string | null;
  bio: string | null;
  role: string;
  roleTitle: string;
  created_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/v1/admin/content/profile');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch profile: ${res.status}`;
        
        if (res.status === 404 || res.status === 401) {
          showAlert('لطفاً دوباره وارد شوید', 'error');
          setTimeout(() => {
            router.push('/admin/signin');
          }, 2000);
          return;
        }
        
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطا در دریافت پروفایل';
      showAlert(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/content/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      showAlert('پروفایل با موفقیت به‌روز شد', 'success');
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      showAlert('خطا در ذخیره پروفایل: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/admin/content/profile/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload image');

      const data = await res.json();
      if (profile) {
        setProfile({ ...profile, image_profile: data.url });
      }
      showAlert('عکس با موفقیت آپلود شد', 'success');
      fetchProfile();
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('خطا در آپلود عکس', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600 dark:text-gray-300">در حال بارگذاری...</div>
      </div>
    );
  }

  const avatarUrl = profile.image_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=465fff&color=fff&size=200`;
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="پروفایل" />
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">پروفایل</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">مدیریت اطلاعات حساب کاربری</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-slate-900 p-8 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer transition-all duration-300 ring-2 ring-slate-200 dark:ring-slate-700">
                <Image
                  width={128}
                  height={128}
                  src={avatarUrl}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                  <label className="cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white">
                      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path>
                      <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-brand-100 text-lg">{profile.roleTitle}</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-100 border border-purple-400/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                  </svg>
                  {profile.roleTitle}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-500">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{memberSince || 'N/A'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">عضو از</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-500">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.roleTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">نقش</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information - Inline Editing */}
      <ComponentCard title="اطلاعات پروفایل">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">نام</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="نام شما"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}
