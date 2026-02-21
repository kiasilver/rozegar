"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { FaFacebookF, FaTwitter, FaPinterestP, FaVk, FaRss, FaInstagram, FaLinkedin, FaYoutube, FaTelegram, FaWhatsapp } from 'react-icons/fa';

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

interface FooterMenu {
  id: number;
  title: string;
  url: string | null;
  order: number;
  group: string | null;
  custom_group_name?: string | null;
  is_active: boolean;
  target: string | null;
}

interface FooterData {
  settings: {
    bio: string;
    copyright: string;
  };
  menus: FooterMenu[];
}

const Footer1 = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [logoUrl, setLogoUrl] = useState('/logo/rozmaregi.png');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch categories
    fetch('/api/v1/public/categories')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }
        return res.json();
      })
      .then((data: Category[]) => {
        setCategories(data);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
        setCategories([]);
      });

    // Fetch social links
    fetch('/api/v1/public/social-links')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch social links');
        }
        return res.json();
      })
      .then((data: SocialLink[] | { error?: string }) => {
        if (Array.isArray(data)) {
          setSocialLinks(data);
        } else {
          setSocialLinks([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching social links:', error);
        setSocialLinks([]);
      });

    // Fetch footer data
    fetch('/api/v1/public/footer')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch footer data');
        }
        return res.json();
      })
      .then((data: FooterData) => {
        setFooterData(data);
      })
      .catch((error) => {
        console.error('Error fetching footer data:', error);
        setFooterData(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch logo
    fetch('/api/v1/public/logos')
      .then(res => res.json())
      .then(data => {
        if (data.footer) {
          setLogoUrl(data.footer);
        }
      })
      .catch(() => {
        // Keep default logo
      });
  }, []);

  // Icon mapping (same as Header2)
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
    <footer className="bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-screen-xl px-2 xxs:px-3 sm:px-4 md:px-6 lg:px-8 py-3 xxs:py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xxs:gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {/* Logo and About */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 text-center sm:text-right">
            <Link href="/" className="block mb-1 xxs:mb-2 sm:mb-3 flex justify-center sm:justify-start">
              <Image
                src={logoUrl}
                alt="لوگو روزمرگی"
                width={200}
                height={50}
                className="object-cover w-28 xxs:w-32 sm:w-40 md:w-48 lg:w-52 h-auto"
                style={{ filter: 'invert(1) grayscale(100%) contrast(100%) brightness(0)' }}
              />
            </Link>
            <p className="text-[10px] xxs:text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 xxs:mt-2 sm:mt-3 leading-relaxed">
              {footerData?.settings.bio || 'سایت خبری و تحلیلی با آخرین اخبار و مقالات'}
            </p>
          </div>

          {/* Categories */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-1 text-center sm:text-right">
            <p className="font-medium text-gray-900 dark:text-white text-primary mb-1 xxs:mb-2 sm:mb-3 text-xs xxs:text-sm sm:text-base">دسته‌بندی‌ها</p>
            {loading ? (
              <p className="text-[10px] xxs:text-xs sm:text-sm text-gray-500">در حال بارگذاری...</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[10px] xxs:text-xs sm:text-sm">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/car-prices"
                    className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                  >
                    قیمت خودرو
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* دسترسی سریع */}
          {footerData && footerData.menus.filter(m => m.group === 'quick-access' && m.is_active).length > 0 && (
            <div className="col-span-1 sm:col-span-1 lg:col-span-1 text-center sm:text-right">
              <p className="font-medium text-gray-900 dark:text-white text-primary mb-1 xxs:mb-2 sm:mb-3 text-xs xxs:text-sm sm:text-base">دسترسی سریع</p>
              <ul className="flex flex-col gap-1 text-[10px] xxs:text-xs sm:text-sm">
                {footerData.menus
                  .filter(m => m.group === 'quick-access' && m.is_active)
                  .sort((a, b) => a.order - b.order)
                  .map((menu) => (
                    <li key={menu.id}>
                      {menu.url ? (
                        <Link
                          href={menu.url}
                          target={menu.target || '_self'}
                          className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                        >
                          {menu.title}
                        </Link>
                      ) : (
                        <span className="text-gray-700 dark:text-white block">{menu.title}</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* لینک های مفید */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-1 text-center sm:text-right">
            <p className="font-medium text-gray-900 dark:text-white text-primary mb-1 xxs:mb-2 sm:mb-3 text-xs xxs:text-sm sm:text-base">لینک های مفید</p>
            <ul className="flex flex-col gap-1 text-[10px] xxs:text-xs sm:text-sm">
              {/* لینک پربازدیدترین اخبار اقتصاد */}
              {(() => {
                const mostViewedCategory = categories.find(cat => cat.name.includes('پربازدیدترین اخبار اقتصاد'));
                return mostViewedCategory ? (
                  <li>
                    <Link
                      href={`/category/${mostViewedCategory.slug}`}
                      className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                    >
                      پربازدیدترین اخبار اقتصاد
                    </Link>
                  </li>
                ) : null;
              })()}
              {/* منوهای دیتابیس */}
              {footerData && footerData.menus
                .filter(m => m.group === 'useful-links' && m.is_active)
                .sort((a, b) => a.order - b.order)
                .map((menu) => (
                  <li key={menu.id}>
                    {menu.url ? (
                      <Link
                        href={menu.url}
                        target={menu.target || '_self'}
                        className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                      >
                        {menu.title}
                      </Link>
                    ) : (
                      <span className="text-gray-700 dark:text-white block">{menu.title}</span>
                    )}
                  </li>
                ))}
            </ul>
          </div>

          {/* سایر */}
          {footerData && footerData.menus.filter(m => m.group === 'other' && m.is_active).length > 0 && (
            <div className="col-span-1 sm:col-span-1 lg:col-span-1 text-center sm:text-right">
              <h4 className="font-medium text-gray-900 dark:text-white text-primary mb-1 xxs:mb-2 sm:mb-3 text-xs xxs:text-sm sm:text-base">سایر</h4>
              <ul className="flex flex-col gap-1 text-[10px] xxs:text-xs sm:text-sm">
                {footerData.menus
                  .filter(m => m.group === 'other' && m.is_active)
                  .sort((a, b) => a.order - b.order)
                  .map((menu) => (
                    <li key={menu.id}>
                      {menu.url ? (
                        <Link
                          href={menu.url}
                          target={menu.target || '_self'}
                          className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                        >
                          {menu.title}
                        </Link>
                      ) : (
                        <span className="text-gray-700 dark:text-white block">{menu.title}</span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* دسته‌های دلخواه */}
          {footerData && footerData.menus.filter(m => m.group === 'custom' && m.is_active).length > 0 && (
            <>
              {Array.from(new Set(
                footerData.menus
                  .filter(m => m.group === 'custom' && m.is_active)
                  .map(m => (m as any).custom_group_name || 'دلخواه')
              )).map((groupName) => (
                <div key={groupName} className="col-span-1 sm:col-span-1 lg:col-span-1 text-center sm:text-right">
                  <h4 className="font-medium text-gray-900 dark:text-white text-primary mb-1 xxs:mb-2 sm:mb-3 text-xs xxs:text-sm sm:text-base">{groupName}</h4>
                  <ul className="flex flex-col gap-1 text-[10px] xxs:text-xs sm:text-sm">
                    {footerData.menus
                      .filter(m => m.group === 'custom' && m.is_active && ((m as any).custom_group_name || 'دلخواه') === groupName)
                      .sort((a, b) => a.order - b.order)
                      .map((menu) => (
                        <li key={menu.id}>
                          {menu.url ? (
                            <Link
                              href={menu.url}
                              target={menu.target || '_self'}
                              className="text-gray-700 dark:text-white transition hover:text-blue-600 dark:hover:text-blue-400 hover:opacity-75 block py-[5px]"
                            >
                              {menu.title}
                            </Link>
                          ) : (
                            <span className="text-gray-700 dark:text-white block">{menu.title}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {/* Social Media */}
          {socialLinks.length > 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-2 xxs:mt-3 sm:mt-4 lg:mt-0 flex justify-center sm:justify-start">
              <ul className="flex justify-center sm:justify-start gap-2 xxs:gap-3 sm:gap-4 md:gap-6 flex-wrap">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      rel="noreferrer"
                      target="_blank"
                      className="text-gray-700 dark:text-white transition hover:opacity-75 text-primary text-sm xxs:text-base sm:text-lg md:text-xl touch-target"
                      aria-label={link.platform}
                    >
                      <span className="sr-only">{link.platform}</span>
                      {getIcon(link.platform)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-2 xxs:mt-3 sm:mt-4 border-t border-gray-100 dark:border-gray-800 pt-2 xxs:pt-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-1.5 xxs:gap-2 sm:gap-3">
            <p className="text-[9px] xxs:text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center sm:text-right">
              {footerData?.settings.copyright || `© ${new Date().getFullYear()} تمامی حقوق برای خبرگزاری شما محفوظ است.`}
            </p>

            {footerData && footerData.menus.filter(m => m.group === 'legal' && m.is_active).length > 0 && (
              <ul className="flex flex-wrap justify-center sm:justify-start gap-1.5 xxs:gap-2 sm:gap-3 md:gap-4 text-[9px] xxs:text-[10px] sm:text-xs">
                {footerData.menus
                  .filter(m => m.group === 'legal' && m.is_active)
                  .sort((a, b) => a.order - b.order)
                  .map((menu) => (
                    <li key={menu.id}>
                      {menu.url ? (
                        <Link
                          href={menu.url}
                          target={menu.target || '_self'}
                          className="text-gray-500 dark:text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-300 touch-target"
                        >
                          {menu.title}
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">{menu.title}</span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer1;