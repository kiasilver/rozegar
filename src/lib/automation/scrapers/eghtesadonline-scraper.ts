/**
 * Eghtesadonline.com Web Scraper
 * 
 * اقتصاد آنلاین RSS ندارد — این ماژول صفحه لیست خبرها را parse می‌کند
 * و خبرهای جدید غیرتکراری را از طریق pipeline موجود پردازش و ارسال می‌کند.
 * 
 * Flow:
 * 1. Fetch listing page → Parse news items
 * 2. Duplicate check → Filter
 * 3. Fetch article page → Extract image/video/content
 * 4. Create mock RSSItem → processRSSItemUnified()
 */

import { JSDOM } from 'jsdom';
import { isDuplicateContent } from '@/lib/automation/telegram/rss-duplicate-checker';
import { processRSSItemUnified } from '@/lib/automation/undefined-rss/unified-rss-processor';
import { getUnifiedSettings } from '@/lib/automation/undefined-rss/unified-rss-processor';
import type { RSSItem } from '@/lib/shared/unified-content-extractor';

const BASE_URL = 'https://www.eghtesadonline.com';
const LISTING_URL = `${BASE_URL}/fa/services/7`;
const RSS_SOURCE_URL = LISTING_URL; // Used as rssSourceUrl for duplicate checking
const DEFAULT_CATEGORY_ID = 1; // Default category — can be overridden
const DEFAULT_CATEGORY_NAME = 'اقتصادی'; // Default category name

export interface EghtesadonlineNewsItem {
    title: string;
    url: string;
    summary: string;
    thumbnailUrl?: string;
    date: string;
}

export interface EghtesadonlineArticle {
    title: string;
    url: string;
    imageUrl?: string;
    videoUrl?: string;
    content: string;
    hasVideo: boolean;
}

export interface ScrapeResult {
    totalFound: number;
    newItems: number;
    duplicates: number;
    processed: number;
    errors: number;
    details: {
        title: string;
        status: 'duplicate' | 'processed' | 'error';
        error?: string;
    }[];
}

/**
 * Main entry point: Scrape listing page, check duplicates, process new items
 */
export async function scrapeAndProcessEghtesadonline(
    categoryId: number = DEFAULT_CATEGORY_ID,
    categoryName: string = DEFAULT_CATEGORY_NAME,
    options?: {
        telegram?: boolean;
        website?: boolean;
        maxItems?: number;
        skipDuplicateCheck?: boolean;
    }
): Promise<ScrapeResult> {
    const { telegram = true, website = true, maxItems = 10, skipDuplicateCheck = false } = options || {};

    console.log(`\n[EghtesadonlineScraper] 🚀 Starting scrape...`);
    console.log(`[EghtesadonlineScraper] 📋 Listing URL: ${LISTING_URL}`);

    // 1. Fetch and parse listing page
    const newsItems = await fetchListingPage(maxItems);
    console.log(`[EghtesadonlineScraper] 📰 Found ${newsItems.length} news items`);

    const result: ScrapeResult = {
        totalFound: newsItems.length,
        newItems: 0,
        duplicates: 0,
        processed: 0,
        errors: 0,
        details: [],
    };

    if (newsItems.length === 0) {
        console.log(`[EghtesadonlineScraper] ⚠️ No news items found on listing page`);
        return result;
    }

    // Get unified settings
    const settings = await getUnifiedSettings();
    if (!settings) {
        console.error(`[EghtesadonlineScraper] ❌ Unified RSS settings not configured`);
        return result;
    }

    // 2. Process each item
    for (const item of newsItems) {
        console.log(`\n[EghtesadonlineScraper] ─── Processing: ${item.title.substring(0, 60)}...`);

        try {
            // 2a. Duplicate check
            if (!skipDuplicateCheck) {
                const duplicateStatus = await isDuplicateContent(
                    item.title,
                    item.url,
                    RSS_SOURCE_URL
                );

                if (duplicateStatus.telegramDuplicate || duplicateStatus.unifiedLogDuplicate) {
                    console.log(`[EghtesadonlineScraper] ⏭️ Duplicate — skipping`);
                    result.duplicates++;
                    result.details.push({ title: item.title, status: 'duplicate' });
                    continue;
                }
            }

            result.newItems++;

            // 2b. Fetch article page for full content
            const article = await fetchArticlePage(item.url);
            console.log(`[EghtesadonlineScraper] 📄 Article extracted:`);
            console.log(`  Image: ${article.imageUrl || 'none'}`);
            console.log(`  Video: ${article.videoUrl || 'none'}`);
            console.log(`  Content: ${article.content.length} chars`);

            // 2c. Create mock RSSItem
            const rssItem: RSSItem = {
                title: article.title,
                link: article.url,
                content: article.content,
                contentSnippet: article.content.substring(0, 200),
                pubDate: new Date().toISOString(),
                isoDate: new Date().toISOString(),
                imageUrl: article.imageUrl,
                videoUrl: article.videoUrl,
            };

            // 2d. Process through unified pipeline
            const processResult = await processRSSItemUnified(
                rssItem,
                RSS_SOURCE_URL,
                categoryId,
                categoryName,
                {
                    telegram,
                    website,
                    skipDuplicateCheck: true, // Already checked above
                },
                settings
            );

            if (processResult.success) {
                console.log(`[EghtesadonlineScraper] ✅ Successfully processed`);
                result.processed++;
                result.details.push({ title: item.title, status: 'processed' });
            } else {
                console.log(`[EghtesadonlineScraper] ❌ Processing failed: ${processResult.error}`);
                result.errors++;
                result.details.push({ title: item.title, status: 'error', error: processResult.error });
            }

            // Add delay between items to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
            console.error(`[EghtesadonlineScraper] ❌ Error processing "${item.title}":`, error.message);
            result.errors++;
            result.details.push({ title: item.title, status: 'error', error: error.message });
        }
    }

    console.log(`\n[EghtesadonlineScraper] 📊 Results:`);
    console.log(`  Total: ${result.totalFound} | New: ${result.newItems} | Duplicates: ${result.duplicates}`);
    console.log(`  Processed: ${result.processed} | Errors: ${result.errors}`);

    return result;
}

