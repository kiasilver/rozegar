"use client";

import { useEffect } from 'react';

export default function ColorVariables() {
  useEffect(() => {
    // Apply colors immediately from localStorage if available (prevents FOUC)
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

    // Fetch from API to ensure we have the latest (updates cache)
    fetch('/api/v1/public/colors')
      .then(res => res.json())
      .then(data => {
        const root = document.documentElement;
        
        if (data.sitePrimaryColor) {
          root.style.setProperty('--primary-color', data.sitePrimaryColor);
        }
        if (data.siteSecondaryColor) {
          root.style.setProperty('--secondary-color', data.siteSecondaryColor);
        }
        if (data.siteTertiaryColor) {
          root.style.setProperty('--tertiary-color', data.siteTertiaryColor);
        }
        if (data.siteQuaternaryColor) {
          root.style.setProperty('--quaternary-color', data.siteQuaternaryColor);
        }

        // Update cache with latest from server
        localStorage.setItem('siteColors', JSON.stringify(data));
      })
      .catch(err => {
        console.error('Error fetching color settings:', err);
      });
  }, []);

  return null;
}

