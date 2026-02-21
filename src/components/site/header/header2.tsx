"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaFacebookF, FaTwitter, FaPinterestP, FaVk, FaRss, FaSearch, FaInstagram, FaLinkedin, FaYoutube, FaTelegram, FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';
import AdHeaderList from '@/components/site/ads/adheaderlist';
import SearchModal from '@/components/site/search/searchmodal';

interface Category {
  id: number;
  name: string;
  slug: string;
  order: number;
}

interface SocialLink {
  id: number;
  platform: string;
  url: string;
  icon?: string | null;
}

const TopHeader = ({ searchModalOpen, setSearchModalOpen }: { searchModalOpen: boolean; setSearchModalOpen: (open: boolean) => void }) => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [logoUrl, setLogoUrl] = useState('/logo/rozmaregi.png');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [weather, setWeather] = useState<{ temperature: number; icon: string; description: string; city: string } | null>(null);

  // Live date and time for Tehran timezone
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Convert to Tehran timezone (UTC+3:30)
      const tehranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));

      const dateStr = tehranTime.toLocaleDateString('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const timeStr = tehranTime.toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      setCurrentDate(dateStr);
      setCurrentTime(timeStr);
    };

    // Update immediately
    updateDateTime();

    // Update every second
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch weather data for Tehran
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/v1/public/weather');
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Fallback weather
        setWeather({
          temperature: 27,
          icon: '☀',
          description: 'آفتابی',
          city: 'تهران',
        });
      }
    };

    // Fetch immediately
    fetchWeather();

    // Update every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/v1/public/logos')
      .then(res => res.json())
      .then(data => {
        if (data.header) {
          setLogoUrl(data.header);
        }
      })
      .catch(() => {
        // Keep default logo
      });
  }, []);

  useEffect(() => {
    fetch('/api/v1/public/social-links')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch social links');
        }
        return res.json();
      })
      .then((data: SocialLink[] | { error?: string }) => {
        // Check if data is an array
        if (Array.isArray(data)) {
          setSocialLinks(data);
        } else {
          console.error('Invalid response format:', data);
          setSocialLinks([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching social links:', err);
        setSocialLinks([]);
      });
  }, []);

  // Icon mapping
  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <FaFacebookF />;
      case 'twitter':
      case 'x':
        return <FaTwitter />;
      case 'instagram':
        return <FaInstagram />;
      case 'linkedin':
        return <FaLinkedin />;
      case 'youtube':
        return <FaYoutube />;
      case 'telegram':
        return <FaTelegram />;
      case 'whatsapp':
        return <FaWhatsapp />;
      case 'pinterest':
        return <FaPinterestP />;
      case 'vk':
        return <FaVk />;
      case 'rss':
        return <FaRss />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-secondary text-white text-[9px] xxs:text-[10px] sm:text-xs md:text-sm px-1.5 xxs:px-2 sm:px-3 md:px-4 py-1 flex flex-row-reverse justify-between items-center gap-1 xxs:gap-1.5">
        <div className="flex items-center gap-1 xxs:gap-1 sm:gap-1 md:gap-2 shrink-0">
          {/* Search Icon */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="text-white hover:text-white/75 transition-colors flex items-center justify-center p-0.5 touch-target"
            aria-label="جستجو"
          >
            <FaSearch className="text-[11px] xxs:text-xs sm:text-sm md:text-base" />
          </button>

          {/* Vertical Separator on Mobile */}
          <div className="w-[1px] h-3 bg-white/20 sm:hidden"></div>

          {/* Social Media Links */}
          <div className="flex items-center gap-1 xxs:gap-1 sm:gap-1 md:gap-2">
            {Array.isArray(socialLinks) && socialLinks.length > 0 && socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/75 transition-colors flex items-center justify-center p-0 w-[34px] h-[34px] flex-shrink-0"
                aria-label={link.platform}
              >
                <span className="text-[10px] xxs:text-xs sm:text-sm md:text-base">
                  {getIcon(link.platform)}
                </span>
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 xxs:gap-1.5 sm:gap-2 md:gap-4 flex-nowrap overflow-hidden text-[8px] xxs:text-[9px] sm:text-xs md:text-sm">
          <span className="truncate">{currentDate}</span>
          {currentTime && <span className="font-mono hidden xs:inline opacity-90">{currentTime}</span>}
          {weather && (
            <span className="whitespace-nowrap hidden sm:inline opacity-90 border-r border-white/20 pr-2 sm:pr-4">
              {weather.icon} {weather.temperature}°C {weather.city}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

const Header2 = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/logo/rozmaregi.png');

  useEffect(() => {
    // دریافت دسته‌بندی‌های blog از API
    fetch('/api/v1/public/categories')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }
        return res.json();
      })
      .then((data: Category[]) => {
        // فیلتر کردن دسته‌بندی‌های نامطلوب از منو
        // - "پربازدیدترین اخبار اقتصاد" یا "پربیننده‌ها اخبار اقتصادی"
        // - "چند رسانه‌ای" (چون به صورت دستی اضافه می‌شود)
        const filteredCategories = data.filter(
          cat => {
            const name = cat.name.toLowerCase();
            // فیلتر کردن پربازدیدترین/پربیننده‌ها
            if (name.includes('پربازدیدترین') ||
              name.includes('پربیننده') ||
              name.includes('پربازدید')) {
              return false;
            }
            // فیلتر کردن چند رسانه‌ای
            if (name.includes('چند رسانه') ||
              name.includes('چندرسانه') ||
              name.includes('multimedia')) {
              return false;
            }
            return true;
          }
        );
        setCategories(filteredCategories);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
        setCategories([]);
        setLoading(false);
      });

    // دریافت لوگو
    fetch('/api/v1/public/logos')
      .then(res => res.json())
      .then(data => {
        if (data.header) {
          setLogoUrl(data.header);
        }
      })
      .catch(() => {
        // Keep default logo
      });
  }, []);

  return (
    <>
      {/* تبلیغات بالای top menu - کنار هم */}
      <div className="w-full py-1 sm:py-2 px-1.5 xxs:px-2 sm:px-3 md:px-4 hidden lg:block">
        <div className="mx-auto max-w-screen-xl">
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex-1 max-w-[400px] flex justify-center">
              <AdHeaderList position="BANNER_TOP_HEADER_LEFT" limit={1} className="w-full" showPlaceholder={true} />
            </div>
            <div className="flex-1 max-w-[400px] flex justify-center">
              <AdHeaderList position="BANNER_TOP_HEADER_RIGHT" limit={1} className="w-full" showPlaceholder={true} />
            </div>
          </div>
        </div>
      </div>

      <TopHeader searchModalOpen={searchModalOpen} setSearchModalOpen={setSearchModalOpen} />
      <header className="bg-primary py-1.5 xxs:py-2 sm:py-2.5 md:py-3 sticky top-[32px] xxs:top-[36px] sm:top-[40px] z-50 shadow-md">
        <div className="mx-auto max-w-screen-xl px-1.5 xxs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="flex h-10 xxs:h-12 sm:h-14 md:h-16 items-center justify-between gap-1.5 xxs:gap-2 sm:gap-3 md:gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href={"/"}>
                <Image
                  src={logoUrl}
                  alt="لوگو روزمرگی"
                  width={200}
                  height={50}
                  className="object-cover h-7 xxs:h-8 sm:h-10 md:h-12 w-auto"
                  priority
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav aria-label="Global" className="hidden lg:flex flex-1 items-center justify-center overflow-hidden">
              <ul className="flex items-center gap-2 lg:gap-3 xl:gap-4 2xl:gap-6 text-[11px] lg:text-xs xl:text-sm text-white flex-wrap justify-center max-w-full">
                {loading ? (
                  <li className="text-white/75 text-[11px] lg:text-xs xl:text-sm">در حال بارگذاری...</li>
                ) : (
                  <>
                    {/* خانه همیشه اول */}
                    <li className="flex-shrink-0">
                      <Link href="/" className="hover:text-white/75 transition-colors font-medium flex items-center justify-center touch-target">
                        <svg width="20" height="20" className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8.12602 14C8.57006 15.7252 10.1362 17 12 17C13.8638 17 15.4299 15.7252 15.874 14M11.0177 2.764L4.23539 8.03912C3.78202 8.39175 3.55534 8.56806 3.39203 8.78886C3.24737 8.98444 3.1396 9.20478 3.07403 9.43905C3 9.70352 3 9.9907 3 10.5651V17.8C3 18.9201 3 19.4801 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4801 21 18.9201 21 17.8V10.5651C21 9.9907 21 9.70352 20.926 9.43905C20.8604 9.20478 20.7526 8.98444 20.608 8.78886C20.4447 8.56806 20.218 8.39175 19.7646 8.03913L12.9823 2.764C12.631 2.49075 12.4553 2.35412 12.2613 2.3016C12.0902 2.25526 11.9098 2.25526 11.7387 2.3016C11.5447 2.35412 11.369 2.49075 11.0177 2.764Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      </Link>
                    </li>
                    {/* دسته‌بندی‌های blog - کاهش به 6 تا برای جلوگیری از برش */}
                    {categories && categories.length > 0 && categories.slice(0, 6).map((category) => (
                      <li key={category.id} className="flex-shrink-0 whitespace-nowrap">
                        <Link
                          href={`/category/${category.slug}`}
                          className="hover:text-white/75 transition-colors text-[11px] lg:text-xs xl:text-sm"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                    {/* لینک قیمت خودرو */}
                    <li className="flex-shrink-0 whitespace-nowrap">
                      <Link
                        href="/car-prices"
                        className="hover:text-white/75 transition-colors text-[11px] lg:text-xs xl:text-sm"
                      >
                        قیمت خودرو
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-sm bg-white/10 p-1.5 xxs:p-2 text-white transition hover:bg-white/20 touch-target flex items-center justify-center"
                aria-label="منو"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 xxs:w-6 xxs:h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-2 xxs:mt-3 sm:mt-4 pb-2 xxs:pb-3 sm:pb-4 border-t border-white/20">
              {/* Mobile Search Button */}
              <div className="mt-2 xxs:mt-3 sm:mt-4 mb-2 xxs:mb-3 sm:mb-4">
                <button
                  onClick={() => {
                    setSearchModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-1.5 xxs:gap-2 px-2 xxs:px-3 sm:px-4 py-1.5 xxs:py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors text-xs xxs:text-sm sm:text-base touch-target"
                >
                  <FaSearch className="text-xs xxs:text-sm sm:text-base" />
                  <span>جستجو</span>
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="mt-2 xxs:mt-3 sm:mt-4">
                <ul className="flex flex-col gap-1 xxs:gap-2 sm:gap-3 text-xs xxs:text-sm sm:text-base text-white">
                  <li>
                    <Link
                      href="/"
                      className="py-1.5 xxs:py-2 sm:py-2.5 hover:text-white/75 transition-colors font-medium flex items-center gap-1.5 xxs:gap-2 text-xs xxs:text-sm sm:text-base touch-target"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <svg width="20" height="20" className="w-4 h-4 xxs:w-5 xxs:h-5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.12602 14C8.57006 15.7252 10.1362 17 12 17C13.8638 17 15.4299 15.7252 15.874 14M11.0177 2.764L4.23539 8.03912C3.78202 8.39175 3.55534 8.56806 3.39203 8.78886C3.24737 8.98444 3.1396 9.20478 3.07403 9.43905C3 9.70352 3 9.9907 3 10.5651V17.8C3 18.9201 3 19.4801 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4801 21 18.9201 21 17.8V10.5651C21 9.9907 21 9.70352 20.926 9.43905C20.8604 9.20478 20.7526 8.98444 20.608 8.78886C20.4447 8.56806 20.218 8.39175 19.7646 8.03913L12.9823 2.764C12.631 2.49075 12.4553 2.35412 12.2613 2.3016C12.0902 2.25526 11.9098 2.25526 11.7387 2.3016C11.5447 2.35412 11.369 2.49075 11.0177 2.764Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      خانه
                    </Link>
                  </li>
                  {categories && categories.length > 0 && categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/category/${category.slug}`}
                        className="block py-1.5 xxs:py-2 sm:py-2.5 hover:text-white/75 transition-colors text-xs xxs:text-sm sm:text-base touch-target"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/car-prices"
                      className="block py-1.5 xxs:py-2 sm:py-2.5 hover:text-white/75 transition-colors text-xs xxs:text-sm sm:text-base touch-target"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      قیمت خودرو
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/news"
                      className="block py-1.5 xxs:py-2 sm:py-2.5 hover:text-white/75 transition-colors text-xs xxs:text-sm sm:text-base touch-target"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      همه اخبار
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className="block py-1.5 xxs:py-2 sm:py-2.5 hover:text-white/75 transition-colors text-xs xxs:text-sm sm:text-base touch-target"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      بلاگ
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
};

export default Header2;
