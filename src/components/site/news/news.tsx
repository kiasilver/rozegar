"use client";
import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useSSE } from "@/hooks/usesse";

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
}

export default function NewsSlider({ category }: { category: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);

  // Refs for navigation buttons
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch(`/api/site/news/${category}`)
      .then((res) => res.json())
      .then((data: NewsItem[]) => setItems(data))
      .catch(error => console.error(`Error fetching news for ${category}:`, error));
  }, [category]);

  // Use SSE for real-time updates
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new-blog' || message.type === 'blog-updated') {
        fetch(`/api/site/news/${category}`)
          .then((res) => res.ok ? res.json() : [])
          .then((data: NewsItem[]) => setItems(data))
          .catch(e => console.error(e));
      }
    },
  });

  return (
    <section className="relative w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 mt-4 sm:mt-6 md:mt-8 lg:mt-10 overflow-hidden">
      <div className="relative flex flex-col gap-4 sm:gap-6 pt-10 sm:pt-14 mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8 md:mb-10 overflow-hidden">
        {/* برچسب دسته‌بندی با طراحی یکسان - تراز شده با خط */}
        <div className="absolute top-[28px] sm:top-[38px] left-0 right-0 h-[2px] bg-gray-100">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-primary text-white px-6 sm:px-8 py-1 sm:py-1.5 font-bold rounded-tr-md rounded-tl-md text-xs sm:text-sm md:text-base z-10 shadow-sm">
            {category}
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center lg:justify-end mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <button ref={nextRef} className="p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowRight className="w-5 h-5" />
              </button>
              <button ref={prevRef} className="p-2 xxs:p-2.5 rounded-full hover:bg-primary/10 hover:text-primary transition-all border border-gray-200 shadow-sm touch-target active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
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
                480: { slidesPerView: 1.7, spaceBetween: 15 },
                640: { slidesPerView: 2.2, spaceBetween: 15 },
                768: { slidesPerView: 2.5, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1280: { slidesPerView: 4, spaceBetween: 20 },
              }}
            >
              {items.map((item) => (
                <SwiperSlide key={item.id}>
                  <div className="flex flex-col w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white hover:shadow-md transition-all">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-md flex-shrink-0 bg-gray-200">
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
                    <div className="flex flex-col gap-y-1.5 p-2 sm:p-3 flex-1">
                      <h3 className="blog1 pr-2 sm:pr-4 pt-2 text-[13px] sm:text-[14px] md:text-[15px] min-h-[45px] sm:min-h-[50px] leading-[18px] sm:leading-[20px] md:leading-[22px] line-clamp-2 border-t border-gray-300 mt-2 text-right font-semibold text-[#2d2c2c]">
                        {item.title}
                      </h3>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-auto pr-2 sm:pr-4">{item.date}</div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}
