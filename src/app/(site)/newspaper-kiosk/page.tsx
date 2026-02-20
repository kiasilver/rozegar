"use client";

import React, { useState, useEffect } from "react";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface NewspaperItem {
  name: string;
  filename: string;
  pdfUrl: string;
  imageUrl?: string;
  date: string;
  dateStr: string;
  dayOfWeek: string;
}

/**
 * تبدیل نام انگلیسی روزنامه به فارسی
 */
const getPersianName = (name: string): string => {
  // 1. اگر نام فارسی است (یا شامل حروف فارسی شد)
  if (/[\u0600-\u06FF]/.test(name)) {
    let processed = name.replace(/[-_]/g, ' '); // حذف خط تیره و آندرلاین

    // حذف الگوی تاریخ (انگلیسی و فارسی) که حالا با فاصله جدا شده‌اند
    // مثلا: 1404 12 01 یا ۱۴۰۴ ۱۲ ۰۱
    processed = processed.replace(/\d{4}\s+\d{1,2}\s+\d{1,2}/g, '');
    processed = processed.replace(/[\u06F0-\u06F9]{4}\s+[\u06F0-\u06F9]{1,2}\s+[\u06F0-\u06F9]{1,2}/g, '');

    // حذف تاریخ چسبیده (اگر هنوز مانده باشد)
    processed = processed.replace(/\d{4}-\d{1,2}-\d{1,2}/g, '');

    return processed.replace(/\s+/g, ' ').trim();
  }

  // 2. نرمال‌سازی نام انگلیسی برای حذف پسوند تاریخ
  let cleanName = name
    .replace(/-?\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-?[\u06F0-\u06F9]{4}-[\u06F0-\u06F9]{2}-[\u06F0-\u06F9]{2}$/, '');

  // 3. اگر نام فقط شامل تاریخ بود (یا خالی شد)، مربوط به روزنامه آسیا است
  if (!cleanName || /^\d{4}-\d{2}-\d{2}$/.test(name) || /^\d+$/.test(cleanName)) {
    return 'روزنامه آسیا';
  }

  // Mapping table برای نام‌های انگلیسی به فارسی
  const nameMapping: Record<string, string> = {
    'Servat': 'ثروت',
    'Roozegar': 'روزگار',
    'GostareshSMT': 'گسترش صمت',
    'Movajehe': 'مواجهه اقتصادی',
    'NaghshDaily': 'نقش اقتصاد',
    'HadafEconomic': 'هدف و اقتصاد',
    'MadanDaily': 'روزگار معدن',
    'DonyayeEghtesad': 'دنیای اقتصاد',
    'JahanSanat': 'جهان صنعت',
    'Sarmayeh': 'سرمایه',
    'TejaratFarda': 'تجارت فردا',
    'Bourse': 'بورس',
    'EghtesadNews': 'اقتصاد نیوز',
    'EghtesadOnline': 'اقتصاد آنلاین',
    'Kargozaran': 'کارگزاران',
    'BoursePress': 'بورس پرس',
    'Tejarat': 'تجارت',
    'Eghtesad': 'اقتصاد',
    'Bazar': 'بازار',
    'Sanat': 'صنعت',
    'EghtesadeMardom': 'اقتصاد مردم',
    'EghtesadeMeli': 'اقتصاد ملی',
    'TejaratOnline': 'تجارت آنلاین',
    'Jahan-e-Eghtesad': 'جهان اقتصاد',
    'JahaneEghtesad': 'جهان اقتصاد',
    'JahanEghtesad': 'جهان اقتصاد',
    'Emruz': 'امروز',
    'Emrooz': 'امروز',
    'Khob': 'خوب',
    'Khoob': 'خوب',
    'Shoroo': 'شروع',
    'Shorou': 'شروع',
    'AsrGhanoon': 'عصر قانون',
    'AsreTosee': 'عصر توسعه',
    'KhabarVarzeshi': 'خبر ورزشی',
    'Shoot': 'شوت',
    'Goal': 'گل',
    'Piroozi': 'پیروزی',
    'Esteghlal': 'استقلال',
    'IranVarzeshi': 'ایران ورزشی',
    'AbrarVarzeshi': 'ابرار ورزشی',
    'Hamshahri': 'همشهری',
    'JamJam': 'جام جم',
    'Iran': 'ایران',
    'Etemad': 'اعتماد',
    'Shargh': 'شرق',
    'Kayhan': 'کیهان',
    'Ettelaat': 'اطلاعات',
    'JomhouriEslami': 'جمهوری اسلامی',
    'Resalat': 'رسالت',
    'MardomSalari': 'مردم سالاری',
    'ArmanMelli': 'آرمان ملی',
    'AftabYazd': 'آفتاب یزد',
    'Ebtekar': 'ابتکار',
    'Javan': 'جوان',
    'VatanEmrooz': 'وطن امروز',
    'SiasatRooz': 'سیاست روز',
    'AsrIranian': 'عصر ایرانیان',
    'SahebGhalam': 'صاحب قلم',
    'Sayeh': 'سایه',
    'Kaenat': 'کائنات',
    'KarVaKargar': 'کار و کارگر',
    'Hemayat': 'حمایت',
    'Rah_e_Mardom': 'راه مردم',
    'RaheMardom': 'راه مردم',
    'RooyeshMellat': 'رویش ملت',
    'SetarehSobh': 'ستاره صبح',
    'SedayeEslahat': 'صدای اصلاحات',
    'NaslTosee': 'نسل توسعه',
    'NekatPress': 'نکات پرس',
    'VaghayeEttefaghieh': 'وقایع اتفاقیه',
    'Hadaf': 'هدف',
    'AkhbarSanat': 'اخبار صنعت',
    'akhbarsanat': 'اخبار صنعت',
  };

  // جستجو در mapping
  if (nameMapping[name]) {
    return nameMapping[name];
  }

  // mapping برای cleanName
  if (nameMapping[cleanName]) {
    return nameMapping[cleanName];
  }

  // جستجو با case-insensitive
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(nameMapping)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // اگر پیدا نشد، نام پاک شده را برگردان
  if (/[\u0600-\u06FF]/.test(cleanName)) {
    return cleanName.replace(/[-_]/g, ' ').trim();
  }
  return cleanName;
};

