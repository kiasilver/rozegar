"use client";
import ComponentCard from "@/components/admin/common/componentcard";
import PageBreadcrumb from "@/components/admin/common/pagebreadcrumb";
import React, { useEffect, useState } from "react";
import { useAlert } from "@/context/admin/alertcontext";
import Button from "@/components/admin/ui/button/button";
import Badge from "@/components/admin/ui/badge/badge";
import Label from "@/components/admin/form/label";
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';

interface Menu {
    menuid: number;
    menukey: string;
    url: string | null;
    translations: Array<{ title: string; lang: string }>;
    other_menus?: Menu[];
}

interface Permission {
    permissionid: number;
    rolename: string;
    menukey: string;
    canview: boolean;
    canedit: boolean;
    candelete: boolean;
    menu?: {
        translations: Array<{ title: string; lang: string }>;
    };
}

const permissionOptions = [
    { value: "false", label: "غیرفعال" },
    { value: "true", label: "فعال" },
];

const roleOptions = [
    { value: "Super Admin", label: "Super Admin" },
    { value: "Admin", label: "مدیر (Admin)" },
    { value: "Author", label: "نویسنده (Author)" },
];

export default function PermissionsPage() {
    const { showAlert } = useAlert();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>("Super Admin");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchMenus();
        fetchPermissions();
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [selectedRole]);

    const fetchMenus = async () => {
        try {
            const response = await fetch("/api/v1/admin/system/menus");
            if (!response.ok) throw new Error("Failed to fetch menus");
            const data: Menu[] = await response.json();
            setMenus(data);
        } catch (error) {
            console.error("Error fetching menus:", error);
            showAlert("خطا در دریافت منوها", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await fetch("/api/v1/admin/system/menus/permissions");
            if (!response.ok) throw new Error("Failed to fetch permissions");
            const data: Permission[] = await response.json();
            setPermissions(data.filter(p => p.rolename === selectedRole));
        } catch (error) {
            console.error("Error fetching permissions:", error);
        }
    };

    const getPermission = (menukey: string): Permission | null => {
        return permissions.find(p => p.menukey === menukey) || null;
    };

    const handlePermissionChange = async (
        menukey: string,
        field: "canview" | "canedit" | "candelete",
        value: string
    ) => {
        const boolValue = value === "true";
        const currentPermission = getPermission(menukey);
        
        // Create updated permission object
        const updatedPermission: Permission = {
            permissionid: currentPermission?.permissionid || 0,
            rolename: selectedRole,
            menukey,
            canview: field === "canview" ? boolValue : (currentPermission?.canview ?? false),
            canedit: field === "canedit" ? boolValue : (currentPermission?.canedit ?? false),
            candelete: field === "candelete" ? boolValue : (currentPermission?.candelete ?? false),
        };

        // If canview is false, disable canedit and candelete
        if (field === "canview" && !boolValue) {
            updatedPermission.canedit = false;
            updatedPermission.candelete = false;
        }

        // If canedit is false, disable candelete
        if (field === "canedit" && !boolValue) {
            updatedPermission.candelete = false;
        }

        // Update local state immediately for instant UI feedback
        setPermissions(prev => {
            const filtered = prev.filter(p => p.menukey !== menukey);
            return [...filtered, updatedPermission];
        });

        setSaving(menukey);
        try {
            const response = await fetch("/api/v1/admin/system/menus/permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    menukey: updatedPermission.menukey,
                    rolename: updatedPermission.rolename,
                    canview: updatedPermission.canview,
                    canedit: updatedPermission.canedit,
                    candelete: updatedPermission.candelete,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "خطا در ذخیره دسترسی");
            }

            // Refresh to ensure sync with server
            await fetchPermissions();
            showAlert("دسترسی با موفقیت به‌روزرسانی شد", "success");
        } catch (error) {
            // Revert on error
            await fetchPermissions();
            showAlert(error instanceof Error ? error.message : "خطا در ذخیره دسترسی", "error");
        } finally {
            setSaving(null);
        }
    };

    const renderMenuPermissions = (menu: Menu, level: number = 0) => {
        const permission = getPermission(menu.menukey);
        const menuTitle = menu.translations.find(t => t.lang === "FA")?.title || menu.menukey;
        const isSaving = saving === menu.menukey;
        const canView = permission?.canview ?? false;
        const canEdit = permission?.canedit ?? false;
        const canDelete = permission?.candelete ?? false;

        return (
            <div key={menu.menuid} className={`${level > 0 ? "mr-6 mt-3" : ""}`}>
                <div className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    level > 0 
                        ? "bg-gradient-to-r from-gray-50/50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/50 border-gray-200 dark:border-gray-700/50" 
                        : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md"
                }`}>
                    {/* Menu Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {level > 0 && (
                                <span className="text-gray-400 dark:text-gray-500 text-lg">└─</span>
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {menuTitle}
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                            {menu.menukey}
                        </p>
                    </div>

                    {/* Permission Dropdowns */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* View Permission */}
                        <div className="flex flex-col gap-1 min-w-[120px]">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">مشاهده</Label>
                            <div className="relative">
                                <select
                                    value={canView ? "true" : "false"}
                                    onChange={(e) => handlePermissionChange(menu.menukey, "canview", e.target.value)}
                                    disabled={isSaving}
                                    className={`h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                                        isSaving 
                                            ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                                            : "border-gray-300 dark:border-gray-700"
                                    }`}
                                >
                                    {permissionOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                                    <ExpandMoreOutlinedIcon className="w-5 h-5" />
                                </span>
                            </div>
                        </div>

                        {/* Edit Permission */}
                        <div className="flex flex-col gap-1 min-w-[120px]">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">ویرایش</Label>
                            <div className="relative">
                                <select
                                    value={canEdit ? "true" : "false"}
                                    onChange={(e) => handlePermissionChange(menu.menukey, "canedit", e.target.value)}
                                    disabled={!canView || isSaving}
                                    className={`h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                                        !canView || isSaving 
                                            ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                                            : "border-gray-300 dark:border-gray-700"
                                    }`}
                                >
                                    {permissionOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                                    <ExpandMoreOutlinedIcon className="w-5 h-5" />
                                </span>
                            </div>
                        </div>

                        {/* Delete Permission */}
                        <div className="flex flex-col gap-1 min-w-[120px]">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">حذف</Label>
                            <div className="relative">
                                <select
                                    value={canDelete ? "true" : "false"}
                                    onChange={(e) => handlePermissionChange(menu.menukey, "candelete", e.target.value)}
                                    disabled={!canView || isSaving}
                                    className={`h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                                        !canView || isSaving 
                                            ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                                            : "border-gray-300 dark:border-gray-700"
                                    }`}
                                >
                                    {permissionOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                                    <ExpandMoreOutlinedIcon className="w-5 h-5" />
                                </span>
                            </div>
                        </div>

                        {/* Saving Indicator */}
                        {isSaving && (
                            <div className="flex items-center ml-2">
                                <Badge size="sm" color="light" className="animate-pulse">
                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                    ذخیره...
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submenus */}
                {menu.other_menus && menu.other_menus.length > 0 && (
                    <div className="mt-2 space-y-2 border-r-2 border-gray-200 dark:border-gray-700 pr-2">
                        {menu.other_menus.map((subMenu) => renderMenuPermissions(subMenu, level + 1))}
                    </div>
                )}
            </div>
        );
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
            <PageBreadcrumb pageTitle="مدیریت دسترسی‌ها" />
            
            <ComponentCard title="تنظیمات دسترسی‌ها">
                {/* Role Selector */}
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-100 dark:border-gray-600">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                            <Label htmlFor="role" className="mb-3 block text-base font-semibold text-gray-900 dark:text-white">
                                انتخاب نقش
                            </Label>
                            <div className="relative max-w-xs">
                                <select
                                    id="role"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="h-12 w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-base font-medium text-gray-900 dark:text-white shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:focus:border-brand-800"
                                >
                                    {roleOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                                    <ExpandMoreOutlinedIcon className="w-5 h-5" />
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                                دسترسی‌های منوها برای نقش <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedRole}</span> را تنظیم کنید
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge size="md" color="primary">
                                {permissions.length} منو
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Permissions List */}
                <div className="space-y-3">
                    {menus.length > 0 ? (
                        menus.map((menu) => renderMenuPermissions(menu))
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium">منویی یافت نشد</p>
                        </div>
                    )}
                </div>
            </ComponentCard>
        </div>
    );
}
