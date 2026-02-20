"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/Admin/ui/table";
import Checkbox from "@/components/Admin/form/input/Checkbox";
import React, { useState, useEffect } from "react";
import Button from "@/components/Admin/ui/button/Button";
import Badge from "@/components/Admin/ui/badge/Badge";
import { useAlert } from "@/context/Admin/AlertContext";
import PageBreadcrumb from "@/components/Admin/common/PageBreadCrumb";
import Image from "next/image";
import Link from "next/link";

interface Comment {
  id: number;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  name: string | null; // برای کاربران مهمان
  email: string | null; // برای کاربران مهمان
  user: {
    id: number;
    name: string;
    email: string;
    image_profile: string | null;
  } | null; // ممکن است null باشد برای کاربران مهمان
  blog: {
    id: number;
    translations: Array<{
      title: string;
      slug: string;
    }>;
  };
  parent: {
    id: number;
    content: string;
  } | null;
}

export default function CommentsList() {
  const { showAlert } = useAlert();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchComments();
  }, [statusFilter, searchQuery]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/v1/admin/content/comments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch comments");

      const result = await response.json();
      setComments(result.data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      showAlert("خطا در دریافت نظرات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (id: number, value: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSelectAll = () => {
    const allSelected =
      Object.keys(checkedItems).length === comments.length &&
      Object.values(checkedItems).every((value) => value === true);

    const newChecked = comments.reduce((acc, comment) => {
      acc[comment.id] = !allSelected;
      return acc;
    }, {} as { [key: number]: boolean });

    setCheckedItems(newChecked);
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/v1/admin/content/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (!response.ok) throw new Error("Failed to approve comment");

      showAlert("نظر با موفقیت تایید شد", "success");
      fetchComments();
    } catch (error) {
      console.error("Error approving comment:", error);
      showAlert("خطا در تایید نظر", "error");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("آیا از رد این نظر اطمینان دارید؟")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/content/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });

      if (!response.ok) throw new Error("Failed to reject comment");

      showAlert("نظر با موفقیت رد شد", "success");
      fetchComments();
    } catch (error) {
      console.error("Error rejecting comment:", error);
      showAlert("خطا در رد نظر", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("آیا از حذف این نظر اطمینان دارید؟ این عمل غیرقابل بازگشت است.")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/content/comments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      showAlert("نظر با موفقیت حذف شد", "success");
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      showAlert("خطا در حذف نظر", "error");
    }
  };

  const handleBulkAction = async (action: "APPROVED" | "REJECTED" | "DELETE") => {
    const selectedIds = Object.keys(checkedItems)
      .map(Number)
      .filter((id) => checkedItems[id]);

    if (selectedIds.length === 0) {
      showAlert("لطفاً حداقل یک نظر را انتخاب کنید", "error");
      return;
    }

    if (action === "DELETE") {
      if (!confirm(`آیا از حذف ${selectedIds.length} نظر انتخاب شده اطمینان دارید؟`)) {
        return;
      }
    }

    try {
      const promises = selectedIds.map((id) => {
        if (action === "DELETE") {
          return fetch(`/api/v1/admin/content/comments/${id}`, { method: "DELETE" });
        } else {
          return fetch(`/api/v1/admin/content/comments/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action }),
          });
        }
      });

      await Promise.all(promises);
      showAlert(
        `${selectedIds.length} نظر با موفقیت ${action === "DELETE" ? "حذف" : action === "APPROVED" ? "تایید" : "رد"} شد`,
        "success"
      );
      setCheckedItems({});
      fetchComments();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      showAlert("خطا در انجام عملیات", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge color="success">تایید شده</Badge>;
      case "PENDING":
        return <Badge color="warning">در انتظار</Badge>;
      case "REJECTED":
        return <Badge color="error">رد شده</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAvatarUrl = (comment: Comment) => {
    // اگر کاربر لاگین کرده باشد
    if (comment.user) {
      if (comment.user.image_profile) {
        return comment.user.image_profile;
      }
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random&color=fff&size=128&bold=true`;
    }
    // برای کاربران مهمان
    const guestName = comment.name || "ناشناس";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random&color=fff&size=128&bold=true`;
  };

  const getCommentAuthorName = (comment: Comment) => {
    return comment.user?.name || comment.name || "ناشناس";
  };

  const getCommentAuthorEmail = (comment: Comment) => {
    return comment.user?.email || comment.email || "بدون ایمیل";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="نظرات" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 sm:px-4 md:px-6 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white/90">
              لیست نظرات
            </h3>
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <input
                type="text"
                placeholder="جستجو در نظرات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="PENDING">در انتظار</option>
              <option value="APPROVED">تایید شده</option>
              <option value="REJECTED">رد شده</option>
            </select>

            <Button
              onClick={handleSelectAll}
              disabled={comments.length === 0}
              variant="outline"
              size="sm"
            >
              {Object.keys(checkedItems).length === comments.length &&
                comments.length > 0 &&
                Object.values(checkedItems).every((v) => v)
                ? "لغو انتخاب همه"
                : "انتخاب همه"}
            </Button>

            {Object.values(checkedItems).filter(Boolean).length > 0 && (
              <>
                <Button
                  onClick={() => handleBulkAction("APPROVED")}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  تایید انتخاب شده‌ها
                </Button>
                <Button
                  onClick={() => handleBulkAction("REJECTED")}
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  رد انتخاب شده‌ها
                </Button>
                <Button
                  onClick={() => handleBulkAction("DELETE")}
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  حذف انتخاب شده‌ها
                </Button>
              </>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {Object.values(checkedItems).filter(Boolean).length} انتخاب شده
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            در حال بارگذاری...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            نظری یافت نشد
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                <TableRow>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    <Checkbox
                      checked={
                        Object.keys(checkedItems).length === comments.length &&
                        comments.length > 0 &&
                        Object.values(checkedItems).every((v) => v)
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    نویسنده
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    محتوا
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    مقاله
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    وضعیت
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    تاریخ
                  </TableCell>
                  <TableCell
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    عملیات
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="py-3">
                      <Checkbox
                        checked={checkedItems[comment.id] || false}
                        onChange={(val) => handleCheckboxChange(comment.id, val)}
                      />
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Image
                            src={getAvatarUrl(comment)}
                            alt={getCommentAuthorName(comment)}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            {getCommentAuthorName(comment)}
                            {!comment.user && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(مهمان)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getCommentAuthorEmail(comment)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-md">
                      <div className="line-clamp-2">{comment.content}</div>
                      {comment.parent && (
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
                          پاسخ به: {comment.parent.content.substring(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {comment.blog.translations[0] ? (
                        <Link
                          href={`/news/${comment.blog.translations[0].slug}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline line-clamp-1"
                          target="_blank"
                        >
                          {comment.blog.translations[0].title}
                        </Link>
                      ) : (
                        <span className="text-gray-400">بدون عنوان</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {getStatusBadge(comment.status)}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="text-xs">{formatDate(comment.created_at)}</div>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        {comment.status !== "APPROVED" && (
                          <button
                            onClick={() => handleApprove(comment.id)}
                            className="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-colors text-sm"
                          >
                            تایید
                          </button>
                        )}
                        {comment.status !== "REJECTED" && (
                          <button
                            onClick={() => handleReject(comment.id)}
                            className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors text-sm"
                          >
                            رد
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors text-sm"
                        >
                          حذف
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
