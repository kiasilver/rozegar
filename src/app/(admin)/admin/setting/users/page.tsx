"use client";
import ComponentCard from "@/components/admin/common/componentcard";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import React, { useEffect, useState } from "react";
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
import Button from "@/components/admin/ui/button/button";
import { Modal } from "@/components/admin/ui/modal";
import { useModal } from "@/hooks/admin/usemodal";
import Input from "@/components/admin/form/input/inputfield";
import Label from "@/components/admin/form/label";
import { z } from "zod";

interface User {
    id: number;
    name: string;
    email: string;
    image_profile: string | null;
    role: string;
    status: string;
    is_active: boolean;
    blogs: number;
    created_at: string;
}

const userSchema = z.object({
    name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
    email: z.string().email("ایمیل معتبر نیست"),
    password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
    role: z.enum(["Admin", "Author"], { errorMap: () => ({ message: "نقش باید Admin یا Author باشد" }) }),
});

type UserFormData = z.infer<typeof userSchema>;

export default function UsersPage() {
    const { showAlert } = useAlert();
    const { isOpen, openModal, closeModal } = useModal();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        role: 'Author',
    });
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/v1/admin/system/users");
            if (!response.ok) throw new Error("Failed to fetch users");
            const result = await response.json();
            setUsers(result.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            showAlert("خطا در دریافت کاربران", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setFormData({ name: '', email: '', password: '', role: 'Author' });
        openModal();
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't pre-fill password
        });
        setEditModalOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingUser) return;

        try {
            // Validate at least one field is provided
            if (!editFormData.name && !editFormData.email && !editFormData.password) {
                showAlert('لطفاً حداقل یک فیلد را پر کنید', 'error');
                return;
            }

            // Validate name if provided
            if (editFormData.name && editFormData.name.length < 2) {
                showAlert('نام باید حداقل ۲ کاراکتر باشد', 'error');
                return;
            }

            // Validate email if provided
            if (editFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
                showAlert('ایمیل معتبر نیست', 'error');
                return;
            }

            // Validate password if provided
            if (editFormData.password && editFormData.password.length < 6) {
                showAlert('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
                return;
            }

            setSaving(true);

            const updateData: { name?: string; email?: string; password?: string } = {};
            if (editFormData.name) updateData.name = editFormData.name;
            if (editFormData.email) updateData.email = editFormData.email;
            if (editFormData.password) updateData.password = editFormData.password;

            const res = await fetch(`/api/v1/admin/system/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'خطا در به‌روزرسانی کاربر');
            }

            showAlert('کاربر با موفقیت به‌روزرسانی شد', 'success');
            setEditModalOpen(false);
            setEditingUser(null);
            setEditFormData({ name: '', email: '', password: '' });
            fetchUsers();
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'خطا در به‌روزرسانی کاربر', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        try {
            userSchema.parse(formData);
            setSaving(true);

            const res = await fetch("/api/v1/admin/system/users", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'خطا در ایجاد کاربر');
            }

            showAlert('کاربر با موفقیت ایجاد شد', 'success');
            closeModal();
            fetchUsers();
        } catch (error) {
            if (error instanceof z.ZodError) {
                showAlert(error.errors[0].message, 'error');
            } else {
                showAlert(error instanceof Error ? error.message : 'خطا در ایجاد کاربر', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`آیا از حذف کاربر "${name}" اطمینان دارید؟`)) return;

        try {
            const res = await fetch(`/api/v1/admin/system/users/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('خطا در حذف کاربر');

            showAlert('کاربر با موفقیت حذف شد', 'success');
            fetchUsers();
        } catch (error) {
            showAlert('خطا در حذف کاربر', 'error');
        }
    };

    const getAvatarUrl = (user: User) => {
        if (user.image_profile) return user.image_profile;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=465fff&color=fff&size=200`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-lg text-gray-600 dark:text-gray-400">در حال بارگذاری...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageBreadcrumb pageTitle="مدیریت کاربران" />

            <ComponentCard title="کاربران">
                <div className="mb-4 flex justify-end">
                    <Button onClick={handleAdd}>افزودن کاربر جدید</Button>
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
                                        ایمیل
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                    >
                                        نقش
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
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                                                    <Image
                                                        width={40}
                                                        height={40}
                                                        src={getAvatarUrl(user)}
                                                        alt={user.name}
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {user.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-start">
                                            <Badge
                                                size="sm"
                                                color={user.role === "Admin" ? "success" : "light"}
                                            >
                                                {user.role === "Admin" ? "مدیر" : "نویسنده"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            {user.blogs}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-start">
                                            <Badge
                                                size="sm"
                                                color={
                                                    user.status === "Online"
                                                        ? "success"
                                                        : user.status === "Offline"
                                                            ? "warning"
                                                            : "error"
                                                }
                                            >
                                                {user.status === "Online" ? "آنلاین" : "آفلاین"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                                                >
                                                    ویرایش
                                                </button>
                                                {user.role !== "Admin" && (
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                                    >
                                                        حذف
                                                    </button>
                                                )}
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
                            افزودن کاربر جدید
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
                                    placeholder="نام کاربر"
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
                                <Label htmlFor="password">رمز عبور</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="حداقل ۶ کاراکتر"
                                />
                            </div>
                            <div>
                                <Label htmlFor="role">نقش</Label>
                                <select
                                    id="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as "Admin" | "Author" }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Author">نویسنده</option>
                                    <option value="Admin">مدیر</option>
                                </select>
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

            {/* Edit User Modal */}
            <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingUser(null); }} className="max-w-[600px] m-4">
                <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            ویرایش کاربر
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            فقط فیلدهایی که می‌خواهید تغییر دهید را پر کنید
                        </p>
                    </div>
                    <form className="flex flex-col">
                        <div className="space-y-4 px-2">
                            <div>
                                <Label htmlFor="edit-name">نام</Label>
                                <Input
                                    id="edit-name"
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={editingUser?.name || "نام کاربر"}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-email">ایمیل</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder={editingUser?.email || "email@example.com"}
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-password">رمز عبور جدید (اختیاری)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="خالی بگذارید تا تغییر نکند"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    اگر می‌خواهید رمز عبور تغییر نکند، این فیلد را خالی بگذارید
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setEditModalOpen(false); setEditingUser(null); }}>
                                انصراف
                            </Button>
                            <Button size="sm" onClick={handleUpdate} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
