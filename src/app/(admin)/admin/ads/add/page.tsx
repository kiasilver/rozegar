"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Admin/form/input/InputField";
import Label from "@/components/Admin/form/Label";
import Select from "@/components/Admin/form/Select";
import TextArea from "@/components/Admin/form/input/TextArea";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import AdPreview from "@/components/Admin/ads/AdPreview";
import ImageUploadCrop from "@/components/Admin/ads/ImageUploadCrop";
import HTMLEditor from "@/components/Admin/ads/HTMLEditor";
import MediaGalleryModal from "@/components/Admin/media/MediaGalleryModal";
import {
  getAdTemplate,
  getSizeSuggestions,
  getBestSuggestion,
  isSuggestedSize,
} from "@/lib/ad-templates";

export default function AddAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    position: "SIDEBAR_TOP",
    type: "IMAGE",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/v1/admin/content/ads", {
        method: "POST",
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
        alert(error.error || "خطا در ایجاد تبلیغ");
      }
    } catch (error) {
      console.error("Error creating ad:", error);
      alert("خطا در ایجاد تبلیغ");
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

  // اعمال بهترین suggestion هنگام تغییر position
  React.useEffect(() => {
    if (bestSuggestion && formData.type === "IMAGE" && !formData.width && !formData.height) {
      setFormData({
        ...formData,
        width: String(bestSuggestion.width),
        height: String(bestSuggestion.height),
      });
    }
  }, [formData.position]);

  // بررسی اینکه آیا سایز فعلی پیشنهادی است
  const isCurrentSizeSuggested = useMemo(() => {
    if (!formData.width || !formData.height) return false;
    return isSuggestedSize(
      formData.position,
      parseInt(formData.width),
      parseInt(formData.height)
    );
  }, [formData.position, formData.width, formData.height]);

  // Create ad object for preview
  const previewAd = {
    id: 0,
    title: formData.title,
    position: formData.position,
    type: formData.type as "IMAGE" | "GIF" | "HTML" | "SCRIPT",
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            افزودن تبلیغ جدید
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تبلیغ خود را با انتخاب موقعیت و نوع مناسب ایجاد کنید
          </p>
        </div>
      </div>

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
              <p className="mt-1 text-xs text-gray-500 dark:text-white">
                {currentTemplate.description}
              </p>
            )}
          </div>

          <div>
            <Label>نوع تبلیغ</Label>
            <Select
              value={formData.type}
              onChange={(value) =>
                setFormData({ ...formData, type: value })
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
                <div className="space-y-3">
                  <ImageUploadCrop
                    currentImage={formData.image_url}
                    onImageUploaded={(url) =>
                      setFormData({ ...formData, image_url: url })
                    }
                    maxWidth={currentTemplate?.maxWidth || 1200}
                    maxHeight={currentTemplate?.maxHeight || 1200}
                    onOpenGallery={() => setIsMediaGalleryOpen(true)}
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
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">یا</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      URL تصویر را وارد کنید (یا مسیر نسبی):
                    </p>
                    <Input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, image_url: e.target.value })
                      }
                      placeholder="https://example.com/image.jpg یا uploads/ads/image.jpg"
                    />
                  </div>
                </div>
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
                          <div className="text-xs text-gray-600 dark:text-white mt-1">
                            {suggestion.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-white">
                    💡 سایزهای سبز رنگ رایج‌تر هستند و معمولاً عملکرد بهتری دارند.
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white">
                    💡 برای بهترین نتیجه، از سایزهای پیشنهادی استفاده کنید.
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

                        const response = await fetch("/api/v1/admin/media/script", {
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
                id="start-date-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('start-date-input') as HTMLInputElement;
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
                id="end-date-input"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('end-date-input') as HTMLInputElement;
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

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    در حال ذخیره...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    ذخیره تبلیغ
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                انصراف
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 lg:h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                پیش‌نمایش زنده
              </h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <AdPreview ad={previewAd} />
            </div>
            {(formData.type === "IMAGE" || formData.type === "GIF") && formData.image_url && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  💡 تصویر در موقعیت <strong>{positionOptions.find(p => p.value === formData.position)?.label}</strong> نمایش داده می‌شود
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Gallery Modal */}
      <MediaGalleryModal
        isOpen={isMediaGalleryOpen}
        onClose={() => setIsMediaGalleryOpen(false)}
        onSelect={(url) => {
          setFormData({ ...formData, image_url: url });
          setIsMediaGalleryOpen(false);
        }}
        accept="image"
      />
    </div>
  );
}

