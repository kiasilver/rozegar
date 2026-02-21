"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSSE } from "@/hooks/usesse";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  img?: string;
  image?: string | null;
  date?: string;
  published_at?: string | null;
  view_count?: number;
  category?: string;
}

function formatJalaliDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

export default function MostViewedSidebar() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // دریافت اخبار داغ (پربازدیدترین)
    const fetchHotNews = async () => {
      try {
        console.log('Fetching most viewed news...');
        const newsRes = await fetch(`/api/site/news/most-viewed`);

        if (!newsRes.ok) {
          throw new Error(`HTTP error! status: ${newsRes.status}`);
        }

        const data = await newsRes.json();
        // فیلتر کردن فقط مواردی که عکس معتبر دارند
        const formattedItems = data
          .slice(0, 5) // کاهش به ۵ مورد برای هم‌ترازی با ارتفاع اسلایدر
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            image: item.img || item.image || null,
            published_at: item.date || item.published_at || null,
            view_count: item.view_count || 0,
            category: item.category,
          }));

        setItems(formattedItems);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching hot news:', error);
        setLoading(false);
      }
    };

    fetchHotNews();
  }, [loading]); // Only on mount

  // Use SSE for real-time updates
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new-blog' || message.type === 'blog-updated' || message.type === 'view-count-updated') {
        // Refresh hot news
        fetch(`/api/site/news/most-viewed`)
          .then(res => res.ok ? res.json() : [])
          .then(data => {
            const formattedItems = data
              .slice(0, 5)
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                slug: item.slug,
                image: item.img || item.image || null,
                published_at: item.date || item.published_at || null,
                view_count: item.view_count || 0,
                category: item.category,
              }));
            setItems(formattedItems);
          })
          .catch(e => console.error(e));
      }
    },
  });

  if (loading) {
    return (
      <div className="relative mt-12 lg:mt-0">
        <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
          <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
            اخبار داغ
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
        </div>
        <div className="bg-white rounded-b-md shadow-sm border border-gray-200 relative pb-2 sm:pb-3 overflow-hidden pt-4 border-t-0">
          <div className="text-center py-6 text-xs text-gray-500">
            در حال بارگذاری...
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-12 lg:mt-0">
      <div className="absolute top-[-40px] right-0 left-0 z-10 h-[40px]">
        <div className="absolute right-0 top-0 inline-block bg-primary text-white px-3 xxs:px-4 sm:px-6 md:px-8 py-1.5 xxs:py-2 sm:py-2 font-bold rounded-tr-md rounded-tl-md text-[11px] xxs:text-xs sm:text-sm md:text-base shadow-sm z-20">
          اخبار داغ
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary"></div>
      </div>

      <div className="bg-white rounded-b-md shadow-sm border border-gray-200 relative pb-2 px-2 xs:px-3 overflow-hidden pt-2 border-t-0">

        <div className="flex flex-col">
          {items.slice(0, 5).map((item, index) => (
            <Link
              key={item.id}
              href={`/news/${item.slug}`}
              className="flex items-center gap-3 xs:gap-3.5 group hover:bg-gray-50 p-2 sm:p-3 rounded-lg transition-colors border-b border-gray-100 last:border-0"
            >
              {/* Image - Right Column */}
              <div className="flex-shrink-0 w-20 h-16 xs:w-24 xs:h-[72px] sm:w-[110px] sm:h-[84px] rounded-md overflow-hidden bg-gray-100 border border-gray-200 shadow-sm relative">
                <img
                  src={item.image || '/images/logo/logo.png'}
                  alt={item.title}
                  className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/logo/logo.png';
                  }}
                />
              </div>

              {/* Content - Left Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-16 xs:h-[72px] sm:h-[84px]">
                <h3 className="text-[13px] xs:text-[14px] sm:text-[15px] font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors leading-[22px] xs:leading-[24px]">
                  {item.title}
                </h3>

                {/* Date/Time - Bottom Left */}
                <div className="mt-auto w-full text-left">
                  <span className="text-[10px] xs:text-[11px] text-gray-500 inline-block font-medium" dir="rtl">
                    📅 {formatJalaliDate(item.published_at ?? null)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

