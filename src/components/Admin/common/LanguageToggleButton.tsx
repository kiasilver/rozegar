import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/Admin/Language";
import { setCookie } from "nookies"; // وارد کردن تابع برای کار با کوکی‌ها


export const LanguageToggleButton: React.FC = () => {
  const { toggleLanguage } = useLanguage();
  const [currentLang, setCurrentLang] = useState<string>("");

  useEffect(() => {
    // اول تلاش کن از کوکی بخونی
    const match = document.cookie.match(/(?:^|; )language=([^;]+)/);
    const cookieLang = match ? decodeURIComponent(match[1]) : null;
  
    // اگر کوکی وجود داره از اون استفاده کن، در غیر این صورت از localStorage
    const initialLang = cookieLang || localStorage.getItem("language") || "en";
  
    setCurrentLang(initialLang);
    document.documentElement.lang = initialLang;
  }, []);

  const handleLanguageToggle = () => {
    // بهتره از HTML یا localStorage بخونیم، چون state ممکنه هنوز آپدیت نشده باشه
    const current = document.documentElement.lang || localStorage.getItem("language") || "en";
    const newLang = current === "en" ? "fa" : "en";
  
    // تنظیم همه‌جا
    localStorage.setItem("language", newLang);
    setCookie(null, "language", newLang, {
      path: "/",
      sameSite: "lax", // بهتره
    });
  
    document.documentElement.lang = newLang;
    setCurrentLang(newLang);
    toggleLanguage();
  
    // بعد reload که درخواست جدید با کوکی درست بره سمت سرور
    window.location.reload();
  };
  
  return (
    <button
      onClick={handleLanguageToggle}
      className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      <svg
       className={currentLang === "fa" ? "block" : "hidden"} 
     
        width="20"
        height="20"
        viewBox="0 0 24 24"
        
        xmlns="http://www.w3.org/2000/svg"
      >
         <path fill="none" d="M0 0h24v24H0z"/>
         
          <path d="M14 10h2v.757a4.5 4.5 0 0 1 7 3.743V20h-2v-5.5c0-1.43-1.175-2.5-2.5-2.5S16 13.07 16 14.5V20h-2V10zm-2-6v2H4v5h8v2H4v5h8v2H2V4h10z"
          fill="currentColor"
        />
      </svg>
      <svg
                className={currentLang === "en" ? "block" : "hidden"} 

        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
        d="M5.2,18.1v-1.8h3.7c0.7,0,1.3-0.1,1.7-0.2c0.4-0.1,0.8-0.2,1-0.4c0.2-0.2,0.4-0.3,0.5-0.5s0.1-0.4,0.2-0.5
				h-1.5c-0.2,0-0.4,0-0.6,0c-0.2,0-0.4,0-0.6-0.1s-0.4-0.1-0.7-0.2c-0.2-0.1-0.4-0.2-0.7-0.3c-0.2-0.1-0.3-0.2-0.5-0.4
				c-0.2-0.2-0.3-0.3-0.5-0.6C7.1,13,7,12.8,6.9,12.4c-0.1-0.3-0.1-0.7-0.1-1.1c0-0.5,0.1-1,0.3-1.5C7.2,9.4,7.5,9,7.8,8.7
				C8.2,8.4,8.5,8.1,9,7.9s0.9-0.3,1.4-0.3c0.6,0,1.1,0.1,1.5,0.4s0.9,0.6,1.2,1c0.3,0.5,0.6,1,0.8,1.7c0.2,0.7,0.2,1.5,0.2,2.3v1.3
				c0,0.6-0.1,1.2-0.4,1.7c-0.3,0.5-0.6,0.9-1.1,1.2c-0.9,0.5-2.1,0.8-3.7,0.8H5.2z M10.3,9.5c-0.2,0-0.4,0-0.6,0.1
				C9.5,9.7,9.3,9.8,9.1,9.9c-0.2,0.2-0.3,0.3-0.4,0.6c-0.1,0.2-0.2,0.5-0.2,0.8c0,0.2,0,0.4,0.1,0.5c0,0.1,0.1,0.3,0.2,0.4
				c0.1,0.1,0.1,0.2,0.2,0.2c0.1,0.1,0.2,0.1,0.2,0.1c0.2,0.1,0.4,0.2,0.7,0.2s0.6,0.1,1,0.1h1.5c0-0.6-0.1-1.2-0.2-1.7
				c-0.1-0.5-0.3-0.9-0.5-1.2C11.3,9.7,10.9,9.5,10.3,9.5z M8.2,4.1l2.2-2.2l2.3,2.3l-2.2,2.2L8.2,4.1z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};
