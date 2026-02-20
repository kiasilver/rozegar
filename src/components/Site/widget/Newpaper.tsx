"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { slugifyPersian } from '@/lib/utils/slugify-fa';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Newspaper as NewspaperIcon } from 'lucide-react';
import { useSSE } from "@/hooks/useSSE";

interface Newspaper {
    name: string;
    url: string;
    pdfUrl?: string;
    englishName?: string;
    imageUrl?: string;
    filename?: string;
    date?: string;
    dateStr?: string;
    dayOfWeek?: string;
}

/**
 * تبدیل نام انگلیسی روزنامه به فارسی
 */
const getPersianName = (name: string, englishName?: string): string => {
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
        // نام‌های اضافه شده بر اساس درخواست کاربر
        'madandaily': 'روزگار معدن',
        'hadafeconomic': 'هدف و اقتصاد',
        'gostareshsmt': 'گسترش صمت',
        'naghshdaily': 'نقش اقتصاد',
        'asia': 'روزنامه آسیا',
        'asiya': 'روزنامه آسیا',

        // Mappings اصلی (به همراه حالت‌های lowercase)
        'Servat': 'ثروت', 'servat': 'ثروت',
        'Roozegar': 'روزگار', 'roozegar': 'روزگار', 'ruzegar': 'روزگار',
        'GostareshSMT': 'گسترش صمت',
        'Movajehe': 'مواجهه اقتصادی', 'movajehe': 'مواجهه اقتصادی',
        'NaghshDaily': 'نقش اقتصاد',
        'HadafEconomic': 'هدف و اقتصاد',
        'MadanDaily': 'روزگار معدن',
        'DonyayeEghtesad': 'دنیای اقتصاد', 'donyayeeghtesad': 'دنیای اقتصاد',
        'JahanSanat': 'جهان صنعت', 'jahansanat': 'جهان صنعت',
        'Sarmayeh': 'سرمایه', 'sarmayeh': 'سرمایه',
        'TejaratFarda': 'تجارت فردا', 'tejaratfarda': 'تجارت فردا',
        'Bourse': 'بورس', 'bourse': 'بورس',
        'EghtesadNews': 'اقتصاد نیوز', 'eghtesadnews': 'اقتصاد نیوز',
        'EghtesadOnline': 'اقتصاد آنلاین', 'eghtesadonline': 'اقتصاد آنلاین',
        'Kargozaran': 'کارگزاران', 'kargozaran': 'کارگزاران',
        'BoursePress': 'بورس پرس', 'boursepress': 'بورس پرس',
        'Tejarat': 'تجارت', 'tejarat': 'تجارت',
        'Eghtesad': 'اقتصاد', 'eghtesad': 'اقتصاد',
        'Bazar': 'بازار', 'bazar': 'بازار',
        'Sanat': 'صنعت', 'sanat': 'صنعت',
        'EghtesadeMardom': 'اقتصاد مردم', 'eghtesademardom': 'اقتصاد مردم',
        'EghtesadeMeli': 'اقتصاد ملی', 'eghtesademeli': 'اقتصاد ملی',
        'TejaratOnline': 'تجارت آنلاین', 'tejaratonline': 'تجارت آنلاین',
        'Jahan-e-Eghtesad': 'جهان اقتصاد', 'jahan-e-eghtesad': 'جهان اقتصاد',
        'JahaneEghtesad': 'جهان اقتصاد', 'jahaneeghtesad': 'جهان اقتصاد',
        'JahanEghtesad': 'جهان اقتصاد', 'jahaneghtesad': 'جهان اقتصاد',
        'Emruz': 'امروز', 'emruz': 'امروز', 'emrooz': 'امروز',
        'Emrooz': 'امروز',
        'Khob': 'خوب', 'khob': 'خوب', 'khoob': 'خوب',
        'Khoob': 'خوب',
        'Shoroo': 'شروع', 'shoroo': 'شروع', 'shorou': 'شروع',
        'Shorou': 'شروع',
        'AsrGhanoon': 'عصر قانون', 'asrghanoon': 'عصر قانون',
        'AsreTosee': 'عصر توسعه', 'asretosee': 'عصر توسعه',
        'TehranTimes': 'تهران تایمز', 'tehrantimes': 'تهران تایمز',
        'IranDaily': 'ایران دیلی', 'irandaily': 'ایران دیلی',
        'KayhanInternational': 'کیهان اینترنشنال', 'kayhaninternational': 'کیهان اینترنشنال',
        'FinancialTribune': 'فایننشال تریبون', 'financialtribune': 'فایننشال تریبون',
        'IranNews': 'ایران نیوز', 'irannews': 'ایران نیوز',
        'AbrarEconomic': 'ابرار اقتصادی', 'abrareconomic': 'ابرار اقتصادی',
        'AbrarEghtesadi': 'ابرار اقتصادی', 'abrareghtesadi': 'ابرار اقتصادی',
        'AftabYazd': 'آفتاب یزد', 'aftabyazd': 'آفتاب یزد', 'aftab': 'آفتاب یزد',
        'ArmanMelli': 'آرمان ملی', 'armanmelli': 'آرمان ملی',
        'AsrEghtesad': 'عصر اقتصاد', 'asreghtesad': 'عصر اقتصاد',
        'Ebtekar': 'ابتکار', 'ebtekar': 'ابتکار',
        'Etemad': 'اعتماد', 'etemad': 'اعتماد',
        'Ettelaat': 'اطلاعات', 'ettelaat': 'اطلاعات',
        'Farhikhtegan': 'فرهیختگان', 'farhikhtegan': 'فرهیختگان',
        'Hamshahri': 'همشهری', 'hamshahri': 'همشهری',
        'Iran': 'ایران', 'iran': 'ایران',
        'JamJam': 'جام جم', 'jamjam': 'جام جم',
        'Javan': 'جوان', 'javan': 'جوان',
        'JomhouriEslami': 'جمهوری اسلامی', 'jomhourieslami': 'جمهوری اسلامی',
        'Kayhan': 'کیهان', 'kayhan': 'کیهان',
        'Khorasan': 'خراسان', 'khorasan': 'خراسان',
        'Mardomsalari': 'مردم سالاری', 'mardomsalari': 'مردم سالاری',
        'Resalat': 'رسالت', 'resalat': 'رسالت',
        'SetarehSobh': 'ستاره صبح', 'setarehsobh': 'ستاره صبح',
        'Shahrvand': 'شهروند', 'shahrvand': 'شهروند',
        'Shargh': 'شرق', 'shargh': 'شرق',
        'SobhEmrooz': 'صبح امروز', 'sobhemrooz': 'صبح امروز',
        'VatanEmrooz': 'وطن امروز', 'vatanemrooz': 'وطن امروز',
        'samat': 'صمت', 'semat': 'صمت',
        'AkhbarSanat': 'اخبار صنعت', 'akhbarsanat': 'اخبار صنعت',
        'Akhbar-e-Sanat': 'اخبار صنعت', 'akhbar-e-sanat': 'اخبار صنعت',
    };

    // اول سعی کن با englishName match کنی
    if (englishName && nameMapping[englishName]) {
        return nameMapping[englishName];
    }

    // اگر lowercase englishName موجود بود
    if (englishName && nameMapping[englishName.toLowerCase()]) {
        return nameMapping[englishName.toLowerCase()];
    }

    // سپس با cleanName (نام بدون تاریخ)
    if (nameMapping[cleanName]) {
        return nameMapping[cleanName];
    }

    // با نسخه lowercase cleanName
    if (nameMapping[cleanName.toLowerCase()]) {
        return nameMapping[cleanName.toLowerCase()];
    }

    // تلاش برای match کردن با حذف فاصله‌ها از cleanName
    const normalizedName = cleanName.replace(/\s+/g, '');
    if (nameMapping[normalizedName]) {
        return nameMapping[normalizedName];
    }

    // نسخه lowercase بدون فاصله
    if (nameMapping[normalizedName.toLowerCase()]) {
        return nameMapping[normalizedName.toLowerCase()];
    }

    // چک کردن lowercase برای کلیدها (اگر هنوز match نشده)
    const lowerName = cleanName.toLowerCase();
    const foundKey = Object.keys(nameMapping).find(k => k.toLowerCase() === lowerName);
    if (foundKey) {
        return nameMapping[foundKey];
    }

    // اگر پیدا نشد، نام تمیز شده را برگردان (حداقل تاریخش حذف شده)
    // همچنین خط تیره‌ها را با فاصله جایگزین کن
    return cleanName.replace(/-/g, ' ');
};

