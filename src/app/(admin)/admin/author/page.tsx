"use client";
import ComponentCard from "@/components/admin/common/componentcard";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
  } from "@/components/admin/ui/table";
  
  import Badge from "@/components/admin/ui/badge/badge";
  import Image from "next/image";
  import { useAlert } from "@/context/admin/alertcontext";
  import { useEffect, useState } from "react";
  import Button from "@/components/admin/ui/button/button";
  import { Modal } from "@/components/admin/ui/modal";
  import { useModal } from "@/hooks/admin/usemodal";
  import Input from "@/components/admin/form/input/inputfield";
  import Label from "@/components/admin/form/label";
  import { z } from "zod";

interface Author {
  id: number;
  image_profile: string | null;
  name: string;
  email: string;
  status: string;
  blogs: number;
}

const authorSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد").optional(),
});

type AuthorFormData = z.infer<typeof authorSchema>;

  export default function AuthorList() {
    const { showAlert } = useAlert();
    const { isOpen, openModal, closeModal } = useModal();
    const [authors, setAuthors] = useState<Author[]>([]);
    const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
    const [formData, setFormData] = useState<AuthorFormData>({
      name: '',
      email: '',
      password: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      fetchAuthors();
    }, []);

    const fetchAuthors = async () => {
      try {
        const response = await fetch("/api/v1/admin/content/profile");
        if (!response.ok) throw new Error("Failed to fetch authors");
        const data: Author[] = await response.json();
        setAuthors(data);
      } catch (error) {
        console.error("Error fetching authors:", error);
        showAlert("خطا در دریافت نویسندگان", "error");
      }
    };

    const handleAdd = () => {
      setEditingAuthor(null);
      setFormData({ name: '', email: '', password: '' });
      openModal();
    };

    const handleEdit = (author: Author) => {
      setEditingAuthor(author);
      setFormData({ name: author.name, email: author.email, password: '' });
      openModal();
    };

    const handleSave = async () => {
      try {
        authorSchema.parse(formData);
        setSaving(true);

        const url = editingAuthor 
          ? `/api/v1/admin/content/profile/${editingAuthor.id}`
          : '/api/v1/admin/content/profile';
        
        const method = editingAuthor ? 'PATCH' : 'POST';
        const body = editingAuthor && !formData.password
          ? { name: formData.name, email: formData.email }
          : formData;

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'خطا در ذخیره نویسنده');
        }

        showAlert(editingAuthor ? 'نویسنده با موفقیت به‌روز شد' : 'نویسنده با موفقیت اضافه شد', 'success');
        closeModal();
        fetchAuthors();
      } catch (error) {
        if (error instanceof z.ZodError) {
          showAlert(error.errors[0].message, 'error');
        } else {
          showAlert(error instanceof Error ? error.message : 'خطا در ذخیره نویسنده', 'error');
        }
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (id: number) => {
      if (!confirm('آیا از حذف این نویسنده اطمینان دارید؟')) return;

      try {
        const res = await fetch(`/api/v1/admin/content/profile/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('خطا در حذف نویسنده');

        showAlert('نویسنده با موفقیت حذف شد', 'success');
        fetchAuthors();
      } catch (error) {
        showAlert('خطا در حذف نویسنده', 'error');
      }
    };

    const getAvatarUrl = (author: Author) => {
      if (author.image_profile) return author.image_profile;
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=465fff&color=fff&size=200`;
    };

    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="نویسندگان" />
        
        <ComponentCard title="نویسندگان">
          <div className="mb-4 flex justify-end">
            <Button onClick={handleAdd}>افزودن نویسنده جدید</Button>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      کاربر
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      تعداد پست
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      وضعیت
                    </TableCell>
                    <TableCell
                      isHeader
                      className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      عملیات
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {authors.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                            <Image
                              width={40}
                              height={40}
                              src={getAvatarUrl(author)}
                              alt={author.name}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {author.name}
                            </span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                              {author.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {author.blogs}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          size="sm"
                          color={
                            author.status === "Online"
                              ? "success"
                              : author.status === "Offline"
                              ? "warning"
                              : "error"
                          }
                        >
                          {author.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(author)}
                            className="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 transition-colors"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDelete(author.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
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
          </div>
        </ComponentCard>

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[600px] m-4">
          <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
            <div className="px-2 pr-14">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {editingAuthor ? 'ویرایش نویسنده' : 'افزودن نویسنده جدید'}
              </h4>
            </div>
            <form className="flex flex-col">
              <div className="space-y-4 px-2">
                <div>
                  <Label htmlFor="name">نام</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="نام نویسنده"
                  />
                </div>
                <div>
                  <Label htmlFor="email">ایمیل</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    {editingAuthor ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingAuthor ? 'در صورت تغییر رمز وارد کنید' : 'حداقل ۶ کاراکتر'}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeModal}>
                  انصراف
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    );
  }
