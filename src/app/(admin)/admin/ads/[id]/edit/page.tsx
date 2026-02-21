"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Input from "@/components/admin/form/input/inputfield";
import Label from "@/components/admin/form/label";
import Select from "@/components/admin/form/select";
import TextArea from "@/components/admin/form/input/textarea";
import Checkbox from "@/components/admin/form/input/checkbox";
import AdPreview from "@/components/admin/ads/adpreview";
import ImageUploadCrop from "@/components/admin/ads/imageuploadcrop";
import HTMLEditor from "@/components/admin/ads/htmleditor";
import {
  getAdTemplate,
  getSizeSuggestions,
  getBestSuggestion,
  isSuggestedSize,
} from "@/lib/ad-templates";

interface Ad {
  id: number;
  title?: string | null;
  position: string;
  type: "IMAGE" | "GIF" | "HTML" | "SCRIPT";
  image_url?: string | null;
  html_content?: string | null;
  script_code?: string | null;
  link_url?: string | null;
  target?: string | null;
  width?: number | null;
  height?: number | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  priority: number;
}

export default function EditAdPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    position: "SIDEBAR_TOP",
    type: "IMAGE" as "IMAGE" | "GIF" | "HTML" | "SCRIPT",
    image_url: "",
    html_content: "",
    script_code: "",
    link_url: "",
    target: "_blank",
    width: "",
    height: "",
    is_active: true,
    start_date: "",
    end_date: "",
    priority: "0",
  });

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/ads/${id}`)
        .then((res) => res.json())
        .then((ad: Ad) => {
          setFormData({
            title: ad.title || "",
            position: ad.position,
            type: ad.type,
            image_url: ad.image_url || "",
            html_content: ad.html_content || "",
            script_code: ad.script_code || "",
            link_url: ad.link_url || "",
            target: ad.target || "_blank",
            width: ad.width?.toString() || "",
            height: ad.height?.toString() || "",
            is_active: ad.is_active,
            start_date: ad.start_date
              ? new Date(ad.start_date).toISOString().slice(0, 16)
              : "",
            end_date: ad.end_date
              ? new Date(ad.end_date).toISOString().slice(0, 16)
              : "",
            priority: ad.priority.toString(),
          });
          setFetching(false);
        })
        .catch((err) => {
          console.error("Error fetching ad:", err);
          setFetching(false);
        });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          width: formData.width ? parseInt(formData.width) : null,
          height: formData.height ? parseInt(formData.height) : null,
          priority: parseInt(formData.priority),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/ads");
      } else {
        const error = await res.json();
        alert(error.error || "خطا در ویرایش تبلیغ");
      }
    } catch (error) {
      console.error("Error updating ad:", error);
      alert("خطا در ویرایش تبلیغ");
    } finally {
      setLoading(false);
    }
  };

  const positionOptions = [
    { value: "BANNER_TOP_HEADER_LEFT", label: "بنر بالای هدر - چپ" },
    { value: "BANNER_TOP_HEADER_RIGHT", label: "بنر بالای هدر - راست" },
    { value: "SIDEBAR_TOP", label: "بالای sidebar" },
    { value: "SIDEBAR_MIDDLE", label: "وسط sidebar" },
    { value: "SIDEBAR_BOTTOM", label: "پایین sidebar" },
    { value: "CONTENT_TOP", label: "بالای محتوا" },
    { value: "CONTENT_MIDDLE", label: "وسط محتوا" },
    { value: "CONTENT_BOTTOM", label: "پایین محتوا" },
    { value: "BANNER_BOTTOM", label: "بنر پایین صفحه" },
    { value: "STICKY_BOTTOM_RIGHT", label: "چسبنده پایین راست" },
  ];

  // دریافت template و suggestions برای position فعلی
  const currentTemplate = useMemo(
    () => getAdTemplate(formData.position),
    [formData.position]
  );
  const sizeSuggestions = useMemo(
    () => getSizeSuggestions(formData.position),
    [formData.position]
  );
  const bestSuggestion = useMemo(
    () => getBestSuggestion(formData.position),
    [formData.position]
  );

  // بررسی اینکه آیا سایز فعلی پیشنهادی است
  const isCurrentSizeSuggested = useMemo(() => {
    if (!formData.width || !formData.height) return false;
    return isSuggestedSize(
      formData.position,
      parseInt(formData.width),
      parseInt(formData.height)
    );
  }, [formData.position, formData.width, formData.height]);

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600 dark:text-gray-400">در حال بارگذاری...</div>
      </div>
    );
  }

  // Create ad object for preview
  const previewAd = {
    id: parseInt(id || "0"),
    title: formData.title,
    position: formData.position,
    type: formData.type,
    image_url: formData.image_url || null,
    html_content: formData.html_content || null,
    script_code: formData.script_code || null,
    link_url: formData.link_url || null,
    target: formData.target as "_blank" | "_self",
    width: formData.width ? parseInt(formData.width) : null,
    height: formData.height ? parseInt(formData.height) : null,
    is_active: formData.is_active,
    click_count: 0,
    view_count: 0,
    priority: parseInt(formData.priority),
    created_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        ویرایش تبلیغ
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label>عنوان تبلیغ</Label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="عنوان تبلیغ (اختیاری)"
            />
          </div>

          <div>
            <Label>موقعیت نمایش</Label>
            <Select
              value={formData.position}
              onChange={(value) =>
                setFormData({ ...formData, position: value })
              }
              options={positionOptions}
            />
            {currentTemplate && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {currentTemplate.description}
              </p>
            )}
          </div>

          <div>
            <Label>نوع تبلیغ</Label>
            <Select
              value={formData.type}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as "IMAGE" | "GIF" | "HTML" | "SCRIPT",
                })
              }
              options={[
                { value: "IMAGE", label: "تصویر" },
                { value: "GIF", label: "GIF متحرک" },
                { value: "HTML", label: "HTML" },
                { value: "SCRIPT", label: "اسکریپت" },
              ]}
            />
          </div>

          {(formData.type === "IMAGE" || formData.type === "GIF") && (
            <>
              <div className="md:col-span-2">
                <Label>آپلود تصویر</Label>
                <ImageUploadCrop
                  currentImage={formData.image_url}
                  onImageUploaded={(url) =>
                    setFormData({ ...formData, image_url: url })
                  }
                  maxWidth={currentTemplate?.maxWidth || 1200}
                  maxHeight={currentTemplate?.maxHeight || 1200}
                  allowScriptFiles={true}
                  onScriptFileUploaded={(content) => {
                    // اگر در بخش IMAGE/GIF فایل script آپلود شد، نوع تبلیغ را به SCRIPT تغییر بده
                    if (content && (formData.type === "IMAGE" || formData.type === "GIF")) {
                      setFormData(prev => ({ 
                        ...prev, 
                        type: "SCRIPT",
                        script_code: content,
                        image_url: ""
                      }));
                      alert("فایل script آپلود شد و نوع تبلیغ به SCRIPT تغییر یافت");
                    }
                  }}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  یا URL تصویر را وارد کنید (یا مسیر نسبی):
                </p>
                <Input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg یا uploads/ads/image.jpg"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>
                  عرض (پیکسل)
                  {currentTemplate?.maxWidth && (
                    <span className="text-xs text-gray-500 mr-2">
                      (حداکثر: {currentTemplate.maxWidth}px)
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={formData.width}
                  onChange={(e) =>
                    setFormData({ ...formData, width: e.target.value })
                  }
                  placeholder={bestSuggestion ? String(bestSuggestion.width) : "300"}
                  max={currentTemplate?.maxWidth}
                />
                {!isCurrentSizeSuggested && formData.width && formData.height && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ این سایز پیشنهادی نیست. سایزهای پیشنهادی را در زیر ببینید.
                  </p>
                )}
              </div>

              <div>
                <Label>
                  ارتفاع (پیکسل)
                  {currentTemplate?.maxHeight && (
                    <span className="text-xs text-gray-500 mr-2">
                      (حداکثر: {currentTemplate.maxHeight}px)
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={formData.height}
                  onChange={(e) =>
                    setFormData({ ...formData, height: e.target.value })
                  }
                  placeholder={bestSuggestion ? String(bestSuggestion.height) : "250"}
                  max={currentTemplate?.maxHeight}
                />
              </div>

              {/* Size Suggestions */}
              {sizeSuggestions.length > 0 && (
                <div className="md:col-span-2">
                  <Label>سایزهای پیشنهادی:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {sizeSuggestions.map((suggestion, idx) => {
                      const isSelected =
                        formData.width === String(suggestion.width) &&
                        formData.height === String(suggestion.height);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              width: String(suggestion.width),
                              height: String(suggestion.height),
                            });
                          }}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : suggestion.common
                              ? "border-green-300 bg-green-50 dark:bg-green-900/10 hover:border-green-400"
                              : "border-gray-200 bg-white dark:bg-gray-800 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">
                            {suggestion.width} × {suggestion.height}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {suggestion.label}
                          </div>
                          {suggestion.common && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                              رایگان
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💡 سایزهای سبز رنگ رایج‌تر هستند و معمولاً عملکرد بهتری دارند.
                  </p>
                </div>
              )}

              <div>
                <Label>لینک کلیک (اختیاری)</Label>
                <Input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) =>
                    setFormData({ ...formData, link_url: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label>Target</Label>
                <Select
                  value={formData.target}
                  onChange={(value) =>
                    setFormData({ ...formData, target: value })
                  }
                  options={[
                    { value: "_blank", label: "تب جدید" },
                    { value: "_self", label: "همان صفحه" },
                  ]}
                />
              </div>
            </>
          )}

          {formData.type === "HTML" && (
            <div className="md:col-span-2">
              <HTMLEditor
                value={formData.html_content}
                onChange={(value) =>
                  setFormData({ ...formData, html_content: value })
                }
                placeholder="کد HTML تبلیغ"
                rows={10}
              />
            </div>
          )}

          {formData.type === "SCRIPT" && (
            <div className="md:col-span-2 space-y-3">
              <Label>کد اسکریپت</Label>
              
              {/* Upload Script File */}
              <div>
                <Label className="text-sm mb-2 block">آپلود فایل اسکریپت (.js, .txt)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".js,.txt"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Check file size before upload (5MB limit)
                      if (file.size > 5 * 1024 * 1024) {
                        alert("حجم فایل باید کمتر از 5MB باشد");
                        return;
                      }

                      try {
                        const uploadFormData = new FormData();
                        uploadFormData.append("file", file);

                        const response = await fetch("/api/admin/upload/script", {
                          method: "POST",
                          body: uploadFormData,
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          alert(error.error || "خطا در آپلود فایل");
                          return;
                        }

                        const data = await response.json();
                        setFormData({ ...formData, script_code: data.content });
                        alert(`فایل ${data.filename} با موفقیت آپلود شد`);
                      } catch (error) {
                        console.error("Error uploading script file:", error);
                        alert("خطا در آپلود فایل");
                      }
                    }}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-white
                      hover:file:bg-primary/90
                      cursor-pointer"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  می‌توانید فایل .js یا .txt را آپلود کنید (نکته: .ts برای ویدیو است، نه script)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">یا</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              {/* Text Area for Manual Input */}
              <div>
                <Label className="text-sm mb-2 block">یا کد اسکریپت را مستقیماً وارد کنید</Label>
                <TextArea
                  value={formData.script_code}
                  onChange={(e) =>
                    setFormData({ ...formData, script_code: e.target.value })
                  }
                  rows={10}
                  placeholder="کد اسکریپت (مثل Google Ads)"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <Label>اولویت</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              placeholder="0"
            />
          </div>

          <div>
            <Label className="text-gray-700 dark:text-white">
              تاریخ شروع (اختیاری)
            </Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="pr-10"
                id="edit-start-date-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('edit-start-date-input') as HTMLInputElement;
                  if (input) {
                    if (input.showPicker) {
                      input.showPicker();
                    } else {
                      input.click();
                    }
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-white">
              تاریخ پایان (اختیاری)
            </Label>
            <div className="relative">
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="pr-10"
                id="edit-end-date-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('edit-end-date-input') as HTMLInputElement;
                  if (input) {
                    if (input.showPicker) {
                      input.showPicker();
                    } else {
                      input.click();
                    }
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <Checkbox
              checked={formData.is_active}
              onChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
              label="فعال"
            />
          </div>
        </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "در حال ذخیره..." : "ذخیره"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              پیش‌نمایش زنده
            </h3>
            <AdPreview ad={previewAd} />
          </div>
        </div>
      </div>
    </div>
  );
}

