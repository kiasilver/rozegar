import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import { notFound } from 'next/navigation';
import ContactUsRenderer from '@/components/Site/pages/ContactUsRenderer';

// Static page with ISR - revalidate every hour
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.generalPage.findUnique({
    where: { key: 'contact' },
    include: {
      translations: {
        where: { lang: 'FA' },
        include: { seo: true },
      },
    },
  });

  const translation = page?.translations[0];
  const seo = translation?.seo;

  return {
    title: seo?.meta_title || translation?.title || 'ارتباط با ما | روزمرگی',
    description: seo?.meta_description || 'ارتباط با پایگاه خبری روزمرگی',
    alternates: {
      canonical: '/contact',
    },
    openGraph: {
      title: seo?.og_title || translation?.title || 'ارتباط با ما | روزمرگی',
      description: seo?.og_description || 'ارتباط با پایگاه خبری روزمرگی',
      images: seo?.og_image ? [seo.og_image] : [],
      type: (seo?.og_type as 'website' | 'article' | 'profile' | undefined) || 'website',
    },
  };
}

export default async function ContactPage() {
  const page = await prisma.generalPage.findUnique({
    where: { key: 'contact' },
    include: {
      translations: {
        where: { lang: 'FA' },
      },
    },
  });

  if (!page || !page.is_active) {
    // اگر صفحه وجود ندارد، یک صفحه پیش‌فرض نمایش بده
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
              ارتباط با ما
            </h1>
            <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-700">
              <p className="mb-3 sm:mb-4 text-sm sm:text-base">
                صفحه ارتباط با ما در حال آماده‌سازی است. لطفاً بعداً مراجعه کنید.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const translation = page.translations[0];

  // Try to parse content as JSON (template data)
  let templateData = null;
  if (translation?.content) {
    try {
      templateData = JSON.parse(translation.content);
    } catch {
      // Content is not JSON, use old format
    }
  }

  // If template data exists, use template renderer
  if (templateData) {
    return <ContactUsRenderer data={templateData} />;
  }

  // Otherwise, use old format
  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            {translation?.title || 'ارتباط با ما'}
          </h1>
          <div
            className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{
              __html: translation?.content || '<p>محتوای صفحه در حال آماده‌سازی است.</p>',
            }}
          />
        </div>
      </div>
    </div>
  );
}

