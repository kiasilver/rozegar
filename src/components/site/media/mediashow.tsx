"use client";

import AdVideoPlayer from "@/components/site/videoplayer/advideoplayer";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSSE } from "@/hooks/usesse";

interface BlogItem {
  id: number;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image?: string;
  category?: string;
  hasVideo?: boolean;
}

function formatJalaliDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    return `${datePart} - ${timePart}`;
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

const MediaShow: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [allNews, setAllNews] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'infographic'>('video');

  // Function to fetch blogs
  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/v1/public/blogs?limit=50');
      const data: BlogItem[] = await res.json();
      setAllNews(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching media blogs:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchBlogs();

    // Initial fetch
    fetchBlogs();
  }, []);

  // Use SSE for real-time updates
  useSSE('/api/sse', {
    onMessage: (message) => {
      if (message.type === 'new-blog' || message.type === 'current') {
        // Refresh blogs when new blog is published
        fetchBlogs();
      }
    },
  });

  // Random کردن و انتخاب محتوا - فیلتر بر اساس تب فعال
  const mediaContent = useMemo(() => {
    if (allNews.length === 0) return null;

    // فیلتر کردن بر اساس تب فعال
    let filteredItems: BlogItem[];

    if (activeTab === 'video') {
      // فقط مواردی که ویدیو دارند
      filteredItems = allNews.filter((item) => {
        const img = item.image;
        if (!img || img.length === 0) return false;
        // بررسی وجود ویدیو
        return item.hasVideo === true;
      });
    } else {
      // برای تب "اینفوگرافی" - همه موارد با عکس (بدون نیاز به ویدیو)
      filteredItems = allNews.filter((item) => {
        const img = item.image;
        if (!img || img.length === 0) return false;
        return true;
      });
    }

    if (filteredItems.length === 0) return null;
    const shuffled = shuffleArray(filteredItems);
    return {
      mainVideo: shuffled[0],
      sideItems: shuffled.slice(1, Math.min(4, shuffled.length))
    };
  }, [allNews, activeTab]);

  if (loading) {
    return (
      <div className="w-full mt-12 max-w-[1600px] m-auto sm:mt-7 grid grid-cols-1 gap-4 sm:gap-6 bg-[#191a1a]">
        <div className="w-4xl ">
          <div className="w-full flex justify-center items-center h-[300px] sm:h-[400px] px-6 sm:px-8 md:px-12 lg:px-16">
            <div className="text-white text-lg">در حال بارگذاری چند رسانه‌ای...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!mediaContent || !mediaContent.mainVideo) {
    return null;
  }

  return (
    <div className="w-full mt-12 sm:mt-12 grid grid-cols-1 gap-4 sm:gap-6 pb-5 bg-[#191a1a]">
      <div className="w-full max-w-[1600px] m-auto">
        <div className="w-full flex justify-center pt-12 sm:pt-16 md:pt-20 lg:pt-[80px] px-6 sm:px-8 md:px-12 lg:px-16">
          <div className="flex flex-col gap-4 sm:gap-6 pt-4 relative w-full max-w-[1600px]">

            <div className="flex items-center justify-between w-full flex-row-reverse border-b-1 border-[#787878] pb-3" style={{ marginBottom: '20px' }}>
              <Link
                href="/media"
                style={{ color: '#fff' }}
                className="moreSecImg flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                بیشتر
                <svg width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6.5L6 9.5M6 9.5L9 12.5M6 9.5H12M5.85 16.25H12.15C13.4101 16.25 14.0402 16.25 14.5215 16.0048C14.9448 15.789 15.289 15.4448 15.5048 15.0215C15.75 14.5402 15.75 13.9101 15.75 12.65V6.35C15.75 5.08988 15.75 4.45982 15.5048 3.97852C15.289 3.55516 14.9448 3.21095 14.5215 2.99524C14.0402 2.75 13.4101 2.75 12.15 2.75H5.85C4.58988 2.75 3.95982 2.75 3.47852 2.99524C3.05516 3.21095 2.71095 3.55516 2.49524 3.97852C2.25 4.45982 2.25 5.08988 2.25 6.35V12.65C2.25 13.9101 2.25 14.5402 2.49524 15.0215C2.71095 15.4448 3.05516 15.789 3.47852 16.0048C3.95982 16.25 4.58988 16.25 5.85 16.25Z" stroke="#fff" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </Link>
              <div className="flex items-center gap-2 flex-row-reverse   ">
                <span
                  className="text-white font-bold text-sm sm:text-base"
                  style={{
                    border: 'unset',
                    padding: '10px',
                    background: 'unset',
                    width: 'auto',

                    borderRadius: 'unset'
                  }}
                >
                  چند رسانه ای
                </span>
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6C3 4.34315 4.34315 3 6 3H14C15.6569 3 17 4.34315 17 6V14C17 15.6569 15.6569 17 14 17H6C4.34315 17 3 15.6569 3 14V6Z" stroke="white" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M21 7V18C21 19.6569 19.6569 21 18 21H7" stroke="white" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9 12V8L12.1429 10L9 12Z" fill="white" stroke="white" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex text-xs  sm:text-sm justify-center pb-3 sm:pb-4  gap-3 sm:gap-4 w-full">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1 sm:px-4 sm:py-2 rounded transition-colors ${activeTab === 'video'
                  ? 'bg-white text-[#191a1a] font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                ویدئو
              </button>
              <button
                onClick={() => setActiveTab('infographic')}
                className={`px-3 py-1 sm:px-4 sm:py-2 rounded transition-colors ${activeTab === 'infographic'
                  ? 'bg-white text-[#191a1a] font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                اینفوگرافی
              </button>
            </div>
          </div>
        </div>

        <div className="w-full flex pb-6 sm:pb-8 px-6 sm:px-8 md:px-12 lg:px-16 mt-8">
          <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-[1.2fr_1fr] w-full max-w-[1600px] min-h-[300px] sm:min-h-[400px] lg:h-[470px] overflow-hidden">
            <article className="h-[250px] sm:h-[350px] lg:h-[inherit] w-full">
              <div className="h-full relative w-full">
                <Link
                  href={mediaContent.mainVideo.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10"
                  aria-label={mediaContent.mainVideo.title}
                />
                <AdVideoPlayer
                  className="w-full h-full rounded-sm [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>video]:rounded-sm"
                  poster={mediaContent.mainVideo.image}
                  sources={[{ src: "/videos/test2.mp4", type: "video/mp4" }]}
                  maxAdsPerPlayback={1}
                  autoPlay={false}
                  controls={false}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* اوورلی توضیحات روی ویدئو */}
                <div
                  className={
                    "description_video w-full pointer-events-none bottom-0 bg-[#2D2C2CB2] absolute px-4 sm:px-6 lg:px-7 py-6 sm:py-8 lg:py-10 " +
                    "transition-opacity duration-300 " +
                    (isPlaying ? "opacity-0" : "opacity-100")
                  }
                >
                  <h3 className="blog pb-2 sm:pb-3 m-0 leading-[22px] sm:leading-[25px] text-[16px] sm:text-[18px] lg:text-[20px] font-bolder text-white text-right line-clamp-2">
                    {mediaContent.mainVideo.title}
                  </h3>
                  {mediaContent.mainVideo.description && (
                    <h5 className="ps-2 sm:ps-4 overflow-hidden text-ellipsis line-clamp-2 mt-2 text-white text-xs sm:text-sm">
                      {stripHtml(mediaContent.mainVideo.description)}
                    </h5>
                  )}
                </div>
              </div>
            </article>

            {/* ستون راست لیست‌ها */}
            <div className="flex gap-3 sm:gap-4 w-full flex-col">
              {mediaContent.sideItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 sm:gap-4 max-h-min h-max border-[#7d7d7d] border-b-1 pb-3 flex-shrink-0 hover:bg-white/5 transition-colors rounded-sm p-1 -m-1"
                >
                  <div className="relative w-[100px] sm:w-[150px] md:w-[180px] lg:max-w-[210px] h-[70px] sm:h-[80px] md:h-[90px] flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-sm"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex justify-between flex-col flex-1 min-w-0">
                    <h3 className="blog m-0 leading-[20px] sm:leading-[22px] lg:leading-[25px] text-[13px] sm:text-[14px] lg:text-[15px] font-bold text-[#fff] text-right line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="text-[10px] sm:text-xs text-white mt-1">
                      📅 {formatJalaliDate(item.pubDate)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaShow;
