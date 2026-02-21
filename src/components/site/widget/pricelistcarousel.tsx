"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import { useSSE } from "@/hooks/usesse";

interface PriceListItem {
  id: number;
  title: string;
  slug: string;
  image?: string;
  table: string | null;
  publishedAt: string;
}

interface PriceListCarouselProps {
  category: string;
  categoryName?: string;
}

// تابع فرمت تاریخ شمسی به فرمت "آذر ماه ۱۴۰۴"
function formatJalaliMonth(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      month: 'long',
    }).format(date);
    const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
    }).format(date);
    return `${month} ${year}`;
  } catch {
    return dateString;
  }
}

// استخراج تاریخ از فرمت شمسی برای نمایش
function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      day: 'numeric',
    }).format(date);
    const month = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      month: 'long',
    }).format(date);
    const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
    }).format(date);
    const time = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${day} / ${month} / ${year} | ${time}`;
  } catch {
    return dateString;
  }
}

// استخراج عنوان جدول از محتوا
function extractTableTitle(content: string, articleTitle: string): string {
  if (!content) return articleTitle;

  // جستجوی h2, h3 قبل از جدول
  const beforeTable = content.split('<table')[0];
  const headingMatch = beforeTable.match(/<h[2-3][^>]*>(.*?)<\/h[2-3]>/i);
  if (headingMatch && headingMatch[1]) {
    const title = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    if (title.length > 5) {
      return title;
    }
  }

  // جستجوی متن قبل از جدول
  const textBeforeTable = beforeTable.replace(/<[^>]*>/g, ' ').trim();
  if (textBeforeTable.length > 10) {
    const words = textBeforeTable.split(/\s+/).slice(-10).join(' ');
    if (words.includes('قیمت') || words.includes('لیست')) {
      return words.substring(0, 80) + (words.length > 80 ? '...' : '');
    }
  }

  // استفاده از عنوان مقاله اگر شامل "قیمت" باشد
  if (articleTitle.includes('قیمت') || articleTitle.includes('لیست')) {
    return articleTitle;
  }

  return 'لیست قیمت';
}

const ArrowLeft = () => (
  <svg className="currentColor w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ArrowRight = () => (
  <svg className="currentColor w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function PriceListCarousel({ category, categoryName }: PriceListCarouselProps) {
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/public/price-lists?category=${encodeURIComponent(category)}&limit=10`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: PriceListItem[]) => {
        setItems(data.filter(item => item.table)); // فقط مواردی که جدول دارند
        setLoading(false);
      })
      .catch((error) => {
        console.error(`Error fetching price lists for ${category}:`, error);
        setItems([]);
        setLoading(false);
      });
  }, [category]);

  // Use SSE for real-time updates
  useSSE('/api/sse', {
    onMessage: (message) => {
      // Listen for price list updates
      if (message.type === 'new-price-list' || message.type === 'price-update') {
        fetch(`/api/v1/public/price-lists?category=${encodeURIComponent(category)}&limit=10`)
          .then((res) => res.ok ? res.json() : [])
          .then((data: PriceListItem[]) => {
            setItems(data.filter(item => item.table));
          })
          .catch(e => console.error(e));
      }
    },
  });

  if (loading) {
    return null; // یا می‌توانید یک loading state نمایش دهید
  }

  if (items.length === 0) {
    return null; // اگر مقاله‌ای با جدول قیمت نبود، نمایش نده
  }

  return (
    <section className="w-full max-w-[1600px] mx-auto px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mt-12 xxs:mt-14 sm:mt-16 lg:mt-20">
      <div className="relative">
        <div className="absolute top-[-40px] right-0 left-0 h-[40px] z-10">
          <div className="absolute right-0 top-0 inline-block bg-primary text-white px-6 sm:px-8 py-1.5 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-xs sm:text-sm md:text-base z-20 shadow-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 sm:w-5" />
            <span>{categoryName || 'آخرین قیمت‌ها'}</span>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative pt-6 xxs:pt-8 sm:pt-10">

          {/* Navigation Arrows - Centered on Mobile */}
          <div className="flex items-center justify-center lg:justify-end px-3 sm:px-6 mb-4">
            <div className="flex items-center gap-3">
              <button className="price-list-prev p-2 xxs:p-2.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200 shadow-sm touch-target active:scale-95 text-gray-600">
                <ArrowRight />
              </button>
              <button className="price-list-next p-2 xxs:p-2.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200 shadow-sm touch-target active:scale-95 text-gray-600">
                <ArrowLeft />
              </button>
            </div>
          </div>

          {/* کاروسل */}
          <div className="p-2 xxs:p-3 sm:p-4 md:p-6" dir="rtl">
            <Swiper
              modules={[Navigation]}
              className="w-full"
              spaceBetween={10}
              slidesPerView={1}
              navigation={{
                nextEl: ".price-list-next",
                prevEl: ".price-list-prev",
              }}
              breakpoints={{
                368: { slidesPerView: 1, spaceBetween: 10 },
                480: { slidesPerView: 1.3, spaceBetween: 12 },
                640: { slidesPerView: 2, spaceBetween: 15 },
                768: { slidesPerView: 2.5, spaceBetween: 15 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1280: { slidesPerView: 4, spaceBetween: 20 },
              }}
            >
              {items.map((item) => (
                <SwiperSlide key={item.id}>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all h-full flex flex-col">
                    {/* برند و تاریخ */}
                    <div className="bg-gray-50 px-2 xxs:px-3 py-1.5 xxs:py-2 border-b border-gray-200">
                      <div className="flex items-center justify-between text-[10px] xxs:text-xs text-gray-600">
                        <span className="font-semibold">اقتصاد آنلاین</span>
                        <span>{formatJalaliMonth(item.publishedAt)}</span>
                      </div>
                    </div>

                    {/* عنوان جدول */}
                    <div className="px-2 xxs:px-3 py-1.5 xxs:py-2 bg-white border-b border-gray-200">
                      <h3 className="text-[11px] xxs:text-xs sm:text-sm font-bold text-gray-800 text-right line-clamp-2">
                        {extractTableTitle(item.table || '', item.title)}
                      </h3>
                    </div>

                    {/* جدول قیمت */}
                    <div className="px-2 xxs:px-3 py-2 xxs:py-3 flex-1 overflow-x-auto">
                      <div
                        className="price-table-wrapper text-[10px] xxs:text-xs"
                        dangerouslySetInnerHTML={{ __html: item.table || '' }}
                        style={{
                          maxHeight: '350px',
                          overflowY: 'auto',
                        }}
                      />
                    </div>

                    {/* عنوان مقاله و تاریخ */}
                    <div className="px-2 xxs:px-3 py-2 xxs:py-3 bg-gray-50 border-t border-gray-200 mt-auto">
                      <Link
                        href={`/اخبار/${item.slug}`}
                        className="block group"
                      >
                        <h4 className="text-[11px] xxs:text-xs sm:text-sm font-semibold text-gray-800 text-right line-clamp-2 mb-1.5 xxs:mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <div className="text-[9px] xxs:text-[10px] text-gray-500 text-right">
                          {formatDateForDisplay(item.publishedAt)}
                        </div>
                      </Link>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        <style jsx global>{`
        .price-table-wrapper {
          font-size: 10px;
          direction: rtl;
        }
        .price-table-wrapper table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          direction: rtl;
        }
        .price-table-wrapper th,
        .price-table-wrapper td {
          padding: 6px 4px;
          text-align: right;
          border: 1px solid #d1d5db;
          font-size: 10px;
        }
        @media (min-width: 375px) {
          .price-table-wrapper {
            font-size: 11px;
          }
          .price-table-wrapper table {
            font-size: 11px;
          }
          .price-table-wrapper th,
          .price-table-wrapper td {
            padding: 8px 6px;
            font-size: 11px;
          }
        }
        .price-table-wrapper th {
          background-color: #f9fafb;
          font-weight: bold;
          color: #111827;
          white-space: nowrap;
        }
        .price-table-wrapper td {
          color: #374151;
        }
        .price-table-wrapper tr:nth-child(even) {
          background-color: #ffffff;
        }
        .price-table-wrapper tr:nth-child(odd) {
          background-color: #f9fafb;
        }
        .price-table-wrapper tr:hover {
          background-color: #f3f4f6;
        }
        .price-table-wrapper table thead {
          background-color: #f9fafb;
        }
      `}</style>
      </div>
    </section>
  );
}

