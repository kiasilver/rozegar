"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This code will only run on the client side
    if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || "light"; // Default to light theme

    setTheme(initialTheme);
    setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      // فقط در پنل ادمین dark mode را اعمال کن
      if (isAdminRoute) {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        // در صفحات سایت همیشه dark mode را حذف کن
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, isInitialized, isAdminRoute]);

  // وقتی از سایت به ادمین می‌رویم یا برعکس، theme را اعمال کن
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      if (isAdminRoute) {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        const currentTheme = savedTheme || "light";
        setTheme(currentTheme);
        if (currentTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        // در صفحات سایت همیشه dark mode را حذف کن
        document.documentElement.classList.remove("dark");
      }
    }
  }, [pathname, isInitialized, isAdminRoute]);

  const toggleTheme = () => {
    if (isAdminRoute) {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
