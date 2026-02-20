"use client";
import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from '@/components/Admin/common/ComponentCard';
import Label from '@/components/Admin/form/Label';
import Input from '@/components/Admin/form/input/InputField';
import TextArea from '@/components/Admin/form/input/TextArea';
import Button from '@/components/Admin/ui/button/Button';
import { useAlert } from "@/context/Admin/AlertContext";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/Admin/ui/table";

interface FooterMenu {
  id: number;
  title: string;
  url: string | null;
  group: string;
  order: number;
  custom_group_name?: string | null; // برای دسته دلخواه
}

export default function FooterSettingsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [footerMenus, setFooterMenus] = useState<FooterMenu[]>([]);
  const [newMenu, setNewMenu] = useState({ title: '', url: '', group: 'quick-access', custom_group_name: '' });
  const [availablePages, setAvailablePages] = useState<Array<{ label: string; value: string; type: string }>>([]);
  const [urlInputMode, setUrlInputMode] = useState<'select' | 'manual'>('select');
  
  const [footerSettings, setFooterSettings] = useState({
    footerBio: 'پایگاه خبری «روزمرگی اقتصاد» با نگاهی دقیق به تحولات اقتصادی ایران، به ویژه در حوزه مسکن و شهرسازی، راه و ترابری و قیمت‌های روز، شما را در جریان آخرین اخبار و تحلیل‌ها قرار می‌دهد.',
    footerCopyright: 'کلیه حقوق مادی و معنوی این وب‌سایت، شامل محتوا، طرح و ایده، متعلق به «روزمرگی اقتصاد» می‌باشد. هرگونه کپی‌برداری، بازنشر و استفاده از مطالب، تنها با کسب مجوز کتبی از مدیریت وب‌سایت مجاز است.',
  });

  useEffect(() => {
    fetchSettings();
    fetchFooterMenus();
    fetchAvailablePages();
  }, []);

  const fetchAvailablePages = async () => {
    try {
      const res = await fetch('/api/v1/admin/content/pages/pages');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch pages:', res.status, errorData);
        // در صورت خطا، حداقل صفحات اصلی را نمایش می‌دهیم
        setAvailablePages([
          { label: 'صفحه اصلی', value: '/', type: 'main' },
          { label: 'اخبار', value: '/news', type: 'main' },
          { label: 'بلاگ', value: '/blog', type: 'main' },
          { label: 'جستجو', value: '/search', type: 'main' },
          { label: 'آرشیو', value: '/archive', type: 'main' },
        ]);
        return;
      }
      const data = await res.json();
      setAvailablePages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      // در صورت خطا، حداقل صفحات اصلی را نمایش می‌دهیم
      setAvailablePages([
        { label: 'صفحه اصلی', value: '/', type: 'main' },
        { label: 'اخبار', value: '/news', type: 'main' },
        { label: 'بلاگ', value: '/blog', type: 'main' },
        { label: 'جستجو', value: '/search', type: 'main' },
        { label: 'آرشیو', value: '/archive', type: 'main' },
      ]);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/settings/footer');
      if (!res.ok) throw new Error('Failed to fetch footer settings');
      const data = await res.json();
      setFooterSettings({
        footerBio: data.bio || footerSettings.footerBio,
        footerCopyright: data.copyright || footerSettings.footerCopyright,
      });
    } catch (error) {
      console.error('Error fetching footer settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFooterMenus = async () => {
    try {
      const res = await fetch('/api/v1/admin/content/pages/menus');
      if (!res.ok) throw new Error('Failed to fetch footer menus');
      const data = await res.json();
      setFooterMenus(data);
    } catch (error) {
      console.error('Error fetching footer menus:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/footer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: footerSettings.footerBio,
          copyright: footerSettings.footerCopyright,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save footer settings');
      }

      showAlert('تنظیمات Footer با موفقیت ذخیره شد', 'success');
    } catch (error) {
      console.error('Error saving footer settings:', error);
      showAlert('خطا در ذخیره تنظیمات: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMenu = async () => {
    if (!newMenu.title.trim()) {
      showAlert('عنوان منو الزامی است', 'error');
      return;
    }

    if (newMenu.group === 'custom' && !newMenu.custom_group_name?.trim()) {
      showAlert('برای دسته دلخواه، نام دسته الزامی است', 'error');
      return;
    }

    try {
      const menuData: any = {
        title: newMenu.title,
        url: newMenu.url,
        group: newMenu.group,
      };
      
      if (newMenu.group === 'custom' && newMenu.custom_group_name) {
        menuData.custom_group_name = newMenu.custom_group_name.trim();
      }

      const res = await fetch('/api/v1/admin/content/pages/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to add menu');
      }

      showAlert('منو با موفقیت اضافه شد', 'success');
      setNewMenu({ title: '', url: '', group: 'quick-access', custom_group_name: '' });
      fetchFooterMenus();
    } catch (error) {
      console.error('Error adding menu:', error);
      showAlert('خطا در اضافه کردن منو', 'error');
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (!confirm('آیا از حذف این منو اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/v1/admin/content/pages/menus/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete menu');

      showAlert('منو با موفقیت حذف شد', 'success');
      fetchFooterMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      showAlert('خطا در حذف منو', 'error');
    }
  };

  const handleUpdateMenu = async (id: number, data: { title?: string; url?: string; group?: string; custom_group_name?: string }) => {
    try {
      const res = await fetch(`/api/v1/admin/content/pages/menus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update menu');

      showAlert('منو با موفقیت به‌روزرسانی شد', 'success');
      fetchFooterMenus();
    } catch (error) {
      console.error('Error updating menu:', error);
      showAlert('خطا در به‌روزرسانی منو', 'error');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = footerMenus.findIndex((m) => m.id === active.id);
    const newIndex = footerMenus.findIndex((m) => m.id === over.id);

    const newMenus = [...footerMenus];
    const [removed] = newMenus.splice(oldIndex, 1);
    newMenus.splice(newIndex, 0, removed);

    const updatedMenus = newMenus.map((menu, index) => ({
      ...menu,
      order: index,
    }));

    setFooterMenus(updatedMenus);

    try {
      await fetch('/api/v1/admin/content/pages/menus/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: updatedMenus.map((m) => m.id) }),
      });
    } catch (error) {
      console.error('Error reordering menus:', error);
      fetchFooterMenus();
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
      <PageBreadcrumb pageTitle="تنظیمات Footer" />

      {/* Footer Settings */}
      <ComponentCard title="تنظیمات Footer">
        <div className="space-y-6">
          <div>
            <Label htmlFor="footerBio">متن Bio (زیر لوگو)</Label>
            <TextArea
              id="footerBio"
              value={footerSettings.footerBio}
              onChange={(e) => setFooterSettings(prev => ({ ...prev, footerBio: e.target.value }))}
              placeholder="پایگاه خبری «روزمرگی اقتصاد» با نگاهی دقیق به تحولات اقتصادی ایران، به ویژه در حوزه مسکن و شهرسازی، راه و ترابری و قیمت‌های روز، شما را در جریان آخرین اخبار و تحلیل‌ها قرار می‌دهد."
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="footerCopyright">متن Copyright</Label>
            <TextArea
              id="footerCopyright"
              value={footerSettings.footerCopyright}
              onChange={(e) => setFooterSettings(prev => ({ ...prev, footerCopyright: e.target.value }))}
              placeholder="کلیه حقوق مادی و معنوی این وب‌سایت، شامل محتوا، طرح و ایده، متعلق به «روزمرگی اقتصاد» می‌باشد. هرگونه کپی‌برداری، بازنشر و استفاده از مطالب، تنها با کسب مجوز کتبی از مدیریت وب‌سایت مجاز است."
              rows={3}
            />
          </div>
        </div>
      </ComponentCard>

      {/* Footer Menus */}
      <ComponentCard title="منوهای Footer">
        <div className="space-y-4">
          {/* Add New Menu */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 dark:text-white">افزودن منوی جدید</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input
                  placeholder="عنوان منو"
                  value={newMenu.title}
                  onChange={(e) => setNewMenu(prev => ({ ...prev, title: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <select
                    value={urlInputMode}
                    onChange={(e) => {
                      setUrlInputMode(e.target.value as 'select' | 'manual');
                      if (e.target.value === 'manual') {
                        setNewMenu(prev => ({ ...prev, url: '' }));
                      }
                    }}
                    className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <option value="select">انتخاب از صفحات</option>
                    <option value="manual">وارد کردن دستی</option>
                  </select>
                </div>
                {urlInputMode === 'select' ? (
                  <select
                    value={newMenu.url}
                    onChange={(e) => setNewMenu(prev => ({ ...prev, url: e.target.value }))}
                    className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <option value="">انتخاب صفحه...</option>
                    {availablePages.map((page) => (
                      <option key={page.value} value={page.value}>
                        {page.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="URL (مثال: /page یا https://example.com)"
                    value={newMenu.url}
                    onChange={(e) => setNewMenu(prev => ({ ...prev, url: e.target.value }))}
                  />
                )}
                <select
                  value={newMenu.group}
                  onChange={(e) => setNewMenu(prev => ({ ...prev, group: e.target.value, custom_group_name: e.target.value === 'custom' ? prev.custom_group_name : '' }))}
                  className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-700 dark:text-gray-300"
                >
                  <option value="quick-access">دسترسی سریع</option>
                  <option value="useful-links">لینک های مفید</option>
                  <option value="other">سایر</option>
                  <option value="custom">دلخواه</option>
                </select>
                {newMenu.group === 'custom' && (
                  <Input
                    placeholder="نام دسته دلخواه (مثال: خدمات، محصولات)"
                    value={newMenu.custom_group_name}
                    onChange={(e) => setNewMenu(prev => ({ ...prev, custom_group_name: e.target.value }))}
                    className="h-11"
                  />
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddMenu} size="sm">
                  <AddIcon className="w-4 h-4 ml-1" />
                  افزودن
                </Button>
              </div>
            </div>
          </div>

          {/* Menus List */}
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={footerMenus.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>ترتیب</TableCell>
                    <TableCell isHeader>عنوان</TableCell>
                    <TableCell isHeader>URL</TableCell>
                    <TableCell isHeader>گروه</TableCell>
                    <TableCell isHeader>عملیات</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {footerMenus.map((menu) => (
                    <SortableMenuRow
                      key={menu.id}
                      menu={menu}
                      onDelete={handleDeleteMenu}
                      onUpdate={handleUpdateMenu}
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
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

function SortableMenuRow({ menu, onDelete, onUpdate }: { menu: FooterMenu; onDelete: (id: number) => void; onUpdate: (id: number, data: { title?: string; url?: string; group?: string }) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: menu.id });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(menu.title);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState(menu.url || '');
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editedGroup, setEditedGroup] = useState(menu.group || 'quick-access');
  const [editedCustomGroupName, setEditedCustomGroupName] = useState(menu.custom_group_name || '');
  const [availablePages, setAvailablePages] = useState<Array<{ label: string; value: string; type: string }>>([]);
  const [urlInputMode, setUrlInputMode] = useState<'select' | 'manual'>('manual');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== menu.title) {
      onUpdate(menu.id, { title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(menu.title);
    setIsEditingTitle(false);
  };

  useEffect(() => {
    setEditedTitle(menu.title);
    setEditedUrl(menu.url || '');
    setEditedGroup(menu.group || 'quick-access');
    setEditedCustomGroupName(menu.custom_group_name || '');
  }, [menu.title, menu.url, menu.group, menu.custom_group_name]);

  useEffect(() => {
    fetch('/api/v1/admin/content/pages/pages')
      .then(res => res.json())
      .then(data => setAvailablePages(data))
      .catch(err => console.error('Error fetching pages:', err));
  }, []);

  const handleSaveUrl = () => {
    if (editedUrl !== menu.url) {
      onUpdate(menu.id, { url: editedUrl });
    }
    setIsEditingUrl(false);
  };

  const handleCancelUrlEdit = () => {
    setEditedUrl(menu.url || '');
    setIsEditingUrl(false);
  };

  const handleSaveGroup = () => {
    if (editedGroup === 'custom' && !editedCustomGroupName.trim()) {
      alert('برای دسته دلخواه، نام دسته الزامی است');
      return;
    }
    
    const updateData: any = { group: editedGroup };
    if (editedGroup === 'custom') {
      updateData.custom_group_name = editedCustomGroupName.trim();
    } else {
      updateData.custom_group_name = null;
    }
    
    if (editedGroup !== menu.group || (editedGroup === 'custom' && editedCustomGroupName !== menu.custom_group_name)) {
      onUpdate(menu.id, updateData);
    }
    setIsEditingGroup(false);
  };

  const handleCancelGroupEdit = () => {
    setEditedGroup(menu.group || 'quick-access');
    setEditedCustomGroupName(menu.custom_group_name || '');
    setIsEditingGroup(false);
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="!text-gray-900 dark:!text-gray-100">
        <div className="flex items-center gap-2">
          <DragIndicatorOutlinedIcon
            className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            {...attributes}
            {...listeners}
          />
        </div>
      </TableCell>
      <TableCell className="!text-gray-900 dark:!text-gray-100">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTitle();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>{menu.title}</span>
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="ویرایش عنوان"
            >
              <EditOutlinedIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </TableCell>
      <TableCell className="!text-gray-900 dark:!text-gray-100">
        {isEditingUrl ? (
          <div className="flex items-center gap-2">
            <select
              value={urlInputMode}
              onChange={(e) => {
                setUrlInputMode(e.target.value as 'select' | 'manual');
                if (e.target.value === 'manual') {
                  setEditedUrl('');
                }
              }}
              className="h-8 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-gray-700 dark:text-gray-300"
            >
              <option value="select">انتخاب</option>
              <option value="manual">دستی</option>
            </select>
            {urlInputMode === 'select' ? (
              <select
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                className="h-8 flex-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-gray-700 dark:text-gray-300"
              >
                <option value="">انتخاب صفحه...</option>
                {availablePages.map((page) => (
                  <option key={page.value} value={page.value}>
                    {page.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                className="h-8 flex-1 text-xs"
                placeholder="URL"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveUrl();
                  } else if (e.key === 'Escape') {
                    handleCancelUrlEdit();
                  }
                }}
                autoFocus
              />
            )}
            <button
              onClick={handleSaveUrl}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelUrlEdit}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm">{menu.url || '-'}</span>
            <button
              onClick={() => setIsEditingUrl(true)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="ویرایش URL"
            >
              <EditOutlinedIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </TableCell>
      <TableCell className="!text-gray-900 dark:!text-gray-100">
        {isEditingGroup ? (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={editedGroup}
              onChange={(e) => {
                setEditedGroup(e.target.value);
                if (e.target.value !== 'custom') {
                  setEditedCustomGroupName('');
                }
              }}
              className="h-8 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-gray-700 dark:text-gray-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveGroup();
                } else if (e.key === 'Escape') {
                  handleCancelGroupEdit();
                }
              }}
              autoFocus
            >
              <option value="quick-access">دسترسی سریع</option>
              <option value="useful-links">لینک های مفید</option>
              <option value="other">سایر</option>
              <option value="custom">دلخواه</option>
            </select>
            {editedGroup === 'custom' && (
              <Input
                value={editedCustomGroupName}
                onChange={(e) => setEditedCustomGroupName(e.target.value)}
                placeholder="نام دسته دلخواه"
                className="h-8 text-xs flex-1 min-w-[150px]"
              />
            )}
            <button
              onClick={handleSaveGroup}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelGroupEdit}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {menu.group === 'custom' && menu.custom_group_name 
                ? menu.custom_group_name 
                : menu.group === 'quick-access' 
                  ? 'دسترسی سریع'
                  : menu.group === 'useful-links'
                    ? 'لینک های مفید'
                    : menu.group === 'other'
                      ? 'سایر'
                      : menu.group || 'دسترسی سریع'}
            </span>
            <button
              onClick={() => setIsEditingGroup(true)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="ویرایش گروه"
            >
              <EditOutlinedIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </TableCell>
      <TableCell className="!text-gray-900 dark:!text-gray-100">
        <button
          onClick={() => onDelete(menu.id)}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          <DeleteOutlineIcon className="w-5 h-5" />
        </button>
      </TableCell>
    </TableRow>
  );
}

