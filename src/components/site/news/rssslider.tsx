"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";

// Use simple arrow icons instead of MUI to reduce bundle size
const ArrowLeft = ({ className = "text-gray-600 w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ArrowRight = ({ className = "text-gray-600 w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface RSSItem {
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
    .substring(0, 100);
}

interface RSSSliderProps {
  rssUrl: string;
  title: string;
  maxItems?: number;
}

export default function RSSSlider({ rssUrl, title, maxItems = 8 }: RSSSliderProps) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/site/rss?url=${encodeURIComponent(rssUrl)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: RSSItem[]) => {
        // فیلتر کردن فقط مواردی که عکس معتبر دارند
        const itemsWithImage = data.filter((item) => {
          const img = item.image;
          if (!img || img.length === 0) return false;
          const hasLogo = img.includes('/images/logo/logo.png') || img.includes('logo.png') || img.includes('logo.svg');
          const hasValidImage = img.includes('http') || img.includes('uploads') || img.includes('image') || img.includes('media');
          return !hasLogo && hasValidImage;
        });
        // Random کردن و محدود کردن تعداد
        const shuffled = [...itemsWithImage].sort(() => Math.random() - 0.5);
        setItems(shuffled.slice(0, maxItems));
        setLoading(false);
      })
      .catch((error) => {
        console.error(`Error fetching RSS for ${title}:`, error);
        setLoading(false);
      });
  }, [rssUrl, maxItems, title]);

  if (loading) {
    return (
      <section className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 mt-6 sm:mt-8 md:mt-10">
        <div className="text-center py-8 text-gray-500">در حال بارگذاری {title}...</div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full max-w-[1600px] mx-auto px-1.5 xxs:px-3 sm:px-4 md:px-6 mt-4 sm:mt-6 md:mt-8 lg:mt-10 overflow-hidden">
      <div className="relative flex flex-col gap-4 sm:gap-6 pt-10 sm:pt-14 mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8 md:mb-10 overflow-hidden">
        {/* برچسب دسته‌بندی با طراحی یکسان - تراز شده با خط */}
        <div className="absolute top-[28px] sm:top-[38px] left-0 right-0 h-[2px] bg-gray-100">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-primary text-white px-6 sm:px-8 py-1 sm:py-1.5 font-bold rounded-tr-md rounded-tl-md text-xs sm:text-sm md:text-base z-10 shadow-sm">
            {title}
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center lg:justify-end mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <button className="custom-prev p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95">
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="custom-next p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div dir="rtl" className="w-full">
            <Swiper
              modules={[Navigation, Autoplay]}
              className="w-full overflow-visible lg:overflow-hidden"
              spaceBetween={12}
              slidesPerView={1.1}
              navigation={{ nextEl: ".custom-next", prevEl: ".custom-prev" }}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              breakpoints={{
                360: { slidesPerView: 1.2, spaceBetween: 12 },
                480: { slidesPerView: 1.7, spaceBetween: 15 },
                640: { slidesPerView: 2.2, spaceBetween: 15 },
                768: { slidesPerView: 2.5, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1280: { slidesPerView: 4, spaceBetween: 20 },
              }}
            >
              {items.map((item, index) => (
                <SwiperSlide key={index}>
                  <Link
                    href={item.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-md flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="absolute top-2 right-2 bg-primary text-white px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold rounded uppercase z-10">
                        {title}
                      </span>
                    </div>
                    <div className="flex flex-col gap-y-1.5 p-2 sm:p-3 flex-1">
                      <h3 className="blog1 pr-2 sm:pr-4 pt-2 text-[13px] sm:text-[14px] md:text-[15px] min-h-[45px] sm:min-h-[50px] leading-[18px] sm:leading-[20px] md:leading-[22px] line-clamp-2 border-t border-gray-300 mt-2 text-right font-semibold text-[#2d2c2c]">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] sm:text-[12px] text-gray-600 text-right line-clamp-2 pr-2 sm:pr-4">
                          {stripHtml(item.description)}
                        </p>
                      )}
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-auto pr-2 sm:pr-4">
                        📅 {formatJalaliDate(item.pubDate)}
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}

