"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  published_at: Date | null;
  view_count: number;
  category?: string;
}

const FeaturedNews: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedNews = async () => {
      try {
        const response = await fetch('/api/v1/public/latest-news?limit=6&featured=true');
        if (response.ok) {
          const data = await response.json();
          setArticles(data);
        }
      } catch (error) {
        console.error('Error fetching featured news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedNews();
  }, []);

  if (loading) {
    return (
      <div className="space-y-1.5 sm:space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 px-2 sm:px-3 md:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1.5 sm:mb-2"></div>
            <div className="h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 px-2 sm:px-3 md:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        خبر برگزیده‌ای یافت نشد
      </div>
    );
  }

  return (
    <div>
      {articles.map((article, index) => (
        <article
          key={article.id}
          className={`bg-white dark:bg-gray-900 px-2 sm:px-3 md:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-gray-200 dark:border-gray-700 ${index === 0 ? 'border-t-0' : ''}`}
        >
          <div className="flex flex-row-reverse gap-2 sm:gap-3">
            <div className="hidden sm:block sm:basis-56 flex flex-row max-w-[80px] sm:max-w-[100px] min-w-[80px] sm:min-w-[100px] flex-shrink-0">
              <span className="w-full px-1 sm:px-2 flex max-w-[70px] sm:max-w-[80px]">
                <Image
                  src={article.image || '/images/logo/logo.png'}
                  alt={article.title}
                  width={80}
                  height={80}
                  className="rounded-lg sm:rounded-xl aspect-square h-full w-full object-cover"
                />
              </span>
            </div>
            <div className="flex flex-col justify-between w-full min-w-0">
              <Link href={`/اخبار/${article.slug}`} className="flex flex-row group">
                <h3 className="mt-[-5px] text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">
                {article.published_at && (
                  <time>
                    {new Date(article.published_at).toLocaleDateString('fa-IR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {article.view_count > 0 && (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {article.view_count.toLocaleString('fa-IR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default FeaturedNews;

