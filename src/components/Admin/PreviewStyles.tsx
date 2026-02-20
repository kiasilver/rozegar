"use client";

import { useEffect } from 'react';

export default function PreviewStyles() {
  useEffect(() => {
    // Get query params from URL
    const params = new URLSearchParams(window.location.search);
    const bg = params.get('bg');
    const text = params.get('text');
    const darkBg = params.get('darkBg');
    const darkText = params.get('darkText');
    const sitePrimary = params.get('sitePrimary');
    const siteSecondary = params.get('siteSecondary');
    
    const applyColors = (colors: {
      bg?: string | null;
      text?: string | null;
      darkBg?: string | null;
      darkText?: string | null;
      sitePrimary?: string | null;
      siteSecondary?: string | null;
    }) => {
      const root = document.documentElement;
      
      if (colors.bg) {
        root.style.setProperty('--preview-bg', colors.bg);
        document.body.style.backgroundColor = colors.bg;
      }
      if (colors.text) {
        root.style.setProperty('--preview-text', colors.text);
        document.body.style.color = colors.text;
      }
      if (colors.darkBg) {
        root.style.setProperty('--preview-dark-bg', colors.darkBg);
      }
      if (colors.darkText) {
        root.style.setProperty('--preview-dark-text', colors.darkText);
      }
      if (colors.sitePrimary) {
        root.style.setProperty('--primary-color', colors.sitePrimary);
      }
      if (colors.siteSecondary) {
        root.style.setProperty('--secondary-color', colors.siteSecondary);
      }
      
      // Apply dark mode styles if in dark mode
      if (document.documentElement.classList.contains('dark')) {
        if (colors.darkBg) {
          document.body.style.backgroundColor = colors.darkBg;
        }
        if (colors.darkText) {
          document.body.style.color = colors.darkText;
        }
      }
    };

    // Apply initial colors from query params
    if (bg || text || darkBg || darkText || sitePrimary || siteSecondary) {
      applyColors({ bg, text, darkBg, darkText, sitePrimary, siteSecondary });
    }

    // Listen for real-time updates from parent window
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from same origin or any origin (for preview)
      if (event.data?.type === 'UPDATE_COLORS') {
        applyColors(event.data.colors);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also check for URL changes (for iframe refresh)
    const checkUrlParams = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const currentBg = currentParams.get('bg');
      const currentText = currentParams.get('text');
      const currentDarkBg = currentParams.get('darkBg');
      const currentDarkText = currentParams.get('darkText');
      const currentSitePrimary = currentParams.get('sitePrimary');
      const currentSiteSecondary = currentParams.get('siteSecondary');
      
      if (currentBg || currentText || currentDarkBg || currentDarkText || currentSitePrimary || currentSiteSecondary) {
        applyColors({ 
          bg: currentBg, 
          text: currentText, 
          darkBg: currentDarkBg, 
          darkText: currentDarkText,
          sitePrimary: currentSitePrimary,
          siteSecondary: currentSiteSecondary,
        });
      }
    };

    // Check URL params periodically for iframe refresh
    const intervalId = setInterval(checkUrlParams, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(intervalId);
    };
  }, []);
  
  return null;
}


