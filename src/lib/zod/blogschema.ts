// src/lib/validations/blogSchema.ts
import { z } from "zod"

export const blogSchema = z.object({
  name: z.string().min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),
  slug: z.string().optional(),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد"),
  categories: z.array(z.string()).min(1, "حداقل یک دسته‌بندی انتخاب کنید"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
})
