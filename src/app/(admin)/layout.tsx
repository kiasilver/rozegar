"use client";
import '@/styles/globals-admin.css';
import { useSidebar } from "@/context/admin/sidebarcontext";
import AppHeader from "@/layout/admin/appheader";
import AppSidebar from "@/layout/admin/appsidebar";
import Backdrop from "@/layout/admin/backdrop";
import React, { useEffect, useState } from "react";
import { LanguageProvider } from '@/context/admin/language';
import { SidebarProvider } from '@/context/admin/sidebarcontext';
import { ThemeProvider } from '@/context/admin/themecontext';
import { usePathname } from "next/navigation"; // Import usePathname hook
import { AlertProvider } from "@/context/admin/alertcontext"; // Import AlertProvider
import { ProgressProvider } from "@/context/admin/progresscontext"; // Import ProgressProvider
import { RSSProgressProvider } from "@/context/admin/rssprogresscontext"; // Import RSSProgressProvider
import { HeroUIProvider } from "@heroui/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // Get the current path

  // If the path is 'admin/login', do not apply AdminLayout
  if (pathname === '/admin/signup' || pathname === '/admin/signin') {
    return (
      <ThemeProvider>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </ThemeProvider>
    ); // Return only the children without the layout
  }

  return (
    <ThemeProvider>
      <HeroUIProvider>
        <AlertProvider>
          <ProgressProvider>
            <RSSProgressProvider>
              <LanguageProvider>
                <SidebarProvider>
                  <AdminLayoutInner>{children}</AdminLayoutInner>
                </SidebarProvider>
              </LanguageProvider>
            </RSSProgressProvider>
          </ProgressProvider>
        </AlertProvider>
      </HeroUIProvider>
    </ThemeProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const [lang, setLang] = useState<string>('en'); // Default to English

  // Effect to check the lang attribute on initial render and setup MutationObserver for real-time changes
  useEffect(() => {
    const htmlElement = document.documentElement; // Reference to <html>

    // Function to update lang state based on <html lang="...">
    const updateLang = () => setLang(htmlElement.lang);

    // Initialize lang from <html lang="..."> on mount
    updateLang();

    // Set up a MutationObserver to detect changes to the lang attribute
    const observer = new MutationObserver(() => {
      updateLang();
    });

    // Start observing changes to the <html> element, specifically the 'lang' attribute
    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    // Clean up the observer when the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, []);

  // Determine if sidebar should be considered expanded
  const sidebarExpanded = isExpanded;
  
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : sidebarExpanded
    ? "lg:ml-[5px]"
    : "lg:ml-[70px]";

  // Conditional margin based on the lang attribute (RTL/LTR)
  const dynamicMargin = lang === 'fa' 
    ? (isMobileOpen 
        ? "mr-0" 
        : sidebarExpanded 
        ? "lg:mr-[5px]" 
        : "lg:mr-[70px]")
    : mainContentMargin;

  return (
    <div className="h-screen overflow-hidden xl:flex bg-white dark:bg-gray-900 transition-colors">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 ${dynamicMargin}`}
      >
        <AppHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden admin-main-content">
          <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8 lg:py-10 w-full bg-white dark:bg-gray-900">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
