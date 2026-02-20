import localFont from 'next/font/local';



export const IRFONT = localFont({
  src: [
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-ExtraLight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-Light.woff2',
      
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      
      path: '../../../public/fonts/Vazir/Vazirmatn-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-ExtraBold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn-Bold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/Vazir/Vazirmatn.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
 variable: '--Vazir',
  display: 'swap',
});
