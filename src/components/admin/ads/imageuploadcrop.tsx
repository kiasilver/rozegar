"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ImageUploadCropProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
  maxWidth?: number;
  maxHeight?: number;
  onOpenGallery?: () => void;
  allowScriptFiles?: boolean;
  onScriptFileUploaded?: (content: string) => void;
}

export default function ImageUploadCrop({
  onImageUploaded,
  currentImage,
  maxWidth = 1200,
  maxHeight = 1200,
  onOpenGallery,
  allowScriptFiles = false,
  onScriptFileUploaded,
}: ImageUploadCropProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is a script file (.js, .txt) - Note: .ts is video format, not script
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const isScriptFile = allowScriptFiles && (fileExtension === 'js' || fileExtension === 'txt');

    if (isScriptFile && onScriptFileUploaded) {
      // Check file size before upload (5MB limit for script files)
      if (file.size > 5 * 1024 * 1024) {
        alert("حجم فایل باید کمتر از 5MB باشد");
        return;
      }

      // Handle script file upload
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/v1/admin/media/script", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          onScriptFileUploaded(data.content);
        } else {
          const error = await res.json();
          alert(error.error || "خطا در آپلود فایل script");
        }
      } catch (error) {
        console.error("Error uploading script file:", error);
        alert("خطا در آپلود فایل script");
      } finally {
        setUploading(false);
      }
      return;
    }

    // Check if file is an image (including GIF)
    const isValidImage = file.type.startsWith("image/") || 
                        file.name.toLowerCase().endsWith('.gif') ||
                        file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    
    if (!isValidImage) {
      alert("لطفاً یک فایل تصویری انتخاب کنید (JPG, PNG, GIF, WebP, SVG)" + (allowScriptFiles ? " یا فایل script (.js, .txt)" : ""));
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم فایل باید کمتر از 5 مگابایت باشد");
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("maxWidth", String(maxWidth));
      formData.append("maxHeight", String(maxHeight));

      const res = await fetch("/api/v1/admin/media/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Normalize URL: remove trailing slash if present
        const normalizedUrl = data.url?.endsWith('/') && !data.url.endsWith('//') 
          ? data.url.slice(0, -1) 
          : data.url;
        onImageUploaded(normalizedUrl);
        setPreview(normalizedUrl);
      } else {
        const error = await res.json();
        alert(error.error || "خطا در آپلود تصویر");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("خطا در آپلود تصویر");
    } finally {
      setUploading(false);
    }
  };

  // Update preview when currentImage changes
  React.useEffect(() => {
    if (currentImage) {
      setPreview(currentImage);
    }
  }, [currentImage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept={allowScriptFiles ? "image/*,.gif,.js,.txt" : "image/*,.gif"}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploading ? "در حال آپلود..." : preview ? "تغییر تصویر" : "آپلود تصویر جدید"}
        </button>
        
        {onOpenGallery && (
          <button
            type="button"
            onClick={onOpenGallery}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            انتخاب از گالری
          </button>
        )}
        
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onImageUploaded("");
            }}
            className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            حذف تصویر
          </button>
        )}
      </div>

      {preview && (
        <div className="relative w-full h-64 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {preview.toLowerCase().endsWith('.gif') ? (
            // Use regular img tag for GIF to preserve animation
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
            />
          )}
        </div>
      )}

      {!preview && (
        <div className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">هیچ تصویری انتخاب نشده</p>
        </div>
      )}
    </div>
  );
}

