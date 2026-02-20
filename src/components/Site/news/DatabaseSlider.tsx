"use client";
import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import "swiper/css/navigation";
import { useSSE } from "@/hooks/useSSE";

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

interface NewsItem {
  id: number;
  img: string;
  title: string;
  date: string;
  slug?: string;
  description?: string;
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

interface DatabaseSliderProps {
  category: string;
  slug?: string;
  title?: string;
  maxItems?: number;
}

export default function DatabaseSlider({
  category,
  slug,
  title,
  maxItems = 12
}: DatabaseSliderProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for navigation buttons
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // If slug is available, use it, otherwise use category name
    const fetchId = slug || category;

    const fetchData = () => {
      fetch(`/api/site/news/${encodeURIComponent(fetchId)}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data: NewsItem[]) => {
          // فیلتر کردن فقط مواردی که عکس معتبر دارند
          const itemsWithImage = data.filter((item) => {
            const img = item.img;
            if (!img || img.length === 0) return false;
            const hasLogo = img.includes('/images/logo/logo.png') || img.includes('logo.png') || img.includes('logo.svg');

            // Relaxed check: Allow if it's not a logo. 
            // Previous check required 'http', 'uploads', 'image', or 'media' which might be too strict.
            // valid if it has content and isn't the fallback logo.
            return !hasLogo;
          });
          // Random کردن و محدود کردن تعداد
          const shuffled = [...itemsWithImage].sort(() => Math.random() - 0.5);
          setItems(shuffled.slice(0, maxItems));
          setLoading(false);
        })
        .catch((error) => {
          console.error(`Error fetching news for ${category}:`, error);
          setLoading(false);
        });
    };

    fetchData();
  }, [category, slug, maxItems]);

  // Use SSE for real-time updates
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new-blog' || message.type === 'blog-updated') {
        const fetchId = slug || category;
        fetch(`/api/site/news/${encodeURIComponent(fetchId)}`)
          .then((res) => res.ok ? res.json() : [])
          .then((data: NewsItem[]) => {
            const itemsWithImage = data.filter((item) => {
              const img = item.img;
              if (!img || img.length === 0) return false;
              const hasLogo = img.includes('/images/logo/logo.png') || img.includes('logo.png') || img.includes('logo.svg');
              const hasValidImage = img.includes('http') || img.includes('uploads') || img.includes('image') || img.includes('media');
              return !hasLogo && hasValidImage;
            });
            const shuffled = [...itemsWithImage].sort(() => Math.random() - 0.5);
            setItems(shuffled.slice(0, maxItems));
          })
          .catch(e => console.error(e));
      }
    },
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 xxs:p-3 sm:p-4 md:p-6">
        <div className="text-center py-6 xxs:py-8 text-gray-500 text-xs xxs:text-sm">
          در حال بارگذاری {title || category}...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const displayTitle = title || category;

  return (
    <div className="relative w-full mt-10">
      {/* برچسب دسته‌بندی با خط آبی زیر آن - دقیقاً در بالای container سفید */}
      <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
        {/* برچسب در سمت راست */}
        <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
          {displayTitle}
        </div>
        {/* خط آبی از چپ تا راست - زیر برچسب */}
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 pt-[40px] p-3 xxs:p-4 sm:p-5 md:p-6">
        <div>
          {/* Navigation Arrows - Centered on Mobile, Right-aligned on Desktop */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-4 sm:mb-6">
            <button ref={nextRef} className="p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowRight className="w-4 h-4 xxs:w-5 xxs:h-5" />
            </button>
            <button ref={prevRef} className="p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowLeft className="w-4 h-4 xxs:w-5 xxs:h-5" />
            </button>
          </div>

          <div dir="rtl" className="w-full overflow-hidden -mx-3 xxs:-mx-4 sm:-mx-5 md:-mx-6 px-3 xxs:px-4 sm:px-5 md:px-6">
            <Swiper
              modules={[Navigation, Autoplay]}
              className="w-full"
              spaceBetween={12}
              slidesPerView={1.1}
              navigation={{
                prevEl: prevRef.current,
                nextEl: nextRef.current,
              }}
              onBeforeInit={(swiper) => {
                // @ts-ignore
                swiper.params.navigation.prevEl = prevRef.current;
                // @ts-ignore
                swiper.params.navigation.nextEl = nextRef.current;
              }}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              breakpoints={{
                360: { slidesPerView: 1.2, spaceBetween: 12 },
                480: { slidesPerView: 1.7, spaceBetween: 16 },
                640: { slidesPerView: 2.2, spaceBetween: 16 },
                768: { slidesPerView: 2.5, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 24 },
                1280: { slidesPerView: 4, spaceBetween: 24 },
              }}
            >
              {items.map((item) => (
                <SwiperSlide key={item.id}>
                  <Link
                    href={item.slug ? `/news/${item.slug}` : '#'}
                    className="flex flex-col w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-md shrink-0 bg-gray-200">
                      <img
                        src={item.img || '/images/logo/logo.png'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/logo/logo.png';
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-y-1 xxs:gap-y-1.5 p-1.5 xxs:p-2 sm:p-3 flex-1">
                      <h3 className="blog1 pr-1.5 xxs:pr-2 sm:pr-4 pt-1.5 xxs:pt-2 text-[11px] xxs:text-[13px] sm:text-[14px] md:text-[15px] min-h-[40px] xxs:min-h-[45px] sm:min-h-[50px] leading-[16px] xxs:leading-[18px] sm:leading-[20px] md:leading-[22px] line-clamp-2 border-t border-gray-300 mt-1.5 xxs:mt-2 text-right font-semibold text-[#2d2c2c]">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-[10px] xxs:text-[11px] sm:text-[12px] text-gray-600 text-right line-clamp-2 pr-1.5 xxs:pr-2 sm:pr-4">
                          {stripHtml(item.description)}
                        </p>
                      )}
                      <div className="text-[9px] xxs:text-[10px] sm:text-xs text-gray-500 mt-auto pr-1.5 xxs:pr-2 sm:pr-4">
                        📅 {formatJalaliDate(item.date)}
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
}

