"use client";
import { useEffect, useState } from 'react';
import { IRFONT } from '@/lib/utils/fonts';
import { SSEProvider } from '@/providers/SSEProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Apply colors immediately on mount to prevent FOUC (Flash of Unstyled Content)
  useEffect(() => {
    try {
      const cachedColors = localStorage.getItem('siteColors');
      if (cachedColors) {
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
      }
    } catch (e) {
      // Silently fail if localStorage is not available or parsing fails
    }
    setIsHydrated(true);
  }, []);

  return (
    <html dir='rtl' className={IRFONT.variable} suppressHydrationWarning>
      <body className={isHydrated ? 'bg-white dark:bg-gray-900 font-[var(--Vazir)] transition-colors' : ''} suppressHydrationWarning>
        {/* Blocking script to apply colors before React hydration - prevents FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cachedColors = localStorage.getItem('siteColors');
                  if (cachedColors) {
                    var colors = JSON.parse(cachedColors);
                    var root = document.documentElement;
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
                  }
                } catch (e) {
                  // Silently fail
                }
              })();
            `,
          }}
        />
        <SSEProvider>
          <div id='Container' className="min-h-screen bg-white dark:bg-gray-900">{children}</div>
        </SSEProvider>
      </body>
    </html>
  );
}
