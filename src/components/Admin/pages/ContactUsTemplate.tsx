"use client";
import React, { useState, useEffect, useRef } from "react";
import Label from "@/components/Admin/form/Label";
import Input from "@/components/Admin/form/input/InputField";
import TextArea from "@/components/Admin/form/input/TextArea";
import Button from "@/components/Admin/ui/button/Button";
import { useAlert } from "@/context/Admin/AlertContext";
import { getSocialIcon } from "@/lib/social-icons";
import ClickableMap from "./ClickableMap";

interface SocialMediaLink {
  id: number;
  platform: string;
  url: string;
  icon?: string;
}

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
  formReceiveEmail: string; // ایمیل دریافت کننده پیام‌ها
  formNameLabel: string;
  formEmailLabel: string;
  formPhoneLabel: string;
  formWebsiteLabel: string;
  formMessageLabel: string;
  contactTitle: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  workingHours: string;
  socialTitle: string;
  officeAddressTitle: string;
  callInfoTitle: string;
}

interface ContactUsTemplateProps {
  initialData?: Partial<ContactUsData>;
  onSave: (data: ContactUsData) => Promise<void>;
  loading?: boolean;
}

export default function ContactUsTemplate({
  initialData,
  onSave,
  loading = false,
}: ContactUsTemplateProps) {
  const { showAlert } = useAlert();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapPickerActive, setMapPickerActive] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);

  const [geocoding, setGeocoding] = useState(false);
  const [data, setData] = useState<ContactUsData>({
    heroTitle: initialData?.heroTitle || "Get In Touch",
    heroSubtitle: initialData?.heroSubtitle || "Contact US",
    heroDescription: initialData?.heroDescription || "",
    heroImage: initialData?.heroImage,
    mapEmbedUrl: initialData?.mapEmbedUrl || "",
    mapLatitude: initialData?.mapLatitude || "",
    mapLongitude: initialData?.mapLongitude || "",
    mapAddress: initialData?.mapAddress || "",
    formTitle: initialData?.formTitle || "پشتیبانی و خدمات مشتری",
    formDescription: initialData?.formDescription || "در حالی که به نیازهای مشتریان خود رسیدگی می‌کنیم، زمان انتظار برای پاسخ ایمیل ممکن است بیشتر از حد معمول باشد. برای ارائه بهترین تجربه ممکن به شما، توصیه می‌کنیم از تماس تلفنی استفاده کنید. در بیشتر موارد، این سریع‌ترین و آسان‌ترین گزینه است.",
    formSubmitText: initialData?.formSubmitText || "ارسال پیام",
    formReceiveEmail: initialData?.formReceiveEmail || "",
    formNameLabel: initialData?.formNameLabel || "نام",
    formEmailLabel: initialData?.formEmailLabel || "ایمیل",
    formPhoneLabel: initialData?.formPhoneLabel || "شماره تماس",
    formWebsiteLabel: initialData?.formWebsiteLabel || "وب‌سایت (اختیاری)",
    formMessageLabel: initialData?.formMessageLabel || "پیام",
    contactTitle: initialData?.contactTitle || "اطلاعات تماس",
    address: initialData?.address || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    fax: initialData?.fax || "",
    workingHours: initialData?.workingHours || "",
    socialTitle: initialData?.socialTitle || "ما را در شبکه‌های اجتماعی دنبال کنید",
    officeAddressTitle: initialData?.officeAddressTitle || "آدرس دفتر",
    callInfoTitle: initialData?.callInfoTitle || "اطلاعات تماس",
  });

  useEffect(() => {
    if (initialData) {
      setData((prev) => {
        const updated = { ...prev, ...initialData };
        // If formTitle is empty or English, use Persian default
        if (!updated.formTitle || updated.formTitle === "General Customer Care & Technical Support") {
          updated.formTitle = "پشتیبانی و خدمات مشتری";
        }
        // If formDescription is empty or English, use Persian default
        if (!updated.formDescription || updated.formDescription.includes("As we address the needs")) {
          updated.formDescription = "در حالی که به نیازهای مشتریان خود رسیدگی می‌کنیم، زمان انتظار برای پاسخ ایمیل ممکن است بیشتر از حد معمول باشد. برای ارائه بهترین تجربه ممکن به شما، توصیه می‌کنیم از تماس تلفنی استفاده کنید. در بیشتر موارد، این سریع‌ترین و آسان‌ترین گزینه است.";
        }
        // If formSubmitText is empty or English, use Persian default
        if (!updated.formSubmitText || updated.formSubmitText === "Leave a Message") {
          updated.formSubmitText = "ارسال پیام";
        }
        return updated;
      });
    }
  }, [initialData]);

  useEffect(() => {
    // Fetch social media links from API
    fetch("/api/v1/public/social-links")
      .then((res) => res.json())
      .then((links) => {
        if (Array.isArray(links)) {
          setSocialLinks(links);
        }
      })
      .catch((err) => console.error("Error fetching social links:", err));
  }, []);

  const renderSocialIcon = (link: SocialMediaLink) => {
    if (link.icon) {
      // If icon is a URL, use it as image
      if (link.icon.startsWith("http") || link.icon.startsWith("/")) {
        return (
          <img
            src={link.icon}
            alt={link.platform}
            className="w-6 h-6 mx-auto"
          />
        );
      }
      // If icon is a Material UI icon name, use the component
      const IconComponent = getSocialIcon(link.platform);
      return <IconComponent className="w-6 h-6 mx-auto" />;
    }
    // Fallback to Material UI icon based on platform
    const IconComponent = getSocialIcon(link.platform);
    return <IconComponent className="w-6 h-6 mx-auto" />;
  };

  const updateData = (field: keyof ContactUsData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await onSave(data);
      showAlert("تغییرات با موفقیت ذخیره شد", "success");
    } catch (error) {
      showAlert("خطا در ذخیره تغییرات", "error");
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    updateData("mapLatitude", lat.toFixed(6));
    updateData("mapLongitude", lng.toFixed(6));
    setMapPickerActive(false);
    setSelectedSection("map");
    showAlert("موقعیت روی نقشه انتخاب شد", "success");
  };

  const handleGeocodeAddress = async () => {
    if (!data.mapAddress || !data.mapAddress.trim()) {
      showAlert("لطفاً آدرس را وارد کنید", "error");
      return;
    }

    setGeocoding(true);
    try {
      // Use Nominatim API (OpenStreetMap) - free, no API key needed
      const encodedAddress = encodeURIComponent(data.mapAddress.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            "User-Agent": "ContactUsPage/1.0", // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error("خطا در جستجوی آدرس");
      }

      const results = await response.json();
      
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        updateData("mapLatitude", lat);
        updateData("mapLongitude", lon);
        setSelectedSection("map");
        showAlert("موقعیت با موفقیت پیدا شد و روی نقشه نمایش داده شد", "success");
      } else {
        showAlert("آدرس پیدا نشد. لطفاً آدرس دقیق‌تری وارد کنید", "error");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      showAlert("خطا در جستجوی آدرس. لطفاً دوباره تلاش کنید", "error");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Live Preview - Left Side */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            پیش‌نمایش زنده
          </h3>
        </div>
        <div className="h-full overflow-y-auto bg-gray-900">
          <div className="relative text-white">
            {/* Hero Section - Clickable */}
            <div
              onClick={() => setSelectedSection("hero")}
              className={`cursor-pointer transition-all ${
                selectedSection === "hero"
                  ? "ring-4 ring-blue-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-blue-300"
              }`}
            >
              <div className="container mx-auto px-4 py-16 text-center">
                <h3 className="text-sm md:text-base text-gray-400 mb-2">
                  {data.heroTitle || "Get In Touch"}
                </h3>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
                  {data.heroSubtitle || "Contact US"}
                </h1>
                {data.heroDescription && (
                  <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                    {data.heroDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Map Section - Clickable */}
            <div
              ref={mapRef}
              onClick={() => setSelectedSection("map")}
              className={`relative transition-all ${
                selectedSection === "map"
                  ? "ring-4 ring-blue-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-blue-300"
              }`}
            >
              <ClickableMap
                key={`${data.mapLatitude}-${data.mapLongitude}`}
                latitude={data.mapLatitude}
                longitude={data.mapLongitude}
                onLocationSelect={handleMapLocationSelect}
                height="320px"
                pickerActive={mapPickerActive}
                className="w-full rounded-lg overflow-hidden"
              />
            </div>

            {/* Main Content Section */}
            <div className="bg-gray-900 py-16">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column - Contact Form */}
                  <div
                    onClick={() => setSelectedSection("form")}
                    className={`cursor-pointer transition-all ${
                      selectedSection === "form"
                        ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg p-2"
                        : "hover:ring-2 hover:ring-blue-300"
                    }`}
                  >
                    <h2 className="text-2xl font-bold mb-4 text-white">
                      {data.formTitle || "تماس با ما"}
                    </h2>
                    {data.formDescription && (
                      <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                        {data.formDescription}
                      </p>
                    )}
                    <div className="space-y-6">
                      <input
                        type="text"
                        placeholder={data.formNameLabel || "نام"}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled
                      />
                      <input
                        type="email"
                        placeholder={data.formEmailLabel || "ایمیل"}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled
                      />
                      <input
                        type="tel"
                        placeholder={data.formPhoneLabel || "شماره تماس"}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled
                      />
                      <input
                        type="url"
                        placeholder={data.formWebsiteLabel || "وب‌سایت (اختیاری)"}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled
                      />
                      <textarea
                        placeholder={data.formMessageLabel || "پیام..."}
                        rows={6}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        disabled
                      />
                      <button
                        className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                        disabled
                      >
                        {data.formSubmitText || "ارسال پیام"}
                      </button>
                    </div>
                  </div>
                  {/* Right Column - Social, Address, Contact */}
                  <div className="space-y-8">
                    {/* Social Media */}
                    {socialLinks.length > 0 && (
                      <div
                        onClick={() => setSelectedSection("social")}
                        className={`cursor-pointer transition-all ${
                          selectedSection === "social"
                            ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg p-2"
                            : "hover:ring-2 hover:ring-blue-300"
                        }`}
                      >
                        <h3 className="text-xl font-bold mb-4 text-white">
                          {data.socialTitle || "ما را در شبکه‌های اجتماعی دنبال کنید"}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          {socialLinks.map((link) => {
                            const IconComponent = getSocialIcon(link.platform);
                            return (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors border border-gray-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-center mb-2 text-white">
                                  {link.icon && (link.icon.startsWith("http") || link.icon.startsWith("/")) ? (
                                    <img
                                      src={link.icon}
                                      alt={link.platform}
                                      className="w-8 h-8"
                                    />
                                  ) : (
                                    <IconComponent className="w-8 h-8" />
                                  )}
                                </div>
                                <div className="font-semibold text-sm mb-1 text-white">
                                  {link.platform}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {link.platform.toLowerCase().includes("facebook")
                                    ? "Like"
                                    : link.platform.toLowerCase().includes("twitter") ||
                                      link.platform.toLowerCase().includes("x")
                                    ? "Follow"
                                    : link.platform.toLowerCase().includes("instagram")
                                    ? "Follow"
                                    : link.platform.toLowerCase().includes("pinterest")
                                    ? "Pin"
                                    : link.platform.toLowerCase().includes("linkedin")
                                    ? "Connect"
                                    : link.platform.toLowerCase().includes("youtube")
                                    ? "Subscribe"
                                    : link.platform.toLowerCase().includes("telegram")
                                    ? "Join"
                                    : "Visit"}
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Office Address */}
                    {data.address && (
                      <div
                        onClick={() => setSelectedSection("contact")}
                        className={`cursor-pointer transition-all ${
                          selectedSection === "contact"
                            ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg p-2"
                            : "hover:ring-2 hover:ring-blue-300"
                        }`}
                      >
                        <h3 className="text-xl font-bold mb-4 text-white">
                          {data.officeAddressTitle || "Office Address"}
                        </h3>
                        <div className="space-y-2 text-gray-300">
                          <div className="flex items-start gap-2">
                            <span className="text-red-500 mt-1 text-xl">📍</span>
                            <div>
                              {data.address.split("\n").map((line, index) => (
                                <p key={index} className={index === 0 ? "font-semibold text-white" : ""}>
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Call Information */}
                    {(data.phone || data.email || data.fax || data.workingHours) && (
                      <div
                        onClick={() => setSelectedSection("contact")}
                        className={`cursor-pointer transition-all ${
                          selectedSection === "contact"
                            ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg p-2"
                            : "hover:ring-2 hover:ring-blue-300"
                        }`}
                      >
                        <h3 className="text-xl font-bold mb-4 text-white">
                          {data.callInfoTitle || "Call Information"}
                        </h3>
                        <div className="space-y-3 text-gray-300">
                          {data.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 text-xl">📞</span>
                              <span>Phone: {data.phone}</span>
                            </div>
                          )}
                          {data.fax && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 text-xl">☎️</span>
                              <span>Tel: {data.fax}</span>
                            </div>
                          )}
                          {data.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 text-xl">✉️</span>
                              <a
                                href={`mailto:${data.email}`}
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Email: {data.email}
                              </a>
                            </div>
                          )}
                          {data.workingHours && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 text-xl">🕐</span>
                              <span>{data.workingHours}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Panel - Right Side */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            ویرایش محتوا
          </h3>
          {selectedSection && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              بخش انتخاب شده:{" "}
              {selectedSection === "hero"
                ? "Hero"
                : selectedSection === "map"
                ? "نقشه"
                : selectedSection === "form"
                ? "فرم"
                : selectedSection === "social"
                ? "شبکه‌های اجتماعی"
                : "اطلاعات تماس"}
            </p>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Hero Section Editor */}
          {(selectedSection === "hero" || !selectedSection) && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                بخش Hero
              </h4>
              <div>
                <Label>عنوان کوچک (Get In Touch)</Label>
                <Input
                  value={data.heroTitle}
                  onChange={(e) => updateData("heroTitle", e.target.value)}
                  placeholder="Get In Touch"
                />
              </div>
              <div>
                <Label>عنوان اصلی (Contact US)</Label>
                <Input
                  value={data.heroSubtitle}
                  onChange={(e) => updateData("heroSubtitle", e.target.value)}
                  placeholder="Contact US"
                />
              </div>
              <div>
                <Label>توضیحات (اختیاری)</Label>
                <TextArea
                  value={data.heroDescription}
                  onChange={(e) => updateData("heroDescription", e.target.value)}
                  rows={3}
                  placeholder="توضیحات..."
                />
              </div>
            </div>
          )}

          {/* Map Section Editor */}
          {selectedSection === "map" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                تنظیمات نقشه
              </h4>
              <div>
                <Label>آدرس</Label>
                <TextArea
                  value={data.mapAddress || ""}
                  onChange={(e) => updateData("mapAddress", e.target.value)}
                  rows={3}
                  placeholder="مثال: Tehran, Tehran, Rahman Abad،تهران، استان تهران،،, RC7P+5GQ, Iran"
                />
                <div className="mt-2">
                  <Button
                    onClick={handleGeocodeAddress}
                    disabled={geocoding || !data.mapAddress?.trim()}
                    variant="primary"
                    size="sm"
                  >
                    {geocoding ? "در حال جستجو..." : "جستجوی موقعیت از آدرس"}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    آدرس را از Google Maps کپی کنید و دکمه را بزنید تا موقعیت به صورت خودکار پیدا شود
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>عرض جغرافیایی</Label>
                  <Input
                    value={data.mapLatitude || ""}
                    onChange={(e) => updateData("mapLatitude", e.target.value)}
                    placeholder="35.6892"
                  />
                </div>
                <div>
                  <Label>طول جغرافیایی</Label>
                  <Input
                    value={data.mapLongitude || ""}
                    onChange={(e) => updateData("mapLongitude", e.target.value)}
                    placeholder="51.3890"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  setMapPickerActive(!mapPickerActive);
                  setSelectedSection("map");
                }}
                className="w-full"
                variant={mapPickerActive ? "danger" : "primary"}
              >
                {mapPickerActive
                  ? "لغو انتخاب موقعیت"
                  : "انتخاب موقعیت روی نقشه"}
              </Button>
              {mapPickerActive && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  روی نقشه در پیش‌نمایش کلیک کنید
                </p>
              )}
              <div>
                <Label>لینک Embed نقشه (اختیاری)</Label>
                <Input
                  value={data.mapEmbedUrl || ""}
                  onChange={(e) => updateData("mapEmbedUrl", e.target.value)}
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </div>
            </div>
          )}

          {/* Form Section Editor */}
          {selectedSection === "form" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                تنظیمات فرم تماس
              </h4>
              <div>
                <Label>عنوان فرم</Label>
                <Input
                  value={data.formTitle}
                  onChange={(e) => updateData("formTitle", e.target.value)}
                  placeholder="تماس با ما"
                />
              </div>
              <div>
                <Label>توضیحات فرم</Label>
                <TextArea
                  value={data.formDescription}
                  onChange={(e) => updateData("formDescription", e.target.value)}
                  rows={4}
                  placeholder="لطفاً فرم زیر را پر کنید و پیام خود را برای ما ارسال کنید..."
                />
              </div>
              <div>
                <Label>متن دکمه ارسال</Label>
                <Input
                  value={data.formSubmitText}
                  onChange={(e) => updateData("formSubmitText", e.target.value)}
                  placeholder="ارسال پیام"
                />
              </div>
              <div>
                <Label>ایمیل دریافت کننده پیام‌ها <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  value={data.formReceiveEmail}
                  onChange={(e) => updateData("formReceiveEmail", e.target.value)}
                  placeholder="info@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  پیام‌های فرم تماس به این ایمیل ارسال می‌شوند
                </p>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h5 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
                  برچسب‌های فیلدهای فرم
                </h5>
                <div className="space-y-3">
                  <div>
                    <Label>برچسب نام</Label>
                    <Input
                      value={data.formNameLabel}
                      onChange={(e) => updateData("formNameLabel", e.target.value)}
                      placeholder="نام"
                    />
                  </div>
                  <div>
                    <Label>برچسب ایمیل</Label>
                    <Input
                      value={data.formEmailLabel}
                      onChange={(e) => updateData("formEmailLabel", e.target.value)}
                      placeholder="ایمیل"
                    />
                  </div>
                  <div>
                    <Label>برچسب شماره تماس</Label>
                    <Input
                      value={data.formPhoneLabel}
                      onChange={(e) => updateData("formPhoneLabel", e.target.value)}
                      placeholder="شماره تماس"
                    />
                  </div>
                  <div>
                    <Label>برچسب وب‌سایت</Label>
                    <Input
                      value={data.formWebsiteLabel}
                      onChange={(e) => updateData("formWebsiteLabel", e.target.value)}
                      placeholder="وب‌سایت (اختیاری)"
                    />
                  </div>
                  <div>
                    <Label>برچسب پیام</Label>
                    <Input
                      value={data.formMessageLabel}
                      onChange={(e) => updateData("formMessageLabel", e.target.value)}
                      placeholder="پیام"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Info */}
          {selectedSection === "social" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                شبکه‌های اجتماعی
              </h4>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>نکته:</strong> لینک‌های شبکه‌های اجتماعی به صورت خودکار از{" "}
                  <a
                    href="/admin/setting/social"
                    target="_blank"
                    className="underline hover:text-blue-600"
                  >
                    تنظیمات شبکه‌های اجتماعی
                  </a>{" "}
                  دریافت می‌شوند.
                </p>
              </div>
              <div>
                <Label>عنوان بخش</Label>
                <Input
                  value={data.socialTitle}
                  onChange={(e) => updateData("socialTitle", e.target.value)}
                  placeholder="ما را در شبکه‌های اجتماعی دنبال کنید"
                />
              </div>
              {socialLinks.length > 0 && (
                <div className="mt-4">
                  <Label>لینک‌های فعال ({socialLinks.length})</Label>
                  <div className="mt-2 space-y-2">
                    {socialLinks.map((link) => {
                      const IconComponent = getSocialIcon(link.platform);
                      return (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {link.icon && (link.icon.startsWith("http") || link.icon.startsWith("/")) ? (
                              <img
                                src={link.icon}
                                alt={link.platform}
                                className="w-5 h-5"
                              />
                            ) : (
                              <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {link.platform}
                            </span>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            مشاهده
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact Info Editor */}
          {selectedSection === "contact" && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                اطلاعات تماس
              </h4>
              <div>
                <Label>عنوان بخش آدرس</Label>
                <Input
                  value={data.officeAddressTitle}
                  onChange={(e) => updateData("officeAddressTitle", e.target.value)}
                  placeholder="Office Address"
                />
              </div>
              <div>
                <Label>آدرس</Label>
                <TextArea
                  value={data.address}
                  onChange={(e) => updateData("address", e.target.value)}
                  rows={4}
                  placeholder="آدرس کامل..."
                />
              </div>
              <div>
                <Label>عنوان بخش تماس</Label>
                <Input
                  value={data.callInfoTitle}
                  onChange={(e) => updateData("callInfoTitle", e.target.value)}
                  placeholder="Call Information"
                />
              </div>
              <div>
                <Label>تلفن</Label>
                <Input
                  value={data.phone}
                  onChange={(e) => updateData("phone", e.target.value)}
                  placeholder="(+1) 234 567 89"
                />
              </div>
              <div>
                <Label>ایمیل</Label>
                <Input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData("email", e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <Label>ساعات کاری</Label>
                <Input
                  value={data.workingHours}
                  onChange={(e) => updateData("workingHours", e.target.value)}
                  placeholder="Monday to Friday: 9 AM to 6 PM"
                />
              </div>
            </div>
          )}

          {!selectedSection && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>روی بخشی در پیش‌نمایش کلیک کنید تا ویرایش کنید</p>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
