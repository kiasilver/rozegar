// Blog // Edit Blog

"use client";

import React, { useState, useEffect } from "react";
import Label from "@/components/Admin/form/Label";
import Input from "@/components/Admin/form/input/InputField";
import Textarea from "@/components/Admin/form/input/TextArea";
import Select from "@/components/Admin/form/Select";
import Button from "@/components/Admin/ui/button/Button";
import DragDropFile from "@/components/Admin/form/form-elements/DropZone";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import { useAlert } from "@/context/Admin/AlertContext";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import WordPressEditor from "@/components/Admin/form/richtext/WordPressEditor";
import { z } from "zod";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import SEOPanel from "@/components/Admin/seo/SEOPanel";

const blogSchema = z.object({
  name: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  slug: z.string().optional(),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد"),
  categories: z.array(z.string()).min(1, "حداقل یک دسته‌بندی را انتخاب کنید"),
  image: z.any().optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED"]).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonical_url: z.string().optional(),
  robots: z.string().optional(),
  metaKeywords: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  blogId: z.number(),
  translationId: z.number().optional(),

});

type BlogFormData = z.infer<typeof blogSchema>;

export default function EditBlog() {
  const router = useRouter();
  const [editorKey, setEditorKey] = useState(0);
 
  const { showAlert } = useAlert();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      name: "",
      slug: "",
      blogId: 0,
      translationId:0,
      description: "",
      categories: [],
      image: undefined,
      status: "DRAFT",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonical_url: "",
    },
  });

  const [activeTab, setActiveTab] = useState("محتوا");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Define the Category type
  type Category = {
    id: number;
    name: string;
  };
  
  const [categories, setCategories] = useState<Category[]>([]);
  const params = useParams();
  const id = params?.id;
  useEffect(() => {
    const fetchBlog = async () => {
      const res = await fetch(`/api/admin/blog/${id}/edit`);
      const data = await res.json();
  
    
    
      const faTranslation = Array.isArray(data.translation)
        ? data.translation.find((t: { lang: string; content?: string; id?: number }) => t.lang === "FA")
        : data.translation;
    
        
      setValue("name", faTranslation?.title || "");
      setValue("slug", data.slug || "");
      setValue("description", faTranslation?.content || "");
      setValue("translationId", faTranslation?.id || 0);
      setValue("status", data.status || "DRAFT");
      setValue("categories", data.categories.map((catId: number) => catId.toString()));
      setValue("image", data.image || "");
      setValue("blogId", data.id || 0); // اطمینان از درست بودن مقدار blogId
      setValue("metaTitle", data.seo?.meta_title || "");
      setValue("metaDescription", data.seo?.meta_description || "");
      setValue("metaKeywords", data.seo?.meta_keywords || "");
      setValue("canonical_url", data.seo?.canonical_url || "");
      setValue("robots", data.seo?.robots || "");
    };
  
    if (id) fetchBlog();
  }, [id, setValue]);
  
  
  
  
  

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/admin/blog/category");
      const rawData = await res.json();
      const transformed = rawData.map((cat: { id: number; translations: { lang: string; name: string }[] }) => {
        const faTranslation = cat.translations.find((t: { lang: string; name: string }) => t.lang === "FA");
        return {
          id: cat.id,
          name: faTranslation?.name || "بدون عنوان"
        };
      });
      setCategories(transformed);
    };

    fetchCategories();
  }, []);

  const selectedCategories = watch("categories");
  const nameVal = watch("name") ?? "";
  const descriptionVal = watch("description") ?? "";
  const metaTitleVal = watch("metaTitle") ?? "";
  const metaDescriptionVal = watch("metaDescription") ?? "";
  const metaKeywordsVal = watch("metaKeywords") ?? "";
  const statusVal = watch("status") ?? "DRAFT";
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);

