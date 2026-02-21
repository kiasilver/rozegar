"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Video,
  Eye,
  Edit,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Monitor,
  Move,
} from "lucide-react";
import EditableBlogPreview from "./editableblogpreview";
import VisualBlogEditor from "./visualblogeditor";

interface WordPressEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  image?: string;
  categories?: string[];
  author?: string;
  onTitleChange?: (title: string) => void;
}

export default function WordPressEditor({ 
  value, 
  onChange, 
  placeholder = "محتوا را اینجا بنویسید...",
  title = "",
  image = "",
  categories = [],
  author = "نویسنده",
  onTitleChange,
}: WordPressEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blockType, setBlockType] = useState("p");
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"edit" | "visual">("edit");
  const [isUploading, setIsUploading] = useState(false);

  const format = (command: string, value?: string) => {
    try {
      if (command === "undo" || command === "redo") {
        document.execCommand(command, false);
      } else {
        document.execCommand(command, false, value);
      }
      if (command === "formatBlock" && value) {
        setBlockType(value);
      }
      updateActiveFormats();
      handleInput();
    } catch (error) {
      console.error("Error executing format command:", error);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      updateActiveFormats();
    }
  };

  const updateActiveFormats = () => {
    const formats: string[] = [];
    if (document.queryCommandState("bold")) formats.push("bold");
    if (document.queryCommandState("italic")) formats.push("italic");
    if (document.queryCommandState("underline")) formats.push("underline");
    setActiveFormats(formats);
    
    // Update block type
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === 1 ? container as HTMLElement : (container as HTMLElement).parentElement;
      if (element) {
        const tagName = element.tagName.toLowerCase();
        if (["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"].includes(tagName)) {
          setBlockType(tagName);
        }
      }
    }
  };

  const blockOptions = [
    { label: "متن عادی", value: "p", icon: <Type size={16} /> },
    { label: "عنوان 1", value: "h1", icon: <Heading1 size={16} /> },
    { label: "عنوان 2", value: "h2", icon: <Heading2 size={16} /> },
    { label: "عنوان 3", value: "h3", icon: <Heading3 size={16} /> },
    { label: "عنوان 4", value: "h4", icon: <Heading4 size={16} /> },
    { label: "عنوان 5", value: "h5", icon: <Type size={16} /> },
    { label: "عنوان 6", value: "h6", icon: <Type size={16} /> },
  ];

  const currentBlock = blockOptions.find((opt) => opt.value === blockType) || blockOptions[0];

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      formData.append("maxWidth", "1920");
      formData.append("maxHeight", "1920");

      const response = await fetch("/api/v1/admin/content/blogs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "خطای نامشخص" }));
        throw new Error(errorData.error || "خطا در آپلود تصویر");
      }

      const data = await response.json();
      
      if (!data.url) {
        throw new Error("آدرس تصویر دریافت نشد");
      }
      
      // Insert image into editor
      if (!editorRef.current) {
        throw new Error("ویرایشگر در دسترس نیست");
      }
      
      // Ensure URL is absolute
      const imageUrl = data.url.startsWith('http') || data.url.startsWith('/') 
        ? data.url 
        : `/${data.url}`;
      
      const selection = window.getSelection();
      let range: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else if (editorRef.current) {
        // Create range at end of editor
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      
      if (range) {
        // Create image element with proper attributes
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = file.name;
        img.setAttribute("style", "max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px;");
        img.setAttribute("loading", "lazy");
        
        // Insert image
        range.insertNode(img);
        
        // Add line break after image
        const br = document.createElement("br");
        range.setStartAfter(img);
        range.insertNode(br);
        
        // Move cursor after image
        range.setStartAfter(br);
        range.collapse(true);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Fallback: append to editor
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = file.name;
        img.setAttribute("style", "max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px;");
        img.setAttribute("loading", "lazy");
        editorRef.current.appendChild(img);
        editorRef.current.appendChild(document.createElement("br"));
      }
      
      // Force image to load and display
      const insertedImg = editorRef.current.querySelector(`img[src="${imageUrl}"]`);
      if (insertedImg) {
        (insertedImg as HTMLImageElement).onerror = () => {
          console.error("❌ خطا در بارگذاری تصویر:", imageUrl);
          (insertedImg as HTMLImageElement).src = imageUrl; // Retry
        };
      }
      
      handleInput();
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage = error instanceof Error ? error.message : "خطا در آپلود تصویر. لطفاً دوباره تلاش کنید.";
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");
      formData.append("maxWidth", "1920");
      formData.append("maxHeight", "1920");

      const response = await fetch("/api/v1/admin/content/blogs/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "خطای نامشخص" }));
        throw new Error(errorData.error || "خطا در آپلود ویدیو");
      }

      const data = await response.json();
      
      if (!data.url) {
        throw new Error("آدرس ویدیو دریافت نشد");
      }
      
      // Insert video into editor
      if (!editorRef.current) {
        throw new Error("ویرایشگر در دسترس نیست");
      }
      
      const selection = window.getSelection();
      let range: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else if (editorRef.current) {
        // Create range at end of editor
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      
      if (range) {
        // Create video element
        const video = document.createElement("video");
        video.src = data.url;
        video.controls = true;
        video.style.cssText = "max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px;";
        video.textContent = "مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.";
        
        // Insert video
        range.insertNode(video);
        
        // Add line break after video
        const br = document.createElement("br");
        range.setStartAfter(video);
        range.insertNode(br);
        
        // Move cursor after video
        range.setStartAfter(br);
        range.collapse(true);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // Fallback: append to editor
        const video = document.createElement("video");
        video.src = data.url;
        video.controls = true;
        video.style.cssText = "max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px;";
        video.textContent = "مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.";
        editorRef.current.appendChild(video);
        editorRef.current.appendChild(document.createElement("br"));
      }
      
      handleInput();
    } catch (error) {
      console.error("Error uploading video:", error);
      const errorMessage = error instanceof Error ? error.message : "خطا در آپلود ویدیو. لطفاً دوباره تلاش کنید.";
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoEmbed = () => {
    const url = prompt("لینک ویدیو را وارد کنید (YouTube, Vimeo, یا لینک مستقیم):");
    if (!url) return;

    let embedHTML = "";
    
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        embedHTML = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem auto;">
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
            src="https://www.youtube.com/embed/${videoId}" 
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen></iframe>
        </div>`;
      }
    }
    // Vimeo
    else if (url.includes("vimeo.com")) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        embedHTML = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem auto;">
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
            src="https://player.vimeo.com/video/${videoId}" 
            frameborder="0" allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen></iframe>
        </div>`;
      }
    }
    // Direct video link
    else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      embedHTML = `<video controls style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">
        <source src="${url}" type="video/mp4">
        مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
      </video>`;
    }

    if (embedHTML) {
      if (!editorRef.current) {
        alert("ویرایشگر در دسترس نیست");
        return;
      }
      
      const selection = window.getSelection();
      let range: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else if (editorRef.current) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      
      if (range) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = embedHTML;
        const embedNode = tempDiv.firstChild;
        if (embedNode) {
          range.insertNode(embedNode);
          // Add line break after embed
          const br = document.createElement("br");
          range.setStartAfter(embedNode);
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } else {
        // Fallback
        editorRef.current.innerHTML += embedHTML;
      }
      
      handleInput();
    } else {
      alert("لینک ویدیو معتبر نیست. لطفاً لینک YouTube، Vimeo یا لینک مستقیم ویدیو را وارد کنید.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "image") {
      handleImageUpload(file);
    } else {
      handleVideoUpload(file);
    }

    // Reset input
    e.target.value = "";
  };

  useEffect(() => {
    if (editorRef.current) {
      // Only update if content is different to avoid cursor issues
      const currentContent = editorRef.current.innerHTML;
      if (value !== currentContent && value !== undefined) {
        // Save cursor position
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const cursorOffset = range ? range.startOffset : 0;
        const cursorNode = range ? range.startContainer : null;
        
        // Update content
        editorRef.current.innerHTML = value || "";
        
        // Try to restore cursor position (best effort)
        if (range && cursorNode && editorRef.current.contains(cursorNode)) {
          try {
            const newRange = document.createRange();
            newRange.setStart(cursorNode, Math.min(cursorOffset, cursorNode.textContent?.length || 0));
            newRange.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          } catch (e) {
            // Ignore cursor restoration errors
          }
        }
      }
    }
  }, [value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const previewContent = value || "<p style='color: #999;'>پیش‌نمایش محتوا</p>";

  return (
    <div className="space-y-3 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-md border dark:border-gray-700 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`p-1.5 rounded ${viewMode === "edit" ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
              title="ویرایش"
            >
              <Edit size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`p-1.5 rounded ${viewMode === "visual" ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-300"}`}
              title="ویرایشگر Visual (Drag & Drop)"
            >
              <Move size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Block Format */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              className="flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-sm border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              {currentBlock.icon}
              <span>{currentBlock.label}</span>
              <ChevronDown size={16} />
            </button>

            {showFormatMenu && (
              <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                {blockOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      format("formatBlock", option.value);
                      setShowFormatMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Text Formatting */}
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => format("bold")}
              className={`p-1.5 rounded ${activeFormats.includes("bold") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("italic")}
              className={`p-1.5 rounded ${activeFormats.includes("italic") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("underline")}
              className={`p-1.5 rounded ${activeFormats.includes("underline") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}
              title="Underline"
            >
              <Underline size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Alignment */}
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => format("justifyLeft")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="چپ‌چین"
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("justifyCenter")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="وسط‌چین"
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("justifyRight")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="راست‌چین"
            >
              <AlignRight size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Lists */}
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => format("insertUnorderedList")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="لیست نامرتب"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("insertOrderedList")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="لیست مرتب"
            >
              <ListOrdered size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("formatBlock", "blockquote")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="نقل قول"
            >
              <Quote size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Media - Only show in edit mode */}
          {viewMode === "edit" && (
            <div className="flex gap-1 items-center">
              <label className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700 cursor-pointer" title="افزودن تصویر">
                <ImageIcon size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "image")}
                  disabled={isUploading}
                />
              </label>
              <label className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700 cursor-pointer" title="افزودن ویدیو">
                <Video size={16} />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "video")}
                  disabled={isUploading}
                />
              </label>
              <button
                type="button"
                onClick={handleVideoEmbed}
                className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
                title="افزودن ویدیو از لینک"
              >
                <LinkIcon size={16} />
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Undo/Redo */}
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => format("undo")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="بازگشت"
            >
              <Undo size={16} />
            </button>
            <button
              type="button"
              onClick={() => format("redo")}
              className="p-1.5 rounded hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              title="جلو"
            >
              <Redo size={16} />
            </button>
          </div>
        </div>

        {isUploading && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            در حال آپلود...
          </div>
        )}
      </div>

      {/* Editor/Preview Area */}
      {viewMode === "visual" ? (
        <div className="relative border rounded-md overflow-hidden bg-white dark:bg-gray-900">
          <div className="h-[600px] overflow-auto">
            <VisualBlogEditor
              content={value}
              onChange={onChange}
              title={title}
              image={image}
              categories={categories}
              author={author}
              onTitleChange={onTitleChange}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            dir="rtl"
            className="min-h-[400px] p-4 border rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed prose prose-lg max-w-none dark:prose-invert editor-placeholder"
            style={{
              textAlign: "right",
            }}
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder={placeholder}
          />
          <style jsx global>{`
            .editor-placeholder:empty:before {
              content: attr(data-placeholder);
              color: #999;
              pointer-events: none;
            }
            .editor-placeholder img {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 1rem auto !important;
              border-radius: 8px;
              object-fit: contain;
            }
            .editor-placeholder img[src] {
              min-height: 50px;
              background: #f3f4f6;
              border: 1px dashed #d1d5db;
            }
            .editor-placeholder img[src]:not([src=""]) {
              background: transparent;
              border: none;
            }
            .editor-placeholder video {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 1rem auto !important;
              border-radius: 8px;
            }
            .editor-placeholder iframe {
              max-width: 100% !important;
              border-radius: 8px;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

