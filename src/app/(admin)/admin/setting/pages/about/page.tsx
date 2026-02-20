"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AboutUsTemplate from "@/components/Admin/pages/AboutUsTemplate";
import { useAlert } from "@/context/Admin/AlertContext";

interface AboutUsData {
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroDescription: string;
  aboutTitle: string;
  aboutContent: string;
  aboutImage?: string;
  missionTitle: string;
  missionContent: string;
  visionTitle: string;
  visionContent: string;
  valuesTitle: string;
  values: Array<{ title: string; description: string; icon?: string }>;
  teamTitle: string;
  teamMembers: Array<{
    name: string;
    position: string;
    bio: string;
    image?: string;
    social?: { linkedin?: string; twitter?: string; email?: string };
  }>;
  statsTitle: string;
  stats: Array<{ label: string; value: string; icon?: string }>;
  contactTitle: string;
  address: string;
  phone: string;
  email: string;
  workingHours: string;
}

export default function AboutUsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [aboutData, setAboutData] = useState<Partial<AboutUsData>>({});
  const [aboutIsActive, setAboutIsActive] = useState(true);

  const fetchAboutPage = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/content/pages/about");
      if (response.ok) {
        const pageData = await response.json();
        if (pageData) {
          setAboutIsActive(pageData.is_active !== false);
          
          // Parse template data from content if exists
          if (pageData.content) {
            try {
              const parsed = JSON.parse(pageData.content);
              setAboutData(parsed);
            } catch {
              // If content is not JSON, it's old format - convert to template format
              setAboutData({
                heroTitle: pageData.title || "درباره ما",
                heroSubtitle: "ما کی هستیم؟",
                heroDescription: "",
                aboutTitle: "داستان ما",
                aboutContent: pageData.content,
                missionTitle: "ماموریت ما",
                missionContent: "",
                visionTitle: "چشم‌انداز ما",
                visionContent: "",
                valuesTitle: "ارزش‌های ما",
                values: [],
                teamTitle: "تیم ما",
                teamMembers: [],
                statsTitle: "آمار و ارقام",
                stats: [],
                contactTitle: "تماس با ما",
                address: "",
                phone: "",
                email: "",
                workingHours: "",
              });
            }
          } else {
            // Initialize with default values
            setAboutData({
              heroTitle: pageData.title || "درباره ما",
              heroSubtitle: "ما کی هستیم؟",
              heroDescription: "",
              aboutTitle: "داستان ما",
              aboutContent: "",
              missionTitle: "ماموریت ما",
              missionContent: "",
              visionTitle: "چشم‌انداز ما",
              visionContent: "",
              valuesTitle: "ارزش‌های ما",
              values: [{ title: "", description: "" }],
              teamTitle: "تیم ما",
              teamMembers: [{ name: "", position: "", bio: "" }],
              statsTitle: "آمار و ارقام",
              stats: [{ label: "", value: "" }],
              contactTitle: "تماس با ما",
              address: "",
              phone: "",
              email: "",
              workingHours: "",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching about page:", error);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAboutPage();
  }, [fetchAboutPage]);

  const handleSaveAbout = async (data: AboutUsData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/content/pages/about", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.heroTitle || "درباره ما",
          content: JSON.stringify(data), // Store JSON for template editing
          is_active: aboutIsActive,
          slug: "about",
        }),
      });

      if (response.ok) {
        showAlert("صفحه درباره ما با موفقیت ذخیره شد", "success");
        await fetchAboutPage();
      } else {
        const error = await response.json();
        showAlert(error.error || "خطا در ذخیره صفحه", "error");
      }
    } catch (error) {
      console.error("Error saving page:", error);
      showAlert("خطا در ارتباط با سرور", "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-300">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          مدیریت صفحه درباره ما
        </h1>
        <Link
          href="/about"
          target="_blank"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          مشاهده صفحه
        </Link>
      </div>

      <AboutUsTemplate
        initialData={aboutData}
        onSave={handleSaveAbout}
        loading={loading}
      />
    </div>
  );
}

