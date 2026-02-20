// BlogList.tsx

"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/Admin/ui/table";
import { useEffect, useState } from "react";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import React from "react";
import Select from "@/components/Admin/form/Select";
import Label from "@/components/Admin/form/Label";
import Image from "next/image";
import { useAlert } from "@/context/Admin/AlertContext";
import Dialog from "@/components/Admin/dialog/error/modal1"; // ایمپورت مودال حذف
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
interface Blog {
  id: number;
  image: string;
  name: string;
  category: string;
  slug: string;
  fullSlug?: string; // slug کامل برای استفاده در لینک
  count: string;
  authorName?: string | null;
  isAgent?: boolean; // آیا نویسنده Agent است (kia bayar)
  seoScore?: number; // SEO score (0-100)
}

const options = [
  { value: "Delete", label: "پاک کردن" },
];

export default function BlogList() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // وضعیت مودال
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null); // آیدی بلاگ انتخاب شده
  const [agentFilter, setAgentFilter] = useState<'all' | 'agent' | 'human'>('all'); // فیلتر Agent

  useEffect(() => {
    fetch("/api/v1/admin/content/blogs/blogList")
      .then((res) => {
        if (!res.ok) {
          console.error("❌ خطا در دریافت بلاگ‌ها:", res.status, res.statusText);
          return [];
        }
        return res.json();
      })
      .then((data) => {
        // بررسی اینکه data یک آرایه است یا خیر
        if (!Array.isArray(data)) {
          console.error("❌ خطا در دریافت بلاگ‌ها - data یک آرایه نیست:", data);
          setBlogs([]);
          return;
        }
        
        const transformed = data.map((blog: { 
          id: number; 
          image: string; 
          translations?: { title?: string; slug?: string }[]; 
          blogcategory?: { id?: number; translations?: { name?: string; slug?: string }[] }[]; 
          count?: number;
          User?: { name?: string; email?: string } | null;
          seoScore?: number;
        }) => {
          const title = blog.translations?.[0]?.title ?? "بدون عنوان";
          
          // استخراج categories - بررسی ساختار مختلف
          let categories: string[] = [];
          if (blog.blogcategory && Array.isArray(blog.blogcategory) && blog.blogcategory.length > 0) {
            // Debug log برای بررسی ساختار
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 [BlogList] Blog ${blog.id} blogcategory structure:`, JSON.stringify(blog.blogcategory, null, 2));
            }
            
            categories = blog.blogcategory
              .map(category => {
                // بررسی ساختار: category.translations[0].name
                if (category.translations && Array.isArray(category.translations) && category.translations.length > 0) {
                  const name = category.translations[0]?.name;
                  if (name) {
                    return name;
                  }
                }
                // اگر translations وجود ندارد، بررسی کن که آیا category خودش name دارد
                if ((category as any).name) {
                  return (category as any).name;
                }
                return null;
              })
              .filter((name): name is string => Boolean(name));
          }
          
          const categorySlugs = blog.blogcategory?.map(category => {
            if (category.translations && Array.isArray(category.translations) && category.translations.length > 0) {
              return category.translations[0]?.slug;
            }
            // اگر translations وجود ندارد، بررسی کن که آیا category خودش slug دارد
            if ((category as any).slug) {
              return (category as any).slug;
            }
            return null;
          }).filter((slug): slug is string => Boolean(slug)) ?? [];
          
          const firstCategorySlug = categorySlugs[0] || "";
          
          // Debug log
          if (categories.length === 0 && blog.blogcategory && blog.blogcategory.length > 0) {
            console.warn(`⚠️ [BlogList] Blog ${blog.id}: categories structure:`, JSON.stringify(blog.blogcategory, null, 2));
            console.warn(`⚠️ [BlogList] Blog ${blog.id}: categories array is empty but blogcategory exists`);
          }
          
          // تولید slug کوتاه: فقط دسته‌بندی + عنوان (حداکثر 50 کاراکتر)
          const shortSlug = firstCategorySlug 
            ? `${firstCategorySlug}-${title.substring(0, 30).replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-")}`
            : title.substring(0, 50).replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-");
          
          // بررسی اینکه آیا نویسنده "kia bayar" است
          const authorName = blog.User?.name || null;
          const isAgent = authorName?.toLowerCase().includes('kia') && authorName?.toLowerCase().includes('bayar');
          
          return {
            id: blog.id,
            image: blog.image,
            name: title,
            category: categories.length > 0 ? categories.join(", ") : "بدون دسته‌بندی", 
            slug: shortSlug,
            fullSlug: blog.translations?.[0]?.slug ?? "slug", // نگه داشتن slug کامل برای استفاده در لینک
            count: blog.count?.toString() ?? "0",
            authorName: authorName,
            isAgent: isAgent || false,
            seoScore: blog.seoScore || 0,
          };
        });

        setBlogs(transformed);
        setFilteredBlogs(transformed);
      })
      .catch((error) => {
        console.error("❌ خطا در دریافت بلاگ‌ها:", error);
        setBlogs([]);
      });
  }, []);

  const handleBulkDelete = async () => {
    const selectedIds = Object.entries(checkedItems)
      .filter(([ isChecked]) => isChecked)
      .map(([id]) => parseInt(id)); // Get selected blog IDs
    
    if (selectedIds.length === 0) {
      showAlert("هیچ بلاگی انتخاب نشده است.", "error");
      return;
    }
  
    try {
      const res = await fetch("/api/v1/admin/content/blogs/bulkDelete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
  
      const result = await res.json();
      if (result.success) {
        setBlogs((prev) => prev.filter((blog) => !selectedIds.includes(blog.id)));
        setFilteredBlogs((prev) => prev.filter((blog) => !selectedIds.includes(blog.id)));
        setCheckedItems((prev) => {
          const newChecked = { ...prev };
          selectedIds.forEach((id) => {
            delete newChecked[id];
          });
          return newChecked;
        });
      } else {
        console.error("Bulk delete failed:", result.error);
      }
    } catch (err) {
      console.error("Error during bulk delete:", err);
    }
  
    setIsModalOpen(false); // Close the modal after deletion
  };
  

const handleDelete = (id: number) => {
  setSelectedBlogId(id); // تنظیم آیدی بلاگ
  setIsModalOpen(true); // نمایش مودال
};


  const handleConfirmDelete = async () => {
    if (selectedBlogId === null) return;
  
    try {
      const res = await fetch(`/api/v1/admin/content/blogs/${selectedBlogId}`, {
        method: 'DELETE',
      });
  
      if (!res.ok) {
        console.error('Server responded with error:', res.status);
        return;
      }
  
      const text = await res.text();
  
      if (!text) {
        console.error('Empty response from server');
        return;
      }
  
      const result = JSON.parse(text);
  
      if (result.success) {
        setBlogs((prev) => prev.filter((blog) => blog.id !== selectedBlogId));
        setFilteredBlogs((prev) => prev.filter((blog) => blog.id !== selectedBlogId));
        setCheckedItems((prev) => {
          const newChecked = { ...prev };
          delete newChecked[selectedBlogId];
          return newChecked;
        });
      } else {
        console.error('Delete failed', result.error);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  
    setIsModalOpen(false); // بستن مودال پس از حذف
  };
  
  

  const handleCancelDelete = () => {
    setIsModalOpen(false); // بستن مودال در صورت لغو
  };

  const handleCheckboxChange = (id: number, value: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSelectAll = () => {
    const allSelected =
      Object.keys(checkedItems).length === filteredBlogs.length &&
      Object.values(checkedItems).every((value) => value === true);

    const newChecked = filteredBlogs.reduce((acc, blog) => {
      acc[blog.id] = !allSelected;
      return acc;
    }, {} as { [key: number]: boolean });

    setCheckedItems(newChecked);
  };

  const [selectedAction, setSelectedAction] = useState<string>("");

  const handleSelectChange = (value: string) => {
    console.log('Selected Action:', value); // برای بررسی مقدار انتخاب‌شده
    setSelectedAction(value);
  };
  
  // فیلتر بر اساس Agent
  useEffect(() => {
    let filtered = [...blogs];
    
    if (agentFilter === 'agent') {
      filtered = filtered.filter(blog => blog.isAgent);
    } else if (agentFilter === 'human') {
      filtered = filtered.filter(blog => !blog.isAgent);
    }
    
    setFilteredBlogs(filtered);
  }, [agentFilter, blogs]);
  
  // تابع برای ساخت URL بلاگ
  const getBlogUrl = (blog: Blog): string => {
    if (blog.fullSlug && blog.fullSlug !== 'slug') {
      // استفاده از slug کامل
      return `/اخبار/${blog.fullSlug}`;
    }
    // اگر slug کامل نداریم، از slug کوتاه استفاده کن
    return `/اخبار/${blog.slug}`;
  };
  
  const handleActionExecute = () => {
    if (selectedAction === "Delete") {
      const selectedIds = Object.entries(checkedItems)
        .filter(([ , isChecked]) => isChecked)
        .map(([id]) => parseInt(id));
  
      if (selectedIds.length === 0) {
        showAlert("هیچ بلاگی انتخاب نشده است.", "error");
      } else {
        setIsModalOpen(true); // Show the confirmation modal
      }
    } else {
      if (!selectedAction) {
        showAlert("لطفاً یک عملیات را انتخاب کنید.", "error");
      } else {
        console.error("عملیات انتخاب‌شده معتبر نیست.");
      }
    }
  };
  
  
  
  

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <PageBreadcrumb pageTitle="لیست بلاگ‌ها" />
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white px-2 pb-2 pt-3 dark:border-gray-800 dark:bg-white/[0.03] sm:px-3 sm:pb-2.5 sm:pt-3.5 md:px-4 md:pb-3 md:pt-4 lg:px-6">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white/90">
              لیست بلاگ‌ها
            </h3>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              ({filteredBlogs.length} از {blogs.length} بلاگ)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* فیلتر Agent */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Label className="mb-0 min-w-[100px] sm:min-w-[120px]">
                <Select
                  options={[
                    { value: 'all', label: 'همه' },
                    { value: 'agent', label: 'Agent Pro 3+' },
                    { value: 'human', label: 'انسان' },
                  ]}
                  placeholder="فیلتر نویسنده"
                  onChange={(value) => setAgentFilter(value as 'all' | 'agent' | 'human')}
                  className="dark:bg-dark-900"
                />
              </Label>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {Object.values(checkedItems).filter(Boolean).length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                انتخاب شده
              </span>
            </div>

            <button
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSelectAll}
              disabled={blogs.length === 0}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">انتخاب همه</span>
              <span className="sm:hidden">همه</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Label className="mb-0 min-w-[110px] sm:min-w-[140px]">
                <Select
                  options={options}
                  placeholder="انتخاب عملیات"
                  onChange={handleSelectChange}
                  className="dark:bg-dark-900"
                />
              </Label>
              <button
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-600 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-xs sm:text-theme-sm font-medium text-white shadow-theme-xs hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleActionExecute}
                disabled={!selectedAction || Object.values(checkedItems).filter(Boolean).length === 0}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="hidden sm:inline">انجام عملیات</span>
                <span className="sm:hidden">اجرا</span>
              </button>
            </div>
            
            <Dialog
              isOpen={isModalOpen}
              onClose={handleCancelDelete}
              onConfirm={selectedBlogId ? handleConfirmDelete : handleBulkDelete}
            />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto -mx-2 sm:-mx-3 md:-mx-4 lg:-mx-6">
        <div className="inline-block min-w-full align-middle px-2 sm:px-3 md:px-4 lg:px-6">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400">
                  نام
                </TableCell>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400 hidden md:table-cell">
                  دسته بندی
                </TableCell>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400 hidden lg:table-cell">
                  نویسنده
                </TableCell>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400 hidden sm:table-cell">
                  SEO Score
                </TableCell>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400 hidden xl:table-cell">
                  مسیر
                </TableCell>
                <TableCell className="py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-xs md:text-theme-xs font-medium text-gray-500 text-start dark:text-gray-400">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800 overflow-x-hidden">
              <AnimatePresence>
                {filteredBlogs.map((blog) => (
                  <motion.tr
                    key={blog.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 100 }} // رفتن به راست
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                    className="transition-all overflow-x-hidden"
                  >
                    <TableCell className="py-2 sm:py-2.5 md:py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Checkbox
                          checked={checkedItems[blog.id] || false}
                          onChange={(val) => handleCheckboxChange(blog.id, val)}
                        />
                        <div className="h-[40px] w-[40px] sm:h-[45px] sm:w-[45px] md:h-[50px] md:w-[50px] overflow-hidden rounded-md cursor-pointer flex-shrink-0" onClick={() => window.open(getBlogUrl(blog), '_blank')}>
                          {blog.image && blog.image.trim() !== '' ? (
                            <Image
                              width={50}
                              height={50}
                              src={blog.image}
                              className="h-full w-full object-cover"
                              alt={blog.name}
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-400 dark:text-gray-500 text-xs">بدون عکس</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={getBlogUrl(blog)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-800 dark:text-gray-200 text-xs sm:text-theme-sm font-medium truncate hover:text-blue-600 dark:hover:text-blue-400 block"
                            title={blog.name}
                          >
                            {blog.name}
                          </a>
                          {blog.name.length > 50 && (
                            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {blog.name.substring(0, 50)}...
                            </p>
                          )}
                          {/* نمایش دسته‌بندی در موبایل */}
                          <div className="md:hidden mt-1 flex flex-wrap gap-1">
                            {blog.category !== "بدون دسته‌بندی" ? (
                              blog.category.split(", ").slice(0, 1).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                >
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                                بدون دسته
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-2.5 md:py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {blog.category !== "بدون دسته‌بندی" ? (
                          blog.category.split(", ").map((cat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md bg-blue-50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                            بدون دسته‌بندی
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-2.5 md:py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {blog.isAgent ? (
                          <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-purple-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="hidden xl:inline">Agent Pro 3+</span>
                            <span className="xl:hidden">Agent</span>
                          </span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-theme-sm truncate max-w-[100px] xl:max-w-none">
                            {blog.authorName || 'ناشناس'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-2.5 md:py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            (blog.seoScore || 0) >= 80 ? 'bg-green-500' :
                            (blog.seoScore || 0) >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className={`text-xs sm:text-theme-sm font-medium ${
                            (blog.seoScore || 0) >= 80 ? 'text-green-700 dark:text-green-400' :
                            (blog.seoScore || 0) >= 60 ? 'text-yellow-700 dark:text-yellow-400' :
                            'text-red-700 dark:text-red-400'
                          }`}>
                            {blog.seoScore || 0}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-2.5 md:py-3 hidden xl:table-cell">
                      <div className="max-w-[150px] lg:max-w-[200px]">
                        <a
                          href={getBlogUrl(blog)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs sm:text-theme-sm truncate block underline"
                          title={blog.fullSlug || blog.slug}
                        >
                          {blog.slug}
                        </a>
                        {blog.fullSlug && blog.fullSlug !== blog.slug && (
                          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1 truncate" title={blog.fullSlug}>
                            {blog.fullSlug.length > 40 ? `${blog.fullSlug.substring(0, 40)}...` : blog.fullSlug}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 sm:py-2.5 md:py-3">
                      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                        <button
                          onClick={() => router.push(`/admin/blog/${blog.id}/edit`)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-green-50 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                          title="ویرایش بلاگ"
                        >
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden sm:inline">ویرایش</span>
                        </button>
                        <button
                          onClick={() => handleDelete(blog.id)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-red-50 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          title="حذف بلاگ"
                        >
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline">حذف</span>
                        </button>
                      </div>
                    </TableCell>
                </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
        </div>
      </div>
    </div>
  );
}
