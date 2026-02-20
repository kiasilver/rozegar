import { PrismaClient, BlogStatus, Lang } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// For Debugging: Manually check if connection works
const connectionString = "postgresql://postgres:3791@localhost:5433/ultimatecms";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const categoriesData = [
    { name: 'اخبار روز اقتصادی', slug: 'akhbar-rooz-eghtesadi', icon: 'trending-up' },
    { name: 'مسکن و شهرسازی', slug: 'maskan-shahrsazi', icon: 'home' },
    { name: 'راه‌های کشور', slug: 'rahha-keshvar', icon: 'map' },
    { name: 'بنادر و دریانوردی', slug: 'banadr-daryanavardi', icon: 'anchor' },
    { name: 'قیمت روز', slug: 'gheymat-rooz', icon: 'dollar-sign' },
    { name: 'ارزدیجیتال', slug: 'arzdigital', icon: 'cpu' },
    { name: 'طلا و ارز', slug: 'tala-arz', icon: 'circle' },
    { name: 'بورس', slug: 'bours', icon: 'bar-chart-2' },
];

const sampleImages = [
    '/images/carousel/carousel-01.png',
    '/images/carousel/carousel-02.png',
    '/images/carousel/carousel-03.png',
    '/images/carousel/carousel-04.png',
    '/images/grid-image/image-01.png',
    '/images/grid-image/image-02.png',
    '/images/grid-image/image-03.png',
    '/images/grid-image/image-04.png',
    '/images/grid-image/image-05.png',
    '/images/grid-image/image-06.png',
];

async function main() {
    console.log('🌱 Starting seeding...');

    // 1. Create a dummy user if not exists
    let user = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                name: 'مدیر کل',
                email: 'admin@example.com',
                is_active: true,
                password: 'password123', // In a real app, hash this!
            },
        });
        console.log(`👤 Created user: ${user.name}`);
    }

    // 2. Create Categories
    for (const cat of categoriesData) {
        const existingCat = await prisma.blogCategoryTranslation.findFirst({
            where: { slug: cat.slug, lang: Lang.FA }
        });

        let categoryId;

        if (existingCat) {
            categoryId = existingCat.blogCategory_id;
            console.log(`📂 Category already exists: ${cat.name}`);
        } else {
            const newCat = await prisma.blogCategory.create({
                data: {
                    is_active: true,
                    icon: cat.icon,
                    translations: {
                        create: {
                            lang: Lang.FA,
                            name: cat.name,
                            slug: cat.slug,
                            description: `توضیحات مربوط به دسته بندی ${cat.name}`,
                        }
                    }
                }
            });
            categoryId = newCat.id;
            console.log(`📂 Created category: ${cat.name}`);
        }

        // 3. Create 10 Seed News for this Category
        const newsCount = await prisma.blog.count({
            where: {
                blogcategory: {
                    some: {
                        id: categoryId
                    }
                }
            }
        });

        if (newsCount < 10) {
            console.log(`📝 Creating ${10 - newsCount} news for ${cat.name}...`);

            for (let i = 1; i <= (10 - newsCount); i++) {
                const randomImage = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                const title = `خبر شماره ${i} در دسته ${cat.name} - تیتر جذاب و خواندنی`;
                const slug = `${cat.slug}-news-${Date.now()}-${i}`;

                await prisma.blog.create({
                    data: {
                        author_id: user.id,
                        slug: slug,
                        image: randomImage,
                        status: BlogStatus.PUBLISHED,
                        published_at: new Date(),
                        is_active: true,
                        view_count: Math.floor(Math.random() * 1000),
                        is_breaking: Math.random() > 0.8,
                        is_featured: Math.random() > 0.7,
                        reading_time: Math.floor(Math.random() * 10) + 1,
                        blogcategory: {
                            connect: { id: categoryId }
                        },
                        translations: {
                            create: {
                                lang: Lang.FA,
                                title: title,
                                slug: slug,
                                excerpt: `این خلاصه خبر شماره ${i} برای دسته بندی ${cat.name} است که شامل توضیحات کوتاه و جذاب می‌باشد.`,
                                content: `
                                <p>این متن کامل خبر شماره ${i} است.</p>
                                <h2>تیتر داخلی خبر</h2>
                                <p>لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ و با استفاده از طراحان گرافیک است.</p>
                                <ul>
                                    <li>نکته اول مهم</li>
                                    <li>نکته دوم قابل توجه</li>
                                    <li>نکته سوم تکمیلی</li>
                                </ul>
                                <p>چاپگرها و متون بلکه روزنامه و مجله در ستون و سطرآنچنان که لازم است و برای شرایط فعلی تکنولوژی مورد نیاز و کاربردهای متنوع با هدف بهبود ابزارهای کاربردی می‌باشد.</p>
                            `
                            }
                        }
                    }
                });
            }
        }
    }

    console.log('✅ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
