"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaTimes, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  image?: string;
  published_at?: string;
  category?: {
    name: string;
    slug: string;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/public/search?q=${encodeURIComponent(query.trim())}&limit=10`);
        if (!response.ok) {
          throw new Error('خطا در جستجو');
        }
        const data = await response.json();
        
        // Format results (API returns 'results' not 'posts')
        const posts = data.results || data.posts || [];
        const formattedResults: SearchResult[] = posts.map((post: any) => {
          const translation = post.translations?.[0];
          const category = post.blogcategory?.[0]?.translations?.[0];
          
          return {
            id: post.id,
            title: translation?.title || 'بدون عنوان',
            slug: translation?.slug || post.slug || post.id.toString(),
            excerpt: translation?.excerpt || '',
            image: post.image,
            published_at: post.published_at,
            category: category ? {
              name: category.name,
              slug: category.slug,
            } : undefined,
          };
        });
        
        setResults(formattedResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    setDebounceTimer(timer);
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query]);

  const handleResultClick = (slug: string) => {
    router.push(`/news/${slug}`);
    onClose();
    setQuery('');
    setResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
      setQuery('');
      setResults([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
            <FaSearch className="text-gray-400 text-lg" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در مقالات و اخبار..."
              className="flex-1 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
            />
            {loading && <FaSpinner className="animate-spin text-gray-400" />}
          </form>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="بستن"
          >
            <FaTimes className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FaSearch className="mx-auto mb-4 text-4xl opacity-50" />
              <p>برای جستجو، حداقل 2 کاراکتر وارد کنید</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FaSpinner className="mx-auto mb-4 text-4xl animate-spin" />
              <p>در حال جستجو...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>نتیجه‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.slug)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right flex items-start gap-4 group"
                >
                  {result.image && (
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={result.image}
                        alt={result.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      dangerouslySetInnerHTML={{ __html: result.title }}
                    />
                    {result.excerpt && (
                      <p
                        className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      {result.category && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {result.category.name}
                        </span>
                      )}
                      {result.published_at && (
                        <span>
                          {new Date(result.published_at).toLocaleDateString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {query.trim().length >= 2 && results.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={onClose}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              مشاهده همه نتایج ({results.length}+)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

