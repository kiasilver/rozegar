import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';

async function getMetaDescription(): Promise<string> {
  try {
    // اول default_meta_description را بررسی می‌کنیم، اگر نبود meta_description را بررسی می‌کنیم
    const [defaultSetting, legacySetting] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: 'default_meta_description' },
      }),
      prisma.siteSetting.findUnique({
        where: { key: 'meta_description' },
      }),
    ]);
    
    return defaultSetting?.value || legacySetting?.value || 'آخرین اخبار، تحلیل‌ها و گزارش‌های خبری را در سایت خبری ما دنبال کنید. به‌روزترین اطلاعات از ایران و جهان.';
  } catch (error) {
    console.error('Error fetching meta description:', error);
    return 'آخرین اخبار، تحلیل‌ها و گزارش‌های خبری را در سایت خبری ما دنبال کنید. به‌روزترین اطلاعات از ایران و جهان.';
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const description = await getMetaDescription();
  
  return {
    title: {
      default: 'سایت خبری - آخرین اخبار و رویدادها',
      template: '%s | سایت خبری',
    },
    description,
    keywords: ['خبر', 'اخبار', 'رویداد', 'تحلیل', 'گزارش', 'ایران', 'جهان'],
    authors: [{ name: 'سایت خبری' }],
    creator: 'سایت خبری',
    publisher: 'سایت خبری',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
    alternates: {
      canonical: '/',
      languages: {
        'fa-IR': '/fa',
        'en-US': '/en',
      },
    },
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      siteName: 'سایت خبری',
      title: 'سایت خبری - آخرین اخبار و رویدادها',
      description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'سایت خبری',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'سایت خبری - آخرین اخبار و رویدادها',
      description,
      images: ['/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },
  };
}