/**
 * Fetch the listing page and parse news items
 */
export async function fetchListingPage(maxItems: number = 10): Promise<EghtesadonlineNewsItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(LISTING_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching listing page`);
        }

        const html = await response.text();
        const dom = new JSDOM(html, { url: LISTING_URL });
        const document = dom.window.document;

        const items: EghtesadonlineNewsItem[] = [];
        const articles = document.querySelectorAll('.ListNewsSection article.newsList');

        for (let i = 0; i < Math.min(articles.length, maxItems); i++) {
            const article = articles[i];

            // Extract title and URL
            const titleLink = article.querySelector('h3.title a');
            if (!titleLink) continue;

            const title = titleLink.textContent?.trim() || '';
            let href = titleLink.getAttribute('href') || '';

            // Make URL absolute
            if (href && !href.startsWith('http')) {
                href = `${BASE_URL}${href}`;
            }

            // Extract summary
            const summary = article.querySelector('p.summery')?.textContent?.trim() || '';

            // Extract thumbnail
            const img = article.querySelector('.picLink img');
            let thumbnailUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
            if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
                thumbnailUrl = `${BASE_URL}${thumbnailUrl}`;
            }

            // Extract date
            const date = article.querySelector('span.date')?.textContent?.trim() || '';

            if (title && href) {
                items.push({ title, url: href, summary, thumbnailUrl, date });
            }
        }

        return items;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch an article page and extract content, image, and video
 */
export async function fetchArticlePage(url: string): Promise<EghtesadonlineArticle> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching article: ${url}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html, { url });
        const document = dom.window.document;

        // 1. Extract title
        const titleEl = document.querySelector('h1.titleNews');
        const title = titleEl?.textContent?.trim() || '';

        // 2. Extract lead image
        let imageUrl: string | undefined;
        const leadImg = document.querySelector('img.lead_image');
        if (leadImg) {
            imageUrl = leadImg.getAttribute('src') || undefined;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `${BASE_URL}${imageUrl}`;
            }
        }

        // Fallback: OG image
        if (!imageUrl) {
            const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            if (ogImage) {
                imageUrl = ogImage;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = `${BASE_URL}${imageUrl}`;
                }
            }
        }

        // 3. Extract video
        // 3. Extract video (Robust Detection)
        let videoUrl: string | undefined;

        // Strategy A: ArvanVOD / tavoos_init_player (used by many Iranian sites)
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
            const scriptContent = script.textContent || '';

            // ArvanVOD player: tavoos_init_player
            if (scriptContent.includes('tavoos_init_player')) {
                const m3u8Match = scriptContent.match(/(https:\/\/[^\"\'\s]+\.m3u8[^\"\'\s]*)/);
                if (m3u8Match) {
                    videoUrl = m3u8Match[1];
                    console.log(`[EghtesadonlineScraper] 🎥 Video source: ArvanVOD (m3u8)`);
                    break;
                }
                const mp4Match = scriptContent.match(/(https:\/\/[^\"\'\s]+\.mp4[^\"\'\s]*)/);
                if (mp4Match) {
                    videoUrl = mp4Match[1];
                    console.log(`[EghtesadonlineScraper] 🎥 Video source: ArvanVOD (mp4)`);
                    break;
                }
            }

            // General: any arvanvod.ir URL in scripts
            if (!videoUrl && scriptContent.includes('arvanvod.ir')) {
                const arvanMatch = scriptContent.match(/(https:\/\/[^\"\'\s]*arvanvod\.ir[^\"\'\s]*\.(?:m3u8|mp4)[^\"\'\s]*)/);
                if (arvanMatch) {
                    videoUrl = arvanMatch[1];
                    console.log(`[EghtesadonlineScraper] 🎥 Video source: ArvanVOD URL in script`);
                    break;
                }
            }
        }

        // Strategy B: Direct MP4/video links in page (regex scan of HTML)
        if (!videoUrl) {
            const htmlStr = document.documentElement.outerHTML;
            // Look for .mp4 links that are NOT in a script tag (simple approximation)
            // or just find the first mp4 link that looks like a file
            const directVideoMatch = htmlStr.match(/(https?:\/\/[^\"\'\s]+\.mp4)(?:\?[^\"\'\s]*)?/i);
            if (directVideoMatch) {
                videoUrl = directVideoMatch[1];
                console.log(`[EghtesadonlineScraper] 🎥 Video source: direct MP4 link in page`);
            }
        }

        // Strategy C: Standard <video> tag
        if (!videoUrl) {
            const videoSource = document.querySelector('.videoTop video source[src], video source[src], video[src]');
            if (videoSource) {
                videoUrl = videoSource.getAttribute('src') || undefined;
                if (videoUrl && !videoUrl.startsWith('http')) {
                    videoUrl = `${BASE_URL}${videoUrl}`;
                }
                if (videoUrl) console.log(`[EghtesadonlineScraper] 🎥 Video source: <video> tag`);
            }
        }

        // Strategy D: iframe with video/player URL
        if (!videoUrl) {
            const iframe = document.querySelector('iframe[src*="video"], iframe[src*="player"], iframe[src*="aparat"], iframe[src*="arvanvod"]');
            if (iframe) {
                videoUrl = iframe.getAttribute('src') || undefined;
                if (videoUrl) console.log(`[EghtesadonlineScraper] 🎥 Video source: iframe`);
            }
        }

        // Fallback: any video source
        if (!videoUrl) {
            const anyVideo = document.querySelector('video source[src]');
            if (anyVideo) {
                videoUrl = anyVideo.getAttribute('src') || undefined;
                if (videoUrl && !videoUrl.startsWith('http')) {
                    videoUrl = `${BASE_URL}${videoUrl}`;
                }
            }
        }

        // 4. Extract content
        // For video-only articles, content may be minimal
        let content = '';

        // Try to get the article body text
        // Eghtesadonline uses various content containers
        const contentSelectors = [
            '.body-news',
            '.echo_detail .body',
            '.item-body',
            '.news-body',
            'article .body',
        ];

        for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                content = el.textContent?.trim() || '';
                if (content.length > 50) break;
            }
        }

        // Fallback: Use Readability-like extraction (strip scripts/styles, get text)
        if (content.length < 50) {
            // Try OG description as summary
            const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
            if (ogDesc && ogDesc.length > content.length) {
                content = ogDesc;
            }
        }

        // For video-only items with no text content, generate a note
        const hasVideo = !!videoUrl;
        if (hasVideo && content.length < 30) {
            content = title; // Use title as content for video-only articles
        }

        return {
            title,
            url,
            imageUrl,
            videoUrl,
            content,
            hasVideo,
        };
    } finally {
        clearTimeout(timeoutId);
    }
}
