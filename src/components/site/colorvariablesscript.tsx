"use client";

import { useEffect } from 'react';

export default function ColorVariablesScript() {
  useEffect(() => {
    // Apply colors immediately on mount
    const applyColors = async () => {
      try {
        // Try to get from localStorage first (fastest)
        const cachedColors = localStorage.getItem('siteColors');
        if (cachedColors) {
          try {
            const colors = JSON.parse(cachedColors);
            const root = document.documentElement;
            if (colors.sitePrimaryColor) {
              root.style.setProperty('--primary-color', colors.sitePrimaryColor);
            }
            if (colors.siteSecondaryColor) {
              root.style.setProperty('--secondary-color', colors.siteSecondaryColor);
            }
            if (colors.siteTertiaryColor) {
              root.style.setProperty('--tertiary-color', colors.siteTertiaryColor);
            }
            if (colors.siteQuaternaryColor) {
              root.style.setProperty('--quaternary-color', colors.siteQuaternaryColor);
            }
          } catch (e) {
            console.error('Error parsing cached colors:', e);
          }
        }

        // Fetch from API to ensure we have the latest
        const res = await fetch('/api/v1/public/colors');
        if (res.ok) {
          const colors = await res.json();
          const root = document.documentElement;
          
          if (colors.sitePrimaryColor) {
            root.style.setProperty('--primary-color', colors.sitePrimaryColor);
          }
          if (colors.siteSecondaryColor) {
            root.style.setProperty('--secondary-color', colors.siteSecondaryColor);
          }
          if (colors.siteTertiaryColor) {
            root.style.setProperty('--tertiary-color', colors.siteTertiaryColor);
          }
          if (colors.siteQuaternaryColor) {
            root.style.setProperty('--quaternary-color', colors.siteQuaternaryColor);
          }

          // Cache for next time
          localStorage.setItem('siteColors', JSON.stringify(colors));
        }
      } catch (error) {
        console.error('Error applying colors:', error);
      }
    };

    applyColors();
  }, []);

  return null;
}

