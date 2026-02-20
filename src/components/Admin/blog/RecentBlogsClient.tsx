'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import DOMPurify from 'dompurify';


interface Blog {
  title: string;
  content: string;
  image: string;
  blogcategory?: {
    name: string;
  }[] | null; // تغییر به آرایه برای چند دسته‌بندی
}

export default function RecentBlogsClient({ refreshBlogs }: { refreshBlogs: boolean }) {
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([]);
  

  // تابع برای فراخوانی بلاگ‌ها از سرور
  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/content/blogs/recent');
      if (!res.ok) {
        throw new Error('Error fetching blogs');
      }
      const data = await res.json();
      setRecentBlogs(data);
    } catch (error) {
      console.error("Error fetching recent blogs:", error);
    }
  };

  // استفاده از useEffect برای لود بلاگ‌ها هر زمان که refreshBlogs تغییر کند
  useEffect(() => {
    fetchBlogs();
  }, [refreshBlogs]); // هر بار که refreshBlogs تغییر کند، این effect دوباره اجرا می‌شود
  return (
    <article className="rounded-[10px] border  px-4 pt-6 pb-4 dark:border-gray-700 dark:bg-gray-900 mt-6">

      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        بلاگ های آخیر
      </h4>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {recentBlogs.map((blog, index) => (
          <li key={index} className="rounded-lg overflow-hidden shadow hover:shadow-lg dark:shadow-gray-dark transition p-4">
            <Image src={blog.image} alt={blog.title} width={1280} height={900} className='w-full  object-contain ' />

            <div className="py-4">
              {/* چپ‌چین کردن دسته‌بندی */}
              <div className=" mb-2">
                {blog.blogcategory?.length ? (
                  blog.blogcategory.map((cat, i) => (
                    <span
                      key={i}
                      className="text-xs text-white  bg-blue-600 px-2 py-1 rounded mr-2 mb-2 inline-block"
                    >
                      {cat.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white bg-gray-600 px-2 py-1 rounded">
                    بدون دسته‌بندی
                  </span>
                )}
              </div>

              <h3 className="mt-2 font-bold text-lg text-black dark:text-gray-50">{blog.title}</h3>

              <div
                className="text-sm text-gray-600 dark:text-gray-300 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(blog.content, {
                    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'a', 'img'],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
                  }),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