interface NewspaperArchive {
  success: boolean;
  count: number;
  newspapers: NewspaperItem[];
  groupedByDate: Record<string, NewspaperItem[]>;
  dateRange: {
    from: string;
    to: string;
  };
  archiveDays?: number;
}

export default function NewspaperKioskPage() {
  const [archive, setArchive] = useState<NewspaperArchive | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedNewspaper, setSelectedNewspaper] = useState<NewspaperItem | null>(null);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      setLoading(true);

      // دریافت هم archive و هم newspapers برای match کردن عکس‌ها
      const [archiveResponse, newspapersResponse] = await Promise.all([
        fetch("/api/v1/public/newspapers/archive"),
        fetch("/api/v1/public/newspapers"),
      ]);

      if (archiveResponse.ok) {
        const archiveData = await archiveResponse.json();

        // اگر newspapers هم دریافت شد، عکس‌ها را match کن
        if (newspapersResponse.ok) {
          const newspapersData = await newspapersResponse.json();
          if (newspapersData.success && newspapersData.newspapers) {
            // Mapping table برای نام‌های روزنامه‌های اقتصادی (بر اساس economicNewspaperNames)
            const newspaperNameMapping: Record<string, string[]> = {
              'دنیای اقتصاد': ['donyayeeghtesad', 'donya eghtesad', 'donyaye eghtesad', 'دنیای اقتصاد', 'دنیا اقتصاد'],
              'جهان صنعت': ['jahansanat', 'jahan sanat', 'جهان صنعت'],
              'سرمایه': ['sarmayeh', 'sarmaye', 'سرمایه'],
              'تجارت فردا': ['tejaratfarda', 'tejarat farda', 'تجارت فردا'],
              'بورس': ['bourse', 'بورس'],
              'اقتصاد نیوز': ['eghtesadnews', 'eghtesad news', 'اقتصاد نیوز'],
              'اقتصاد آنلاین': ['eghtesadonline', 'eghtesad online', 'اقتصاد آنلاین'],
              'کارگزاران': ['kargozaran', 'کارگزاران'],
              'بورس پرس': ['boursepress', 'bourse press', 'بورس پرس'],
              'تجارت': ['tejarat', 'تجارت'],
              'اقتصاد': ['eghtesad', 'اقتصاد'],
              'بازار': ['bazar', 'بازار'],
              'صنعت': ['sanat', 'صنعت'],
              'جهان اقتصاد': ['jahaneghtesad', 'jahan eghtesad', 'jahaneeghtesad', 'جهان اقتصاد'],
              'اسکناس': ['eskenas', 'eskanass', 'اسکناس'],
              'اقتصاد آینده': ['eghtesadayandeh', 'eghtesad ayandeh', 'اقتصاد آینده'],
              'امروز': ['emruz', 'emrooz', 'امروز'],
              'ثروت': ['sarmayeh', 'sarmaye', 'ثروت'],
              'خوب': ['khob', 'khoob', 'خوب'],
              'روزگار': ['ruzegar', 'روزگار'],
              'روزگار معدن': ['ruzegaremaden', 'ruzegar maden', 'روزگار معدن'],
              'شروع': ['shoroo', 'shorou', 'شروع'],
              'صمت': ['samat', 'semat', 'صمت'],
              'مواجهه اقتصادی': ['mojavezeeghtesadi', 'mojaveze eghtesadi', 'مواجهه اقتصادی'],
              'نقش اقتصاد': ['nagheeghtesad', 'naghe eghtesad', 'نقش اقتصاد'],
              'هدف و اقتصاد': ['hadafvaeghtesad', 'hadaf va eghtesad', 'هدف و اقتصاد'],
            };

            // ساخت map از نام به URL و نام تمیز با تمام انواع نام‌ها
            const imageMap: Record<string, { url: string, name: string }> = {};
            newspapersData.newspapers.forEach((paper: any) => {
              if (paper.name && paper.url) {
                const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s\u0600-\u06FF]/g, '');

                // نام تمیز برای نمایش (اولویت با persianName است)
                const cleanDisplayName = paper.persianName || paper.name;

                // اضافه کردن تمام انواع نام‌ها
                const names = [
                  paper.name,
                  paper.persianName,
                  paper.englishName,
                ].filter(Boolean);

                names.forEach(name => {
                  const normalized = normalize(name);
                  if (normalized && normalized.length > 2) {
                    imageMap[normalized] = { url: paper.url, name: cleanDisplayName };
                    imageMap[normalized.replace(/\s+/g, '')] = { url: paper.url, name: cleanDisplayName };
                  }
                });
              }
            });

            // تابع بهبود یافته برای match کردن
            const findMatchingImage = (pdfName: string): { url: string, name: string } | undefined => {
              const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s\u0600-\u06FF]/g, '');
              const normalizedPdfName = normalize(pdfName);
              const normalizedPdfNameNoSpaces = normalizedPdfName.replace(/\s+/g, '');

              // 0. استفاده از mapping table
              for (const [persianName, variants] of Object.entries(newspaperNameMapping)) {
                if (variants.some(v => normalizedPdfName.includes(normalize(v)) || normalize(v).includes(normalizedPdfName))) {
                  const persianNormalized = normalize(persianName);
                  if (imageMap[persianNormalized]) {
                    return imageMap[persianNormalized];
                  }
                  for (const [key, data] of Object.entries(imageMap)) {
                    if (normalize(key).includes(persianNormalized) || persianNormalized.includes(normalize(key))) {
                      return data;
                    }
                  }
                }
              }

              // 1. Exact match
              if (imageMap[normalizedPdfName]) {
                return imageMap[normalizedPdfName];
              }
              if (imageMap[normalizedPdfNameNoSpaces]) {
                return imageMap[normalizedPdfNameNoSpaces];
              }

              // 2. Partial match
              for (const [key, data] of Object.entries(imageMap)) {
                if (key.length < 3) continue;
                if (normalizedPdfName.includes(key) || key.includes(normalizedPdfName)) {
                  return data;
                }
                if (normalizedPdfNameNoSpaces.includes(key.replace(/\s+/g, '')) || key.replace(/\s+/g, '').includes(normalizedPdfNameNoSpaces)) {
                  return data;
                }
              }

              // 3. Word-based match
              const pdfWords = normalizedPdfName.split(/\s+/).filter(w => w.length > 2);
              for (const [key, data] of Object.entries(imageMap)) {
                const keyWords = key.split(/\s+/).filter(w => w.length > 2);
                const commonWords = pdfWords.filter(w => keyWords.includes(w));
                if (commonWords.length >= Math.min(2, Math.min(pdfWords.length, keyWords.length))) {
                  return data;
                }
              }

              return undefined;
            };

            // match کردن عکس‌ها با archive
            if (archiveData.newspapers) {
              archiveData.newspapers = archiveData.newspapers.map((paper: NewspaperItem) => {
                const match = findMatchingImage(paper.name);
                if (!match) {
                  // console.log ... (optional, removed for brevity or keep?)
                }
                return {
                  ...paper,
                  imageUrl: match?.url || paper.imageUrl,
                  name: match?.name || paper.name, // Use clean name
                };
              });
            }

            if (archiveData.groupedByDate) {
              Object.keys(archiveData.groupedByDate).forEach((dateStr) => {
                archiveData.groupedByDate[dateStr] = archiveData.groupedByDate[dateStr].map((paper: NewspaperItem) => {
                  const match = findMatchingImage(paper.name);
                  return {
                    ...paper,
                    imageUrl: match?.url || paper.imageUrl,
                    name: match?.name || paper.name, // Use clean name
                  };
                });
              });
            }
          }
        }

        setArchive(archiveData);
        // انتخاب اولین تاریخ به صورت پیش‌فرض
        if (archiveData.groupedByDate && Object.keys(archiveData.groupedByDate).length > 0) {
          const firstDate = Object.keys(archiveData.groupedByDate).sort().reverse()[0];
          setSelectedDate(firstDate);
        }
      }
    } catch (error) {
      console.error("Error fetching archive:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    try {
      // اگر dateStr به صورت YYYY-MM-DD است (میلادی)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          calendar: 'persian',
        }).format(date);
      }
      // اگر dateStr تاریخ شمسی است، همان را برگردان
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getDayOfWeek = (dateStr: string) => {
    try {
      // اگر dateStr به صورت YYYY-MM-DD است (میلادی)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(date);
      }
      return '';
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!archive || archive.count === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-2 sm:px-3 md:px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
            کیوسک دیجیتال روزنامه اقتصاد روز
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            در حال حاضر روزنامه‌ای برای نمایش وجود ندارد
          </p>
        </div>
      </div>
    );
  }

  const dates = Object.keys(archive.groupedByDate || {}).sort().reverse();
  const newspapersForSelectedDate = selectedDate
    ? archive.groupedByDate[selectedDate] || []
    : [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 py-4 sm:py-6 md:py-8 px-2 sm:px-3 md:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            کیوسک دیجیتال روزنامه اقتصاد روز
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
            {archive?.archiveDays ? `روزنامه‌های ${archive.archiveDays} روز گذشته` : 'روزنامه‌های 15 روز گذشته'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
            از {archive.dateRange.from} تا {archive.dateRange.to}
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">
            انتخاب تاریخ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {dates.map((dateStr) => {
              const papers = archive.groupedByDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${isSelected
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                >
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {getDayOfWeek(dateStr)}
                    </div>
                    <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                      {formatDateForDisplay(dateStr)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {papers.length} روزنامه
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Newspapers Grid */}
        {selectedDate && newspapersForSelectedDate.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
              روزنامه‌های {formatDateForDisplay(selectedDate)}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {newspapersForSelectedDate.map((paper, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                  onClick={() => {
                    setSelectedNewspaper(paper);
                  }}
                >
                  <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    {paper.imageUrl ? (
                      <img
                        src={paper.imageUrl}
                        alt={getPersianName(paper.name)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // اگر عکس لود نشد، fallback به placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = parent.querySelector('.placeholder-icon');
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'flex';
                            }
                          }
                        }}
                        loading="lazy"
                      />
                    ) : null}
                    <div className="placeholder-icon absolute inset-0 flex items-center justify-center" style={{ display: paper.imageUrl ? 'none' : 'flex' }}>
                      <svg
                        className="w-16 h-16 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-0.5 sm:gap-1 shadow-lg z-10">
                      <PictureAsPdfIcon sx={{ fontSize: 14 }} className="sm:!text-[18px]" />
                      <span className="text-[10px] sm:text-xs font-bold">PDF</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm text-center line-clamp-2">
                      {getPersianName(paper.name)}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                      {paper.dayOfWeek}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {selectedNewspaper && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4"
            onClick={() => setSelectedNewspaper(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full h-[95vh] sm:h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {getPersianName(selectedNewspaper.name)}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {formatDateForDisplay(selectedNewspaper.dateStr)} - {selectedNewspaper.dayOfWeek}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNewspaper(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={selectedNewspaper.pdfUrl}
                  className="w-full h-full"
                  title={getPersianName(selectedNewspaper.name)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

