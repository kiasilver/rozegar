"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { iconMap } from "@/components/admin/icons/iconmap";
import { useSidebar } from "@/context/admin/sidebarcontext";

type Translation = {
  title: string;
  lang: string;
};

type MenuItem = {
  menuid: number;
  menutitle: string;
  menukey: string;
  parentid: number | null;
  url: string | null;
  icon: string | null;
  other_menus?: MenuItem[];
  translations: Translation[];
};

export default function Sidebar() {
  const { isExpanded, isMobileOpen } = useSidebar();
  const [currentLang, setCurrentLang] = useState("FA");
  const [logoSmall, setLogoSmall] = useState<string | null>(null);
  const [logoSmallDark, setLogoSmallDark] = useState<string | null>(null);
  const [logoDashboardLight, setLogoDashboardLight] = useState<string | null>(null);
  const [logoDashboardDark, setLogoDashboardDark] = useState<string | null>(null);

  useEffect(() => {
    const lang = localStorage.getItem("language") || "FA";
    setCurrentLang(lang.toUpperCase());
  }, []);

  useEffect(() => {
    fetch("/api/v1/admin/settings/design")
      .then((res) => res.json())
      .then((data) => {
        if (data.logoDashboardLight) {
          setLogoDashboardLight(data.logoDashboardLight);
        }
        if (data.logoDashboardDark) {
          setLogoDashboardDark(data.logoDashboardDark);
        }
        if (data.logoSmallLight) {
          setLogoSmall(data.logoSmallLight);
        } else if (data.logoSmall) {
          setLogoSmall(data.logoSmall);
        }
        if (data.logoSmallDark) {
          setLogoSmallDark(data.logoSmallDark);
        } else if (data.logoSmall) {
          setLogoSmallDark(data.logoSmall);
        }
      })
      .catch(() => {
        setLogoDashboardLight("/images/logo/logo.png");
        setLogoDashboardDark("/images/logo/logo-dark.png");
        setLogoSmall("/images/logo/logo.png");
        setLogoSmallDark("/images/logo/logo-dark.png");
      });
  }, []);

  const pathname = usePathname();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [openMenus, setOpenMenus] = useState<number[]>([]);
  const [pendingCommentsCount, setPendingCommentsCount] = useState<number>(0);

  useEffect(() => {
    const abortController = new AbortController();

    fetch("/api/v1/admin/system/menus?bypassCache=true", { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(err => {
            return { menus: [], error: err };
          }).catch(() => ({ menus: [], error: "Unknown error" }));
        }
        return res.json();
      })
      .then((data: MenuItem[] | { menus: MenuItem[]; error?: string }) => {
        const rawMenus = Array.isArray(data) ? data : (data.menus || []);
        // Filter out items that are not root items (have a parentid) to avoid duplicates
        const rootMenus = rawMenus.filter((m: any) => m.parentid === null || m.parentid === undefined);
        setMenus(rootMenus);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setMenus([]);
        }
      });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch("/api/v1/admin/content/comments/count");
        if (response.ok) {
          const data = await response.json();
          setPendingCommentsCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching pending comments count:", error);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (menus.length === 0) return;

    const activeParents: number[] = [];
    const normalizedPathname = pathname.replace(/^\/+/, "");

    menus.forEach((menu) => {
      if (menu.url) {
        const normalizedMenuUrl = menu.url.replace(/^\/+/, "");
        if (normalizedPathname === normalizedMenuUrl || normalizedPathname.startsWith(normalizedMenuUrl + "/")) {
          activeParents.push(menu.menuid);
        }
      }
      if (menu.other_menus && menu.other_menus.length > 0) {
        menu.other_menus.forEach((child) => {
          if (child.url) {
            const normalizedChildUrl = child.url.replace(/^\/+/, "");
            if (normalizedPathname === normalizedChildUrl || normalizedPathname.startsWith(normalizedChildUrl + "/")) {
              activeParents.push(menu.menuid);
            }
          }
        });
      }
    });

    setOpenMenus((prev) => {
      const merged = [...new Set([...prev, ...activeParents])];
      return merged;
    });
  }, [pathname, menus]);

  const toggle = (id: number) => {
    setOpenMenus((prev) => {
      if (prev.includes(id)) {
        const menu = menus.find(m => m.menuid === id);
        if (menu && menu.other_menus && menu.other_menus.length > 0) {
          const normalizedPathname = pathname.replace(/^\/+/, "");
          const hasActiveChild = menu.other_menus.some((child) => {
            if (!child.url) return false;
            const normalizedChildUrl = child.url.replace(/^\/+/, "");
            return normalizedPathname === normalizedChildUrl || normalizedPathname.startsWith(normalizedChildUrl + "/");
          });
          if (hasActiveChild) {
            return prev;
          }
        }
        return prev.filter((i) => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const shouldExpand = isExpanded;
  const sidebarWidth = shouldExpand ? "w-[280px]" : "w-[70px]";
  const mobileVisibility = isMobileOpen ? "translate-x-0" : "translate-x-full";
  const sidebarClasses = `app-sidebar fixed lg:sticky top-0 right-0 flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white h-screen transition-all duration-300 ease-in-out z-[999] border-l border-gray-200 dark:border-gray-800 ${sidebarWidth} ${mobileVisibility} lg:translate-x-0`;

  // Categorize menus based on menukey patterns
  const categorizeMenus = (menus: MenuItem[]): { category: string; items: MenuItem[] }[] => {
    const categories: { category: string; items: MenuItem[] }[] = [
      { category: "Main", items: [] },
      { category: "Content", items: [] },
      { category: "Design", items: [] },
      { category: "Settings", items: [] },
      { category: "Other", items: [] },
    ];

    // Pre-process menus to extract/remove nested items from Settings
    const processedMenus: MenuItem[] = [];
    const extractedContentItems: MenuItem[] = [];
    const extractedOtherItems: MenuItem[] = [];
    const extractedDesignItems: MenuItem[] = [];

    menus.forEach(menu => {
      const menukey = menu.menukey || "";

      // Handle Settings Menu specially
      if (menukey === "admin-settings" && menu.other_menus) {
        const newOtherMenus: MenuItem[] = [];
        menu.other_menus.forEach(child => {
          const childKey = child.menukey || "";
          const titleFA = child.translations.find(t => t.lang === 'FA')?.title || "";

          // DELETE "AI" (Hoosh Masnooi)
          if (childKey === "admin-settings-ai") return;
          if (titleFA === "هوش مصنوعی") return;
          if (childKey === "admin-ai-generator") return;

          // EXTRACT "Social Networks" -> Design
          // User asked for "Tarahi" (Design)
          if (childKey.includes("social") || titleFA.includes("شبکه")) {
            if (!child.icon) child.icon = "social"; // Ensure icon using 'social' key
            extractedDesignItems.push(child);
            return;
          }

          // EXTRACT "Unified RSS" -> Content
          if (childKey === "admin-settings-unified-rss" || childKey === "admin-rss-unified") {
            child.translations.forEach(t => {
              if (t.lang === 'FA') t.title = "تولید محتوا با هوش مصنوعی";
            });

            // AGGRESSIVE DEDUPLICATION - PROMPTS
            if (child.other_menus && child.other_menus.length > 0) {
              const uniqueChildren: MenuItem[] = [];
              let hasPrompt = false;

              child.other_menus.forEach(sub => {
                const subTitleFA = sub.translations.find(t => t.lang === 'FA')?.title || "";
                const normalized = subTitleFA.trim();

                if (normalized.includes("پرامپت") || normalized.toLowerCase().includes("prompt")) {
                  if (!hasPrompt) {
                    hasPrompt = true;
                    uniqueChildren.push(sub);
                  }
                } else {
                  const exists = uniqueChildren.some(u => {
                    const uTitle = u.translations.find(t => t.lang === 'FA')?.title || "";
                    return uTitle === subTitleFA;
                  });
                  if (!exists) {
                    uniqueChildren.push(sub);
                  }
                }
              });
              child.other_menus = uniqueChildren;
            }

            extractedContentItems.push(child);
            return;
          }

          // EXTRACT "Metrics" -> Other
          if (childKey === "admin-settings-metrics") {
            extractedOtherItems.push(child);
            return;
          }

          // Keep others
          newOtherMenus.push(child);
        });
        menu.other_menus = newOtherMenus;
      }
      processedMenus.push(menu);
    });

    // Add extracted items to categories
    extractedContentItems.forEach(item => categories[1].items.push(item)); // Content matches extractedContentItems

    // Add Design items AND Social fallback
    extractedDesignItems.forEach(item => categories[2].items.push(item)); // Design matches extractedDesignItems
    if (extractedDesignItems.length === 0) {
      // Fallback for Social Networks only if not found
      // Only if we suspect it's missing. Or just add if not present?
      const hasSocial = extractedDesignItems.some(i => i.menukey.includes('social') || i.translations.some(t => t.title.includes('شبکه')));
      if (!hasSocial) {
        const manualSocial: MenuItem = {
          menuid: 120120121,
          menukey: 'admin-settings-social-manual',
          menutitle: 'شبکه‌های اجتماعی',
          parentid: null,
          url: '/admin/setting/social',
          icon: 'social', // Using 'social' key from iconMap
          translations: [{ lang: 'FA', title: 'شبکه‌های اجتماعی' }, { lang: 'EN', title: 'Social Networks' }],
          other_menus: []
        };
        categories[2].items.push(manualSocial);
      }
    }

    extractedOtherItems.forEach(item => {
      if (!item.icon) item.icon = "metrics";
      categories[4].items.push(item);
    });

    // Check if Unified RSS was extracted. If not, add manually.
    if (extractedContentItems.length === 0 || !extractedContentItems.some(item => item.menukey?.includes("rss") || item.translations?.[0]?.title?.includes("تولید"))) {
      const manualUnifiedRss: MenuItem = {
        menuid: 120120120, // Unique fake ID
        menukey: 'admin-rss-unified-manual',
        menutitle: 'تولید محتوا با هوش مصنوعی',
        parentid: null,
        url: '/admin/rss-unified',
        icon: 'robot',
        translations: [{ lang: 'FA', title: 'تولید محتوا با هوش مصنوعی' }, { lang: 'EN', title: 'AI Content Generation' }],
        other_menus: []
      };
      categories[1].items.push(manualUnifiedRss);
    }

    // Add Car Prices Manual Menu
    const carPriceMenu: MenuItem = {
      menuid: 120120122,
      menukey: 'admin-car-prices',
      menutitle: 'قیمت خودرو',
      parentid: null,
      url: '/admin/tools/car-prices',
      icon: 'car',
      translations: [{ lang: 'FA', title: 'قیمت خودرو' }, { lang: 'EN', title: 'Car Prices' }],
      other_menus: []
    };
    categories[1].items.push(carPriceMenu);

    processedMenus.forEach((menu) => {
      const menukey = menu.menukey || "";
      const titleFA = menu.translations.find(t => t.lang === 'FA')?.title || "";
      const titleEN = menu.translations.find(t => t.lang === 'EN')?.title || "";

      // 1. Remove Telegram menu
      if (menukey === "admin-telegram") return;

      // 2. Remove AI Generator menu
      if (menukey === "admin-ai-generator") return;
      if (menukey === "admin-settings-ai") return;
      if (titleFA === "هوش مصنوعی") return;

      // 3. Rename RSS Unified
      if (menukey === "admin-rss-unified") {
        menu.translations.forEach(t => {
          if (t.lang === "FA") t.title = "تولید محتوا با هوش مصنوعی";
        });
        if (menu.translations.length === 0) {
          menu.translations.push({ lang: "FA", title: "تولید محتوا با هوش مصنوعی" });
        }
      }

      // Categorization Logic

      // MAIN
      if (
        menukey === "admin-dashboard" ||
        menukey === "admin-blog" ||
        menukey === "admin-comments"
      ) {
        if (menukey === "admin-blog" && menu.other_menus) {
          menu.other_menus = menu.other_menus.filter(m => !m.url?.includes('add') && !m.menukey?.includes('add'));
        }
        categories[0].items.push(menu);
      }
      // CONTENT
      else if (
        menukey === "admin-newspaper" || // Moved Newspaper to Content
        menukey === "admin-rss-unified" ||
        (menukey.includes("rss") && menukey.includes("setting")) ||
        menu.url?.includes("/admin/setting/ai") ||
        titleFA.includes("یکپارچه") ||
        menukey.includes("price-ticker") ||
        titleFA.includes("تیکر")
      ) {
        if (menukey === "admin-media-gallery") {
          // Skip, goes to Other
        } else {
          categories[1].items.push(menu);
        }
      }
      // DESIGN
      else if (
        menukey === "admin-pages" ||
        menukey.includes("design") ||
        menukey === "admin-menus" ||
        menukey.includes("social") || // Explicitly check here too
        titleFA.includes("شبکه")
      ) {
        categories[2].items.push(menu);
      }
      // OTHER
      else if (
        menukey.includes("report") ||
        titleFA.includes("گزارش") ||
        menukey.includes("system") ||
        titleFA.includes("متریک") ||
        menukey === "admin-ads" ||
        titleFA.includes("تبلیغات") ||
        menukey === "admin-logs" ||
        menukey === "admin-media-gallery" ||
        titleFA.includes("رسانه")
      ) {
        if ((menukey.includes("report") || titleFA.includes("گزارش")) && !menu.icon) {
          menu.icon = "metrics";
        }
        categories[4].items.push(menu);
      }
      // SETTINGS
      else if (
        menukey.includes("setting")
      ) {
        categories[3].items.push(menu);
      }
      // FALLBACK
      else {
        if (menukey.includes("social")) {
          categories[2].items.push(menu); // Social to Design
        } else if (menukey === "admin-media-gallery") {
          categories[4].items.push(menu); // Media to Other
        } else {
          categories[1].items.push(menu); // Default to Content
        }
      }
    });

    // Remove empty categories
    return categories.filter((cat) => cat.items.length > 0);
  };

  const categorizedMenus = categorizeMenus(menus);

  const categoryTranslations: Record<string, { FA: string; EN: string }> = {
    Main: { FA: "اصلی", EN: "Main" },
    Content: { FA: "محتوا", EN: "Content" },
    Design: { FA: "طراحی", EN: "Design" },
    Settings: { FA: "تنظیمات", EN: "Settings" },
    Other: { FA: "سایر", EN: "Other" },
  };

  return (
    <aside
      className={sidebarClasses}
      id="sidebar"
      data-expanded={shouldExpand ? "true" : "false"}
    >
      {/* Start::main-sidebar-header */}
      <div className="main-sidebar-header shrink-0 px-4 py-5 h-20 lg:h-24 border-b border-gray-200 flex items-center justify-center overflow-hidden dark:border-gray-800">
        <Link href="/admin/dashboard" className="header-logo flex items-center justify-center w-full h-full overflow-hidden">
          {shouldExpand ? (
            <>
              <Image
                className="desktop-logo dark:hidden block"
                src={logoDashboardLight || "/images/logo/logo.png"}
                alt="logo"
                width={150}
                height={40}
                style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', objectFit: 'contain' }}
              />
              <Image
                className="desktop-dark hidden dark:block"
                src={logoDashboardDark || "/images/logo/logo-dark.png"}
                alt="logo"
                width={150}
                height={40}
                style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', objectFit: 'contain' }}
              />
            </>
          ) : (
            <>
              <Image
                className="toggle-logo dark:hidden block"
                src={logoSmall || "/images/logo/logo.png"}
                alt="logo"
                width={40}
                height={40}
                style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', objectFit: 'contain' }}
              />
              <Image
                className="toggle-dark hidden dark:block"
                src={logoSmallDark || "/images/logo/logo-dark.png"}
                alt="logo"
                width={40}
                height={40}
                style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', objectFit: 'contain' }}
              />
            </>
          )}
        </Link>
      </div>
      {/* End::main-sidebar-header */}

      {/* Start::main-sidebar */}
      <div className="main-sidebar flex-1 overflow-y-auto overflow-x-hidden" id="sidebar-scroll">
        {/* Start::nav */}
        <nav className="main-menu-container flex flex-col py-2">
          <ul className="main-menu space-y-1">
            {menus.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                <div>در حال بارگذاری منوها...</div>
              </li>
            ) : (
              categorizedMenus.map((categoryGroup, categoryIndex) => (
                <React.Fragment key={categoryGroup.category}>
                  {/* Category Header */}
                  {shouldExpand && (
                    <li className="slide__category mt-4 first:mt-0">
                      <span className="category-name block px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {categoryTranslations[categoryGroup.category]?.[currentLang === "FA" ? "FA" : "EN"] || categoryGroup.category}
                      </span>
                    </li>
                  )}

                  {/* Category Items */}
                  {categoryGroup.items.map((menu) => {
                    const Icon = menu.icon ? iconMap[menu.icon as keyof typeof iconMap] : null;
                    const isOpen = openMenus.includes(menu.menuid);
                    const menuUrl = menu.url?.replace(/^\/+/, "") || "";
                    const isActive = menuUrl && pathname.startsWith(`/${menuUrl}`);
                    const hasSubmenu = menu.other_menus && menu.other_menus.length > 0;
                    const menuTitle = menu.translations.find(t => t.lang === currentLang)?.title || menu.translations[0]?.title || "";

                    return (
                      <li key={menu.menuid} className={`slide ${hasSubmenu ? 'has-sub' : ''} ${isOpen && hasSubmenu ? 'active open' : ''} ${isActive ? 'active' : ''}`}>
                        {menu.url ? (
                          <Link
                            href={menu.url.startsWith('/') ? menu.url : `/${menu.url}`}
                            className={`side-menu__item ${isActive ? 'active open' : ''}`}
                            title={!shouldExpand ? menuTitle : undefined}
                          >
                            {Icon && (
                              <span className="side-menu__icon shrink-0 w-5 h-5 flex items-center justify-center relative">
                                <Icon className="w-5 h-5" />
                                {!shouldExpand && menu.menukey === 'admin-comments' && pendingCommentsCount > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {pendingCommentsCount > 99 ? '99+' : pendingCommentsCount}
                                  </span>
                                )}
                              </span>
                            )}
                            {shouldExpand && (
                              <>
                                <span className="side-menu__label flex-1">{menuTitle}</span>
                                {menu.menukey === 'admin-comments' && pendingCommentsCount > 0 && (
                                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {pendingCommentsCount > 99 ? '99+' : pendingCommentsCount}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>
                        ) : (
                          <>
                            <Link
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                toggle(menu.menuid);
                              }}
                              className={`side-menu__item ${isOpen && hasSubmenu ? 'active open' : ''}`}
                              title={!shouldExpand ? menuTitle : undefined}
                            >
                              {Icon && (
                                <span className="side-menu__icon shrink-0 w-5 h-5 flex items-center justify-center">
                                  <Icon className="w-5 h-5" />
                                </span>
                              )}
                              {shouldExpand && (
                                <>
                                  <span className="side-menu__label flex-1">{menuTitle}</span>
                                  {hasSubmenu && (
                                    <span className={`side-menu__angle shrink-0 ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        viewBox="0 0 256 256"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polyline points="96 112 128 144 160 112"></polyline>
                                      </svg>
                                    </span>
                                  )}
                                </>
                              )}
                            </Link>

                            {/* Submenu - Vyzor Style */}
                            {shouldExpand && isOpen && hasSubmenu && (
                              <ul className="slide-menu child1 double-menu-active active mt-1 space-y-1">
                                {menu.other_menus?.map((child) => {
                                  const childUrl = child.url?.replace(/^\/+/, "") || "";
                                  const isChildActive = childUrl && pathname.startsWith(`/${childUrl}`);
                                  const ChildIcon = child.icon ? iconMap[child.icon as keyof typeof iconMap] : null;
                                  const childTitle = child.translations.find(t => t.lang === currentLang)?.title || child.translations[0]?.title || "";

                                  return (
                                    <li key={child.menuid} className={`slide ${isChildActive ? 'active open' : ''}`}>
                                      <Link
                                        href={child.url ? (child.url.startsWith('/') ? child.url : `/${child.url}`) : '#'}
                                        className={`side-menu__item pl-9 ${isChildActive ? 'active' : ''}`}
                                      >
                                        {ChildIcon && (
                                          <span className="side-menu-doublemenu__icon shrink-0 w-4 h-4 flex items-center justify-center">
                                            <ChildIcon className="w-4 h-4" />
                                          </span>
                                        )}
                                        <span>{childTitle}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </ul>
        </nav>
        {/* End::nav */}
      </div>
      {/* End::main-sidebar */}
    </aside>
  );
}
