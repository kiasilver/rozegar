"use client";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSSE } from "@/hooks/useSSE";

const Slider = dynamic(() => import("@/components/Site/slider/Swiper"), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
  ssr: false,
});

const MostViewedSidebar = dynamic(() => import("@/components/Site/widget/MostViewedSidebar"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});

interface BlogItem {
  id: number;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image?: string;
  category?: string;
}

function formatJalaliDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .substring(0, 150);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function removeDuplicates(items: BlogItem[]): BlogItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item || !item.link) return false;
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

function filterValidImageItems(items: BlogItem[]): BlogItem[] {
  return items.filter(item => {
    const img = item.image;
    if (!img || img.length === 0) return false;
    return true;
  });
}

function excludeUsedItems(items: BlogItem[], usedLinks: Set<string>): BlogItem[] {
  return items.filter(item => item.link && !usedLinks.has(item.link));
}

const GridShow: React.FC = () => {
  const [allBlogs, setAllBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlogs = async (isInitial = false) => {
    try {
      const res = await fetch('/api/v1/public/blogs?limit=100');
      if (!res.ok) {
        if (isInitial) { setAllBlogs([]); setLoading(false); }
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        if (isInitial) { setAllBlogs([]); setLoading(false); }
        return;
      }
      setAllBlogs(data);
      setLoading(false);
    } catch (error) {
      if (isInitial) { setAllBlogs([]); setLoading(false); }
    }
  };

  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new-blog' || message.type === 'blog-updated') {
        fetchBlogs();
      }
    },
  });

  useEffect(() => {
    fetchBlogs(true);
  }, []);

  const allUniqueNews = useMemo(() => {
    if (!Array.isArray(allBlogs)) return [];
    const uniqueNews = removeDuplicates(allBlogs);
    return filterValidImageItems(uniqueNews);
  }, [allBlogs]);

  const hotNews = useMemo(() => {
    if (allUniqueNews.length === 0) return [];
    const shuffled = shuffleArray([...allUniqueNews]);
    return shuffled.slice(0, 5);
  }, [allUniqueNews]);

  const featuredNews = useMemo(() => {
    if (allUniqueNews.length === 0) return [];
    const usedLinks = new Set(hotNews.map(item => item.link).filter(Boolean));
    const availableNews = excludeUsedItems(allUniqueNews, usedLinks);
    if (availableNews.length === 0) {
      const shuffled = shuffleArray([...allUniqueNews]);
      return shuffled.slice(0, 6);
    }
    const shuffled = shuffleArray(availableNews);
    return shuffled.slice(0, 6);
  }, [allUniqueNews, hotNews]);

  const uniqueHousingNews = useMemo(() => {
    const usedLinks = new Set([
      ...hotNews.map(item => item.link),
      ...featuredNews.map(item => item.link)
    ].filter(Boolean));
    if (!Array.isArray(allBlogs)) return [];
    const housingItems = allBlogs.filter(item =>
      item?.category && (item.category.includes('مسکن') || item.category.includes('شهرسازی'))
    );
    const validItems = filterValidImageItems(housingItems);
    const availableItems = excludeUsedItems(validItems, usedLinks);
    if (availableItems.length >= 6) return availableItems.slice(0, 6);
    if (validItems.length >= 6) return validItems.slice(0, 6);
    const otherItems = excludeUsedItems(allUniqueNews, new Set([
      ...usedLinks,
      ...validItems.map(item => item.link).filter(Boolean)
    ]));
    const combined = [...validItems, ...otherItems].slice(0, 6);
    return combined.length >= 6 ? combined : validItems;
  }, [allBlogs, hotNews, featuredNews, allUniqueNews]);

  const uniquePriceNews = useMemo(() => {
    const usedLinks = new Set([
      ...hotNews.map(item => item.link),
      ...featuredNews.map(item => item.link),
      ...uniqueHousingNews.map(item => item.link)
    ].filter(Boolean));
    if (!Array.isArray(allBlogs)) return [];
    const priceItems = allBlogs.filter(item =>
      item?.category && (item.category.includes('قیمت') || item.category.includes('طلا') || item.category.includes('سکه') || item.category.includes('ارز') || item.category.includes('خودرو'))
    );
    const validItems = filterValidImageItems(priceItems);
    const availableItems = excludeUsedItems(validItems, usedLinks);
    if (availableItems.length >= 6) return availableItems.slice(0, 6);
    if (validItems.length >= 6) return validItems.slice(0, 6);
    const otherItems = excludeUsedItems(allUniqueNews, new Set([
      ...usedLinks,
      ...validItems.map(item => item.link).filter(Boolean)
    ]));
    const combined = [...validItems, ...otherItems].slice(0, 6);
    return combined.length >= 6 ? combined : validItems;
  }, [allBlogs, hotNews, featuredNews, uniqueHousingNews, allUniqueNews]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] py-12">
        <div className="text-lg text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      {/* Container: Slider and Most Viewed */}
      <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_450px] gap-4 sm:gap-6 px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-0 mt-12 sm:mt-16 md:mt-20 mb-12 items-stretch">
        {/* Slider - Column 1 on Desktop */}
        <div className="relative h-[250px] xs:h-[300px] sm:h-[350px] md:h-[400px] lg:h-full w-full overflow-hidden rounded-lg">
          <Slider />
        </div>

        {/* Most Viewed - Column 2 on Desktop */}
        <div className="h-full flex flex-col mt-14 lg:mt-10">
          <MostViewedSidebar />
        </div>
      </div>

      {/* Container Recent News - Desktop Only 3 Columns */}
      <div className="max-w-[1600px] mx-auto w-full mt-16 lg:mt-20 hidden lg:grid lg:grid-cols-[1fr_2.5fr_1fr] gap-5 xl:gap-8 items-stretch mb-12 lg:px-0">

        {/* Right Column: Featured News */}
        <div className="relative mt-8 lg:mt-0">
          <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
            <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
              اخبار برگزیده
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
          </div>
          <div className="flex flex-col gap-4 xl:gap-6 bg-white shadow-sm border border-gray-200 h-full rounded-b-md rounded-tl-md p-5 xl:p-7">
            {featuredNews.length > 0 ? (
              featuredNews.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 xl:gap-4 flex-row-reverse justify-end hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                >
                  <div className="inline-block flex-1 min-w-0">
                    <h3 className="blog m-0 leading-[22px] xl:leading-[25px] text-[14px] xl:text-[15px] font-bold text-[#2d2c2c] text-right line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <div className="text-[10px] xl:text-xs text-gray-500 mt-1">
                      📅 {formatJalaliDate(item.pubDate)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <img
                      src={item.image || '/images/logo/logo.png'}
                      alt={item.title}
                      className="w-[85px] h-[65px] object-cover rounded-sm bg-gray-200"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/logo/logo.png';
                      }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">اخباری یافت نشد</div>
            )}
          </div>
        </div>

        {/* Middle Column: Housing News */}
        <div className="relative mt-8 lg:mt-0">
          <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
            <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
              اخبار مسکن و شهرسازی
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
          </div>
          <div className="bg-white shadow-sm border border-gray-200 h-full flex flex-col rounded-b-md rounded-tl-md px-5 xl:px-7 py-6 xl:py-8 flex-1">
            {uniqueHousingNews.length > 0 ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 flex-1">
                  {uniqueHousingNews.slice(0, 6).map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg overflow-hidden ring-1 ring-gray-100 hover:ring-gray-300 transition hover:shadow-md flex flex-col h-full"
                    >
                      <div className="relative aspect-[16/9] w-full bg-gray-200">
                        <img
                          src={item.image || '/images/logo/logo.png'}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/logo/logo.png';
                          }}
                        />
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="blog m-0 leading-[20px] xl:leading-[22px] text-[13px] xl:text-[14px] text-[#2d2c2c] text-right font-semibold line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        <div className="mt-auto flex items-center justify-between text-[10px] xl:text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">📅 {formatJalaliDate(item.pubDate)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 mt-4">اخباری یافت نشد</div>
            )}
          </div>
        </div>

        {/* Left Column: Price News */}
        <div className="relative mt-8 lg:mt-0">
          <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
            <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
              قیمت روز
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
          </div>
          <div className="flex flex-col gap-4 xl:gap-6 bg-white shadow-sm border border-gray-200 h-full rounded-b-md rounded-tl-md p-5 xl:p-7">
            {uniquePriceNews.length > 0 ? (
              uniquePriceNews.slice(0, 6).map((item, idx) => (
                <Link
                  key={idx}
                  href={item.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 xl:gap-4 flex-row-reverse justify-end hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                >
                  <div className="inline-block flex-1 min-w-0">
                    <h3 className="blog m-0 leading-[22px] xl:leading-[25px] text-[14px] xl:text-[15px] font-bold text-[#2d2c2c] text-right line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <div className="text-[10px] xl:text-xs text-gray-500 mt-1">
                      📅 {formatJalaliDate(item.pubDate)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <img
                      src={item.image || '/images/logo/logo.png'}
                      alt={item.title}
                      className="w-[85px] h-[65px] object-cover rounded-sm bg-gray-200"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/logo/logo.png';
                      }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">اخباری یافت نشد</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridShow;
