"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
import { getSocialIcon } from "@/lib/social-icons";

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
  formReceiveEmail?: string;
  formNameLabel?: string;
  formEmailLabel?: string;
  formPhoneLabel?: string;
  formWebsiteLabel?: string;
  formMessageLabel?: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  workingHours: string;
  socialTitle: string;
  officeAddressTitle: string;
  callInfoTitle: string;
}

interface SocialMediaLink {
  id: number;
  platform: string;
  url: string;
  icon?: string;
}

interface ContactUsRendererProps {
  data: ContactUsData;
}

export default function ContactUsRenderer({ data }: ContactUsRendererProps) {
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch social media links from API
    fetch("/api/v1/public/social-links")
      .then((res) => res.json())
      .then((links) => setSocialLinks(links || []))
      .catch((err) => console.error("Error fetching social links:", err));
  }, []);

  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import Leaflet
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
      
      // Fix for default marker icon in Next.js
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });
  }, []);

  const getMapCoordinates = () => {
    if (data.mapLatitude && data.mapLongitude) {
      const lat = typeof data.mapLatitude === "string" ? parseFloat(data.mapLatitude) : data.mapLatitude;
      const lng = typeof data.mapLongitude === "string" ? parseFloat(data.mapLongitude) : data.mapLongitude;
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };


  const getSocialLabel = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes("facebook")) return "Like";
    if (lowerPlatform.includes("twitter") || lowerPlatform.includes("x")) return "Follow";
    if (lowerPlatform.includes("instagram")) return "Follow";
    if (lowerPlatform.includes("pinterest")) return "Pin";
    if (lowerPlatform.includes("linkedin")) return "Connect";
    if (lowerPlatform.includes("youtube")) return "Subscribe";
    if (lowerPlatform.includes("telegram")) return "Join";
    return "Visit";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("پیام شما با موفقیت ارسال شد!");
        setFormData({ name: "", email: "", phone: "", website: "", message: "" });
      } else {
        alert("خطا در ارسال پیام. لطفاً دوباره تلاش کنید.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("خطا در ارسال پیام. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  const mapCoords = getMapCoordinates();

  return (
    <div className="w-full bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 text-center">
          <p className="text-xs sm:text-sm md:text-base text-gray-500 mb-2">
            {data.heroTitle || "Get In Touch"}
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 text-gray-900">
            {data.heroSubtitle || "Contact US"}
          </h1>
          {data.heroDescription && (
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-2 sm:px-0">
              {data.heroDescription}
            </p>
          )}
        </div>
      </section>

      {/* Map Section */}
      {mapCoords && mounted && L && (
        <section className="w-full bg-white">
          <div className="w-full h-64 sm:h-80 md:h-96 lg:h-[500px]">
            <MapContainer
              center={[mapCoords.lat, mapCoords.lng]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[mapCoords.lat, mapCoords.lng]}>
                <Popup>
                  {data.address || "موقعیت شرکت"}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </section>
      )}

      {/* Main Content Section */}
      <section className="py-8 sm:py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
            {/* Left Column - Contact Form */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900">
                {data.formTitle || "تماس با ما"}
              </h2>
              {data.formDescription && (
                <p className="text-xs sm:text-sm text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                  {data.formDescription}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder={data.formNameLabel || "نام"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder={data.formEmailLabel || "ایمیل"}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder={data.formPhoneLabel || "شماره تماس"}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder={data.formWebsiteLabel || "وب‌سایت (اختیاری)"}
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <textarea
                    placeholder={data.formMessageLabel || "پیام..."}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-secondary text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "در حال ارسال..." : data.formSubmitText || "ارسال پیام"}
                </button>
              </form>
            </div>

            {/* Right Column - Social, Address, Contact */}
            <div className="space-y-6 sm:space-y-8">
              {/* Social Media */}
              {socialLinks.length > 0 && (
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">
                    {data.socialTitle || "ما را در شبکه‌های اجتماعی دنبال کنید"}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                    {socialLinks.map((link) => {
                      const IconComponent = getSocialIcon(link.platform);
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 sm:p-4 text-center transition-colors border border-gray-200"
                        >
                          <div className="flex justify-center mb-1.5 sm:mb-2 text-gray-900">
                            {link.icon && (link.icon.startsWith("http") || link.icon.startsWith("/")) ? (
                              <img
                                src={link.icon}
                                alt={link.platform}
                                className="w-6 h-6 sm:w-8 sm:h-8"
                              />
                            ) : (
                              <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                            )}
                          </div>
                          <div className="font-semibold text-xs sm:text-sm mb-1 text-gray-900 truncate">{link.platform}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {getSocialLabel(link.platform)}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Office Address */}
              {data.address && (
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">
                    {data.officeAddressTitle || "آدرس دفتر"}
                  </h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 text-lg sm:text-xl">📍</span>
                      <div className="text-sm sm:text-base">
                        {data.address.split("\n").map((line, index) => (
                          <p key={index} className={index === 0 ? "font-semibold text-gray-900" : ""}>
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
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">
                    {data.callInfoTitle || "اطلاعات تماس"}
                  </h3>
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
                    {data.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-lg sm:text-xl">📞</span>
                        <span className="break-all">Phone: {data.phone}</span>
                      </div>
                    )}
                    {data.fax && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-lg sm:text-xl">☎️</span>
                        <span className="break-all">Tel: {data.fax}</span>
                      </div>
                    )}
                    {data.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-lg sm:text-xl">✉️</span>
                        <a
                          href={`mailto:${data.email}`}
                          className="text-blue-600 hover:text-blue-700 hover:underline break-all"
                        >
                          Email: {data.email}
                        </a>
                      </div>
                    )}
                    {data.workingHours && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-lg sm:text-xl">🕐</span>
                        <span className="break-words">{data.workingHours}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
