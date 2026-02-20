import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import { notFound } from 'next/navigation';
import { generateWorldClassMetadata } from '@/lib/content/seo/seo';
import Script from 'next/script';
import Link from 'next/link';
import { FaCar, FaClock, FaArrowRight } from 'react-icons/fa';

async function getBaseUrl(): Promise<string> {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
}

interface PageProps {
    params: Promise<{ brand: string }>;
}

export async function generateStaticParams() {
    const sources = await prisma.carPriceSource.findMany({
        where: { is_active: true },
    });

    return sources.map((source) => ({
        brand: encodeURIComponent(source.name),
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { brand: encodedBrand } = await params;
    const brand = decodeURIComponent(encodedBrand);
    const baseUrl = await getBaseUrl();

    const source = await prisma.carPriceSource.findFirst({
        where: {
            name: brand,
            is_active: true,
        },
        include: {
            prices: {
                take: 10,
            },
        },
    });

    if (!source) {
        return {
            title: `قیمت محصولات ${brand}`,
        };
    }

    const models = [...new Set(source.prices.map(p => p.model))];
    const keywords = [
        `قیمت محصولات ${brand}`,
        `قیمت ${brand}`,
        `قیمت لحظه‌ای ${brand}`,
        `قیمت روز ${brand}`,
        ...models.map(m => `قیمت ${brand} ${m}`),
        'قیمت خودرو',
        'قیمت لحظه‌ای خودرو',
    ];

    const title = `قیمت محصولات ${brand} | قیمت لحظه‌ای ${brand} ۱۴۰۴`;
    const description = `مشاهده قیمت لحظه‌ای و روزانه تمامی محصولات ${brand} شامل ${models.slice(0, 5).join('، ')}. مقایسه قیمت بازار و کارخانه ${brand}، آخرین تغییرات قیمت.`;

    return generateWorldClassMetadata({
        title,
        description,
        url: `/car-prices/${encodedBrand}`,
        type: 'website',
        keywords,
        categories: ['قیمت خودرو', brand],
        tags: models,
        siteName: 'روزگار',
    });
}

export const revalidate = 60;

export default async function BrandCarPricesPage({ params }: PageProps) {
    const { brand: encodedBrand } = await params;
    const brand = decodeURIComponent(encodedBrand);
    const baseUrl = await getBaseUrl();

    const source = await prisma.carPriceSource.findFirst({
        where: {
            name: brand,
            is_active: true,
        },
        include: {
            prices: {
                orderBy: [
                    { model: 'asc' },
                    { year: 'desc' },
                ],
            },
        },
    });

    if (!source) {
        notFound();
    }

    // Group prices by model
    const groupedByModel: Record<string, typeof source.prices> = {};
    source.prices.forEach(price => {
        const key = price.model;
        if (!groupedByModel[key]) {
            groupedByModel[key] = [];
        }
        groupedByModel[key].push(price);
    });

    // Get latest update time
    let lastUpdateStr = 'نامشخص';
    let maxDate = new Date(0);
    source.prices.forEach(price => {
        if (price.updated_at > maxDate) maxDate = price.updated_at;
    });
    if (maxDate.getTime() > 0) {
        lastUpdateStr = maxDate.toLocaleString('fa-IR', {
            timeZone: 'Asia/Tehran',
            dateStyle: 'full',
            timeStyle: 'short',
        });
    }

    // Generate Structured Data
    const structuredData = generateBrandStructuredData(source, brand, baseUrl, lastUpdateStr);

    return (
        <>
            <Script
                id="brand-car-prices-structured-data"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen py-8 dir-rtl font-sans text-right">
                <div className="container mx-auto px-4 max-w-5xl">
                    {/* Breadcrumb */}
                    <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
                            خانه
                        </Link>
                        <FaArrowRight className="text-xs" />
                        <Link href="/car-prices" className="hover:text-blue-600 dark:hover:text-blue-400">
                            قیمت خودرو
                        </Link>
                        <FaArrowRight className="text-xs" />
                        <span className="text-gray-900 dark:text-white font-medium">
                            {brand}
                        </span>
                    </nav>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-3">
                            قیمت محصولات {brand}
                        </h1>
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-zinc-700">
                            <FaClock className="text-gray-400" />
                            <span>آخرین بروزرسانی:</span>
                            <span className="font-medium dir-ltr">{lastUpdateStr}</span>
                        </div>
                    </div>

                    {/* Price List by Model */}
                    <div className="space-y-6">
                        {Object.entries(groupedByModel).map(([model, prices]) => (
                            <div key={model} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-zinc-800/80 px-5 py-3 border-b border-gray-100 dark:border-zinc-700">
                                    <h2 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                                        قیمت {brand} {model}
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                                    {prices.map((price) => (
                                        <div key={price.id} className="p-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                    <FaCar className="text-xl" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-base">
                                                        {price.trim || price.model} {price.year}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {price.type === 'market' ? 'قیمت بازار' : 'قیمت کارخانه'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                        {price.price}
                                                    </span>
                                                    <span className="text-xs text-gray-400">تومان</span>
                                                </div>
                                                {price.change && (
                                                    <div className="text-xs text-gray-500">
                                                        تغییر: {price.change}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Back Link */}
                    <div className="mt-8 text-center">
                        <Link
                            href="/car-prices"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <FaArrowRight className="rotate-180" />
                            بازگشت به لیست تمام برندها
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

function generateBrandStructuredData(source: any, brand: string, baseUrl: string, lastUpdate: string) {
    const products = source.prices.map((price: any) => {
        const priceValue = parseFloat(price.price.replace(/[,\u200C\u200D\s]/g, '').replace(/تومان/g, ''));
        
        return {
            '@type': 'Product',
            name: `${brand} ${price.model} ${price.trim || ''} ${price.year}`.trim(),
            brand: {
                '@type': 'Brand',
                name: brand,
            },
            model: price.model,
            productionDate: price.year,
            category: 'خودرو',
            offers: {
                '@type': 'Offer',
                price: !isNaN(priceValue) ? priceValue : undefined,
                priceCurrency: 'IRR',
                availability: 'https://schema.org/InStock',
                priceValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                seller: {
                    '@type': price.type === 'market' ? 'Individual' : 'Organization',
                    name: price.type === 'market' ? 'بازار خودرو' : 'کارخانه',
                },
            },
        };
    }).filter((p: any) => p.offers.price);

    const collectionPage = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `قیمت محصولات ${brand}`,
        description: `قیمت لحظه‌ای و روزانه تمامی محصولات ${brand}. آخرین بروزرسانی: ${lastUpdate}`,
        url: `${baseUrl}/car-prices/${encodeURIComponent(brand)}`,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.slice(0, 50).map((product: any, index: number) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: product,
            })),
        },
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'خانه',
                item: baseUrl,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'قیمت خودرو',
                item: `${baseUrl}/car-prices`,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: brand,
                item: `${baseUrl}/car-prices/${encodeURIComponent(brand)}`,
            },
        ],
    };

    return [collectionPage, breadcrumb];
}

