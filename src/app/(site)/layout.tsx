"use client";
import '@/styles/globals-site.css'
import Header2 from '@/components/Site/header/Header2'
import Footer1 from '@/components/Site/footer/Footer1'
import AdStickyBottomRight from '@/components/Site/ads/AdStickyBottomRight'
import AdPopupBottomRight from '@/components/Site/ads/AdPopupBottomRight'
import MetaDescription from '@/components/Site/MetaDescription'
import PreviewStyles from '@/components/Admin/PreviewStyles'
import ColorVariables from '@/components/Site/ColorVariables'
import CustomFonts from '@/components/Site/CustomFonts'
import PriceTicker from '@/components/Site/price-ticker/PriceTicker'
import { useEffect } from 'react';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // حذف dark mode از صفحات سایت
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <>
      <MetaDescription />
      <PreviewStyles />
      <ColorVariables />
      <CustomFonts />
      <PriceTicker />
      <Header2 />
      <main className="w-full min-h-screen bg-white">{children}</main>
      <Footer1 />
      {/* تبلیغ چسبنده پایین راست */}
      <AdStickyBottomRight />
      {/* تبلیغ Popup پایین راست (Video/GIF) */}
      <AdPopupBottomRight />
    </>
  )
}


