// components/EditBlogCategory.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/button";
import Input from "../form/input/inputfield";
import Label from "../form/label";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string; // یا هر نوعی که آی‌دی‌ت هست
}

export default function EditBlogCategory({ isOpen, onClose, categoryId }: Props) {
  const [data, setData] = useState({
    name: "",
    slug: "",
    parentId: "",
    lang: "",
  });

  useEffect(() => {
    if (isOpen && categoryId) {
      // دریافت اطلاعات بر اساس ID
      fetch(`/api/categories/${categoryId}`)
        .then((res) => res.json())
        .then((json) => {
          setData({
            name: json.name,
            slug: json.slug,
            parentId: json.parentId,
            lang: json.lang,
          });
        });
    }
  }, [isOpen, categoryId]);

  const handleSave = () => {
    // ارسال اطلاعات به API برای آپدیت
    console.log("Saving:", data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
      <div className="relative w-full p-4 bg-white rounded-3xl dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Edit Category
          </h4>
        </div>
        <form className="flex flex-col">
          <div className="px-2 overflow-y-auto">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div>
                <Label>Category Name</Label>
                <Input 
                  type="text" 
                  value={data.name} 
                  onChange={(e) => setData({ ...data, name: e.target.value })} 
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input 
                  type="text" 
                  value={data.slug} 
                  onChange={(e) => setData({ ...data, slug: e.target.value })} 
                />
              </div>
              <div>
                <Label>Parent Category</Label>
                <Input 
                  type="text" 
                  value={data.parentId} 
                  onChange={(e) => setData({ ...data, parentId: e.target.value })} 
                />
              </div>
              <div>
                <Label>Language</Label>
                <Input 
                  type="text" 
                  value={data.lang} 
                  onChange={(e) => setData({ ...data, lang: e.target.value })} 
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
