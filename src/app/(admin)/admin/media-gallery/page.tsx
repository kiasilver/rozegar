"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import ComponentCard from "@/components/Admin/common/ComponentCard";
import Input from "@/components/Admin/form/input/InputField";
import Select from "@/components/Admin/form/Select";
import Button from "@/components/Admin/ui/button/Button";
import Image from "next/image";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageIcon from "@mui/icons-material/Image";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import FolderIcon from "@mui/icons-material/Folder";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FontDownloadIcon from "@mui/icons-material/FontDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useAlert } from "@/context/Admin/AlertContext";

interface MediaFile {
  url: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'font' | 'other';
  size: number;
  modified: Date;
  folder: string;
}


export default function MediaGalleryPage() {
  const { showAlert } = useAlert();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'pdf' | 'font' | 'other'>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string>('uploads/news');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const dateOptions = [
    { value: 'all', label: 'همه زمان‌ها' },
    { value: 'today', label: 'امروز' },
    { value: 'yesterday', label: 'دیروز' },
    { value: 'week', label: 'هفته گذشته' },
    { value: 'month', label: 'ماه گذشته' },
  ];

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

  const getCategoryCounts = () => {
    return [
      { name: 'Videos', count: files.filter(f => f.type === 'video').length, type: 'video' as const },
      { name: 'Images', count: files.filter(f => f.type === 'image').length, type: 'image' as const },
      { name: 'Documents', count: files.filter(f => f.type === 'pdf').length, type: 'pdf' as const },
      { name: 'Audio', count: files.filter(f => f.type === 'other').length, type: 'other' as const },
    ];
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Fetch ALL files initially to prevent category bugs and allow local filtering
      const res = await fetch(`/api/v1/admin/media/list`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        showAlert('خطا در دریافت فایل‌ها', 'error');
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
      showAlert('خطا در دریافت فایل‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این فایل را حذف کنید؟')) {
      return;
    }

    setDeleting(url);
    try {
      const res = await fetch(`/api/v1/admin/media/delete?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.url !== url));
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
        showAlert('فایل با موفقیت حذف شد', 'success');
      } else {
        showAlert('خطا در حذف فایل', 'error');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showAlert('خطا در حذف فایل', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`آیا مطمئن هستید که می‌خواهید ${selectedFiles.size} فایل را حذف کنید؟`)) {
      return;
    }

    const urls = Array.from(selectedFiles);
    let successCount = 0;
    let failCount = 0;

    for (const url of urls) {
      try {
        const res = await fetch(`/api/v1/admin/media/delete?url=${encodeURIComponent(url)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    setSelectedFiles(new Set());
    fetchFiles();

    if (successCount > 0) {
      showAlert(`${successCount} فایل با موفقیت حذف شد`, 'success');
    }
    if (failCount > 0) {
      showAlert(`${failCount} فایل حذف نشد`, 'error');
    }
  };

  const handleSelect = (url: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const displayedFiles = useMemo(() => {
    return files.filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false;
      if (filterFolder !== 'all' && !f.folder.startsWith(filterFolder)) return false;
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      if (filterDate !== 'all') {
        const fileDate = new Date(f.modified);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const aWeekAgo = new Date(today);
        aWeekAgo.setDate(aWeekAgo.getDate() - 7);

        const aMonthAgo = new Date(today);
        aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);

        if (filterDate === 'today' && fileDate < today) return false;
        if (filterDate === 'yesterday' && (fileDate >= today || fileDate < yesterday)) return false;
        if (filterDate === 'week' && fileDate < aWeekAgo) return false;
        if (filterDate === 'month' && fileDate < aMonthAgo) return false;
      }
      return true;
    });
  }, [files, filterType, filterFolder, filterDate, searchQuery]);

  const handleSelectAll = () => {
    if (selectedFiles.size === displayedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(displayedFiles.map(f => f.url)));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showAlert('URL کپی شد', 'success');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", uploadFolder);

      const res = await fetch("/api/v1/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        showAlert("✅ فایل با موفقیت آپلود شد", "success");
        fetchFiles();
      } else {
        const error = await res.json();
        showAlert(error.error || "خطا در آپلود فایل", "error");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      showAlert("خطا در آپلود فایل", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Calculate total size and storage info
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalSizeGB = totalSize / (1024 * 1024 * 1024);
  const storageUsed = totalSizeGB;
  const storageTotal = 64; // GB
  const storageUsedPercent = (storageUsed / storageTotal) * 100;

  // Get recent files (last 5)
  const recentFiles = [...files].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()).slice(0, 5);

  // Group files by folder for sidebar
  const folderStats = folders.filter(f => f.value !== 'all').map(folder => {
    const folderFiles = files.filter(f => f.folder === folder.value);
    const folderSize = folderFiles.reduce((sum, f) => sum + f.size, 0);
    return {
      ...folder,
      count: folderFiles.length,
      size: folderSize,
    };
  });

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="مدیریت فایل" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Sidebar - Categories & Folders */}
        <div className="col-span-1 lg:col-span-12 xl:col-span-3 relative">
          <div className="space-y-4 sm:space-y-6 sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar pr-1 pb-4">
            {/* Upload Section */}
            <ComponentCard title="آپلود فایل">
              <div className="space-y-4">
                <Select
                  options={folders.filter(f => f.value !== 'all')}
                  value={uploadFolder}
                  onChange={(value) => setUploadFolder(value)}
                  className="w-full"
                />
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200">
                  <CloudUploadIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {uploading ? "در حال آپلود..." : "آپلود فایل"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </ComponentCard>

            {/* Categories */}
            <ComponentCard title="دسته‌بندی‌ها">
              <div className="space-y-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-right ${filterType === 'all'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <span className="text-sm font-medium">همه</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{files.length}</span>
                </button>
                {getCategoryCounts().map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setFilterType(category.type)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-right ${filterType === category.type
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {category.type === 'image' && <ImageIcon className="w-4 h-4" />}
                      {category.type === 'video' && <VideoLibraryIcon className="w-4 h-4" />}
                      {category.type === 'pdf' && <PictureAsPdfIcon className="w-4 h-4" />}
                      {category.type === 'other' && <DescriptionIcon className="w-4 h-4" />}
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {files.filter(f => f.type === category.type).length}
                    </span>
                  </button>
                ))}
              </div>
            </ComponentCard>

            {/* Date Options */}
            <ComponentCard title="زمان آپلود">
              <div className="space-y-2">
                {dateOptions.map((dateOption) => (
                  <button
                    key={dateOption.value}
                    onClick={() => setFilterDate(dateOption.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-right ${filterDate === dateOption.value
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <span className="text-sm font-medium">{dateOption.label}</span>
                  </button>
                ))}
              </div>
            </ComponentCard>

            {/* Folders */}
            <ComponentCard title="پوشه‌ها">
              <div className="space-y-2">
                <button
                  onClick={() => setFilterFolder('all')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-right ${filterFolder === 'all'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <span className="text-sm font-medium">همه پوشه‌ها</span>
                </button>
                {folderStats.map((folder) => (
                  <button
                    key={folder.value}
                    onClick={() => setFilterFolder(folder.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-right ${filterFolder === folder.value
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderIcon className="w-4 h-4" />
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium">{folder.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {folder.count} فایل • {formatFileSize(folder.size)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ComponentCard>

            {/* Storage Info */}
            <ComponentCard title="فضای ذخیره‌سازی">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">استفاده شده</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {formatFileSize(storageUsed * 1024 * 1024 * 1024)} از {storageTotal} GB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(storageUsedPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Images</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {formatFileSize(files.filter(f => f.type === 'image').reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Videos</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {formatFileSize(files.filter(f => f.type === 'video').reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Documents</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {formatFileSize(files.filter(f => f.type === 'pdf').reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </ComponentCard>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-1 lg:col-span-12 xl:col-span-9 space-y-4 sm:space-y-6">
          {/* Search and Actions */}
          <ComponentCard>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative w-full">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <Input
                  type="text"
                  placeholder="جستجو فایل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedFiles.size === files.length && files.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </Button>
                {selectedFiles.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    حذف ({selectedFiles.size})
                  </Button>
                )}
              </div>
            </div>
          </ComponentCard>

          {/* Files Grid */}
          <ComponentCard title={`فایل‌ها (${displayedFiles.length})`}>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
              </div>
            ) : displayedFiles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">فایلی یافت نشد</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedFiles.map((file) => (
                  <div
                    key={file.url}
                    onClick={() => handleSelect(file.url)}
                    className={`relative group cursor-pointer rounded-lg border-2 transition-all ${selectedFiles.has(file.url)
                      ? 'border-blue-500 dark:border-blue-400 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800'
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
                    ) : file.type === 'pdf' ? (
                      <div className="relative aspect-square bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                        <PictureAsPdfIcon className="w-12 h-12 text-red-500" />
                      </div>
                    ) : file.type === 'font' ? (
                      <div className="relative aspect-square bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <FontDownloadIcon className="w-12 h-12 text-purple-500" />
                      </div>
                    ) : (
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <DescriptionIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}

                    {/* Overlay */}
                    <div
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(file);
                          }}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="مشاهده جزئیات"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(file.url);
                          }}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          title="کپی URL"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.url);
                          }}
                          disabled={deleting === file.url}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          title="حذف"
                        >
                          <DeleteOutlineIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all ${selectedFiles.has(file.url)
                      ? 'bg-blue-500 ring-2 ring-white dark:ring-gray-900'
                      : 'bg-white/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100'
                      }`}>
                      {selectedFiles.has(file.url) && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>

                    {/* File info */}
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-b-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[60px]" title={file.folder}>
                          {file.folder.split('/').pop()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ComponentCard>

          {/* Recent Files Table */}
          {recentFiles.length > 0 && (
            <ComponentCard title="فایل‌های اخیر">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">نام فایل</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">دسته‌بندی</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">اندازه</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">تاریخ ویرایش</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFiles.map((file) => (
                      <tr key={file.url} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {file.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-500" />}
                            {file.type === 'video' && <VideoLibraryIcon className="w-4 h-4 text-purple-500" />}
                            {file.type === 'pdf' && <PictureAsPdfIcon className="w-4 h-4 text-red-500" />}
                            {file.type === 'font' && <FontDownloadIcon className="w-4 h-4 text-green-500" />}
                            {file.type === 'other' && <DescriptionIcon className="w-4 h-4 text-gray-500" />}
                            <span className="text-sm text-gray-800 dark:text-gray-200">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {file.type === 'image' ? 'Images' : file.type === 'video' ? 'Videos' : file.type === 'pdf' ? 'Documents' : 'Others'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(file.size)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(file.modified)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setSelectedFile(file)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="مشاهده جزئیات"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => copyToClipboard(file.url)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="کپی URL"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(file.url)}
                              disabled={deleting === file.url}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="حذف"
                            >
                              <DeleteOutlineIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ComponentCard>
          )}
        </div>
      </div>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedFile(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">جزئیات فایل</h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {selectedFile.type === 'image' && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">نام فایل</label>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{selectedFile.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">نوع فایل</label>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                    {selectedFile.type === 'image' ? 'تصویر' : selectedFile.type === 'video' ? 'ویدیو' : selectedFile.type === 'pdf' ? 'PDF' : 'سایر'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">اندازه</label>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">تاریخ ویرایش</label>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{formatDate(selectedFile.modified)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">مسیر</label>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{selectedFile.folder}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedFile.url}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedFile.url)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      کپی
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    copyToClipboard(selectedFile.url);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  کپی URL
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedFile.url);
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  حذف فایل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
