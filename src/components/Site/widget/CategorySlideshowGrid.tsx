"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const CategorySlideshow = dynamic(() => import("./CategorySlideshow"), {
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 animate-pulse">
      <div className="bg-gray-200 h-12"></div>
      <div className="p-4 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  ),
});

interface Category {
  id: number;
  name: string;
  slug?: string;
}

interface CategorySlideshowGridProps {
  categories: Category[];
}

const ArrowLeft = () => (
  <svg className="text-gray-600 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ArrowRight = () => (
  <svg className="text-gray-600 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function CategorySlideshowGrid({ categories }: CategorySlideshowGridProps) {
  const [visibleCategories, setVisibleCategories] = useState<Category[]>([]);

  useEffect(() => {
    // فقط دسته‌هایی که داده دارند را نمایش بده
    console.log(`[CategorySlideshowGrid] Received ${categories.length} categories:`, 
      categories.map(c => c.name).join(', '));
    setVisibleCategories(categories);
  }, [categories]);

  if (visibleCategories.length === 0) {
    console.log('[CategorySlideshowGrid] No categories to display');
    return null;
  }

  return (
    <section className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-6 sm:mt-8 lg:mt-10">
      {/* کاروسل با 4 بلاک افقی */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button className="category-grid-prev p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
              <ArrowRight />
            </button>
            <button className="category-grid-next p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
              <ArrowLeft />
            </button>
          </div>
        </div>
        <Swiper
          modules={[Navigation]}
          className="w-full"
          spaceBetween={20}
          slidesPerView={1}
          navigation={{
            nextEl: ".category-grid-next",
            prevEl: ".category-grid-prev",
          }}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 2.5, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 20 },
          }}
        >
          {visibleCategories.map((category) => (
            <SwiperSlide key={category.id}>
              <CategorySlideshow
                category={category.name}
                categoryName={category.name}
                maxItems={8}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

