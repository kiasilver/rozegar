"use client";
import {
  Table, TableBody, TableCell, TableHeader, TableRow
} from "@/components/Admin/ui/table";

import Checkbox from "@/components/Admin/form/input/Checkbox";

import CategoryForm from "@/components/Admin/blog/AddCategoryForm";
import DehazeOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "slugify";
import { slugifyPersian } from "@/lib/utils/slugify-fa";
import { isPersian } from "@/lib/utils/isPersian";
import { useAlert } from "@/context/Admin/AlertContext";
import { DndContext, closestCenter } from '@dnd-kit/core';
import {  SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from "@dnd-kit/core";

const CategorySchema = z.object({
  name: z.string().min(1, "نام دسته بندی الزامی است"),
  parent_id: z.string().optional(),
  slug: z.string().optional()
});

type CategoryFormData = {
  name: string;
  parent_id?: string;
  slug?: string;
};

interface BlogCategory {
  id: number;
  translations: {
    name: string;
    slug: string;
    lang: string;
  }[]; 
  children: BlogCategory[];
}

function flattenCategories(categories: BlogCategory[], depth = 0): (BlogCategory & { depth: number })[] {
  return categories.flatMap(cat => {
    return [
      { ...cat, depth },
      ...flattenCategories(cat.children || [], depth + 1)
    ];
  });
}

function SortableRow({
  category,
  depth,
  onDelete,
  isSelected,
  onToggleSelect,
  onUpdate
}: {
  category: BlogCategory & { depth: number };
  depth: number;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onUpdate: (id: number, name: string, slug: string) => Promise<void>;
}) {
  const faTranslation = Array.isArray(category.translations)
    ? category.translations.find(t => t.lang === "FA")
    : null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [editedName, setEditedName] = useState(faTranslation?.name || "");
  const [editedSlug, setEditedSlug] = useState(faTranslation?.slug || "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== faTranslation?.name) {
      await onUpdate(category.id, editedName, faTranslation?.slug || "");
    }
    setIsEditingName(false);
  };

  const handleSlugSave = async () => {
    if (editedSlug.trim() && editedSlug !== faTranslation?.slug) {
      await onUpdate(category.id, faTranslation?.name || "", editedSlug);
    }
    setIsEditingSlug(false);
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        ...style,
        padding: depth > 0 ? "8px" : "0px",
      }}
      {...attributes}
      className={`outline-0 rounded transition-all duration-50 ease-in-out ${isDragging
        ? "border-1 border-gray-800 bg-gray-50 dark:bg-[#182236] outline-0"
        : "border border-gray-100 dark:border-gray-800"
      }`}
    >
      {/* Checkbox */}
      <TableCell className="px-2 sm:px-4 outline-0">
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={isSelected} 
            onChange={() => onToggleSelect(category.id)} 
          />
        </div>
      </TableCell>
      
      {/* نام */}
      <TableCell className="px-2 sm:px-4">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setEditedName(faTranslation?.name || "");
                  setIsEditingName(false);
                }
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        ) : (
          <div
            onClick={() => setIsEditingName(true)}
            className="text-gray-800 dark:text-white/90 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors"
            title="برای ویرایش کلیک کنید"
          >
            {faTranslation?.name ?? "بدون عنوان"}
          </div>
        )}
      </TableCell>
      
      {/* مسیر */}
      <TableCell className="px-2 sm:px-4">
        {isEditingSlug ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedSlug}
              onChange={(e) => setEditedSlug(e.target.value)}
              onBlur={handleSlugSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSlugSave();
                if (e.key === "Escape") {
                  setEditedSlug(faTranslation?.slug || "");
                  setIsEditingSlug(false);
                }
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        ) : (
          <div
            onClick={() => setIsEditingSlug(true)}
            className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors"
            title="برای ویرایش کلیک کنید"
          >
            {faTranslation?.slug ?? "-"}
          </div>
        )}
      </TableCell>
      
      {/* تعداد فرزند */}
      <TableCell className="px-2 sm:px-4 text-gray-500 dark:text-gray-400 text-center">
        {category.children?.length || 0}
      </TableCell>
      
      {/* عملیات */}
      <TableCell className="px-2 sm:px-4">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onDelete(category.id)}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
          >
            حذف
          </button>
        </div>
      </TableCell>
      
      {/* مرتب سازی */}
      <TableCell className="px-2 sm:px-4 outline-0">
        <div className="flex items-center gap-2">
          <DehazeOutlinedIcon 
            className="cursor-move text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" 
            {...listeners}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function GetCategories() {
  const { showAlert } = useAlert();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [sortedCategories, setSortedCategories] = useState<(BlogCategory & { depth: number })[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State for loading

  const {reset} = useForm<CategoryFormData>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: "",
      parent_id: "",
      slug: "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    fetchBlogCategories().finally(() => {
      if (!isMounted) return;
      // set state
    });
    return () => {
      isMounted = false;
    };
  }, []);
  

  async function fetchBlogCategories() {
    try {
      const response = await fetch("/api/v1/admin/content/blogs/category");
      const data: BlogCategory[] = await response.json();

      const uniqueCategories = Array.from(
        new Map(data.map(cat => [cat.id, cat])).values()
      );

      const flat = flattenCategories(uniqueCategories);

      const dedupedFlat = flat.filter((cat, idx, arr) =>
        arr.findIndex(c => c.id === cat.id) === idx
      );

      setCategories(uniqueCategories);
      setSortedCategories(dedupedFlat);
    } catch (error) {
      showAlert("خطا در گرفتن دسته بندی ها: " + error, "error");
    }
  }

  async function onSubmit(data: CategoryFormData) {
    setIsSubmitting(true);

    const baseText = data.slug?.trim() || data.name;
    const finalSlug = isPersian(baseText)
      ? slugifyPersian(baseText)
      : slugify(baseText, { lower: true, strict: true });

    const category = {
      name: data.name,
      slug: finalSlug,
      parent_id: data.parent_id && data.parent_id.trim() ? Number(data.parent_id) : null,
      lang: "FA",
    };

    try {
      const res = await fetch("/api/v1/admin/content/blogs/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "مشکلی در ثبت دسته بندی پیش آمد");
      }

      reset();
      await fetchBlogCategories();
      showAlert("دسته بندی با موفقیت ثبت شد", "success");
    } catch (error: any) {
      console.error("Error creating category:", error);
      showAlert("مشکل در ثبت دسته بندی: " + (error.message || error), "error");
    } finally {
      setIsSubmitting(false);
    }
  }


  function getDescendants(list: (BlogCategory & { depth: number })[], parentIndex: number) {
    const descendants = [];
    const parentDepth = list[parentIndex].depth;
    let i = parentIndex + 1;
    while (i < list.length && list[i].depth > parentDepth) {
      descendants.push(list[i]);
      i++;
    }
    return descendants;
  }
  
  
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  
    const oldIndex = sortedCategories.findIndex(c => c.id === active.id);
    const newIndex = sortedCategories.findIndex(c => c.id === over.id);
  
    if (oldIndex === -1 || newIndex === -1) return;
  
    const draggedItem = sortedCategories[oldIndex];
    
    // فقط برای دسته‌های اصلی (depth === 0) اجازه drag & drop بده
    if (draggedItem.depth !== 0) {
      showAlert('فقط دسته‌های اصلی قابل مرتب‌سازی هستند', 'warning');
      return;
    }
  
    const children = getDescendants(sortedCategories, oldIndex);
    const itemsToMove = [draggedItem, ...children];
    const itemsWithoutDragged = sortedCategories.filter(
      (item, idx) => idx < oldIndex || idx > oldIndex + children.length
    );
  
    let insertAt = newIndex;
    // Adjust target index if we removed items from above
    if (newIndex > oldIndex) {
      insertAt = newIndex - itemsToMove.length + 1;
    }
  
    const newList = [
      ...itemsWithoutDragged.slice(0, insertAt),
      ...itemsToMove,
      ...itemsWithoutDragged.slice(insertAt),
    ];
  
    // Update UI immediately
    setSortedCategories(newList);
  
    // محاسبه‌ی والد جدید (برای دسته‌های اصلی همیشه null است)
    const newParentId = null;
    const oldParentId = null;
  
    setIsLoading(true);
    try {
      // به‌روزرسانی order برای همه دسته‌های اصلی بر اساس موقعیت جدیدشان
      const mainCategories = newList.filter(c => c.depth === 0);
      
      // Update all main categories' order in parallel
      const updatePromises = mainCategories.map((cat, idx) => 
        fetch('/api/v1/admin/content/blogs/category', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cat.id, order: idx }),
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Failed to update category ${cat.id}`);
          }
          return res.json();
        })
      );
      
      await Promise.all(updatePromises);
      
      showAlert('دسته‌بندی با موفقیت مرتب شد', 'success');
      
      // Refresh categories after a short delay to ensure DB is updated
      setTimeout(() => {
        fetchBlogCategories();
      }, 300);
    } catch (error) {
      console.error('Error updating category order:', error);
      showAlert('مشکل در ذخیره‌سازی تغییرات: ' + (error instanceof Error ? error.message : String(error)), 'error');
      // Revert UI on error
      fetchBlogCategories();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    if (!confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟ این عمل غیرقابل بازگشت است.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/content/blogs/category/${categoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "خطا در حذف دسته‌بندی");
      }

      showAlert("دسته‌بندی با موفقیت حذف شد", "success");
      fetchBlogCategories();
    } catch (error) {
      showAlert("مشکل در حذف دسته‌بندی: " + (error instanceof Error ? error.message : error), "error");
    }
  }

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const handleToggleSelect = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === sortedCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(sortedCategories.map(cat => cat.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) {
      showAlert("لطفاً حداقل یک دسته‌بندی را انتخاب کنید", "error");
      return;
    }

    if (!confirm(`آیا از حذف ${selectedCategories.length} دسته‌بندی انتخاب شده اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
      return;
    }

    try {
      const deletePromises = selectedCategories.map(id => 
        fetch(`/api/v1/admin/content/blogs/category/${id}`, { method: "DELETE" })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      
      if (failed.length > 0) {
        showAlert(`خطا در حذف ${failed.length} دسته‌بندی`, "error");
      } else {
        showAlert(`${selectedCategories.length} دسته‌بندی با موفقیت حذف شدند`, "success");
      }
      
      setSelectedCategories([]);
      fetchBlogCategories();
    } catch (error) {
      showAlert("مشکل در حذف دسته‌بندی‌ها: " + error, "error");
    }
  };

  const handleUpdateCategory = async (id: number, name: string, slug: string) => {
    try {
      const res = await fetch(`/api/v1/admin/content/blogs/category/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "خطا در به‌روزرسانی دسته‌بندی");
      }

      showAlert("دسته‌بندی با موفقیت به‌روزرسانی شد", "success");
      fetchBlogCategories();
    } catch (error) {
      showAlert("مشکل در به‌روزرسانی دسته‌بندی: " + (error instanceof Error ? error.message : error), "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Categories Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 sm:px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">دسته بندی ها</h3>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {selectedCategories.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap"
              >
                حذف انتخاب شده‌ها ({selectedCategories.length})
              </button>
            )}
            <button
              onClick={handleSelectAll}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              {selectedCategories.length === sortedCategories.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
            </button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-center text-xs sm:text-sm dark:text-gray-400">
                      <Checkbox 
                        checked={selectedCategories.length === sortedCategories.length && sortedCategories.length > 0}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-start text-xs sm:text-sm dark:text-gray-400 whitespace-nowrap">نام</TableCell>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-start text-xs sm:text-sm dark:text-gray-400 whitespace-nowrap">مسیر</TableCell>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-center text-xs sm:text-sm dark:text-gray-400 whitespace-nowrap">تعداد فرزند</TableCell>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-start text-xs sm:text-sm dark:text-gray-400 whitespace-nowrap">عملیات</TableCell>
                    <TableCell isHeader className="py-3 px-2 sm:px-4 font-medium text-gray-500 text-start text-xs sm:text-sm dark:text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">مرتب سازی</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">(بکشید)</span>
                        <span className="sm:hidden">مرتب</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category, index) => (
                    <SortableRow
                      key={`${category.id}-${category.depth}-${index}`}
                      category={category}
                      depth={category.depth}
                      onDelete={handleDeleteCategory}
                      isSelected={selectedCategories.includes(category.id)}
                      onToggleSelect={handleToggleSelect}
                      onUpdate={handleUpdateCategory}
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Add Category Form */}
      <CategoryForm categories={categories} isSubmitting={isSubmitting} onSubmit={onSubmit} />

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-lg">
            <span className="text-gray-800 dark:text-white font-medium">لطفاً صبر کنید...</span>
          </div>
        </div>
      )}
    </div>
  );
}
