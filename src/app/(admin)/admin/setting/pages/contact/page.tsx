"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ContactUsTemplate from "@/components/admin/pages/contactustemplate";
import { useAlert } from "@/context/admin/alertcontext";

interface ContactUsData {
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroDescription: string;
  mapEmbedUrl?: string;
  mapLatitude?: string;
  mapLongitude?: string;
  mapAddress?: string;
  formTitle: string;
  formDescription: string;
  formSubmitText: string;
  formReceiveEmail: string;
  formNameLabel: string;
  formEmailLabel: string;
  formPhoneLabel: string;
  formWebsiteLabel: string;
  formMessageLabel: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  workingHours: string;
  socialTitle: string;
  officeAddressTitle: string;
  callInfoTitle: string;
}

export default function ContactUsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [contactData, setContactData] = useState<Partial<ContactUsData>>({});
  const [contactIsActive, setContactIsActive] = useState(true);

  const fetchContactPage = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/content/pages/contact");
      if (response.ok) {
        const pageData = await response.json();
        if (pageData) {
          setContactIsActive(pageData.is_active !== false);
          
          // Parse template data from content if exists
          if (pageData.content) {
            try {
              const parsed = JSON.parse(pageData.content);
              // Convert English defaults to Persian if they exist
              if (parsed.formTitle === "General Customer Care & Technical Support" || !parsed.formTitle) {
                parsed.formTitle = "پشتیبانی و خدمات مشتری";
              }
              if (parsed.formDescription?.includes("As we address the needs") || !parsed.formDescription) {
                parsed.formDescription = "در حالی که به نیازهای مشتریان خود رسیدگی می‌کنیم، زمان انتظار برای پاسخ ایمیل ممکن است بیشتر از حد معمول باشد. برای ارائه بهترین تجربه ممکن به شما، توصیه می‌کنیم از تماس تلفنی استفاده کنید. در بیشتر موارد، این سریع‌ترین و آسان‌ترین گزینه است.";
              }
              if (parsed.formSubmitText === "Leave a Message" || !parsed.formSubmitText) {
                parsed.formSubmitText = "ارسال پیام";
              }
              setContactData(parsed);
            } catch {
              // If content is not JSON, it's old format - convert to template format
              setContactData({
                heroTitle: pageData.title || "Get In Touch",
                heroSubtitle: "Contact US",
                heroDescription: "",
                formTitle: "پشتیبانی و خدمات مشتری",
                formDescription: "در حالی که به نیازهای مشتریان خود رسیدگی می‌کنیم، زمان انتظار برای پاسخ ایمیل ممکن است بیشتر از حد معمول باشد. برای ارائه بهترین تجربه ممکن به شما، توصیه می‌کنیم از تماس تلفنی استفاده کنید. در بیشتر موارد، این سریع‌ترین و آسان‌ترین گزینه است.",
                formSubmitText: "ارسال پیام",
                formReceiveEmail: "",
                formNameLabel: "نام",
                formEmailLabel: "ایمیل",
                formPhoneLabel: "شماره تماس",
                formWebsiteLabel: "وب‌سایت (اختیاری)",
                formMessageLabel: "پیام...",
                address: "",
                phone: "",
                email: "",
                workingHours: "",
                socialTitle: "ما را در شبکه‌های اجتماعی دنبال کنید",
                officeAddressTitle: "آدرس دفتر",
                callInfoTitle: "اطلاعات تماس",
              });
            }
          } else {
            // Initialize with default values
            setContactData({
              heroTitle: pageData.title || "Get In Touch",
              heroSubtitle: "Contact US",
              heroDescription: "",
              formTitle: "پشتیبانی و خدمات مشتری",
              formDescription: "در حالی که به نیازهای مشتریان خود رسیدگی می‌کنیم، زمان انتظار برای پاسخ ایمیل ممکن است بیشتر از حد معمول باشد. برای ارائه بهترین تجربه ممکن به شما، توصیه می‌کنیم از تماس تلفنی استفاده کنید. در بیشتر موارد، این سریع‌ترین و آسان‌ترین گزینه است.",
              formSubmitText: "ارسال پیام",
              formReceiveEmail: "",
              formNameLabel: "نام",
              formEmailLabel: "ایمیل",
              formPhoneLabel: "شماره تماس",
              formWebsiteLabel: "وب‌سایت (اختیاری)",
              formMessageLabel: "پیام...",
              address: "",
              phone: "",
              email: "",
              workingHours: "",
              socialTitle: "ما را در شبکه‌های اجتماعی دنبال کنید",
              officeAddressTitle: "آدرس دفتر",
              callInfoTitle: "اطلاعات تماس",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching contact page:", error);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchContactPage();
  }, [fetchContactPage]);

  const handleSaveContact = async (data: ContactUsData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/content/pages/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.heroSubtitle || "Contact US",
          content: JSON.stringify(data), // Store JSON for template editing
          is_active: contactIsActive,
          slug: "contact",
        }),
      });

      if (response.ok) {
        showAlert("صفحه ارتباط با ما با موفقیت ذخیره شد", "success");
        await fetchContactPage();
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
          مدیریت صفحه ارتباط با ما
        </h1>
        <Link
          href="/contact"
          target="_blank"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          مشاهده صفحه
        </Link>
      </div>

      <ContactUsTemplate
        initialData={contactData}
        onSave={handleSaveContact}
        loading={loading}
      />
    </div>
  );
}