function formatJalaliDate(dateString?: string): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // اگر تاریخ معتبر نبود
        return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    } catch {
        return dateString;
    }
}

const NewspaperWidget: React.FC = () => {
    const [newspapers, setNewspapers] = useState<Newspaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNewspaper, setSelectedNewspaper] = useState<Newspaper | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Use SSE for real-time updates (e.g. daily 7:30 AM update)
    useSSE('/api/sse', {
        onMessage: (message) => {
            // Refresh on new newspapers or generic updates
            if (message.type === 'new-newspaper' || message.type === 'newspaper-updated' || message.type === 'daily-update') {
                console.log('📡 [Newpaper] Received real-time update:', message.type);
                setRefreshKey(prev => prev + 1); // Trigger re-fetch
            }
        },
    });

    useEffect(() => {
        fetchNewspapers();
    }, [refreshKey]);

    const fetchNewspapers = async () => {
        try {
            setLoading(true);
            setError(null);

            const archiveResponse = await fetch("/api/v1/public/newspapers/archive");

            if (archiveResponse.ok) {
                const archiveData = await archiveResponse.json();

                // گرفتن جدیدترین تاریخ (امروز)
                if (archiveData.groupedByDate && Object.keys(archiveData.groupedByDate).length > 0) {
                    const dates = Object.keys(archiveData.groupedByDate).sort().reverse();
                    const todayDate = dates[0]; // جدیدترین تاریخ
                    const todayNewspapers = archiveData.groupedByDate[todayDate] || [];

                    setNewspapers(todayNewspapers);
                } else {
                    setNewspapers([]);
                }
            } else {
                setNewspapers([]);
            }
        } catch (err) {
            console.error('Error fetching newspapers:', err);
            setError('خطا در دریافت روزنامه‌ها');
            setNewspapers([]);
        } finally {
            setLoading(false);
        }
    };

    // اگر روزنامه‌ای وجود ندارد، کامپوننت را نمایش نده
    if (!loading && newspapers.length === 0) {
        return null;
    }

    return (
        <section className="w-full max-w-[1600px] mx-auto px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mt-4 xxs:mt-6 sm:mt-8 lg:mt-10 mb-8 overflow-hidden" aria-label="کیوسک دیجیتال روزنامه‌های اقتصادی">
            {/* Header Title Centered */}
            <div className="text-center mb-6">
                <Link href="/newspaper-kiosk" className="inline-block group">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                        <NewspaperIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        <span>کیوسک دیجیتال</span>
                        <span className="text-gray-500 font-normal text-lg sm:text-x">|</span>
                        <span>روزنامه‌های اقتصادی امروز</span>
                    </h2>
                </Link>
                {newspapers.length > 0 && newspapers[0].dateStr && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span>آخرین بروزرسانی: {formatJalaliDate(newspapers[0].dateStr)} - {newspapers[0].dayOfWeek || ''}</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative pt-6 pb-4 sm:pb-6">

                <div className="px-2 xxs:px-3 sm:p-4 md:p-6">
                    {loading ? (
                        <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 justify-items-center'>
                            {[...Array(8)].map((_, index) => (
                                <div key={index} className="text-center w-full max-w-[160px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-[280px]">
                                    <div className='w-full aspect-[3/4] bg-gray-200 animate-pulse rounded-lg mx-auto'></div>
                                    <div className='mt-3 sm:mt-4 h-4 bg-gray-200 animate-pulse rounded w-3/4 mx-auto'></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className='text-center py-8 text-red-500 font-bold'>
                            {error}
                        </div>
                    ) : (
                        <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 justify-items-center'>
                            {newspapers.map((newspaper, index) => {
                                // تبدیل نام به فارسی
                                const persianName = getPersianName(newspaper.name);

                                // استفاده از imageUrl اگر موجود باشد، در غیر این صورت از url
                                const imageUrl = newspaper.imageUrl || newspaper.url;

                                // اگر PDF موجود است، از PDF viewer استفاده کن (همیشه pdfUrl از archive می‌آید که از سرور خودمان است)
                                const hasPdf = !!newspaper.pdfUrl;

                                return (
                                    <div key={index} className="text-center w-full max-w-[160px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-[280px] group">
                                        <article className="relative" itemScope itemType="https://schema.org/Article">
                                            {hasPdf ? (
                                                // اگر PDF موجود است، با کلیک PDF viewer باز می‌شود
                                                <div
                                                    onClick={() => setSelectedNewspaper(newspaper)}
                                                    className="block w-full max-w-[150px] xs:max-w-[170px] sm:max-w-[240px] lg:max-w-[280px] mx-auto cursor-pointer"
                                                    title={`مشاهده PDF روزنامه ${persianName}`}
                                                >
                                                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-lg border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={`روزنامه ${persianName} - مشاهده PDF امروز`}
                                                                title={`کلیک برای مشاهده PDF روزنامه ${persianName}`}
                                                                className='w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300'
                                                                loading="lazy"
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
                                                            />
                                                        ) : null}
                                                        <div className="placeholder-icon absolute inset-0 flex items-center justify-center" style={{ display: imageUrl ? 'none' : 'flex' }}>
                                                            <NewspaperIcon className="w-16 h-16 text-gray-300" />
                                                        </div>
                                                        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-primary text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-0.5 sm:gap-1 shadow-lg z-10 transition-transform group-hover:scale-110">
                                                            <PictureAsPdfIcon sx={{ fontSize: 14 }} className="sm:!text-[18px]" />
                                                            <span className="text-[10px] sm:text-xs font-bold">PDF</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // اگر PDF موجود نیست، لینک به صفحه newspaper-kiosk
                                                <Link href="/newspaper-kiosk" className="block w-full max-w-[150px] xs:max-w-[170px] sm:max-w-[240px] lg:max-w-[280px] mx-auto">
                                                    <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-lg border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={`روزنامه ${persianName} - مشاهده PDF امروز`}
                                                                title={`روزنامه ${persianName} - مشاهده و دانلود PDF`}
                                                                className='w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300'
                                                                loading="lazy"
                                                                onError={(e) => {
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
                                                            />
                                                        ) : null}
                                                        <div className="placeholder-icon absolute inset-0 flex items-center justify-center" style={{ display: imageUrl ? 'none' : 'flex' }}>
                                                            <NewspaperIcon className="w-16 h-16 text-gray-300" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            )}
                                            <meta itemProp="headline" content={`روزنامه ${persianName}`} />
                                            <meta itemProp="description" content={`دانلود رایگان روزنامه ${persianName} امروز به صورت PDF`} />
                                        </article>
                                        <h2 className='mt-2 sm:mt-4 font-bold text-xs sm:text-base md:text-lg group-hover:text-primary transition-colors cursor-pointer line-clamp-1 text-gray-800' itemProp="name">{persianName}</h2>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* PDF Viewer Modal - kept outside the overflow-hidden container if possible, but fixed position handles it */}
            {selectedNewspaper && selectedNewspaper.pdfUrl && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4"
                    onClick={() => setSelectedNewspaper(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full h-[95vh] sm:h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                    {getPersianName(selectedNewspaper.name)}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {selectedNewspaper.dateStr ? `${formatJalaliDate(selectedNewspaper.dateStr)} - ${selectedNewspaper.dayOfWeek || ''}` : 'مشاهده PDF روزنامه'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedNewspaper(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
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
                        <div className="flex-1 overflow-hidden bg-gray-100">
                            <iframe
                                src={selectedNewspaper.pdfUrl}
                                className="w-full h-full"
                                title={getPersianName(selectedNewspaper.name)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default NewspaperWidget;
