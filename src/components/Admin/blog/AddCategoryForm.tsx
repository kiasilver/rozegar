// components/AddCategoryForm.tsx
"use client";

import Button from "@/components/Admin/ui/button/Button";
import Input from "@/components/Admin/form/input/InputField";
import Select from "@/components/Admin/form/Select";
import Label from "@/components/Admin/form/Label";
import { useForm } from "react-hook-form";

type BlogCategory = {
  id: number;
  translations: { lang: string; name: string }[];
};

type CategoryFormProps = {
  categories: BlogCategory[];
  onSubmit: (data: { name: string; parent_id: string }) => void;
  isSubmitting: boolean;
};

export default function CategoryForm({ categories, onSubmit, isSubmitting }: CategoryFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<{ name: string; parent_id: string }>({
    defaultValues: {
      name: "",
      parent_id: "",
    },
  });

  const handleFormSubmit = (data: { name: string; parent_id: string }) => {
    console.log("Form submitted with data:", data);
    if (!data.name || !data.name.trim()) {
      console.error("Name is required");
      return;
    }
    onSubmit(data);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-5">اضافه کردن دسته بندی</h3>
        <div>
          <Label htmlFor="name">نام دسته بندی</Label>
          <Input 
            id="name" 
            {...register("name", { required: "نام دسته بندی الزامی است" })} 
            placeholder="نام دسته بندی را وارد کنید" 
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="parent_id">دسته والد</Label>
          <Select
            defaultValue=""
            options={[
              { value: "", label: "ندارد" },
              ...categories.map((cat) => {
                const name = cat.translations.find((t) => t.lang === "FA")?.name ?? `ID: ${cat.id}`;
                return { value: String(cat.id), label: name };
              }),
            ]}
            onChange={(value) => setValue("parent_id", value || "")}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "در حال ثبت..." : "ثبت دسته بندی"}
        </Button>
      </form>
    </div>
  );
}
