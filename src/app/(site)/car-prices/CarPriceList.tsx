'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';
import Link from 'next/link';
import { FaCar, FaClock, FaSearch, FaArrowUp, FaArrowDown, FaMinus, FaChevronLeft } from 'react-icons/fa';

interface CarPriceItem {
    id: number;
    brand: string;
    model: string;
    trim: string | null;
    year: string;
    price: string;
    type: string; // 'market' | 'factory'
    change: string | null;
    time: string | null;
    updated_at: string;
}

interface CarPriceSource {
    id: number;
    name: string;
    prices: CarPriceItem[];
}

interface CarPriceListProps {
    sources: CarPriceSource[];
    lastUpdate: string;
}

// ----------------------------------------------------------------------
// Smart Categorization Logic
// ----------------------------------------------------------------------
const cleanBrand = (brand: string | null | undefined): string => {
    if (!brand) return '';
    return brand.replace(/[\[\]]/g, '').trim();
};

const getNormalizedCategory = (item: CarPriceItem): string => {
    const brand = cleanBrand(item.brand);
    // Combine all fields for searching
    const fullText = `${brand} ${item.model} ${item.trim || ''}`.toLowerCase();
    const modelLower = item.model.toLowerCase();

    // ... (Keep existing checks for Modiran/Kerman/IranKhodro/Saipa/Bahman) ...

    // --- Modiran Khodro (MVM / Fownix / Extreme) ---
    if (fullText.includes('vx') || modelLower === 'vx') return 'اکستریم VX';
    if (fullText.includes('txl') || modelLower === 'txl') return 'اکستریم TXL';
    if (fullText.includes('lx') && fullText.includes('extreme')) return 'اکستریم LX';
    if (modelLower === 'lx' && brand.includes('Modiran')) return 'اکستریم LX';

    if (fullText.includes('tiggo 8') || modelLower.includes('tiggo 8')) return 'فونیکس تیگو 8';
    if (fullText.includes('tiggo 7') || modelLower.includes('tiggo 7')) return 'فونیکس تیگو 7';
    if (fullText.includes('arrizo 6') || modelLower.includes('arrizo 6')) return 'فونیکس آریزو 6';
    if (fullText.includes('arrizo 5') || modelLower.includes('arrizo 5')) return 'ام‌وی‌ام آریزو 5';
    if (fullText.includes('fx') || modelLower === 'fx') return 'فونیکس FX';

    if (fullText.includes('x22') || modelLower.includes('x22')) return 'ام‌وی‌ام X22';
    if (fullText.includes('x33') || modelLower.includes('x33')) return 'ام‌وی‌ام X33';
    if (fullText.includes('x55') || modelLower.includes('x55')) return 'ام‌وی‌ام X55';

    // --- Kerman Motor (JAC / KMC) ---
    if (fullText.includes('j4') || modelLower === 'j4') return 'جک J4';
    if (fullText.includes('s3') || modelLower === 's3') return 'جک S3';
    if (fullText.includes('s5') || modelLower === 's5') return 'جک S5';

    if (fullText.includes('t8') || modelLower === 't8') return 'KMC T8';
    if (fullText.includes('t9') || modelLower === 't9') return 'KMC T9';
    if (fullText.includes('j7') || modelLower === 'j7') return 'KMC J7';
    if (fullText.includes('k7') || modelLower === 'k7') return 'KMC K7';
    if (fullText.includes('a5') || modelLower === 'a5') return 'KMC A5';
    if (fullText.includes('x5') || modelLower === 'x5') return 'KMC X5';
    if (fullText.includes('eagle') || modelLower === 'eagle') return 'KMC Eagle';

    // --- Iran Khodro ---
    if (fullText.includes('207')) return 'پژو 207';
    if (fullText.includes('206')) return 'پژو 206';
    if (fullText.includes('pars') || fullText.includes('پارس')) return 'پژو پارس';
    if (fullText.includes('tara') || fullText.includes('تارا')) return 'تارا';
    if (fullText.includes('dena') || fullText.includes('دنا')) return 'دنا';
    if (fullText.includes('soren') || fullText.includes('سورن')) return 'سورن';
    if (fullText.includes('runna') || fullText.includes('رانا')) return 'رانا';
    if (fullText.includes('haima') || fullText.includes('هایما')) return 'هایما';
    if (fullText.includes('arisun') || fullText.includes('آریسان')) return 'آریسان';

    // --- Saipa ---
    if (fullText.includes('quick') || fullText.includes('کوییک')) return 'کوییک';
    if (fullText.includes('saina') || fullText.includes('ساینا')) return 'ساینا';
    if (fullText.includes('shahin') || fullText.includes('شاهین')) return 'شاهین';
    if (fullText.includes('atlas') || fullText.includes('اطلس')) return 'اطلس';
    if (fullText.includes('151') || fullText.includes('pride')) return 'پراید 151';
    if (fullText.includes('changan') || fullText.includes('چانگان')) return 'چانگان';

    // --- Bahman ---
    if (fullText.includes('fidelily') || fullText.includes('fow') || fullText.includes('فیدلیتی')) return 'فیدلیتی';
    if (fullText.includes('dignity') || fullText.includes('دیگنیتی')) return 'دیگنیتی';
    if (fullText.includes('respect') || fullText.includes('رسپکت')) return 'رسپکت';
    if (fullText.includes('inroads') || fullText.includes('اینرودز')) return 'اینرودز';
    if (fullText.includes('capra') || fullText.includes('کاپرا')) return 'کاپرا';

    // --- Fallback Strategies ---
    if (modelLower === 'manual' || modelLower === 'دنده ای' || modelLower === 'mt') {
        if (brand.includes('Saipa')) return 'محصولات دنده‌ای سایپا';
        return item.model;
    }
    if (modelLower === 'automatic' || modelLower === 'اتوماتیک' || modelLower === 'at') {
        return item.model;
    }

    // Default: Check if model starts with Brand, if not prepend
    if (brand && !item.model.toLowerCase().startsWith(brand.toLowerCase())) {
        return `${brand} ${item.model}`;
    }

    return item.model;
};

