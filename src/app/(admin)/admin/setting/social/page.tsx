"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from "@/components/Admin/common/ComponentCard";
import Input from "@/components/Admin/form/input/InputField";
import Label from "@/components/Admin/form/Label";
import Button from "@/components/Admin/ui/button/Button";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import { useAlert } from "@/context/Admin/AlertContext";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { getSocialIcon } from "@/lib/social-icons";

interface SocialMediaLink {
  id: number;
  platform: string;
  url: string;
  icon?: string | null;
  order: number;
  is_active: boolean;
}

const platformOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter / X" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "pinterest", label: "Pinterest" },
  { value: "rss", label: "RSS" },
];

// Sortable Item Component
function SortableSocialLink({ 
  link, 
  onEdit, 
  onDelete 
}: { 
  link: SocialMediaLink; 
  onEdit: (link: SocialMediaLink) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getSocialIcon(link.platform);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <DragIndicatorOutlinedIcon />
        </div>
        <div className="flex items-center gap-2">
          <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900 dark:text-white">
                {link.platform.startsWith('#') ? link.platform : platformOptions.find((p) => p.value === link.platform)?.label || link.platform}
              </span>
              {!link.is_active && (
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                  غیرفعال
                </span>
              )}
            </div>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block truncate"
            >
              {link.url}
            </a>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(link)}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          aria-label="ویرایش"
        >
          <EditOutlinedIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          aria-label="حذف"
        >
          <DeleteOutlineIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function SocialMediaPage() {
  const { showAlert } = useAlert();
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    platform: "",
    url: "",
    is_active: true,
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/content/social");
      if (!res.ok) throw new Error("خطا در دریافت لینک‌ها");
      const data = await res.json();
      setLinks(data);
    } catch (error) {
      console.error(error);
      showAlert("خطا در دریافت لینک‌ها", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.platform || !formData.url) {
      showAlert("لطفاً تمام فیلدهای الزامی را پر کنید", "error");
      return;
    }

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/v1/admin/content/social/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("خطا در به‌روزرسانی");
        showAlert("لینک با موفقیت به‌روزرسانی شد", "success");
      } else {
        // Create
        const res = await fetch("/api/v1/admin/content/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("خطا در ایجاد");
        showAlert("لینک با موفقیت اضافه شد", "success");
      }
      
      resetForm();
      fetchLinks();
    } catch (error) {
      console.error(error);
      showAlert("خطا در ذخیره‌سازی", "error");
    }
  };

  const handleEdit = (link: SocialMediaLink) => {
    setFormData({
      platform: link.platform,
      url: link.url,
      is_active: link.is_active,
    });
    setEditingId(link.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این لینک اطمینان دارید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/content/social/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("خطا در حذف");
      showAlert("لینک با موفقیت حذف شد", "success");
      fetchLinks();
    } catch (error) {
      console.error(error);
      showAlert("خطا در حذف", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      platform: "",
      url: "",
      is_active: true,
    });
    setEditingId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newLinks = [...links];
    const [movedLink] = newLinks.splice(oldIndex, 1);
    newLinks.splice(newIndex, 0, movedLink);

    // Update order based on new position
    const updatedLinks = newLinks.map((link, index) => ({
      ...link,
      order: index,
    }));

    setLinks(updatedLinks);

    try {
      const res = await fetch("/api/v1/admin/content/social/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: updatedLinks.map((link) => ({
            id: link.id,
            order: link.order,
          })),
        }),
      });
      if (!res.ok) throw new Error("خطا در به‌روزرسانی ترتیب");
      showAlert("ترتیب با موفقیت به‌روزرسانی شد", "success");
    } catch (error) {
      console.error(error);
      showAlert("خطا در به‌روزرسانی ترتیب", "error");
      fetchLinks(); // Revert on error
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
      <PageBreadcrumb pageTitle="مدیریت شبکه‌های اجتماعی" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <ComponentCard title={editingId ? "ویرایش لینک" : "افزودن لینک جدید"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>
                پلتفرم <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="مثلاً: facebook یا #hashtag"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                می‌توانید از لیست انتخاب کنید یا با # یک پلتفرم سفارشی بسازید
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {platformOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: option.value })}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-white"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>
                لینک (URL) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>


            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>فعال</Label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {editingId ? "به‌روزرسانی" : "افزودن"}
              </Button>
              {editingId && (
                <Button type="button" onClick={resetForm} variant="outline">
                  لغو
                </Button>
              )}
            </div>
          </form>
        </ComponentCard>

        {/* List */}
        <ComponentCard title="لینک‌های موجود">
          {links.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-300 py-8">
              هیچ لینکی ثبت نشده است
            </div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {links.map((link) => (
                    <SortableSocialLink
                      key={link.id}
                      link={link}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}

