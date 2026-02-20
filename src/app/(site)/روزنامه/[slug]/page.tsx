
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/core/prisma';
import { slugifyPersian } from '@/lib/utils/slugify-fa';
import { generateWorldClassMetadata } from '@/lib/content/seo/seo';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic route - allow all slugs
export const dynamicParams = true;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// لیست روزنامه‌های اقتصادی
const economicNewspapers = [
  { english: 'DonyayeEghtesad', persian: 'دنیای اقتصاد' },
  { english: 'Jahan-e-Eghtesad', persian: 'جهان اقتصاد' },
  { english: 'JahaneEghtesad', persian: 'جهان اقتصاد' },
  { english: 'JahanEghtesad', persian: 'جهان اقتصاد' },
  { english: 'JahanSanat', persian: 'جهان صنعت' },
  { english: 'AbrarEghtesadi', persian: 'ابرار اقتصادی' },
  { english: 'AkhbarSanat', persian: 'اخبار صنعت' },
  { english: 'EghtesadPooya', persian: 'اقتصاد پویا' },
  { english: 'EghtesadSaramad', persian: 'اقتصاد سرآمد' },
  { english: 'EghtesadKish', persian: 'اقتصاد کیش' },
  { english: 'EghtesadeMardom', persian: 'اقتصاد مردم' },
  { english: 'EghtesadeMeli', persian: 'اقتصاد ملی' },
  { english: 'EghtesadAyandeh', persian: 'اقتصاد آینده' },
  { english: 'EghtesadAyande', persian: 'اقتصاد آینده' },
  { english: 'TejaratOnline', persian: 'تجارت آنلاین' },
  { english: 'Tejarat', persian: 'تجارت' },
  { english: 'Sarmayeh', persian: 'سرمایه' },
  { english: 'Eskenas', persian: 'اسکناس' },
  { english: 'Eskanass', persian: 'اسکناس' },
  { english: 'Emruz', persian: 'امروز' },
  { english: 'Emrooz', persian: 'امروز' },
  { english: 'Khob', persian: 'خوب' },
  { english: 'Khoob', persian: 'خوب' },
  { english: 'Ruzegar', persian: 'روزگار' },
  { english: 'Shoroo', persian: 'شروع' },
  { english: 'Shorou', persian: 'شروع' },
  { english: 'AsrGhanoon', persian: 'عصر قانون' },
  { english: 'Asia', persian: 'آسیا' },
  { english: 'Servat', persian: 'ثروت' },
  { english: 'Movajehe', persian: 'مواجهه اقتصادی' },
  { english: 'MojavezeEghtesadi', persian: 'مواجهه اقتصادی' },
  { english: 'MojavezeEghtesad', persian: 'مواجهه اقتصادی' },
  { english: 'NaghshDaily', persian: 'نقش اقتصاد' },
  { english: 'NagheEghtesad', persian: 'نقش اقتصاد' },
  { english: 'NagheEghtesadi', persian: 'نقش اقتصاد' },
  { english: 'HadafEconomic', persian: 'هدف و اقتصاد' },
  { english: 'HadafVaEghtesad', persian: 'هدف و اقتصاد' },
  { english: 'HadafEghtesad', persian: 'هدف و اقتصاد' },
  { english: 'GostareshSMT', persian: 'گسترش صمت' },
  { english: 'Samat', persian: 'صمت' },
  { english: 'Semat', persian: 'صمت' },
  { english: 'MadanDaily', persian: 'روزگار معدن' },
  { english: 'RuzegareMaden', persian: 'روزگار معدن' },
  { english: 'RuzegarMaden', persian: 'روزگار معدن' },
  { english: 'EqtesadAyandeh', persian: 'اقتصاد آینده' },
];

