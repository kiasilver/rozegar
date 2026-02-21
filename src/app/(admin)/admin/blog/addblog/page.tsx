// This file is addblog/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Label from "@/components/admin/form/label";
import Input from "@/components/admin/form/input/inputfield";
import Textarea from "@/components/admin/form/input/textarea";
import Select from "@/components/admin/form/select";
import Button from "@/components/admin/ui/button/button";
import DragDropFile from "@/components/admin/form/form-elements/dropzone";
import Checkbox from "@/components/admin/form/input/checkbox";
import { useAlert } from "@/context/admin/alertcontext";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateBlogSlug, getOrCreateCategorySlug } from "@/lib/content/blog/blog-slug";
import WordPressEditor from "@/components/admin/form/richtext/wordpresseditor";
import { z } from "zod";
import SEOPanel from "@/components/admin/seo/seopanel";
import { useRouter } from "next/navigation";

const blogSchema = z.object({
  name: z.string().min(3, "????? ???? ????? ? ??????? ????"),
  slug: z.string().optional(),
  description: z.string().refine(
    (val) => {
      if (!val) return false;
      // Strip HTML tags and check text length
      const text = val.replace(/<[^>]*>/g, "").trim();
      return text.length >= 10;
    },
    { message: "????? ???? ????? ?? ??????? ???? (???? ?? ??? ???? ?????? HTML)" }
  ),
  categories: z.array(z.string()).min(1, "????? ?? ????????? ?? ?????? ????"),
  image: z.any().optional(),
  sliderRequested: z.boolean().optional(),
  sliderTitle: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED"]).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  canonical_url: z.string().optional(),
  robots: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
});

type BlogFormData = z.infer<typeof blogSchema>;

type Category = {
  id: number;
  name: string;
};

