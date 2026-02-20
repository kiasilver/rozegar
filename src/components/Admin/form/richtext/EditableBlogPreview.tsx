"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Video,
  Plus,
} from 'lucide-react';

interface EditableBlogPreviewProps {
  content: string;
  onChange: (content: string) => void;
  title?: string;
  image?: string;
  categories?: string[];
  author?: string;
}

export default function EditableBlogPreview({
  content,
  onChange,
  title = "",
  image = "",
  categories = [],
  author = "نویسنده",
}: EditableBlogPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertMenuPosition, setInsertMenuPosition] = useState({ x: 0, y: 0 });

  // Sync content when prop changes (only if editor is not focused)
  useEffect(() => {
    if (!contentRef.current) return;
    
    const isFocused = document.activeElement === contentRef.current;
    if (isFocused) {
      // Don't update if user is typing
      return;
    }
    
    const currentContent = contentRef.current.innerHTML;
    if (content !== currentContent) {
      if (content && content.trim()) {
        contentRef.current.innerHTML = content;
      } else if (!content || content.trim() === '' || content === '<p></p>' || content === '<br>') {
        contentRef.current.innerHTML = '<p>محتوا را اینجا بنویسید...</p>';
      }
    }
  }, [content]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML;
      // Only update if really different
      if (newContent !== content && newContent.trim() !== content.trim()) {
        onChange(newContent);
      }
    }
  }, [onChange, content]);

  // Insert element at cursor
  const insertElement = (tag: string, content: string = '') => {
    if (!contentRef.current) {
      alert('ویرایشگر در دسترس نیست. لطفاً در محتوا کلیک کنید.');
      return;
    }

    const selection = window.getSelection();
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else if (contentRef.current) {
      range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
    }

    if (!range) {
      alert('نمی‌توان موقعیت درج را پیدا کرد. لطفاً در محتوا کلیک کنید.');
      return;
    }

    const element = document.createElement(tag);
    element.innerHTML = content;
    element.contentEditable = 'true';
    
    range.insertNode(element);
    range.setStartAfter(element);
    range.collapse(true);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleContentChange();
    setShowInsertMenu(false);
  };

  // Insert heading
  const insertHeading = (level: number) => {
    insertElement(`h${level}`, `عنوان ${level}`);
  };

  // Insert image
  const insertImage = async () => {
    if (!contentRef.current) {
      alert('ویرایشگر در دسترس نیست. لطفاً در محتوا کلیک کنید.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      try {
        const res = await fetch('/api/v1/admin/content/blogs/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'خطای نامشخص' }));
          throw new Error(errorData.error || 'خطا در آپلود');
        }

        const data = await res.json();
        if (!data.url) {
          throw new Error('آدرس تصویر دریافت نشد');
        }

        // Ensure absolute URL
        const imageUrl = data.url.startsWith('http') || data.url.startsWith('/') 
          ? data.url 
          : `/${data.url}`;

        const selection = window.getSelection();
        let range: Range | null = null;
        
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0);
        } else if (contentRef.current) {
          // Create range at end of editor
          range = document.createRange();
          range.selectNodeContents(contentRef.current);
          range.collapse(false);
        }

        if (!range) {
          throw new Error('نمی‌توان موقعیت درج را پیدا کرد');
        }

        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'editable-image-wrapper';
        imgWrapper.contentEditable = 'false';
        imgWrapper.style.cssText = 'position: relative; margin: 1rem 0; display: inline-block; width: 100%;';
        
        const img = document.createElement('img');
        // Ensure absolute URL
        const absoluteUrl = imageUrl.startsWith('http') || imageUrl.startsWith('/') 
          ? imageUrl 
          : `/${imageUrl}`;
        img.src = absoluteUrl;
        img.alt = file.name;
        img.className = 'max-w-full h-auto rounded-lg';
        img.style.cssText = 'display: block; margin: 0 auto; max-width: 100%; height: auto; cursor: pointer;';
        img.loading = 'lazy';
        img.onload = () => {
          console.log('✅ تصویر با موفقیت بارگذاری شد:', absoluteUrl);
        };
        img.onerror = () => {
          console.error('❌ خطا در بارگذاری تصویر:', absoluteUrl);
          img.style.border = '2px dashed red';
          img.style.padding = '20px';
          img.alt = 'خطا در بارگذاری تصویر';
          // Try to reload
          setTimeout(() => {
            const newImg = new Image();
            newImg.onload = () => {
              img.src = absoluteUrl;
              img.style.border = '';
              img.style.padding = '';
            };
            newImg.src = absoluteUrl;
          }, 1000);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-image-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = 'position: absolute; top: 8px; left: 8px; background: rgba(239, 68, 68, 0.9); color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: none; font-size: 20px; line-height: 1; z-index: 10;';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          imgWrapper.remove();
          handleContentChange();
        };

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(deleteBtn);

        // Insert after current position
        range.insertNode(imgWrapper);
        
        // Add paragraph after image for text (clickable area)
        const p = document.createElement('p');
        p.innerHTML = 'متن را اینجا بنویسید...';
        p.style.cssText = 'margin: 1rem 0; min-height: 24px; color: #999;';
        p.contentEditable = 'true';
        range.setStartAfter(imgWrapper);
        range.insertNode(p);
        
        // Set cursor in the new paragraph
        range.setStart(p, 0);
        range.setEnd(p, 0);
        range.collapse(true);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Focus the paragraph and clear placeholder
        setTimeout(() => {
          const clearPlaceholder = () => {
            if (p.textContent === 'متن را اینجا بنویسید...') {
              p.innerHTML = '';
            }
          };
          p.onfocus = clearPlaceholder;
          p.onclick = clearPlaceholder;
          p.focus();
          // Clear immediately if clicked
          if (document.activeElement === p) {
            clearPlaceholder();
          }
        }, 100);

        handleContentChange();
      } catch (error) {
        console.error('Error uploading image:', error);
        const errorMessage = error instanceof Error ? error.message : 'خطا در آپلود تصویر';
        alert(errorMessage);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  // Insert video
  const insertVideo = async () => {
    if (!contentRef.current) {
      alert('ویرایشگر در دسترس نیست. لطفاً در محتوا کلیک کنید.');
      return;
    }

    const url = prompt('لینک ویدیو را وارد کنید (YouTube, Vimeo, یا لینک مستقیم):');
    if (!url) return;

    let embedHTML = '';
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        embedHTML = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem auto;">
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
            src="https://www.youtube.com/embed/${videoId}" 
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen></iframe>
        </div>`;
      }
    } else if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        embedHTML = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem auto;">
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
            src="https://player.vimeo.com/video/${videoId}" 
            frameborder="0" allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen></iframe>
        </div>`;
      }
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      embedHTML = `<video controls style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">
        <source src="${url}" type="video/mp4">
        مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
      </video>`;
    }

    if (embedHTML) {
      const selection = window.getSelection();
      let range: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else if (contentRef.current) {
        range = document.createRange();
        range.selectNodeContents(contentRef.current);
        range.collapse(false);
      }

      if (!range) {
        alert('نمی‌توان موقعیت درج را پیدا کرد. لطفاً در محتوا کلیک کنید.');
        return;
      }

      const videoWrapper = document.createElement('div');
      videoWrapper.className = 'editable-video-wrapper';
      videoWrapper.contentEditable = 'false';
      videoWrapper.style.cssText = 'position: relative; margin: 1rem 0;';
      videoWrapper.innerHTML = embedHTML;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-video-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.style.cssText = 'position: absolute; top: 8px; left: 8px; background: rgba(239, 68, 68, 0.9); color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: none; font-size: 20px; line-height: 1; z-index: 10;';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        videoWrapper.remove();
        handleContentChange();
      };

      videoWrapper.appendChild(deleteBtn);

      range.insertNode(videoWrapper);
      
      // Add paragraph after video
      const p = document.createElement('p');
      p.innerHTML = 'متن را اینجا بنویسید...';
      p.style.cssText = 'margin: 1rem 0; min-height: 24px; color: #999;';
      p.contentEditable = 'true';
      range.setStartAfter(videoWrapper);
      range.insertNode(p);
      range.setStart(p, 0);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      handleContentChange();
    } else {
      alert('لینک ویدیو معتبر نیست. لطفاً لینک YouTube، Vimeo یا لینک مستقیم ویدیو را وارد کنید.');
    }
  };

  // Handle click to show insert menu
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('delete-image-btn') || 
        target.classList.contains('delete-video-btn') ||
        target.closest('.delete-image-btn') ||
        target.closest('.delete-video-btn')) {
      return;
    }

    // Double click to show insert menu
    if (e.detail === 2) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setInsertMenuPosition({ x: rect.left, y: rect.top });
        setShowInsertMenu(true);
      }
    }
  };

  const formattedDate = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
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

            {/* Toolbar */}
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
              
              {/* Insert Toolbar */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">افزودن:</span>
                <button
                  onClick={() => insertHeading(1)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="عنوان 1"
                >
                  <Heading1 size={12} />
                  <span>H1</span>
                </button>
                <button
                  onClick={() => insertHeading(2)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="عنوان 2"
                >
                  <Heading2 size={12} />
                  <span>H2</span>
                </button>
                <button
                  onClick={() => insertHeading(3)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="عنوان 3"
                >
                  <Heading3 size={12} />
                  <span>H3</span>
                </button>
                <button
                  onClick={insertImage}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                  title="افزودن تصویر"
                >
                  <ImageIcon size={12} />
                  <span>{isUploading ? '...' : 'تصویر'}</span>
                </button>
                <button
                  onClick={insertVideo}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="افزودن ویدیو"
                >
                  <Video size={12} />
                  <span>ویدیو</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 
              contentEditable
              suppressContentEditableWarning
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
              onInput={() => {
                // Title change can be handled here if needed
              }}
            >
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

            {/* Editable Content */}
            <div 
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className="editable-blog-content min-h-[400px] p-4 border rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed prose prose-lg max-w-none dark:prose-invert"
              dir="rtl"
              style={{ textAlign: "right" }}
              onInput={handleContentChange}
              onClick={handleContentClick}
              onBlur={handleContentChange}
            />

            {/* Insert Menu */}
            {showInsertMenu && (
              <div
                className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2"
                style={{
                  left: `${insertMenuPosition.x}px`,
                  top: `${insertMenuPosition.y + 20}px`,
                }}
                onMouseLeave={() => setShowInsertMenu(false)}
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => insertHeading(1)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Heading1 size={16} />
                    <span>عنوان 1</span>
                  </button>
                  <button
                    onClick={() => insertHeading(2)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Heading2 size={16} />
                    <span>عنوان 2</span>
                  </button>
                  <button
                    onClick={() => insertHeading(3)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Heading3 size={16} />
                    <span>عنوان 3</span>
                  </button>
                  <button
                    onClick={() => insertHeading(4)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Heading4 size={16} />
                    <span>عنوان 4</span>
                  </button>
                  <button
                    onClick={insertImage}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <ImageIcon size={16} />
                    <span>تصویر</span>
                  </button>
                  <button
                    onClick={insertVideo}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Video size={16} />
                    <span>ویدیو</span>
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
      
      <style jsx global>{`
        .editable-blog-content [contenteditable="false"] {
          position: relative;
        }
        .editable-image-wrapper,
        .editable-video-wrapper {
          position: relative;
          margin: 1rem 0;
        }
        .editable-image-wrapper:hover,
        .editable-video-wrapper:hover {
          outline: 2px dashed #3b82f6;
        }
        .delete-image-btn:hover,
        .delete-video-btn:hover {
          background: rgba(239, 68, 68, 1) !important;
        }
        .editable-blog-content img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 1rem auto !important;
          border-radius: 8px;
        }
        .editable-blog-content video {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 1rem auto !important;
          border-radius: 8px;
        }
        .editable-blog-content iframe {
          max-width: 100% !important;
          border-radius: 8px;
        }
        .editable-blog-content h1 {
          font-size: 2.25rem;
          font-weight: bold;
          margin: 1.5rem 0;
        }
        .editable-blog-content h2 {
          font-size: 1.875rem;
          font-weight: bold;
          color: #2563eb;
          background: rgba(59, 130, 246, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .editable-blog-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 1rem;
        }
        .editable-blog-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
        }
        .editable-blog-content p {
          margin: 1rem 0;
          line-height: 1.75;
        }
      `}</style>
    </div>
  );
}

