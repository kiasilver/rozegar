"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";

type Language = "fa" | "en";

type LanguageContextType = {
  Language: Language;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [Language, setLanguage] = useState<Language>("fa");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This code will only run on the client side
    const savedLanguage = localStorage.getItem("Language") as Language | null;
    const initialLanguage = savedLanguage || "fa"; // Default to fa language if not found

    setLanguage(initialLanguage);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("Language", Language);
      // Add or remove class from document element
      if (Language === "en") {
        document.documentElement.setAttribute("lang", "en");
        document.documentElement.classList.remove("fa"); 
        document.documentElement.setAttribute("dir",'ltr')
      } else {
        document.documentElement.setAttribute("lang", "fa");
        document.documentElement.setAttribute("dir",'rtl')
        document.documentElement.classList.remove("en"); 
      }
      
    }
  }, [Language, isInitialized]);

  const toggleLanguage = () => {
    setLanguage((prevLanguage) => (prevLanguage === "fa" ? "en" : "fa"));
  };

  return (
    <LanguageContext.Provider value={{ Language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