export default function AddBlog() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("?????");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      categories: [],
      image: undefined,
      sliderRequested: false,
      sliderTitle: "",
      status: "DRAFT",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonical_url: "",
      robots: "index, follow",
      og_title: "",
      og_description: "",
      og_image: "",
      twitter_title: "",
      twitter_description: "",
      twitter_image: "",
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/v1/admin/content/blogs/category");
      const rawData = await res.json();

      const transformed = rawData.map((cat: { id: number; translations: { lang: string; name: string }[] }) => {
        const faTranslation = cat.translations.find((t: { lang: string; name: string }) => t.lang === "FA");
        return {
          id: cat.id,
          name: faTranslation?.name || "???? ?????"
        };
      });

      setCategories(transformed);
    };

    fetchCategories();
  }, []);

  const sliderRequested = watch("sliderRequested") ?? false;
  const nameVal = watch("name") ?? "";
  const sliderTitleVal = watch("sliderTitle") ?? "";
  const selectedCategories = watch("categories") || [];
  const descriptionVal = watch("description") ?? "";
  const metaTitleVal = watch("metaTitle") ?? "";
  const metaDescriptionVal = watch("metaDescription") ?? "";
  const metaKeywordsVal = watch("metaKeywords") ?? "";
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [autoSEOGenerated, setAutoSEOGenerated] = useState(false); // ???? ??????? ?? ????? ????

  // ????? ?????? SEO ?? Cursor Agent ???? title ? content ???? ????
  useEffect(() => {
    const generateAutoSEO = async () => {
      // ????? ????? title ? content ???? ????? ? ????? ??? ?????
      const titleText = nameVal?.trim() || "";
      const contentText = descriptionVal?.replace(/<[^>]*>/g, " ").trim() || "";
      
      if (
        titleText.length >= 10 && 
        contentText.length >= 50 && 
        !autoSEOGenerated && 
        !isGeneratingSEO
      ) {
        setIsGeneratingSEO(true);
        setAutoSEOGenerated(true); // ??????? ?? ????? ????
        
        try {
          const response = await fetch("/api/v1/admin/content/blogs/generate-seo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: titleText,
              content: contentText.substring(0, 2000), // ????? ???? ???
              keywords: metaKeywordsVal ? metaKeywordsVal.split(",").map((k: string) => k.trim()) : [],
              useAI: true,
              aiProvider: "cursor", // ??????? ?? Cursor Agent
              useAgentAnalysis: true, // ??????? ?? AI Agent ???? ????? ????
              language: "fa",
            }),
          });

          if (!response.ok) {
            throw new Error("??? ?? ????? SEO");
          }

          const seoResult = await response.json();
          
          // ?? ???? ??????? SEO ??? ??? ???? ?????
          if (!metaTitleVal) {
            setValue("metaTitle", seoResult.meta_title || "");
          }
          if (!metaDescriptionVal) {
            setValue("metaDescription", seoResult.meta_description || "");
          }
          if (!metaKeywordsVal) {
            setValue("metaKeywords", seoResult.meta_keywords || "");
          }
          const ogTitleVal = watch("og_title");
          const ogDescVal = watch("og_description");
          const twitterTitleVal = watch("twitter_title");
          const twitterDescVal = watch("twitter_description");
          
          if (!ogTitleVal) {
            setValue("og_title", seoResult.meta_title || "");
          }
          if (!ogDescVal) {
            setValue("og_description", seoResult.meta_description || "");
          }
          if (!twitterTitleVal) {
            setValue("twitter_title", seoResult.meta_title || "");
          }
          if (!twitterDescVal) {
            setValue("twitter_description", seoResult.meta_description || "");
          }
          
          console.log("? SEO ?? ?????? ?? ???? ?????? ?? Cursor Agent ????? ??!");
        } catch (error) {
          console.error("? ??? ?? ????? ?????? SEO:", error);
          // ??? ?? ?? ???? silent handle ??????? ?? UX ?? ???? ????
        } finally {
          setIsGeneratingSEO(false);
        }
      }
    };

    // ????? 1.5 ????? ???? ??????? ?? ????? ???? ?? ??? ????
    const timeoutId = setTimeout(() => {
      generateAutoSEO();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [nameVal, descriptionVal, autoSEOGenerated, isGeneratingSEO, metaTitleVal, metaDescriptionVal, metaKeywordsVal, setValue, watch]);

  const toggleCategory = (cat: string) => {
    const current = selectedCategories;
    const newValue = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setValue("categories", newValue);
  };

  const onSubmit = async (data: BlogFormData) => {
    console.log("?? Form submitted with data:", {
      name: data.name,
      descriptionLength: data.description?.length || 0,
      categories: data.categories,
      status: data.status,
    });

    // Validate description (strip HTML tags for length check)
    const descriptionText = data.description?.replace(/<[^>]*>/g, "").trim() || "";
    if (descriptionText.length < 10) {
      showAlert("????? ???? ????? ?? ??????? ???? (???? ?? ??? ???? ?????? HTML)", "error");
      return;
    }

    setIsSubmitting(true);

    // slug ?? API route ????? ?????? (?? ??????? ?? ???? ?????)
    // ????? ??? slug ?????? ?? ????? ??????? (??? ???? ???)
    // ?? ??? ??? ???? slug ???? ????? ?????? ? ?? ????? ????? ??????

    const finalSliderTitle = (data.sliderTitle && data.sliderTitle.trim())
      ? data.sliderTitle.trim()
      : data.name;

    const blog = {
      ...data,
      slug: data.slug?.trim() || undefined, // ??? slug ?????? (??? ???? ???)
      sliderTitle: finalSliderTitle,
      status: data.status || "DRAFT",
      categories: data.categories.map((id) => String(id)),
    };

    console.log("?? Sending blog data to API:", {
      name: blog.name,
      descriptionLength: blog.description?.length || 0,
      categories: blog.categories,
    });

    try {
      const res = await fetch("/api/v1/admin/content/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });

      console.log("?? API Response status:", res.status);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "???? ??????" }));
        console.error("? API Error:", err);
        showAlert("??? ?? ??? ????: " + (err.error || err.message || "???? ??????"), "error");
        setIsSubmitting(false);
        return;
      }

      const result = await res.json();
      console.log("? Blog created successfully:", result);

      showAlert("???? ?? ?????? ??? ??!", "success");
      setEditorKey((prev) => prev + 1);
      reset({
        name: "",
        slug: "",
        description: "",
        categories: [],
        image: undefined,
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        canonical_url: "",
        robots: "index, follow",
        og_title: "",
        og_description: "",
        og_image: "",
        twitter_title: "",
        twitter_description: "",
        twitter_image: "",
        sliderRequested: false,
        sliderTitle: "",
        status: "DRAFT",
      });
      setResetKey((prev) => prev + 1);
      setAutoSEOGenerated(false); // ???? ???? flag ???? ???? ????
      
      // Redirect to blog list after 1.5 seconds
      setTimeout(() => {
        router.push("/admin/blog/bloglist");
      }, 1500);
    } catch (error) {
      console.error("? Error creating blog:", error);
      const errorMessage = error instanceof Error ? error.message : "???? ????????? ????? ??? ????";
      showAlert(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 ${isSubmitting ? "pointer-events-none opacity-50" : ""
        }`}
    >
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        ???? ???? ????
      </h3>

      <div className="mb-4 flex space-x-4 flex-wrap gap-2">
        {["?????", "???"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 rounded ${activeTab === tab
                ? "font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-theme-xs"
                : "dark:text-gray-400 dark:bg-gray-800"
              }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {activeTab === "?????" && (
          <>
              <div className="space-y-4">
                <div>
              <Label htmlFor="name">????? ???</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="????? ??? ?? ???? ??????"
              />
              {errors.name && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label>?????????</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedCategories.includes(cat.id.toString())}
                      onChange={() => toggleCategory(cat.id.toString())}
                    />
                    <span className="dark:text-white text-gray-700">{cat.name}</span>
                  </label>
                ))}
              </div>
              {errors.categories && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  {errors.categories.message}
                </p>
              )}

              <div className="mt-4">
                <Label htmlFor="status">????? ??????</Label>
                <Select
                  defaultValue={watch("status") || "DRAFT"}
                  options={[
                    { value: "DRAFT", label: "????????" },
                    { value: "PENDING", label: "?? ?????? ?????" },
                    { value: "PUBLISHED", label: "????? ???" },
                  ]}
                  onChange={(val) => setValue("status", val as "DRAFT" | "PENDING" | "PUBLISHED")}
                />
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={sliderRequested}
                    onChange={() => {
                      const next = !sliderRequested;
                      setValue("sliderRequested", next);
                      if (next && !(sliderTitleVal?.trim())) {
                        setValue("sliderTitle", nameVal || "");
                      }
                      if (!next) setValue("sliderTitle", "");
                    }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">????? ?? ??????? (?? ????)</span>
                </label>

                {sliderRequested && (
                  <>
                    <Label htmlFor="sliderTitle">???? ????? ??????? (???????)</Label>
                    <Input
                      id="sliderTitle"
                      {...register("sliderTitle")}
                      placeholder="?????: ???? / ???"
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="image">??? ???</Label>
              <Controller
                name="image"
                control={control}
                render={({ field }) => (
                  <DragDropFile onChange={(val) => field.onChange(val)} resetSignal={resetKey} />
                )}
              />
            </div>

            <Controller
              name="description"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value) return "????? ?????? ???";
                  const text = value.replace(/<[^>]*>/g, "").trim();
                  if (text.length < 10) {
                    return "????? ???? ????? ?? ??????? ???? (???? ?? ??? ???? ?????? HTML)";
                  }
                  return true;
                }
              }}
              render={({ field }) => (
                <div>
                  <Label htmlFor="description">?????</Label>
                  <WordPressEditor
                    value={field.value || ""}
                    key={editorKey}
                    onChange={(value) => {
                      field.onChange(value);
                      // Trigger validation
                      setTimeout(() => {
                        const event = new Event("input", { bubbles: true });
                        document.dispatchEvent(event);
                      }, 0);
                    }}
                    placeholder="????? ?? ????? ???????... ????????? ?????? ????? ? ???????? ????? ????? ????."
                    title={nameVal}
                    image={watch("image")}
                    categories={categories.filter(cat => selectedCategories.includes(cat.id.toString())).map(cat => cat.name)}
                    author="???????"
                    onTitleChange={(newTitle) => {
                      setValue("name", newTitle);
                    }}
                  />
                  {errors.description && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              )}
            />
            </div>
          </>
        )}

        {activeTab === "???" && (
          <>
            {/* SEO Panel ? ??? ?? ?? grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center flex-1">
                    <span className="shrink-0 pe-4 text-gray-800 dark:text-white/90 font-medium"> Basic SEO </span>
                    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                  </span>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!nameVal || !descriptionVal) {
                        showAlert("????? ????? ????? ? ????? ?? ???? ????", "error");
                        return;
                      }
                      
                      setIsGeneratingSEO(true);
                      try {
                        const response = await fetch("/api/v1/admin/content/blogs/generate-seo", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: nameVal,
                            content: descriptionVal.replace(/<[^>]*>/g, " ").substring(0, 2000), // ??? HTML ? ????? ???? ???
                            keywords: metaKeywordsVal ? metaKeywordsVal.split(",").map((k: string) => k.trim()) : [],
                            useAI: true,
                            aiProvider: "cursor", // ?????? ?? Cursor
                            useAgentAnalysis: true, // ??????? ?? AI Agent ???? ????? ????
                            language: "fa",
                          }),
                        });

                        if (!response.ok) {
                          throw new Error("??? ?? ????? SEO");
                        }

                        const seoResult = await response.json();
                        
                        // ?? ???? ??????? SEO
                        setValue("metaTitle", seoResult.meta_title || "");
                        setValue("metaDescription", seoResult.meta_description || "");
                        setValue("metaKeywords", seoResult.meta_keywords || "");
                        setValue("og_title", seoResult.meta_title || "");
                        setValue("og_description", seoResult.meta_description || "");
                        setValue("twitter_title", seoResult.meta_title || "");
                        setValue("twitter_description", seoResult.meta_description || "");
                        
                        showAlert("? SEO ?? ?????? ?? AI Agent ????? ??!", "success");
                      } catch (error) {
                        console.error("? ??? ?? ????? SEO:", error);
                        showAlert(
                          error instanceof Error ? error.message : "??? ?? ????? SEO",
                          "error"
                        );
                      } finally {
                        setIsGeneratingSEO(false);
                      }
                    }}
                    disabled={isGeneratingSEO || !nameVal || !descriptionVal}
                    className="ml-4"
                  >
                    {isGeneratingSEO ? "? ?? ??? ?????..." : "?? ????? ?????? SEO ?? AI"}
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    {...register("metaTitle")}
                    placeholder="Enter meta title"
                  />
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    {...register("metaDescription")}
                    placeholder="Enter meta description"
                  />
                </div>

                <div>
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <Input
                    id="metaKeywords"
                    {...register("metaKeywords")}
                    placeholder="Enter meta keywords (comma-separated)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="canonical_url">Canonical Url</Label>
                  <Input
                    id="canonical_url"
                    {...register("canonical_url")}
                    placeholder="Enter canonical URL"
                  />
                </div>
                
                <div>
                  <Label htmlFor="Robots">Robots</Label>
                  <Select
                    defaultValue="index, follow"
                    options={[
                      { value: "index, follow", label: "Publish(SEO)" },
                      { value: "noindex, nofollow", label: "Dont Publish(SEO)" },
                    ]}
                    onChange={(value) => setValue("robots", value)}
                  />
                </div>
                
                <span className="flex items-center">
                  <span className="shrink-0 pe-4 text-gray-800 dark:text-white/90 mb-4 mt-4 font-medium"> Open Graph </span>
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                </span>

                <div>
                  <Label htmlFor="og_title">OG Title</Label>
                  <Input
                    id="og_title"
                    {...register("og_title")}
                    placeholder="Enter OG title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="og_description">OG Description</Label>
                  <Input
                    id="og_description"
                    {...register("og_description")}
                    placeholder="Enter OG description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="og_image">OG Image</Label>
                  <Input
                    id="og_image"
                    {...register("og_image")}
                    placeholder="Enter OG image URL"
                  />
                </div>

                <span className="flex items-center">
                  <span className="shrink-0 pe-4 text-gray-800 dark:text-white/90 mb-4 mt-4 font-medium"> Twitter Card </span>
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                </span>
                
                <div>
                  <Label htmlFor="twitter_title">Twitter Title</Label>
                  <Input
                    id="twitter_title"
                    {...register("twitter_title")}
                    placeholder="Enter Twitter title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="twitter_description">Twitter Description</Label>
                  <Input
                    id="twitter_description"
                    {...register("twitter_description")}
                    placeholder="Enter Twitter description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="twitter_image">Twitter Image</Label>
                  <Input
                    id="twitter_image"
                    {...register("twitter_image")}
                    placeholder="Enter Twitter image URL"
                  />
                </div>
              </div>
              
              {/* SEO Panel Sidebar */}
              <div>
                <SEOPanel
                  title={nameVal || metaTitleVal}
                  description={metaDescriptionVal}
                  content={descriptionVal}
                  keywords={metaKeywordsVal ? metaKeywordsVal.split(",").map((k) => k.trim()) : []}
                />
              </div>
            </div>
          </>
        )}
        
        {/* ???? ??? ?? ????? ??? (???? ?? ?????) */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "?? ??? ???..." : "??? ????"}
          </Button>
        </div>
      </form>
    </div>
  );
}
