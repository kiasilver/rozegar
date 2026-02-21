"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Button from "@/components/admin/ui/button/button";
import Input from "@/components/admin/form/input/inputfield";
import Select from "@/components/admin/form/select";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import FolderIcon from "@mui/icons-material/Folder";

interface MediaFile {
  url: string;
  name: string;
  type: 'image' | 'video' | 'other';
  size: number;
  modified: Date;
  folder: string;
}

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
  accept?: 'image' | 'video' | 'all';
  multiple?: boolean;
}

export default function MediaGalleryModal({
  isOpen,
  onClose,
  onSelect,
  accept = 'all',
  multiple = false
}: MediaGalleryModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const folders = [
    { value: 'all', label: 'همه پوشه‌ها' },
    { value: 'uploads/news', label: 'اخبار (News)' },
    { value: 'uploads/economics', label: 'اقتصاد (Economics)' },
    { value: 'uploads/ai-content', label: 'هوش مصنوعی (AI Content)' },
    { value: 'uploads/newspapers', label: 'روزنامه‌ها (Newspapers)' },
    { value: 'uploads/logos', label: 'لوگوها (Logos)' },
    { value: 'uploads/ads', label: 'تبلیغات (Ads)' },
    { value: 'uploads/watermarks', label: 'واترمارک‌ها (Watermarks)' },
    { value: 'uploads/blogs', label: 'وبلاگ (Blogs)' },
    { value: 'uploads/others', label: 'سایر (Others)' },
  ];

  const typeOptions = [
    { value: 'all', label: 'همه انواع' },
    { value: 'image', label: 'عکس‌ها' },
    { value: 'video', label: 'ویدیوها' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/media/list`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedFiles = useMemo(() => {
    return files.filter(f => {
      const effectiveFilterType = (accept === 'image' && filterType === 'all') ? 'image'
        : (accept === 'video' && filterType === 'all') ? 'video'
          : filterType;

      if (effectiveFilterType !== 'all' && f.type !== effectiveFilterType) return false;
      if (filterFolder !== 'all' && !f.folder.startsWith(filterFolder)) return false;
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [files, filterType, filterFolder, searchQuery, accept]);

  const handleSelect = (url: string) => {
    if (multiple) {
      setSelectedFiles(prev =>
        prev.includes(url)
          ? prev.filter(u => u !== url)
          : [...prev, url]
      );
    } else {
      if (onSelect) {
        onSelect(url);
      }
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (onSelect && selectedFiles.length > 0) {
      if (multiple) {
        // اگر multiple است، باید callback را تغییر دهیم تا array بگیرد
        // برای حالا فقط اولین را می‌فرستیم
        onSelect(selectedFiles[0]);
      } else {
        onSelect(selectedFiles[0]);
      }
    }
    onClose();
  };

  const handleDelete = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('آیا مطمئن هستید که می‌خواهید این فایل را حذف کنید؟')) {
      return;
    }

    setDeleting(url);
    try {
      const res = await fetch(`/api/v1/admin/media/delete?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFiles(prev => prev.filter(f => f.url !== url));
          setSelectedFiles(prev => prev.filter(u => u !== url));
        } else {
          alert(data.error || 'خطا در حذف فایل');
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: `خطا ${res.status}: ${res.statusText}` }));
        alert(errorData.error || 'خطا در حذف فایل');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('خطا در حذف فایل: ' + (error instanceof Error ? error.message : 'خطای ناشناخته'));
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            گالری رسانه
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="جستجو فایل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              options={typeOptions}
              value={filterType}
              onChange={(value) => setFilterType(value as 'all' | 'image' | 'video')}
              className="w-full sm:w-48"
            />
            <Select
              options={folders}
              value={filterFolder}
              onChange={(value) => setFilterFolder(value)}
              className="w-full sm:w-48"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
            </div>
          ) : displayedFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">فایلی یافت نشد</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedFiles.map((file) => (
                <div
                  key={file.url}
                  onClick={() => handleSelect(file.url)}
                  className={`relative group cursor-pointer rounded-lg border-2 transition-all ${selectedFiles.includes(file.url)
                      ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  {file.type === 'image' ? (
                    <div className="relative aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                      />
                    </div>
                  ) : file.type === 'video' ? (
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <VideoLibraryIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  ) : (
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <FolderIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleDelete(file.url, e)}
                        disabled={deleting === file.url}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <DeleteOutlineIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedFiles.includes(file.url) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}

                  {/* File info */}
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-b-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {file.folder}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && selectedFiles.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFiles.length} فایل انتخاب شده
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                لغو
              </Button>
              <Button onClick={handleConfirmSelection}>
                انتخاب
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

