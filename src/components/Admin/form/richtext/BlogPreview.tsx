"use client";

import React from 'react';
import Image from 'next/image';

interface BlogPreviewProps {
  title: string;
  content: string;
  image?: string;
  categories?: string[];
  author?: string;
  publishedAt?: Date;
}

export default function BlogPreview({
  title,
  content,
  image,
  categories = [],
  author = "نویسنده",
  publishedAt = new Date(),
}: BlogPreviewProps) {
  // Process content similar to BlogContentRenderer
  const processContent = (html: string): string => {
    if (!html) return '';
    
    // تبدیل h1 به h1 با استایل مناسب
    let processed = html.replace(
      /<h1[^>]*>(.*?)<\/h1>/gi,
      '<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">$1</h1>'
    );
    
    // تبدیل h2 به h2 با استایل primary
    processed = processed.replace(
      /<h2[^>]*>(.*?)<\/h2>/gi,
      '<h2 class="text-2xl font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg my-6">$1</h2>'
    );
    
    // تبدیل h3 به h3
    processed = processed.replace(
      /<h3[^>]*>(.*?)<\/h3>/gi,
      '<h3 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-4">$1</h3>'
    );
    
    // تبدیل h4 به h4
    processed = processed.replace(
      /<h4[^>]*>(.*?)<\/h4>/gi,
      '<h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-5 mb-3">$1</h4>'
    );
    
    // تبدیل h5 به h5
    processed = processed.replace(
      /<h5[^>]*>(.*?)<\/h5>/gi,
      '<h5 class="text-base font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">$1</h5>'
    );
    
    // تبدیل h6 به h6
    processed = processed.replace(
      /<h6[^>]*>(.*?)<\/h6>/gi,
      '<h6 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-3 mb-2">$1</h6>'
    );
    
    // بهبود استایل پاراگراف‌ها
    processed = processed.replace(
      /<p[^>]*>/gi,
      '<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">'
    );
    
    // بهبود استایل لیست‌ها
    processed = processed.replace(
      /<ul[^>]*>/gi,
      '<ul class="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">'
    );
    
    processed = processed.replace(
      /<ol[^>]*>/gi,
      '<ol class="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">'
    );
    
    // بهبود استایل blockquote
    processed = processed.replace(
      /<blockquote[^>]*>/gi,
      '<blockquote class="border-r-4 border-blue-500 pr-4 py-2 my-4 italic text-gray-600 dark:text-gray-400">'
    );
    
    // بهبود استایل تصاویر
    processed = processed.replace(
      /<img([^>]*)>/gi,
      (match, attrs) => {
        // Extract src if exists
        const srcMatch = attrs.match(/src=["']([^"']+)["']/);
        const src = srcMatch ? srcMatch[1] : '';
        const altMatch = attrs.match(/alt=["']([^"']*)["']/);
        const alt = altMatch ? altMatch[1] : '';
        
        // Ensure image has proper styling
        return `<img src="${src}" alt="${alt}" class="max-w-full h-auto rounded-lg my-4" style="display: block; margin: 1rem auto;" />`;
      }
    );
    
    // بهبود استایل ویدیوها
    processed = processed.replace(
      /<video([^>]*)>/gi,
      '<video$1 class="max-w-full h-auto rounded-lg my-4" style="display: block; margin: 1rem auto;" controls>'
    );
    
    // بهبود استایل iframe (YouTube, Vimeo)
    processed = processed.replace(
      /<iframe([^>]*)>/gi,
      '<iframe$1 class="w-full rounded-lg my-4" style="aspect-ratio: 16/9; display: block; margin: 1rem auto;" allowfullscreen>'
    );
    
    return processed;
  };

  const formattedDate = publishedAt.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* محتوای اصلی */}
          <article className="lg:col-span-8">
            {/* Breadcrumb */}
            <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 space-x-reverse flex-wrap">
                <li><span className="hover:text-gray-900 transition-colors">خانه</span></li>
                <li>/</li>
                <li><span className="hover:text-gray-900 transition-colors">اخبار</span></li>
                {categories.map((cat, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="mx-2">/</span>
                    <span className="hover:text-gray-900 transition-colors">{cat}</span>
                  </li>
                ))}
                <li className="flex items-center">
                  <span className="mx-2">/</span>
                  <span className="text-gray-900 font-medium">{title || "بدون عنوان"}</span>
                </li>
              </ol>
            </nav>

            {/* نوار ابزار */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">نویسنده:</span>
                  <span className="text-gray-900 dark:text-white">{author}</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {title || "بدون عنوان"}
            </h1>

            {/* Featured Image */}
            {image && (
              <div className="mb-8 bg-primary rounded-lg p-4">
                <div className="relative w-full h-auto">
                  <img
                    src={image.startsWith('http') || image.startsWith('/') ? image : `/uploads/blogs/${image}`}
                    alt={title || "تصویر بلاگ"}
                    className="w-full h-auto rounded-lg"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="blog-content">
              <div
                className="prose prose-lg max-w-none dark:prose-invert"
                dir="rtl"
                style={{ textAlign: "right" }}
                dangerouslySetInnerHTML={{ __html: processContent(content || "") }}
              />
            </div>
          </article>
        </div>
      </div>
      
      <style jsx global>{`
        .blog-content img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 1rem auto !important;
          border-radius: 8px;
        }
        .blog-content video {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 1rem auto !important;
          border-radius: 8px;
        }
        .blog-content iframe {
          max-width: 100% !important;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}









