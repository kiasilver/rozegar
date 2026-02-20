"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";

interface NewsItem {
  id: number;
  img: string;
  title: string;
  date: string;
  slug?: string;
  description?: string;
}

interface CategorySlideshowProps {
  category: string;
  categoryName: string;
  maxItems?: number;
}

// تابع فرمت تاریخ شمسی
function formatJalaliDate(dateString: string): string {
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
    .substring(0, 100);
}

const ArrowLeft = () => (
  <svg className="text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ArrowRight = () => (
  <svg className="text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function CategorySlideshow({ 
  category, 
  categoryName,
  maxItems = 12 
}: CategorySlideshowProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/site/news/${encodeURIComponent(category)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: NewsItem[]) => {
        console.log(`[CategorySlideshow] Fetched ${data.length} items for category: ${category}`);
        // فیلتر کردن - فقط لوگوها را حذف کن، بقیه را نگه دار
        const itemsWithImage = data.filter((item) => {
          const img = item.img || '';
          // فقط لوگوهای مشخص را حذف کن
          const hasLogo = img.includes('/images/logo/') || 
                         img.includes('logo.png') || 
                         img.includes('logo.svg') ||
                         img.includes('/logo/');
          if (hasLogo) return false;
          // بقیه را نگه دار (حتی اگر عکس نداشته باشد)
          return true;
        });
        console.log(`[CategorySlideshow] After filtering: ${itemsWithImage.length} items`);
        // محدود کردن تعداد
        const finalItems = itemsWithImage.slice(0, maxItems);
        setItems(finalItems);
        setLoading(false);
      })
      .catch((error) => {
        console.error(`[CategorySlideshow] Error fetching news for ${category}:`, error);
        setLoading(false);
      });
  }, [category, maxItems]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        <div className="bg-primary text-white px-4 py-3">
          <span className="text-sm font-bold">{categoryName}</span>
        </div>
        <div className="p-4 flex items-center justify-center h-64">
          <div className="text-gray-500 text-sm">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    // نمایش بلاک خالی با پیام برای دیباگ
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        <div className="bg-primary text-white px-4 py-3">
          <span className="text-sm font-bold">{categoryName}</span>
        </div>
        <div className="p-4 flex items-center justify-center h-64">
          <div className="text-gray-500 text-sm">هیچ خبری یافت نشد</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* هدر با رنگ Primary */}
      <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{categoryName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className={`category-slideshow-prev-${category.replace(/\s+/g, '-')} p-1 rounded hover:bg-white/20 transition-colors`}>
            <ArrowRight />
          </button>
          <button className={`category-slideshow-next-${category.replace(/\s+/g, '-')} p-1 rounded hover:bg-white/20 transition-colors`}>
            <ArrowLeft />
          </button>
        </div>
      </div>

      {/* کاروسل */}
      <div className="p-4 flex-1" dir="rtl">
        <Swiper
          modules={[Navigation, Autoplay]}
          className="w-full h-full"
          spaceBetween={15}
          slidesPerView={1}
          navigation={{
            nextEl: `.category-slideshow-next-${category.replace(/\s+/g, '-')}`,
            prevEl: `.category-slideshow-prev-${category.replace(/\s+/g, '-')}`,
          }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          breakpoints={{
            480: { slidesPerView: 1.5, spaceBetween: 15 },
            640: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 2.5, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 20 },
          }}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <Link
                href={item.slug ? `/news/${item.slug}` : '#'}
                className="flex flex-col w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white hover:shadow-md transition-all"
              >
                {item.img && !item.img.includes('/images/logo/') && !item.img.includes('logo.png') && !item.img.includes('logo.svg') && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-md flex-shrink-0 bg-gray-200">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-y-1.5 p-2 sm:p-3 flex-1">
                  <h3 className="text-[13px] sm:text-[14px] md:text-[15px] min-h-[45px] sm:min-h-[50px] leading-[18px] sm:leading-[20px] md:leading-[22px] line-clamp-2 border-t border-gray-300 mt-2 text-right font-semibold text-[#2d2c2c]">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] sm:text-[12px] text-gray-600 text-right line-clamp-2">
                      {stripHtml(item.description)}
                    </p>
                  )}
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-auto">
                    📅 {formatJalaliDate(item.date)}
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