export async function generateStaticParams() {
  // تولید params برای همه روزنامه‌ها
  const params = economicNewspapers.map((paper) => {
    const slug = slugifyPersian(paper.english.toLowerCase());
    return { slug };
  });
  
  console.log('📋 تولید static params برای روزنامه‌ها:', params.map(p => p.slug));
  console.log('📋 تعداد params:', params.length);
  
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  console.log('🚀 [generateMetadata] شروع شد');
  try {
    const { slug } = await params;
    
    console.log(`🔍 [generateMetadata] دریافت slug: "${slug}"`);
    
    // normalize slug (بدون decode)
    const normalizedSlug = slug.trim().toLowerCase();
    
    console.log(`🔍 [generateMetadata] جستجوی روزنامه با slug: "${slug}" (normalized: "${normalizedSlug}")`);
    
    // ابتدا از API روزنامه‌ها را بگیر و بر اساس slug پیدا کن
    let newspaper: { english: string; persian: string } | null = null;
    let newspaperData: { name: string; englishName?: string } | null = null;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/site/newspapers`, {
        next: { revalidate: 3600 },
      });
      const data = await response.json();
      
      if (data.success && data.newspapers) {
        // پیدا کردن روزنامه بر اساس slug از API
        newspaperData = data.newspapers.find(
          (paper: any) => {
            if (!paper.englishName) return false;
            const paperSlug = slugifyPersian(paper.englishName.toLowerCase());
            const matches = paperSlug === normalizedSlug || 
                           paperSlug === slug ||
                           paperSlug.toLowerCase() === normalizedSlug.toLowerCase() ||
                           slugifyPersian(paper.englishName) === normalizedSlug ||
                           slugifyPersian(paper.englishName) === slug;
            return matches;
          }
        ) || null;
        
        if (newspaperData && newspaperData.englishName) {
          // پیدا کردن روزنامه در لیست economicNewspapers
          newspaper = economicNewspapers.find(
            (paper) => {
              const matches = paper.english.toLowerCase() === newspaperData!.englishName!.toLowerCase() ||
                             slugifyPersian(paper.english.toLowerCase()) === slugifyPersian(newspaperData!.englishName!.toLowerCase());
              return matches;
            }
          ) || null;
          
          // اگر در لیست پیدا نشد، از اطلاعات API استفاده کن
          if (!newspaper) {
            newspaper = {
              english: newspaperData.englishName,
              persian: newspaperData.name,
            };
          }
        }
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات روزنامه در generateMetadata:', error);
    }
    
    // اگر از API پیدا نشد، از لیست economicNewspapers استفاده کن
    if (!newspaper) {
      newspaper = economicNewspapers.find(
        (paper) => {
          const paperSlug = slugifyPersian(paper.english.toLowerCase());
          const matches = paperSlug === normalizedSlug || 
                         paperSlug === slug ||
                         paperSlug.toLowerCase() === normalizedSlug.toLowerCase();
          return matches;
        }
      ) || null;
    }
    
    if (!newspaper) {
      const allSlugs = economicNewspapers.map(p => ({
        english: p.english,
        slug: slugifyPersian(p.english.toLowerCase()),
      }));
      console.error(`❌ [generateMetadata] روزنامه با slug "${slug}" (normalized: "${normalizedSlug}") پیدا نشد.`);
      console.error(`📋 [generateMetadata] لیست همه slug‌ها:`, JSON.stringify(allSlugs, null, 2));
      // اگر روزنامه پیدا نشد، metadata ساده برگردان (نه 404)
      return generateWorldClassMetadata({
        title: 'روزنامه پیدا نشد',
        description: 'روزنامه مورد نظر یافت نشد',
        keywords: ['روزنامه', 'اقتصادی'],
        url: `https://rozmaregi.com/روزنامه/${slug}`,
      });
    }
    
    const persianName = newspaper.persian;
    const title = `روزنامه ${persianName} - دانلود PDF امروز | کیوسک دیجیتال`;
    const description = `دانلود رایگان روزنامه ${persianName} امروز به صورت PDF. مشاهده و دانلود آخرین شماره روزنامه ${persianName} در کیوسک دیجیتال روزمرکی.`;
    const keywords = [`روزنامه ${persianName}`, `دانلود PDF ${persianName}`, `${persianName} امروز`, 'کیوسک دیجیتال', 'روزنامه اقتصادی', `${persianName} PDF`];
    
    return generateWorldClassMetadata({
      title,
      description,
      keywords,
      url: `https://rozmaregi.com/روزنامه/${slug}`,
      image: 'https://rozmaregi.com/images/logo/rozmaregi.png',
      type: 'article',
      locale: 'fa_IR',
      siteName: 'روزمرکی',
      author: {
        name: 'روزمرکی',
      },
      publishedAt: new Date(),
      modifiedAt: new Date(),
      tags: [persianName, 'روزنامه اقتصادی', 'کیوسک دیجیتال', 'PDF'],
    });
  } catch (error: any) {
    console.error('❌ [generateMetadata] خطا:', error);
    return {
      title: 'روزنامه پیدا نشد',
    };
  }
}

