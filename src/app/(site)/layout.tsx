"use client";
import '@/styles/globals-site.css'
import Header2 from '@/components/site/header/header2'
import Footer1 from '@/components/site/footer/footer1'
import AdStickyBottomRight from '@/components/site/ads/adstickybottomright'
import AdPopupBottomRight from '@/components/site/ads/adpopupbottomright'
import MetaDescription from '@/components/site/metadescription'
import PreviewStyles from '@/components/admin/previewstyles'
import ColorVariables from '@/components/site/colorvariables'
import CustomFonts from '@/components/site/customfonts'
import PriceTicker from '@/components/site/price-ticker/priceticker'
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


