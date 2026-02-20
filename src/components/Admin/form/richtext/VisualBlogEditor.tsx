"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image as ImageIcon,
  Video,
  Type,
  Plus,
  GripVertical,
  X,
  Move,
} from 'lucide-react';

interface VisualBlogEditorProps {
  content: string;
  onChange: (content: string) => void;
  title?: string;
  image?: string;
  categories?: string[];
  author?: string;
  onTitleChange?: (title: string) => void;
}

export default function VisualBlogEditor({
  content,
  onChange,
  title = "",
  image = "",
  categories = [],
  author = "نویسنده",
  onTitleChange,
}: VisualBlogEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [draggedElement, setDraggedElement] = useState<HTMLElement | null>(null);
  const [dragOverElement, setDragOverElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);

  // Initialize content
  useEffect(() => {
    if (contentRef.current && content !== contentRef.current.innerHTML) {
      const isFocused = document.activeElement === contentRef.current;
      if (!isFocused) {
        contentRef.current.innerHTML = content || '<p>محتوا را اینجا بنویسید...</p>';
      }
    }
  }, [content]);

  // Initialize title
  useEffect(() => {
    if (titleRef.current && title !== titleRef.current.textContent) {
      const isFocused = document.activeElement === titleRef.current;
      if (!isFocused) {
        titleRef.current.textContent = title || "بدون عنوان";
      }
    }
  }, [title]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  }, [onChange]);

  // Insert element at cursor
  const insertElement = (tag: string, content: string = '') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const element = document.createElement(tag);
    element.innerHTML = content;
    element.contentEditable = 'true';
    element.setAttribute('data-editable', 'true');
    
    // Add drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.contentEditable = 'false';
        element.draggable = true;
        element.setAttribute('data-draggable', 'true');
        element.appendChild(dragHandle);

    range.insertNode(element);
    range.setStartAfter(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleContentChange();
  };

  // Insert heading
  const insertHeading = (level: number) => {
    insertElement(`h${level}`, `عنوان ${level}`);
  };

  // Insert image
  const insertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      try {
        const res = await fetch('/api/v1/admin/content/blogs/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('خطا در آپلود');

        const data = await res.json();
        const imageUrl = data.url.startsWith('/') ? data.url : `/${data.url}`;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'visual-editor-image-wrapper';
        imgWrapper.contentEditable = 'false';
        imgWrapper.draggable = true;
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = file.name;
        img.className = 'max-w-full h-auto rounded-lg my-4';
        img.style.cssText = 'display: block; margin: 1rem auto;';
        
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.contentEditable = 'false';
        dragHandle.draggable = false;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          imgWrapper.remove();
          handleContentChange();
        };

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(dragHandle);
        imgWrapper.appendChild(deleteBtn);
        
        // Make wrapper draggable
        imgWrapper.draggable = true;
        imgWrapper.setAttribute('data-draggable', 'true');

        range.insertNode(imgWrapper);
        range.setStartAfter(imgWrapper);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        handleContentChange();
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('خطا در آپلود تصویر');
      }
    };
    input.click();
  };

  // Insert video
  const insertVideo = async () => {
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
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const videoWrapper = document.createElement('div');
      videoWrapper.className = 'visual-editor-video-wrapper';
      videoWrapper.contentEditable = 'false';
      videoWrapper.draggable = true;
      videoWrapper.innerHTML = embedHTML;
      
      const dragHandle = document.createElement('span');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.contentEditable = 'false';
      dragHandle.draggable = false;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        videoWrapper.remove();
        handleContentChange();
      };

      videoWrapper.appendChild(dragHandle);
      videoWrapper.appendChild(deleteBtn);
      
      // Make wrapper draggable
      videoWrapper.draggable = true;
      videoWrapper.setAttribute('data-draggable', 'true');

      range.insertNode(videoWrapper);
      range.setStartAfter(videoWrapper);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      handleContentChange();
    }
  };

  // Setup drag and drop for all draggable elements with better UX
  useEffect(() => {
    if (!contentRef.current) return;

    const setupDragDrop = () => {
      const draggableElements = contentRef.current?.querySelectorAll('[draggable="true"]');
      draggableElements?.forEach((element) => {
        const el = element as HTMLElement;
        
        // Remove old listeners
        const newEl = el.cloneNode(true) as HTMLElement;
        el.parentNode?.replaceChild(newEl, el);
        const cleanEl = newEl;
        
        cleanEl.addEventListener('dragstart', (e) => {
          setIsDragging(true);
          setDraggedElement(cleanEl);
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', '');
          }
          cleanEl.style.opacity = '0.4';
          cleanEl.style.transform = 'scale(0.95)';
          cleanEl.style.transition = 'all 0.2s';
          
          // Create drag preview
          const rect = cleanEl.getBoundingClientRect();
          setDragPreview({ x: e.clientX, y: e.clientY });
        });

        cleanEl.addEventListener('drag', (e) => {
          setDragPreview({ x: e.clientX, y: e.clientY });
        });

        cleanEl.addEventListener('dragend', () => {
          setIsDragging(false);
          setDragPreview(null);
          if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement.style.transform = 'scale(1)';
          }
          // Clean up all drag indicators
          contentRef.current?.querySelectorAll('[data-draggable="true"]').forEach((elem) => {
            (elem as HTMLElement).style.borderTop = '';
            (elem as HTMLElement).style.borderBottom = '';
            (elem as HTMLElement).style.backgroundColor = '';
          });
          setDraggedElement(null);
          setDragOverElement(null);
        });

        cleanEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (cleanEl !== draggedElement && draggedElement) {
            setDragOverElement(cleanEl);
            const rect = cleanEl.getBoundingClientRect();
            const mouseY = e.clientY;
            const isBefore = mouseY < rect.top + rect.height / 2;
            
            // Clear previous indicators
            contentRef.current?.querySelectorAll('[data-draggable="true"]').forEach((elem) => {
              if (elem !== cleanEl) {
                (elem as HTMLElement).style.borderTop = '';
                (elem as HTMLElement).style.borderBottom = '';
                (elem as HTMLElement).style.backgroundColor = '';
              }
            });
            
            if (isBefore) {
              cleanEl.style.borderTop = '3px solid #3b82f6';
              cleanEl.style.borderBottom = '';
              cleanEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            } else {
              cleanEl.style.borderBottom = '3px solid #3b82f6';
              cleanEl.style.borderTop = '';
              cleanEl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            }
          }
        });

        cleanEl.addEventListener('dragleave', () => {
          cleanEl.style.borderTop = '';
          cleanEl.style.borderBottom = '';
          cleanEl.style.backgroundColor = '';
          setDragOverElement(null);
        });

        cleanEl.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!draggedElement || !cleanEl || draggedElement === cleanEl) return;

          const targetRect = cleanEl.getBoundingClientRect();
          const mouseY = e.clientY;
          const isBefore = mouseY < targetRect.top + targetRect.height / 2;

          // Clean up styles
          cleanEl.style.borderTop = '';
          cleanEl.style.borderBottom = '';
          cleanEl.style.backgroundColor = '';

          if (isBefore) {
            cleanEl.parentNode?.insertBefore(draggedElement, cleanEl);
          } else {
            cleanEl.parentNode?.insertBefore(draggedElement, cleanEl.nextSibling);
          }

          handleContentChange();
        });
      });
    };

    setupDragDrop();
    
    // Re-setup when content changes
    const observer = new MutationObserver(() => {
      setTimeout(setupDragDrop, 100);
    });
    if (contentRef.current) {
      observer.observe(contentRef.current, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [draggedElement, handleContentChange, dragPreview]);

  // Handle click on content
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('drag-handle') || 
        target.classList.contains('delete-btn') ||
        target.closest('.drag-handle') ||
        target.closest('.delete-btn')) {
      return;
    }
  };

  const formattedDate = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full bg-gray-50 min-h-screen relative">
      {/* Fixed Sidebar Toolbar */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 flex flex-col gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">افزودن</div>
        <button
          onClick={() => insertHeading(1)}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all"
          title="عنوان 1"
        >
          <Heading1 size={18} />
          <span>H1</span>
        </button>
        <button
          onClick={() => insertHeading(2)}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all"
          title="عنوان 2"
        >
          <Heading2 size={18} />
          <span>H2</span>
        </button>
        <button
          onClick={() => insertHeading(3)}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all"
          title="عنوان 3"
        >
          <Heading3 size={18} />
          <span>H3</span>
        </button>
        <button
          onClick={() => insertHeading(4)}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-all"
          title="عنوان 4"
        >
          <Heading4 size={18} />
          <span>H4</span>
        </button>
        <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1" />
        <button
          onClick={insertImage}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400 rounded transition-all"
          title="افزودن تصویر"
        >
          <ImageIcon size={18} />
          <span>تصویر</span>
        </button>
        <button
          onClick={insertVideo}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-all"
          title="افزودن ویدیو"
        >
          <Video size={18} />
          <span>ویدیو</span>
        </button>
      </div>

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
            </div>

            {/* Title */}
            <h1 
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
              onInput={(e) => {
                if (onTitleChange && titleRef.current) {
                  onTitleChange(titleRef.current.textContent || "");
                }
              }}
              onBlur={() => {
                if (onTitleChange && titleRef.current) {
                  onTitleChange(titleRef.current.textContent || "");
                }
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
              className="blog-content visual-editor min-h-[400px] p-4 border rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed prose prose-lg max-w-none dark:prose-invert"
              dir="rtl"
              style={{ textAlign: "right" }}
              onInput={handleContentChange}
              onClick={handleContentClick}
              onBlur={handleContentChange}
            />

            {/* Drag Preview Indicator */}
            {isDragging && dragPreview && (
              <div
                className="fixed z-50 pointer-events-none"
                style={{
                  left: `${dragPreview.x}px`,
                  top: `${dragPreview.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="bg-blue-500 text-white px-3 py-1 rounded-lg shadow-lg text-sm">
                  در حال جابه‌جایی...
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
      
      <style jsx global>{`
        .visual-editor [data-editable="true"] {
          position: relative;
          padding: 8px;
          margin: 4px 0;
          border: 1px dashed transparent;
        }
        .visual-editor [data-editable="true"]:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }
        .visual-editor-image-wrapper,
        .visual-editor-video-wrapper {
          position: relative;
          margin: 1rem 0;
          padding: 8px;
          border: 2px dashed transparent;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .visual-editor-image-wrapper:hover,
        .visual-editor-video-wrapper:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }
        .visual-editor-image-wrapper[draggable="true"],
        .visual-editor-video-wrapper[draggable="true"] {
          cursor: move;
        }
        .drag-handle {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: grab;
          font-size: 14px;
          z-index: 10;
          user-select: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .drag-handle:hover {
          background: rgba(59, 130, 246, 1);
          transform: scale(1.1);
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .delete-btn {
          position: absolute;
          top: 4px;
          left: 4px;
          background: rgba(239, 68, 68, 0.8);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border: none;
          font-size: 18px;
          line-height: 1;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 1);
        }
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
        .blog-content h1 {
          font-size: 2.25rem;
          font-weight: bold;
          margin: 1.5rem 0;
        }
        .blog-content h2 {
          font-size: 1.875rem;
          font-weight: bold;
          color: #2563eb;
          background: rgba(59, 130, 246, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .blog-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 1rem;
        }
        .blog-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
        }
        .blog-content h5 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
        }
        .blog-content h6 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
        }
      `}</style>
    </div>
  );
}