export default async function NewspaperPage({ params }: PageProps) {
  console.log('🚀 [NewspaperPage] شروع شد');
  const { slug } = await params;
  
  // normalize slug (بدون decode)
  const normalizedSlug = slug.trim().toLowerCase();
  
  // لاگ برای دیباگ
  console.log(`🔍 [NewspaperPage] جستجوی روزنامه با slug: "${slug}" (normalized: "${normalizedSlug}")`);
  
  // ابتدا از API روزنامه‌ها را بگیر و بر اساس slug پیدا کن
  let newspaperData: {
    name: string;
    url: string;
    pdfUrl?: string;
    englishName?: string;
  } | null = null;
  
  let newspaper: { english: string; persian: string } | null = null;
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/site/newspapers`, {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    
    if (data.success && data.newspapers) {
      // پیدا کردن روزنامه بر اساس slug از API
      newspaperData = data.newspapers.find(
        (paper: any) => {
          if (!paper.englishName) return false;
          const paperSlug = slugifyPersian(paper.englishName.toLowerCase());
          // تطبیق دقیق‌تر: هم با normalizedSlug و هم با slug اصلی
          const matches = paperSlug === normalizedSlug || 
                         paperSlug === slug || 
                         paperSlug.toLowerCase() === normalizedSlug.toLowerCase() ||
                         slugifyPersian(paper.englishName) === normalizedSlug ||
                         slugifyPersian(paper.englishName) === slug;
          if (matches) {
            console.log(`✅ [API Match] پیدا شد: ${paper.englishName} -> ${paperSlug} (slug: ${slug})`);
          }
          return matches;
        }
      ) || null;
      
      if (newspaperData && newspaperData.englishName) {
        // پیدا کردن روزنامه در لیست economicNewspapers بر اساس englishName
        newspaper = economicNewspapers.find(
          (paper) => {
            const matches = paper.english.toLowerCase() === newspaperData!.englishName!.toLowerCase() ||
                           slugifyPersian(paper.english.toLowerCase()) === slugifyPersian(newspaperData!.englishName!.toLowerCase());
            return matches;
          }
        ) || null;
        
        // اگر در لیست پیدا نشد، از اطلاعات API استفاده کن
        if (!newspaper) {
          console.log(`ℹ️ [API Only] روزنامه ${newspaperData.englishName} در لیست economicNewspapers نیست، اما از API پیدا شد`);
          newspaper = {
            english: newspaperData.englishName,
            persian: newspaperData.name,
          };
        }
      }
    }
  } catch (error) {
    console.error('خطا در دریافت اطلاعات روزنامه:', error);
  }
  
  // اگر از API پیدا نشد، از لیست economicNewspapers استفاده کن
  if (!newspaper) {
    newspaper = economicNewspapers.find(
      (paper) => {
        const paperSlug = slugifyPersian(paper.english.toLowerCase());
        const matches = paperSlug === normalizedSlug || 
                       paperSlug === slug ||
                       paperSlug.toLowerCase() === normalizedSlug.toLowerCase();
        if (matches) {
          console.log(`✅ [List Match] پیدا شد: ${paper.english} -> ${paperSlug} (slug: ${slug})`);
        }
        return matches;
      }
    ) || null;
  }
  
  if (!newspaper) {
    // لاگ برای دیباگ
    const allSlugs = economicNewspapers.map(p => ({
      english: p.english,
      slug: slugifyPersian(p.english.toLowerCase()),
    }));
    console.error(`❌ روزنامه با slug "${slug}" (normalized: "${normalizedSlug}") پیدا نشد.`);
    console.error(`📋 لیست همه slug‌ها:`, JSON.stringify(allSlugs, null, 2));
    notFound();
  }
  
  // اگر newspaperData پیدا نشد، دوباره از API بگیر (با نام فارسی)
  if (!newspaperData) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/site/newspapers`, {
        next: { revalidate: 3600 },
      });
      const data = await response.json();
      
      if (data.success && data.newspapers) {
        newspaperData = data.newspapers.find(
          (paper: any) => {
            // مقایسه با نام فارسی
            if (paper.name === newspaper!.persian) return true;
            // مقایسه با englishName (case-insensitive)
            if (paper.englishName?.toLowerCase() === newspaper!.english.toLowerCase()) return true;
            return false;
          }
        ) || null;
      }
    } catch (error) {
      console.error('خطا در دریافت اطلاعات روزنامه:', error);
    }
  }
  
  const persianName = newspaper.persian;
  const imageUrl = newspaperData?.url || '/images/placeholder.jpg';
  const pdfUrl = newspaperData?.pdfUrl;
  
  // تولید محتوای SEO
  const seoContent = `
    <h1>روزنامه ${persianName}</h1>
    <p>دانلود رایگان روزنامه ${persianName} امروز به صورت PDF. در کیوسک دیجیتال روزمرکی می‌توانید آخرین شماره روزنامه ${persianName} را مشاهده و دانلود کنید.</p>
    <h2>ویژگی‌های روزنامه ${persianName}</h2>
    <ul>
      <li>دانلود رایگان PDF روزنامه ${persianName}</li>
      <li>مشاهده آنلاین روزنامه ${persianName}</li>
      <li>دسترسی به آرشیو روزنامه ${persianName}</li>
      <li>به‌روزرسانی روزانه</li>
    </ul>
    <h2>درباره روزنامه ${persianName}</h2>
    <p>روزنامه ${persianName} یکی از معتبرترین روزنامه‌های اقتصادی ایران است که هر روز اخبار و تحلیل‌های مهم اقتصادی را منتشر می‌کند. شما می‌توانید در کیوسک دیجیتال روزمرکی، آخرین شماره این روزنامه را به صورت رایگان دانلود کنید.</p>
  `;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 space-x-reverse">
            <li>
              <Link href="/" className="text-gray-500 hover:text-primary">
                خانه
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/#کیوسک-دیجیتال" className="text-gray-500 hover:text-primary">
                کیوسک دیجیتال
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium" aria-current="page">
              {persianName}
            </li>
          </ol>
        </nav>
        
        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              روزنامه {persianName}
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              دانلود رایگان روزنامه {persianName} امروز به صورت PDF
            </p>
            
            {/* Newspaper Image */}
            <div className="mb-8 text-center">
              <div className="relative inline-block">
                {pdfUrl && pdfUrl.startsWith('/uploads/') ? (
                  // اگر PDF محلی موجود است، لینک دانلود مستقیم روی عکس
                  <a
                    href={pdfUrl}
                    download
                    className="block"
                    title={`کلیک برای دانلود مستقیم PDF روزنامه ${persianName}`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`روزنامه ${persianName} - ${new Date().toLocaleDateString('fa-IR')} - دانلود PDF`}
                      title={`کلیک برای دانلود PDF روزنامه ${persianName}`}
                      width={600}
                      height={800}
                      className="rounded-lg shadow-md max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      priority
                      itemProp="image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                      }}
                    />
                  </a>
                ) : (
                  // اگر PDF محلی نیست، فقط نمایش عکس
                  <Image
                    src={imageUrl}
                    alt={`روزنامه ${persianName} - ${new Date().toLocaleDateString('fa-IR')} - دانلود PDF`}
                    title={`روزنامه ${persianName} - مشاهده و دانلود PDF امروز`}
                    width={600}
                    height={800}
                    className="rounded-lg shadow-md max-w-full h-auto"
                    priority
                    itemProp="image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                    }}
                  />
                )}
                {pdfUrl && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2" aria-label="PDF موجود است">
                    <PictureAsPdfIcon sx={{ fontSize: 24 }} />
                    <span>PDF موجود است</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Download Button */}
            {pdfUrl && (
              <div className="text-center mb-8">
                {pdfUrl.startsWith('http') && pdfUrl.includes('pdfviewer.php') ? (
                  // اگر URL pdfviewer است، لینک به صفحه pdfviewer
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 28, marginLeft: '8px' }} />
                    مشاهده و دانلود PDF روزنامه {persianName}
                  </a>
                ) : pdfUrl.startsWith('/uploads/') ? (
                  // اگر PDF محلی است، دانلود مستقیم از public folder
                  <a
                    href={pdfUrl}
                    download
                    className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 28, marginLeft: '8px' }} />
                    دانلود PDF روزنامه {persianName}
                  </a>
                ) : (
                  // سایر موارد
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <PictureAsPdfIcon sx={{ fontSize: 28, marginLeft: '8px' }} />
                    مشاهده PDF روزنامه {persianName}
                  </a>
                )}
              </div>
            )}
            
            {/* SEO Content */}
            <div 
              className="prose prose-lg max-w-none mt-8"
              dangerouslySetInnerHTML={{ __html: seoContent }}
            />
            
            {/* Related Newspapers */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                سایر روزنامه‌های اقتصادی
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {economicNewspapers
                  .filter((paper) => newspaper && paper.english !== newspaper.english)
                  .slice(0, 12)
                  .map((paper) => (
                    <Link
                      key={paper.english}
                      href={`/روزنامه/${slugifyPersian(paper.english.toLowerCase())}`}
                      className="text-center p-4 bg-gray-50 rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      <div className="font-bold text-sm">{paper.persian}</div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Structured Data - Article */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `روزنامه ${persianName} - دانلود PDF امروز`,
              description: `دانلود رایگان روزنامه ${persianName} امروز به صورت PDF. مشاهده و دانلود آخرین شماره روزنامه ${persianName} در کیوسک دیجیتال روزمرکی.`,
              image: imageUrl,
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              author: {
                '@type': 'Organization',
                name: 'روزمرکی',
                url: 'https://rozmaregi.com',
              },
              publisher: {
                '@type': 'Organization',
                name: 'روزمرکی',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://rozmaregi.com/images/logo/rozmaregi.png',
                },
              },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://rozmaregi.com/روزنامه/${slug}`,
              },
              keywords: `روزنامه ${persianName}, دانلود PDF ${persianName}, ${persianName} امروز, کیوسک دیجیتال, روزنامه اقتصادی`,
            }),
          }}
        />
        
        {/* Structured Data - Breadcrumb */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'خانه',
                  item: 'https://rozmaregi.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'کیوسک دیجیتال',
                  item: 'https://rozmaregi.com#کیوسک-دیجیتال',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: persianName,
                  item: `https://rozmaregi.com/روزنامه/${slug}`,
                },
              ],
            }),
          }}
        />
        
        {/* Structured Data - NewsArticle */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NewsArticle',
              headline: `روزنامه ${persianName}`,
              description: `دانلود رایگان روزنامه ${persianName} امروز به صورت PDF`,
              image: imageUrl,
              datePublished: new Date().toISOString(),
              dateModified: new Date().toISOString(),
              author: {
                '@type': 'Organization',
                name: 'روزمرکی',
              },
              publisher: {
                '@type': 'Organization',
                name: 'روزمرکی',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://rozmaregi.com/images/logo/rozmaregi.png',
                },
              },
              articleSection: 'روزنامه اقتصادی',
            }),
          }}
        />
      </div>
    </div>
  );
}

