"use client";

import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Trash2, ImageIcon } from "lucide-react";
import { useAlert } from "@/context/admin/alertcontext";

interface FileStatus {
  id: string;
  file: File;
  progress: number | null;
  url?: string;
  error?: string;
  isUploading: boolean;

}

interface DragDropFileProps {
  onChange?: (value: string) => void;
  resetSignal?: unknown;
  initialUrl?: string; // 👈 اضافه کن
}

const DragDropFile: React.FC<DragDropFileProps> = ({ onChange, resetSignal, initialUrl }) => {

  const { showAlert } = useAlert();
  const [files, setFiles] = useState<FileStatus[]>([]);

  useEffect(() => {
    if (initialUrl) {
      const id = crypto.randomUUID();
      setFiles([{
        id,
        file: new File([""], "existing.jpg"), // فیک برای نمایش فقط
        progress: 100,
        url: initialUrl,
        isUploading: false,
      }]);
    } else {
      setFiles([]);
    }
  }, [resetSignal, initialUrl]);
  

  const handleUpload = (file: File) => {
    const id = crypto.randomUUID();
    const newFile: FileStatus = {
      id,
      file,
      progress: 0,
      isUploading: true,
    };
    setFiles((prev) => [...prev, newFile]);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/admin/media");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        updateFile(id, { progress: percent });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          const fileUrl = res.url;
          updateFile(id, {
            url: fileUrl,
            isUploading: false,
            progress: 100,
          });
          onChange?.(fileUrl);
        } catch {
          updateFile(id, {
            error: "پاسخ نامعتبر از سرور.",
            isUploading: false,
          });
          showAlert("پاسخ نامعتبر از سرور.", "error");
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          const msg = parsed.message || "آپلود با خطا مواجه شد.";
          updateFile(id, {
            error: msg,
            isUploading: false,
          });
          showAlert(msg, "error");
        } catch {
          updateFile(id, {
            error: "آپلود با خطا مواجه شد.",
            isUploading: false,
          });
          showAlert("آپلود با خطا مواجه شد.", "error");
        }
      }
    };

    xhr.onerror = () => {
      updateFile(id, {
        error: "خطا در زمان آپلود.",
        isUploading: false,
      });
      showAlert("خطا در زمان آپلود.", "error");
    };

    xhr.send(formData);
  };

  const updateFile = (id: string, updates: Partial<FileStatus>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], fileRejections) => {
      fileRejections.forEach((rejection) => {
        rejection.errors.forEach((error) => {
          if (error.code === "file-too-large") {
            showAlert(
              `حجم فایل ${rejection.file.name} بیشتر از ۲ مگابایت است.`,
              "error"
            );
          }
        });
      });

      acceptedFiles.forEach(handleUpload);
    },
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/svg+xml": [],
    },
    maxSize: 2 * 1024 * 1024,
  });

  const hasUploadedFile = files.some((f) => f.url);

  return (
    <div className="rounded-2xl space-y-4">
      {!hasUploadedFile && (
        <div
          {...getRootProps()}
          className={`animate-gradient-x py-20 border-2 p-4 cursor-pointer transition text-center ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col-reverse items-center justify-center text-gray-500 gap-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              SVG, PNG, JPG or GIF (MAX. 1200x500px) 2MB
            </p>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {files.map((f) => (
        <div
          key={f.id}
          className={`flex items-center justify-between gap-4 border rounded-xl p-3 ${
            f.error ? "border-red-400 bg-red-50 text-red-500" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {f.url ? (
              <img
                src={f.url}
                alt="uploaded"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : f.isUploading ? (
              <div className="w-10 h-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : (
              <ImageIcon className="w-10 h-10 text-red-400" />
            )}
            <div>
              <p
                className={`text-sm ${
                  f.error ? "text-red-500" : "text-blue-600"
                }`}
              >
                {f.file.name}
              </p>
              {f.isUploading && (
                <div className="h-1 w-36 bg-gray-200 rounded mt-1 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <button onClick={() => removeFile(f.id)}>
            <Trash2
              className={`w-4 h-4 ${
                f.error ? "text-red-500" : "text-gray-400 hover:text-red-400"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default DragDropFile;
