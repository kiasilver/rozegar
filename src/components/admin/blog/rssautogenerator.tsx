/**
 * کامپوننت RSS Auto Generator پیشرفته
 * طراحی زیبا با Dark Mode و Accordion
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/admin/ui/button/button";
import Input from "@/components/admin/form/input/inputfield";
import Label from "@/components/admin/form/label";
import Select from "@/components/admin/form/select";
import Checkbox from "@/components/admin/form/input/checkbox";
import { useAlert } from "@/context/admin/alertcontext";
import { useProgress } from "@/context/admin/progresscontext";
import { Accordion, AccordionGroup } from "@/components/admin/ui/accordion/accordion";

interface Category {
  id: number;
  name: string;
}

interface RSSFeedSource {
  url: string;
  name: string;
  categoryIds?: number[];
}

interface RSSAutoGeneratorProps {
  categories: Category[];
  onGenerated?: (blogIds: number[]) => void;
}

type ContentLength = "short" | "medium" | "long";
type ContentTone = "formal" | "casual" | "professional";
type ContentStyle = "news" | "analytical" | "educational" | "opinion" | "news+analytical";


export default function RSSAutoGenerator({
  categories,
  onGenerated,
}: RSSAutoGeneratorProps) {
  const { showAlert } = useAlert();
  const { progress: progressState, setProgress, resetProgress, refresh } = useProgress();
  const [loading, setLoading] = useState(false);
  const [localProgressActive, setLocalProgressActive] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Map<number, number>>(new Map()); // تعداد بلاگ برای هر دسته‌بندی
  const [selectAllCategories, setSelectAllCategories] = useState(false); // انتخاب همه دسته‌بندی‌ها
  const [globalCategoryCount, setGlobalCategoryCount] = useState(6); // پیش‌فرض: 6 بلاگ برای هر دسته‌بندی

  const [language, setLanguage] = useState<"fa" | "en" | "both">("fa");
  const [contentLength, setContentLength] = useState<ContentLength>("medium");
  const [contentTone, setContentTone] = useState<ContentTone>("professional");
  const [contentStyle, setContentStyle] = useState<ContentStyle>("news");

  const [useAgentCategoryCheck, setUseAgentCategoryCheck] = useState(true);

  // بارگذاری تنظیمات منابع پیش‌فرض از localStorage در handleGenerate

  const toggleCategory = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
      // حذف تعداد برای دسته‌بندی حذف شده
      const newCounts = new Map(categoryCounts);
      newCounts.delete(categoryId);
      setCategoryCounts(newCounts);
      setSelectAllCategories(false);
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
      // اگر selectAllCategories فعال است، از تعداد کلی استفاده کن
      const newCounts = new Map(categoryCounts);
      newCounts.set(categoryId, selectAllCategories ? globalCategoryCount : 6); // پیش‌فرض: 6
      setCategoryCounts(newCounts);
    }
  };

  const toggleSelectAllCategories = () => {
    if (selectAllCategories) {
      // غیرفعال کردن همه
      setSelectedCategories([]);
      setCategoryCounts(new Map());
      setSelectAllCategories(false);
    } else {
      // فعال کردن همه با تعداد کلی
      const allCategoryIds = categories.map(cat => cat.id);
      setSelectedCategories(allCategoryIds);
      const newCounts = new Map<number, number>();
      allCategoryIds.forEach(id => {
        newCounts.set(id, globalCategoryCount || 6); // پیش‌فرض: 6
      });
      setCategoryCounts(newCounts);
      setSelectAllCategories(true);
    }
  };

  const setCategoryCount = (categoryId: number, count: number) => {
    const newCounts = new Map(categoryCounts);
    if (count > 0) {
      newCounts.set(categoryId, count);
    } else {
      newCounts.delete(categoryId);
    }
    setCategoryCounts(newCounts);
  };


  const handleGenerate = async () => {
    // دریافت منابع RSS از دیتابیس (اگر موجود باشد)
    let dbSources: Array<{
      url: string;
      name: string;
      categoryIds?: number[];
      fallbackUrl?: string;
      fallbackName?: string;
    }> = [];

    try {
      const rssRes = await fetch('/api/v1/admin/automation/undefined-rss');
      if (rssRes.ok) {
        const data = await rssRes.json();
        dbSources = (data.sources || []).filter((s: any) => s.isActive !== false);
      }
    } catch (error) {
      console.warn('خطا در دریافت منابع RSS از دیتابیس:', error);
    }

    // فیلتر کردن منابع بر اساس دسته‌بندی انتخاب شده
    // اگر کاربر فقط یک دسته‌بندی انتخاب کرده، فقط منابع مرتبط با آن دسته را request کن
    let filteredDBSources = dbSources;
    if (selectedCategories.length > 0) {
      filteredDBSources = dbSources.filter(source => {
        // اگر منبع به دسته‌بندی خاصی متصل است
        if (source.categoryIds && source.categoryIds.length > 0) {
          // بررسی اینکه آیا با دسته‌بندی‌های انتخاب شده هم‌پوشانی دارد
          const hasMatchingCategory = source.categoryIds.some(catId => selectedCategories.includes(catId));
          return hasMatchingCategory;
        }
        // اگر منبع به دسته‌بندی خاصی متصل نیست، آن را نگه دار (بعداً با Agent بررسی می‌شود)
        return true;
      });
      console.log(`🔍 [Filter] از ${dbSources.length} منبع دیتابیس، ${filteredDBSources.length} منبع برای دسته‌بندی‌های انتخاب شده پیدا شد`);
    }

    // فقط از منابع دیتابیس استفاده می‌کنیم (منابع پیش‌فرض حذف شده)
    const allSources = filteredDBSources;

    if (allSources.length === 0) {
      showAlert("لطفاً حداقل یک منبع RSS را فعال یا اضافه کنید", "error");
      return;
    }

    // اگر useAgentCategoryCheck فعال است و هیچ دسته‌ای انتخاب نشده، خطا بده
    // اگر غیرفعال است، نیازی به انتخاب دسته‌بندی نیست (از همه دسته‌بندی‌ها استفاده می‌شود)
    if (useAgentCategoryCheck && selectedCategories.length === 0) {
      showAlert("لطفاً حداقل یک دسته‌بندی را انتخاب کنید یا حالت 'از همه دسته‌ها' را فعال کنید", "error");
      return;
    }

    // اگر useAgentCategoryCheck غیرفعال است، از همه دسته‌بندی‌ها استفاده کن
    const finalCategoryIds = useAgentCategoryCheck
      ? selectedCategories
      : categories.map(cat => cat.id);

    // اگر useAgentCategoryCheck غیرفعال است، categoryCounts را برای همه دسته‌بندی‌ها تنظیم کن
    const finalCategoryCounts = new Map(categoryCounts);
    if (!useAgentCategoryCheck) {
      categories.forEach(cat => {
        if (!finalCategoryCounts.has(cat.id)) {
          finalCategoryCounts.set(cat.id, globalCategoryCount);
        }
      });
    }

    setLoading(true);
    // CRITICAL: Set local state immediately so progress bar appears instantly
    setLocalProgressActive(true);

    // Set progress in store
    setProgress({
      isActive: true,
      progress: 0,
      message: "Stage 1/6 (Starting...) 0/0 news",
      current: 0,
      total: 0,
      completed: false
    });

    // Force refresh to get progress from server immediately
    setTimeout(() => {
      refresh().catch(() => {
        // Ignore errors
      });
    }, 100);

    try {
      const response = await fetch("/api/v1/admin/content/blogs/rss-auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: allSources,
          categoryIds: finalCategoryIds,
          categoryCounts: Object.fromEntries(finalCategoryCounts), // تبدیل Map به Object
          language,
          useAgentCategoryCheck,
          contentLength,
          contentTone,
          contentStyle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setProgress({ isActive: false, progress: 0, message: "", current: 0, total: 0 });
        showAlert(error.error || "خطا در تولید بلاگ‌ها", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        setProgress({ isActive: false, progress: 100, message: "تکمیل شد", current: result.blogIds?.length || 0, total: result.blogIds?.length || 0 });
        showAlert(
          `✅ ${result.blogIds?.length || 0} بلاگ با موفقیت تولید شد!`,
          "success"
        );

        if (onGenerated && result.blogIds?.length > 0) {
          onGenerated(result.blogIds);
        }
      } else {
        setProgress({ isActive: false, progress: 0, message: "", current: 0, total: 0 });
        showAlert(result.error || "خطا در تولید بلاگ‌ها", "error");
      }
    } catch (error) {
      console.error("Error generating blogs:", error);
      setProgress({ isActive: false, progress: 0, message: "", current: 0, total: 0 });
      showAlert("خطای غیرمنتظره در تولید بلاگ‌ها", "error");
    } finally {
      setLoading(false);
      // Reset local progress after a delay to allow final progress update
      setTimeout(() => {
        setLocalProgressActive(false);
        resetProgress();
      }, 2000);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-2 sm:px-0">
      {/* هدر */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-600 dark:via-purple-600 dark:to-pink-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1">
                ساخت خودکار بلاگ از RSS
              </h2>
              <p className="text-xs sm:text-sm text-white/90 dark:text-white/80 leading-relaxed">
                سیستم پیشرفته با Agent AI برای شخصی‌سازی، SEO و تولید محتوا
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/20 dark:bg-white/10 backdrop-blur-sm">
              <span className="text-green-300 text-sm">✓</span>
              <span className="text-white font-medium whitespace-nowrap">تشخیص هوشمند</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/20 dark:bg-white/10 backdrop-blur-sm">
              <span className="text-green-300 text-sm">✓</span>
              <span className="text-white font-medium whitespace-nowrap">SEO خودکار</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/20 dark:bg-white/10 backdrop-blur-sm">
              <span className="text-green-300 text-sm">✓</span>
              <span className="text-white font-medium whitespace-nowrap">دانلود رسانه</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/20 dark:bg-white/10 backdrop-blur-sm">
              <span className="text-green-300 text-sm">✓</span>
              <span className="text-white font-medium whitespace-nowrap">دو زبانه</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Group */}
      <AccordionGroup>
        {/* تنظیمات محتوا */}
        <Accordion
          title="تنظیمات محتوا"
          defaultOpen={true}
          icon="✍️"
          className="shadow-sm"
        >
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
            تنظیمات مربوط به تولید و بهبود محتوا
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                زبان
              </Label>
              <Select
                value={language}
                options={[
                  { value: "fa", label: "فقط فارسی" },
                  { value: "en", label: "فقط انگلیسی" },
                  { value: "both", label: "دو زبانه" },
                ]}
                onChange={(val) => setLanguage(val as "fa" | "en" | "both")}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                طول محتوا
              </Label>
              <Select
                value={contentLength}
                options={[
                  { value: "short", label: "کوتاه (200-400)" },
                  { value: "medium", label: "متوسط (400-800)" },
                  { value: "long", label: "طولانی (800+)" },
                ]}
                onChange={(val) => setContentLength(val as ContentLength)}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                لحن
              </Label>
              <Select
                value={contentTone}
                options={[
                  { value: "formal", label: "رسمی" },
                  { value: "casual", label: "غیررسمی" },
                  { value: "professional", label: "حرفه‌ای" },
                ]}
                onChange={(val) => setContentTone(val as ContentTone)}
                disabled={loading}
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                سبک
              </Label>
              <Select
                value={contentStyle}
                options={[
                  { value: "analytical", label: "مقاله (تحلیل علمی)" },
                  { value: "news+analytical", label: "خبری + تحلیل" },
                  { value: "educational", label: "آموزشی" },
                  { value: "opinion", label: "نظری" },
                ]}
                onChange={(val) => setContentStyle(val as ContentStyle)}
                disabled={loading}
              />
            </div>
          </div>

        </Accordion>

        {/* تنظیمات دسته‌بندی */}
        <Accordion
          title="تنظیمات دسته‌بندی و تعداد بلاگ"
          defaultOpen={true}
          icon="🏷️"
          className="shadow-sm"
        >
          <div className="mb-4">
            <label className="flex items-start sm:items-center gap-2 sm:gap-3 cursor-pointer p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-4">
              <Checkbox
                checked={useAgentCategoryCheck}
                onChange={() => setUseAgentCategoryCheck(!useAgentCategoryCheck)}
                disabled={loading}
                className="flex-shrink-0 mt-0.5 sm:mt-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                  استفاده از Agent برای تشخیص دسته‌بندی
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {useAgentCategoryCheck
                    ? "Agent فقط خبرهایی را که مربوط به دسته‌بندی‌های انتخاب شده هستند، پردازش می‌کند."
                    : "Agent از همه دسته‌بندی‌ها خبر می‌گیرد و تعداد مشخصی از هر دسته‌بندی تولید می‌کند."}
                </div>
              </div>
              {/* Progress Bar */}
              {(progressState.isActive || loading || localProgressActive) && (
                <div className="flex-shrink-0 flex items-center gap-2 ml-2">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                    <svg className="transform -rotate-90 w-16 h-16 sm:w-20 sm:h-20">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressState.progress / 100)}`}
                        className="text-blue-500 dark:text-blue-400 transition-all duration-300 ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-white">
                        {Math.round(progressState.progress)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                انتخاب دسته‌بندی‌ها و تعداد بلاگ
              </Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectAllCategories}
                    onChange={toggleSelectAllCategories}
                    disabled={loading}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">انتخاب همه</span>
                </label>
                {selectAllCategories && (
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      تعداد کلی:
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={globalCategoryCount}
                      onChange={(e) => {
                        const newCount = parseInt(e.target.value) || 6;
                        setGlobalCategoryCount(Math.max(1, Math.min(100, newCount)));
                        // به‌روزرسانی تعداد همه دسته‌بندی‌های انتخاب شده
                        const newCounts = new Map<number, number>();
                        selectedCategories.forEach(id => {
                          newCounts.set(id, newCount);
                        });
                        setCategoryCounts(newCounts);
                      }}
                      disabled={loading}
                      className="w-16 sm:w-20 text-xs sm:text-sm text-center"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const count = categoryCounts.get(cat.id) || 1;
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleCategory(cat.id)}
                      disabled={loading}
                      className="flex-shrink-0"
                      aria-label={`انتخاب دسته‌بندی ${cat.name}`}
                    />
                    <span className="flex-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          تعداد:
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={count}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value) || 6;
                            setCategoryCount(cat.id, Math.max(1, Math.min(100, newCount)));
                          }}
                          disabled={loading}
                          className="w-16 sm:w-20 text-xs sm:text-sm text-center"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedCategories.length === 0 && useAgentCategoryCheck && (
              <div className="mt-3 p-3 sm:p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm mb-2">
                      هیچ دسته‌بندی انتخاب نشده است
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      می‌توانید از همه دسته‌بندی‌ها با تعداد یکسان استفاده کنید:
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        از هر دسته:
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={globalCategoryCount}
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value) || 6;
                          setGlobalCategoryCount(Math.max(1, Math.min(100, newCount)));
                        }}
                        disabled={loading}
                        className="w-20 sm:w-24 text-xs sm:text-sm text-center"
                      />
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        خبر
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setUseAgentCategoryCheck(false);
                          showAlert("✅ حالت 'از همه دسته‌ها' فعال شد", "success");
                        }}
                        disabled={loading}
                        className="text-[10px] sm:text-xs px-3 py-1.5"
                      >
                        فعال‌سازی
                      </Button>
                    </div>
                    <div className="mt-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      با فعال‌سازی این گزینه، Agent از همه دسته‌بندی‌ها خبر می‌گیرد و {globalCategoryCount} خبر از هر دسته تولید می‌کند.
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedCategories.length === 0 && !useAgentCategoryCheck && (
              <div className="mt-3 p-3 sm:p-4 rounded-lg border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-lg flex-shrink-0">✅</span>
                  <div className="flex-1">
                    <div className="font-medium text-green-900 dark:text-green-300 text-xs sm:text-sm mb-2">
                      حالت "از همه دسته‌ها" فعال است
                    </div>
                    <div className="text-[10px] sm:text-xs text-green-700 dark:text-green-400 leading-relaxed mb-3">
                      سیستم از همه دسته‌بندی‌ها خبر می‌گیرد و تعداد مشخصی از هر دسته تولید می‌کند.
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 whitespace-nowrap">
                        از هر دسته:
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={globalCategoryCount}
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value) || 6;
                          setGlobalCategoryCount(Math.max(1, Math.min(100, newCount)));
                        }}
                        disabled={loading}
                        className="w-20 sm:w-24 text-xs sm:text-sm text-center"
                      />
                      <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                        خبر
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {useAgentCategoryCheck ? (
              <div className="mt-3 p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">💡</span>
                  <div className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Agent فقط خبرهایی را که مربوط به دسته‌بندی‌های انتخاب شده هستند، پردازش می‌کند.
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">💡</span>
                  <div className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 leading-relaxed">
                    Agent از همه دسته‌بندی‌ها خبر می‌گیرد و تعداد مشخصی از هر دسته‌بندی (بر اساس تنظیمات) تولید می‌کند.
                  </div>
                </div>
              </div>
            )}
          </div>
        </Accordion>

      </AccordionGroup>

      {/* دکمه تولید */}
      <div className="sticky bottom-0 z-10 pt-3 sm:pt-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 -mx-2 sm:-mx-6 px-2 sm:px-6 pb-4 sm:pb-6 safe-area-inset-bottom">
        <Button
          onClick={handleGenerate}
          disabled={
            loading ||
            (useAgentCategoryCheck && selectedCategories.length === 0)
          }
          className="w-full py-3 sm:py-4 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="شروع تولید خودکار بلاگ"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin text-lg sm:text-xl">⏳</span>
              <span className="text-xs sm:text-base">در حال تولید...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg sm:text-xl">🚀</span>
              <span className="text-xs sm:text-base">شروع تولید خودکار بلاگ</span>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