// Helper function to ensure proper spacing between numbers and text
const ensureProperSpacing = (text: string): string => {
    if (!text) return text;
    
    // Normalize spaces first
    let result = text.replace(/\s+/g, ' ').trim();
    
    // Ensure space between numbers and any non-digit, non-space, non-punctuation character
    // This handles cases like "1404مدیران" -> "1404 مدیران" or "FL1404" -> "FL 1404"
    // Run multiple times to catch all cases
    let prevResult = '';
    let iterations = 0;
    const maxIterations = 10; // Safety limit
    
    while (prevResult !== result && iterations < maxIterations) {
        prevResult = result;
        iterations++;
        
        // Add space after number if followed by letter (Persian/Arabic/English)
        // Match: digit(s) followed by letter(s) without space
        result = result.replace(/(\d+)([آ-یa-zA-Z\u0600-\u06FF]+)/g, '$1 $2');
        
        // Add space before number if preceded by letter
        // Match: letter(s) followed by digit(s) without space
        result = result.replace(/([آ-یa-zA-Z\u0600-\u06FF]+)(\d+)/g, '$1 $2');
        
        // Normalize spaces again
        result = result.replace(/\s+/g, ' ').trim();
    }
    
    return result;
};

export default function CarPriceList({ sources, lastUpdate }: CarPriceListProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'market' | 'factory'>('all');
    const [selectedBrand, setSelectedBrand] = useState<string | 'all'>('all');
    const [selectedModel, setSelectedModel] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pre-process items with categories
    const processedItems = useMemo(() => {
        let all: (CarPriceItem & { sourceName: string; category: string; cleanBrand: string })[] = [];
        sources.forEach(source => {
            source.prices.forEach(price => {
                all.push({
                    ...price,
                    sourceName: source.name, // REVERT: Use original source name for grouping
                    cleanBrand: cleanBrand(price.brand || source.name), // Keep helper but don't override sourceName
                    category: getNormalizedCategory(price)
                });
            });
        });
        return all;
    }, [sources]);

    // Extract brands (Unique from processed items)
    const brands = useMemo(() => {
        const unique = new Set(processedItems.map(p => p.sourceName));
        return Array.from(unique);
    }, [processedItems]);

    // Extract categories for selected brand
    const availableCategories = useMemo(() => {
        if (selectedBrand === 'all') return [];
        const brandItems = processedItems.filter(p => p.sourceName === selectedBrand);
        const cats = new Set(brandItems.map(p => p.category));
        return Array.from(cats);
    }, [processedItems, selectedBrand]);

    // Filter Items
    const groupedData = useMemo(() => {
        let filtered = processedItems.filter(item => {
            if (activeTab === 'market' && item.type !== 'market') return false;
            if (activeTab === 'factory' && item.type !== 'factory') return false;

            if (selectedBrand !== 'all' && item.sourceName !== selectedBrand) return false;
            if (selectedModel !== 'all' && item.category !== selectedModel) return false;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const searchText = `${item.cleanBrand} ${item.model} ${item.category} ${item.trim || ''} ${item.year}`.toLowerCase();
                return searchText.includes(query);
            }
            return true;
        });

        // Group by Brand -> Category
        const groups: Record<string, Record<string, typeof filtered>> = {};

        filtered.forEach(item => {
            const brandName = item.sourceName;
            const catName = item.category;

            if (!groups[brandName]) groups[brandName] = {};
            if (!groups[brandName][catName]) groups[brandName][catName] = [];

            groups[brandName][catName].push(item);
        });

        return groups;
    }, [processedItems, activeTab, selectedBrand, selectedModel, searchQuery]);

    // Reset filters
    const handleBrandChange = (brand: string) => {
        setSelectedBrand(brand);
        setSelectedModel('all');
    };

    return (
            <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8 dir-rtl font-sans text-right">
                <div className="container mx-auto px-4 max-w-5xl">

                    {/* Breadcrumb */}
                    <nav aria-label="مسیر صفحه" className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
                            خانه
                        </Link>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                            قیمت خودرو
                        </span>
                    </nav>

                    {/* Header Title & Update Time */}
                    <header className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-3">
                            قیمت لحظه‌ای خودرو | قیمت روز خودروهای داخلی و خارجی
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-3 max-w-2xl mx-auto">
                            مشاهده قیمت لحظه‌ای و روزانه تمامی خودروهای داخلی شامل ایران خوردو، مدیران خودرو، ایران سایپا و سایر برندها. مقایسه قیمت بازار و کارخانه.
                        </p>
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-zinc-700">
                            <FaClock className="text-gray-400" />
                            <span>آخرین بروزرسانی:</span>
                            <time dateTime={new Date().toISOString()} className="font-medium dir-ltr">{lastUpdate}</time>
                        </div>
                    </header>

                    {/* Centered Controls Section */}
                    <div className="flex flex-col items-center gap-6 mb-10">

                        {/* Tabs (Segmented Control) */}
                        <div className="bg-gray-200 dark:bg-zinc-800 p-1.5 rounded-2xl flex gap-1 w-full max-w-md">
                            {(['all', 'market', 'factory'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === tab
                                        ? 'bg-white text-gray-900 shadow-md dark:bg-zinc-600 dark:text-white'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {tab === 'all' ? 'همه' : tab === 'market' ? 'بازار' : 'کارخانه/نمایندگی'}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full max-w-2xl">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-400 text-lg" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pr-12 pl-4 py-3.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all text-gray-900 dark:text-white placeholder-gray-400 shadow-sm"
                                placeholder="جستجوی خودرو..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Brand Filters */}
                        <div className="w-full max-w-4xl overflow-x-auto pb-2 pt-2 scrollbar-hide">
                            <div className="flex justify-center min-w-max gap-2 px-4">
                                <button
                                    onClick={() => handleBrandChange('all')}
                                    className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${selectedBrand === 'all'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                        : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    همه برندها
                                </button>
                                {brands.map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => handleBrandChange(brand)}
                                        className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${selectedBrand === brand
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Filters (Visible only if Brand Selected) */}
                        {selectedBrand !== 'all' && availableCategories.length > 0 && (
                            <div className="w-full max-w-4xl overflow-x-auto pb-4 scrollbar-hide animate-fadeIn">
                                <div className="flex justify-center min-w-max gap-2 px-4">
                                    <button
                                        onClick={() => setSelectedModel('all')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedModel === 'all'
                                            ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900'
                                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        همه مدل‌ها
                                    </button>
                                    {availableCategories.sort().map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedModel(cat)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedModel === cat
                                                ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900'
                                                : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grouped Price List */}
                    <div className="space-y-10">
                        {Object.keys(groupedData).length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-zinc-800 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-700">
                                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">نتیجه‌ای یافت نشد</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">لطفاً فیلترها را تغییر دهید.</p>
                            </div>
                        ) : (
                            Object.entries(groupedData).map(([sourceName, categories]) => (
                                <div key={sourceName} className="space-y-6">
                                    {/* Brand Header (Only if showing all brands) */}
                                    {selectedBrand === 'all' && (
                                        <div className="flex items-center gap-4 mb-4">
                                            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                                <Link 
                                                    href={`/car-prices/${encodeURIComponent(sourceName)}`}
                                                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    title={`مشاهده قیمت تمام محصولات ${sourceName}`}
                                                >
                                                    محصولات {sourceName}
                                                </Link>
                                            </h2>
                                            <div className="h-px bg-gray-200 dark:bg-zinc-700 flex-1"></div>
                                        </div>
                                    )}

                                    {Object.entries(categories).map(([catName, items]) => (
                                        <div key={catName} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
                                            {/* Category Header */}
                                            <header className="bg-gray-50 dark:bg-zinc-800/80 px-5 py-3 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base">
                                                        قیمت {catName}
                                                    </h3>
                                                </div>
                                            </header>

                                            {/* Items List */}
                                            <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                                                {items.map((item) => (
                                                    <div key={`${item.id}-${item.type}`} className="group hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors p-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">

                                                        {/* Right: Info */}
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                                <FaCar className="text-xl" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white text-base truncate">
                                                                    {(() => {
                                                                        // Determine display model name
                                                                        let displayModel = item.model.trim();
                                                                        // Use cleanBrand for checker
                                                                        const brand = item.cleanBrand || item.brand;
                                                                        if (brand && !displayModel.toLowerCase().trim().startsWith(brand.toLowerCase().trim())) {
                                                                            displayModel = `${brand.trim()} ${displayModel}`;
                                                                        }

                                                                        // Ensure proper spacing
                                                                        displayModel = ensureProperSpacing(displayModel);

                                                                        // Try to remove category name ONLY if it's redundant
                                                                        // Escape special chars for RegExp (e.g. brackets in "Bestune [NAT]")
                                                                        const escapedCatName = catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                                        let shortName = displayModel.replace(new RegExp(escapedCatName, 'g'), '').trim();
                                                                        
                                                                        // Ensure proper spacing again after removing category
                                                                        shortName = ensureProperSpacing(shortName);

                                                                        // If shortName is too short (e.g. "(GX)" or empty), keep full name
                                                                        if (shortName.length < 3 || /^[\(\)\[\]\s-]*$/.test(shortName)) {
                                                                            return displayModel;
                                                                        }
                                                                        return shortName;
                                                                    })()}
                                                                    {' '}
                                                                    <span className="font-light text-gray-500 dark:text-gray-400 text-sm mx-1">
                                                                        {item.year}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                                                    <span>{item.trim || item.brand}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Center: Update Time AND Market/Factory Toggle */}
                                                        <div className="flex items-center gap-3 text-xs text-gray-400 font-light justify-center md:w-64">
                                                            <span className={`px-2 py-0.5 rounded ${item.type === 'market'
                                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                }`}>
                                                                {item.type === 'market' ? 'قیمت بازار' : 'قیمت کارخانه'}
                                                            </span>
                                                            <div className="w-px h-3 bg-gray-300 dark:bg-zinc-600 hidden md:block"></div>
                                                            <div className="flex items-center gap-1">
                                                                <FaClock className="text-[10px]" />
                                                                {item.time || 'بروزرسانی امروز'}
                                                            </div>
                                                        </div>

                                                        {/* Left: Price & Change */}
                                                        <div className="flex flex-col items-end gap-1 md:w-32 pt-3 md:pt-0 border-t border-gray-50 dark:border-zinc-700 md:border-none">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{item.price}</span>
                                                                <span className="text-xs text-gray-400">تومان</span>
                                                            </div>

                                                            <div className="flex items-center gap-1 text-[11px] h-5">
                                                                {item.change ? (
                                                                    <span className={`font-medium px-1.5 rounded dir-ltr flex items-center gap-1 ${item.change.includes('-')
                                                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/10'
                                                                        : item.change === '0%' || item.change === '۰٪'
                                                                            ? 'text-gray-400 bg-gray-100 dark:bg-zinc-700'
                                                                            : 'text-green-500 bg-green-50 dark:bg-green-900/10'
                                                                        }`}>
                                                                        {item.change}
                                                                        {item.change.includes('-') ? <FaArrowDown className="text-[9px]" /> : (item.change !== '0%' && item.change !== '۰٪') ? <FaArrowUp className="text-[9px]" /> : null}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 bg-gray-100 dark:bg-zinc-700 px-1.5 rounded">0%</span>
                                                                )}
                                                                <span className="text-gray-300 dark:text-zinc-600 text-[10px]">تغییر</span>
                                                            </div>
                                                        </div>

                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }
