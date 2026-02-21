"use client";

import { useEffect, useState } from 'react';

interface FontVariant {
  weight: string;
  style: string;
  url: string;
  filename: string;
}

interface CustomFont {
  name: string;
  variants: FontVariant[];
}

export default function CustomFonts() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);

  useEffect(() => {
    // Fetch custom fonts from public API (no auth needed for site)
    fetch('/api/v1/public/fonts')
      .then(res => res.json())
      .then(data => {
        if (data.fonts) {
          setFonts(data.fonts);
        }
      })
      .catch(error => {
        console.error('Error fetching custom fonts:', error);
      });
  }, []);

  useEffect(() => {
    // Inject @font-face rules for each font variant
    const styleId = 'custom-fonts-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    let css = '';
    fonts.forEach(font => {
      font.variants.forEach(variant => {
        const fontFamily = font.name.replace(/[^a-zA-Z0-9]/g, '-');
        css += `
@font-face {
  font-family: '${font.name}';
  src: url('${variant.url}') format('${getFontFormat(variant.url)}');
  font-weight: ${variant.weight};
  font-style: ${variant.style};
  font-display: swap;
}
`;
      });
    });

    styleElement.textContent = css;
  }, [fonts]);

  return null;
}

function getFontFormat(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    case 'eot':
      return 'embedded-opentype';
    default:
      return 'woff2';
  }
}

