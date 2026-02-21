/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Parallax, Pagination, Navigation, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

type Slide = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  alt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  categoryName: string | null;
  authorName: string | null;
  createdAt: string | null;
};

// تاریخ جلالی با Intl
// تاریخ جلالی با ساعت و دقیقه
function formatJalali(iso: string) {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
    const timePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
    return `${datePart} - ${timePart}`;
  } catch {
    return '';
  }
}


const ImageSlider = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // state برای هاور هر اسلاید
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchSlides = async () => {
      try {
        console.log('🔄 [Slider] Fetching slider data...');
        const res = await fetch('/api/v1/public/slider', {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!res.ok) {
          throw new Error(`Failed to load slider: ${res.status}`);
        }

        const data: Slide[] = await res.json();
        console.log(`✅ [Slider] Loaded ${data.length} slides`);

        if (alive) {
          setSlides(data.slice(0, 3));
          setError(null);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error('❌ [Slider] Fetch error:', errorMsg);

        // Retry logic
        if (retryCount < maxRetries && alive) {
          retryCount++;
          console.log(`🔄 [Slider] Retrying... (${retryCount}/${maxRetries})`);
          setTimeout(() => fetchSlides(), 2000 * retryCount); // Exponential backoff
        } else if (alive) {
          setError(errorMsg);
        }
      } finally {
        if (alive && retryCount >= maxRetries) {
          setLoading(false);
        } else if (alive && error === null) {
          setLoading(false);
        }
      }
    };

    fetchSlides();

    return () => {
      alive = false;
    };
  }, []);

  // Loading state - show skeleton
  if (loading) {
    return (
      <div className="rounded-xl w-full h-[250px] xs:h-[300px] sm:h-[350px] md:h-[400px] lg:h-[350px] xl:h-[400px] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse flex items-center justify-center">
        <div className="text-gray-500 text-sm">در حال بارگذاری اسلایدر...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl w-full h-[250px] xs:h-[300px] sm:h-[350px] md:h-[400px] lg:h-[350px] xl:h-[400px] bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
        <div className="text-center p-4">
          <p className="text-gray-600 text-sm mb-2">خطا در بارگذاری اسلایدر</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline text-xs"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  // Empty state - show fallback message
  if (!slides.length) {
    return (
      <div className="rounded-xl w-full h-[250px] xs:h-[300px] sm:h-[350px] md:h-[400px] lg:h-[350px] xl:h-[400px] bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">هیچ اسلایدی موجود نیست</p>
      </div>
    );
  }


  return (
    <Swiper
      dir="rtl"
      speed={1000}
      parallax
      pagination={{ clickable: true }}
      navigation={true}
      autoplay={{ delay: 4500, disableOnInteraction: false }}
      loop
      modules={[Parallax, Pagination, Navigation, Autoplay]}
      className="mySwiper relative rounded-xl overflow-hidden group w-full h-full"
    >
      <style jsx global>{`
        .swiper-button-next, .swiper-button-prev {
          color: white !important;
          width: 40px !important;
          height: 40px !important;
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          display: none !important; /* Hide by default (mobile) */
          align-items: center;
          justify-content: center;
          opacity: 0; 
          transition: opacity 0.3s ease;
          z-index: 50;
        }
        @media (min-width: 640px) {
          .swiper-button-next, .swiper-button-prev {
            display: flex !important;
          }
        }
        .swiper-button-next {
          left: 10px !important;
          right: auto !important;
        }
        .swiper-button-prev {
          right: 10px !important;
          left: auto !important;
        }
        .swiper-button-next::after, .swiper-button-prev::after {
          font-size: 18px !important;
          font-weight: bold;
        }
        .mySwiper:hover .swiper-button-next,
        .mySwiper:hover .swiper-button-prev {
          opacity: 1;
        }
        .swiper-pagination-bullet-active {
          background: #fff !important;
        }
      `}</style>
      {slides.map((s, index) => (
        <SwiperSlide key={s.id} className="relative w-full h-full">
          {/* تصویر اصلی */}
          <div className="absolute inset-0 w-full h-full">
            <img
              alt={s.alt || s.title}
              src={s.imageUrl}
              className="w-full h-full object-cover"
            />
          </div>


          {/* کپشن */}
          <div className="bg-[rgba(0,0,0,.75)] absolute pt-2 sm:pt-3 pb-8 xs:pb-10 sm:pb-12 md:pb-14 px-3 sm:px-4 text-right text-white bottom-0 w-full z-10 transition-all duration-300">
            {s.categoryName && (
              <span className="bg-primary px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs uppercase w-max font-medium">
                {s.categoryName}
              </span>
            )}

            {/* عنوان با تغییر آیکن روی هاور */}
            <h2
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex items-center font-bold text-sm xs:text-base md:text-lg lg:text-base xl:text-lg leading-tight sm:leading-snug text-white overflow-hidden text-ellipsis line-clamp-2 mt-1.5 sm:mt-2 mb-4 xs:mb-6 sm:mb-8"
            >
              <span className="inline-block w-2.5 xs:w-3 md:w-3.5 ml-1.5 xs:ml-2 flex-shrink-0">
                <img
                  src={
                    hoveredIndex === index
                      ? '/images/titr/titr.png'
                      : '/images/titr/titr-fff.png'
                  }
                  alt=""
                  className=""
                />
              </span>
              <span className="flex-1">{s.title}</span>
            </h2>

            <div className="text-[10px] sm:text-xs mt-2 absolute left-0 bottom-[12px] sm:bottom-[16px] lg:bottom-[20px] bg-[#FFFFFF4D] rounded-br-sm rounded-tr-sm py-1.5 sm:py-2 px-2 sm:px-4">
              {s.createdAt && <span>📅 {formatJalali(s.createdAt)}</span>}

            </div>
          </div>

          {/* لینک روی کل اسلاید */}
          {s.linkUrl && (
            <a
              href={s.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-0"
              aria-label={s.title}
            />
          )}
        </SwiperSlide>
      ))}
    </Swiper>
  );
};


export default ImageSlider;
