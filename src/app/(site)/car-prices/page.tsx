
import { Metadata } from 'next';
import { prisma } from '@/lib/core/prisma';
import CarPriceList from './carpricelist';
import { generateWorldClassMetadata } from '@/lib/content/seo/seo';
import Script from 'next/script';

async function getBaseUrl(): Promise<string> {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
}

export async function generateMetadata(): Promise<Metadata> {
    const baseUrl = await getBaseUrl();
    
    // Get all brands for keywords
    const sources = await prisma.carPriceSource.findMany({
        where: { is_active: true },
        include: {
            prices: {
                take: 1, // Just to check if there are prices
            }
        }
    });

    const brands = sources.map(s => s.name);
    const allKeywords = [
        'قیمت لحظه ای خودرو',
        'قیمت خودرو',
        'قیمت روز خودرو',
        'قیمت لحظه‌ای خودرو',
        'قیمت محصولات ایران خوردو',
        'قیمت محصولات مدیران خودرو',
        'قیمت محصولات ایران سایپا',
        'قیمت خودروهای داخلی',
        'قیمت بازار خودرو',
        'قیمت کارخانه خودرو',
        'قیمت نمایندگی خودرو',
        ...brands.map(b => `قیمت محصولات ${b}`),
        ...brands.map(b => `قیمت ${b}`),
    ];

    const title = 'قیمت لحظه‌ای خودرو | قیمت روز خودروهای داخلی و خارجی ۱۴۰۴';
    const description = `مشاهده قیمت لحظه‌ای و روزانه تمامی خودروهای داخلی شامل ${brands.join('، ')}. مقایسه قیمت بازار و کارخانه، آخرین تغییرات قیمت خودرو، قیمت محصولات ایران خوردو، قیمت محصولات مدیران خودرو، قیمت محصولات ایران سایپا و سایر برندها.`;

    return generateWorldClassMetadata({
        title,
        description,
        url: '/car-prices',
        type: 'website',
        keywords: allKeywords,
        categories: ['قیمت خودرو', 'خودرو', 'قیمت لحظه‌ای'],
        tags: brands,
        siteName: 'روزگار',
    });
}

export const revalidate = 60; // Revalidate every minute if ISR is used, or rely on dynamic fetching

export default async function CarPricesPage() {
    // Fetch active sources with their prices
    const sources = await prisma.carPriceSource.findMany({
        where: { is_active: true },
        include: {
            prices: {
                orderBy: {
                    brand: 'asc' // Sort by brand then model?
                }
            }
        },
        orderBy: { order: 'asc' }
    });

    // Determine the latest update time across all prices
    let lastUpdateStr = 'نامشخص';
    let maxDate = new Date(0);

    const serializedSources = sources.map(source => ({
        ...source,
        prices: source.prices.map(price => {
            if (price.updated_at > maxDate) maxDate = price.updated_at;
            return {
                ...price,
                updated_at: price.updated_at.toISOString() // Serialize Date
            };
        })
    }));

    if (maxDate.getTime() > 0) {
        lastUpdateStr = maxDate.toLocaleString('fa-IR', {
            timeZone: 'Asia/Tehran',
            dateStyle: 'full',
            timeStyle: 'short'
        });
    }

    // Generate Structured Data for cars
    const baseUrl = await getBaseUrl();
    const carStructuredData = generateCarPricesStructuredData(sources, baseUrl, lastUpdateStr);

    return (
        <>
            <Script
                id="car-prices-structured-data"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(carStructuredData) }}
            />
            <CarPriceList sources={serializedSources} lastUpdate={lastUpdateStr} />
        </>
    );
}

// Generate Structured Data for car prices
function generateCarPricesStructuredData(sources: any[], baseUrl: string, lastUpdate: string) {
    const allCars: any[] = [];
    
    sources.forEach(source => {
        source.prices.forEach((price: any) => {
            // Parse price to number (remove commas and "تومان")
            const priceValue = parseFloat(price.price.replace(/[,\u200C\u200D\s]/g, '').replace(/تومان/g, ''));
            
            if (!isNaN(priceValue)) {
                allCars.push({
                    '@type': 'Product',
                    name: `${price.brand} ${price.model} ${price.trim || ''} ${price.year}`.trim(),
                    brand: {
                        '@type': 'Brand',
                        name: price.brand || source.name,
                    },
                    model: price.model,
                    productionDate: price.year,
                    category: 'خودرو',
                    offers: {
                        '@type': 'Offer',
                        price: priceValue,
                        priceCurrency: 'IRR',
                        availability: 'https://schema.org/InStock',
                        priceValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        seller: {
                            '@type': price.type === 'market' ? 'Individual' : 'Organization',
                            name: price.type === 'market' ? 'بازار خودرو' : 'کارخانه',
                        },
                    },
                    ...(price.type === 'factory' && {
                        manufacturer: {
                            '@type': 'Organization',
                            name: source.name,
                        },
                    }),
                });
            }
        });
    });

    // Main CollectionPage
    const collectionPage = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'قیمت لحظه‌ای خودرو',
        description: `قیمت روز و لحظه‌ای تمامی خودروهای داخلی و خارجی. آخرین بروزرسانی: ${lastUpdate}`,
        url: `${baseUrl}/car-prices`,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: allCars.length,
            itemListElement: allCars.slice(0, 50).map((car, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: car,
            })),
        },
    };

    // Breadcrumb
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
        ],
    };

    // Website SearchAction
    const website = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'روزگار',
        url: baseUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/car-prices?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return [collectionPage, breadcrumb, website];
}