const toggleCategory = (catId: string) => {
  const current = selectedCategories || [];
  const newValue = current.includes(catId)
    ? current.filter((id) => id !== catId) // حذف از انتخاب‌ها
    : [...current, catId]; // اضافه کردن به انتخاب‌ها

  setValue("categories", newValue); // به روزرسانی مقادیر فرم
};

  // حذف شده: کامل کردن title با AI - فقط باید در زمان ساخت انجام شود

  

  const onSubmit = async (data: BlogFormData) => {
    setIsSubmitting(true);

    // slug در API route ساخته می‌شود (با استفاده از تابع مرکزی)
    // اینجا فقط slug سفارشی را ارسال می‌کنیم (اگر داده شده)
    // در غیر این صورت slug خالی ارسال می‌شود و از عنوان ساخته می‌شود

    const blog = {
      ...data,
      slug: data.slug?.trim() || undefined, // فقط slug سفارشی (اگر داده شده)
      categories: data.categories.map((id) => String(id)), // تبدیل به string
    };

    const blogData = { ...data };
    if (!blogData.image) {
      delete blogData.image; // حذف تصویر از داده‌ها اگر خالی باشد
    }
 
    try {
      const res = await fetch(`/api/admin/blog/${id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });

      if (!res.ok) {
        const err = await res.json();
        showAlert("خطا در ثبت تغییرات: " + err.error, "error");
        return;
      }

      showAlert("بلاگ با موفقیت تغییر کرد!", "success");
      router.push("/admin/blog/bloglist");
      setEditorKey((prev) => prev + 1); // ری‌مونت کردن برای پاک کردن محتوا
      
    
    } catch (error) {
      console.error("❌ Error creating blog:", error);
      showAlert("خطای غیرمنتظره هنگام تغییر بلاگ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 ${
        isSubmitting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">ویرایش بلاگ</h3>
        {id && (
          <Button
            type="button"
            onClick={() => {
              const previewUrl = `/news/${watch('slug') || id}?preview=true`;
              window.open(previewUrl, '_blank');
            }}
            className="px-4 py-2 text-sm"
          >
            👁️ پیش‌نمایش
          </Button>
        )}
      </div>

      <div className="mb-4 flex space-x-4">
        {["محتوا", "سئو"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 rounded ${activeTab === tab ? "font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-theme-xs" : "dark:text-gray-400 dark:bg-gray-800"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {activeTab === "محتوا" && (
          <>
            {/* فرم در یک ستون */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div>
              <Label htmlFor="name">عنوان بلاگ</Label>
        
              <Input
              id="name"
              {...register("name")}
              value={watch("name") || ""} // استفاده از watch برای دریافت مقدار
              placeholder="عنوان کامل بلاگ را وارد کنید"
              className="w-full"
              />

              {errors.name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>}
              {nameVal && (nameVal.includes("...") || nameVal.includes("…")) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ عنوان ناقص است. لطفاً عنوان کامل را وارد کنید.
                </p>
              )}
            </div>

            <div>
            <Label>دسته‌بندی</Label>
            <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
            <label key={cat.id} className="flex items-center space-x-2">
            <Checkbox
            label={cat.name}
            checked={selectedCategories.includes(cat.id.toString())} // بررسی تیک بودن
            onChange={() => toggleCategory(cat.id.toString())}
            />
            </label>
            ))}



              </div>
              {errors.categories && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.categories.message}</p>}
            </div>

            <div>
              <Label htmlFor="status">وضعیت انتشار</Label>
              <Select
                value={statusVal}
                options={[
                  { value: "DRAFT", label: "پیش‌نویس" },
                  { value: "PENDING", label: "در انتظار بررسی" },
                  { value: "PUBLISHED", label: "منتشر شده" },
                ]}
                onChange={(val) => setValue("status", val as "DRAFT" | "PENDING" | "PUBLISHED")}
              />
            </div>

            <div>
            <Label htmlFor="image">عکس بلاگ</Label>

              <Controller
              name="image"
              control={control}
              render={({ field }) => (
              <DragDropFile
              onChange={(val) => field.onChange(val)} // زمانی که کاربر تصویر جدیدی آپلود می‌کند
              initialUrl={watch('image')} // برای ریست کردن حالت قبلی در صورت نیاز
              />
              )}
              />
        

            </div>
              

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <div>
                  <Label htmlFor="description">محتوا</Label>
                  
                  <WordPressEditor 
                    value={field.value || ""} 
                    key={editorKey} 
                    onChange={field.onChange}
                    placeholder="محتوا را اینجا بنویسید... می‌توانید تصویر، ویدیو و فرمت‌های مختلف اضافه کنید."
                    title={nameVal}
                    image={watch("image")}
                    categories={categories.filter(cat => selectedCategories.includes(cat.id.toString())).map(cat => cat.name)}
                    author="نویسنده"
                    onTitleChange={(newTitle) => {
                      setValue("name", newTitle);
                    }}
                  />
                  {errors.description && <p className="text-red-500 dark:text-red-400 text-sm mt-1" >{errors.description.message}</p>}
                </div>
              )}
            />
              </div>
            </div>
          </>
        )}

        {activeTab === "سئو" && (
          <>
            {/* SEO Panel و فرم در یک ستون */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center flex-1">
                    <span className="shrink-0 pe-4 text-gray-800 dark:text-white/90 font-medium">Basic SEO</span>
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                  </span>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!nameVal || !descriptionVal) {
                        showAlert("لطفاً ابتدا عنوان و محتوا را وارد کنید", "error");
                        return;
                      }
                      
                      setIsGeneratingSEO(true);
                      try {
                        const response = await fetch("/api/admin/blog/generate-seo", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: nameVal,
                            content: descriptionVal.replace(/<[^>]*>/g, " ").substring(0, 2000), // حذف HTML و محدود کردن طول
                            keywords: metaKeywordsVal ? metaKeywordsVal.split(",").map((k: string) => k.trim()) : [],
                            useAI: true,
                            aiProvider: "cursor", // اولویت با Cursor
                            useAgentAnalysis: true, // استفاده از AI Agent برای تحلیل دقیق
                            language: "fa",
                          }),
                        });

                        if (!response.ok) {
                          throw new Error("خطا در تولید SEO");
                        }

                        const seoResult = await response.json();
                        
                        // پر کردن فیلدهای SEO
                        setValue("metaTitle", seoResult.meta_title || "");
                        setValue("metaDescription", seoResult.meta_description || "");
                        setValue("metaKeywords", seoResult.meta_keywords || "");
                        setValue("og_title", seoResult.meta_title || "");
                        setValue("og_description", seoResult.meta_description || "");
                        setValue("twitter_title", seoResult.meta_title || "");
                        setValue("twitter_description", seoResult.meta_description || "");
                        
                        showAlert("✅ SEO با موفقیت با AI Agent تولید شد!", "success");
                      } catch (error) {
                        console.error("❌ خطا در تولید SEO:", error);
                        showAlert(
                          error instanceof Error ? error.message : "خطا در تولید SEO",
                          "error"
                        );
                      } finally {
                        setIsGeneratingSEO(false);
                      }
                    }}
                    disabled={isGeneratingSEO || !nameVal || !descriptionVal}
                    className="ml-4"
                  >
                    {isGeneratingSEO ? "⏳ در حال تولید..." : "🤖 تولید خودکار SEO با AI"}
                  </Button>
                </div>

              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                {...register("metaTitle")}
                placeholder="عنوان متا را وارد نمایید"
              />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                {...register("metaDescription")}
                placeholder="توضیحات متا را وارد نمایید"
              />
            </div>
            <div>
              <Label htmlFor="metaKeywords">Meta Keywords</Label>
              <Input
                id="metaKeywords"
                {...register("metaKeywords")}
                placeholder="کلمات کلیدی متا را وارد کنید"
              />
            </div>
            <div>
              <Label htmlFor="canonical_url">Canonical Url</Label>
              <Input
                id="canonical_url"
                {...register("canonical_url")}
                placeholder="آدرس کاننیکال را وارد کنید"
              />
            </div>
            <div>
              <Label htmlFor="robots">Robots</Label>
              <Select
                defaultValue="index"
                options={[
                  { value: "index, follow", label: "نمایش در نتایج جستجو (SEO)" },
                  { value: "noindex, nofollow", label: "عدم نمایش در نتایج جستجو (SEO)" },
                ]}
                onChange={(value) => setValue("robots", value)}
              />
            </div>
              
            {/* SEO Panel Sidebar */}
            <div>
              <SEOPanel
                title={nameVal || metaTitleVal}
                description={metaDescriptionVal}
                content={descriptionVal}
                keywords={metaKeywordsVal ? metaKeywordsVal.split(",").map((k) => k.trim()) : []}
              />
            </div>
            </div>
          </>
        )}
        
        {/* دکمه ثبت در پایین فرم (خارج از تب‌ها) */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت..." : "ثبت تغییرات"}
          </Button>
        </div>
      </form>
    </div>
  );
}
