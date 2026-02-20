/**
 * RSS Feed URLs برای خبرگزاری‌های ایرانی
 * این لیست را می‌توان بعد از migration به دیتابیس اضافه کرد
 */

export const IRANIAN_NEWS_RSS_FEEDS = {
    // تسنیم
    tasnim: {
        main: 'https://www.tasnimnews.com/fa/rss/feed/0/8/0/%D8%A2%D8%AE%D8%B1%DB%8C%D9%86-%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%AA%D8%B3%D9%86%DB%8C%D9%85',
        politics: 'https://www.tasnimnews.com/fa/rss/feed/1004',
        economy: 'https://www.tasnimnews.com/fa/rss/feed/1003',
        world: 'https://www.tasnimnews.com/fa/rss/feed/1002',
        sports: 'https://www.tasnimnews.com/fa/rss/feed/1006',
    },

    // ایسنا
    isna: {
        main: 'https://www.isna.ir/rss',
        politics: 'https://www.isna.ir/rss/2',
        economy: 'https://www.isna.ir/rss/4',
        world: 'https://www.isna.ir/rss/9',
        sports: 'https://www.isna.ir/rss/3',
    },

    // فارس
    fars: {
        main: 'https://www.farsnews.ir/rss',
        politics: 'https://www.farsnews.ir/rss/13',
        economy: 'https://www.farsnews.ir/rss/14',
        world: 'https://www.farsnews.ir/rss/12',
        sports: 'https://www.farsnews.ir/rss/17',
    },

    // مهر
    mehr: {
        main: 'https://www.mehrnews.com/rss',
        politics: 'https://www.mehrnews.com/rss/tp/1',
        economy: 'https://www.mehrnews.com/rss/tp/4',
        world: 'https://www.mehrnews.com/rss/tp/2',
        sports: 'https://www.mehrnews.com/rss/tp/3',
    },

    // ایرنا
    irna: {
        main: 'https://www.irna.ir/rss',
        politics: 'https://www.irna.ir/rss/1',
        economy: 'https://www.irna.ir/rss/4',
        world: 'https://www.irna.ir/rss/2',
        sports: 'https://www.irna.ir/rss/3',
    },
};

/**
 * لیست کامل RSS Feed URLs برای افزودن به دیتابیس
 */
export const ALL_RSS_FEEDS = [
    // تسنیم
    { url: IRANIAN_NEWS_RSS_FEEDS.tasnim.main, source: 'تسنیم', category: 'عمومی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.tasnim.politics, source: 'تسنیم', category: 'سیاسی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.tasnim.economy, source: 'تسنیم', category: 'اقتصادی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.tasnim.world, source: 'تسنیم', category: 'بین‌الملل' },
    { url: IRANIAN_NEWS_RSS_FEEDS.tasnim.sports, source: 'تسنیم', category: 'ورزشی' },

    // ایسنا
    { url: IRANIAN_NEWS_RSS_FEEDS.isna.main, source: 'ایسنا', category: 'عمومی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.isna.politics, source: 'ایسنا', category: 'سیاسی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.isna.economy, source: 'ایسنا', category: 'اقتصادی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.isna.world, source: 'ایسنا', category: 'بین‌الملل' },
    { url: IRANIAN_NEWS_RSS_FEEDS.isna.sports, source: 'ایسنا', category: 'ورزشی' },

    // فارس
    { url: IRANIAN_NEWS_RSS_FEEDS.fars.main, source: 'فارس', category: 'عمومی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.fars.politics, source: 'فارس', category: 'سیاسی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.fars.economy, source: 'فارس', category: 'اقتصادی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.fars.world, source: 'فارس', category: 'بین‌الملل' },
    { url: IRANIAN_NEWS_RSS_FEEDS.fars.sports, source: 'فارس', category: 'ورزشی' },

    // مهر
    { url: IRANIAN_NEWS_RSS_FEEDS.mehr.main, source: 'مهر', category: 'عمومی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.mehr.politics, source: 'مهر', category: 'سیاسی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.mehr.economy, source: 'مهر', category: 'اقتصادی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.mehr.world, source: 'مهر', category: 'بین‌الملل' },
    { url: IRANIAN_NEWS_RSS_FEEDS.mehr.sports, source: 'مهر', category: 'ورزشی' },

    // ایرنا
    { url: IRANIAN_NEWS_RSS_FEEDS.irna.main, source: 'ایرنا', category: 'عمومی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.irna.politics, source: 'ایرنا', category: 'سیاسی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.irna.economy, source: 'ایرنا', category: 'اقتصادی' },
    { url: IRANIAN_NEWS_RSS_FEEDS.irna.world, source: 'ایرنا', category: 'بین‌الملل' },
    { url: IRANIAN_NEWS_RSS_FEEDS.irna.sports, source: 'ایرنا', category: 'ورزشی' },
];
