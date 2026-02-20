/**
 * Ecoiran.com Web Scraper
 * 
 * این سایت RSS دارد ولی برای ویدیوها باید صفحه خبر را parse کنیم
 * 
 * Flow:
 * 1. Fetch RSS feed → Parse items
 * 2. For each item: Fetch article page → Extract video from ArvanVOD/JW Player
 * 3. Duplicate check → Filter
 * 4. Create RSSItem with video → processRSSItemUnified()
 */

import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { isDuplicateContent } from '@/lib/automation/telegram/rss-duplicate-checker';
import { processRSSItemUnified } from '@/lib/automation/undefined-rss/unified-rss-processor';
import { getUnifiedSettings } from '@/lib/automation/undefined-rss/unified-rss-processor';
import type { RSSItem } from '@/lib/shared/unified-content-extractor';

const RSS_FEED_URL = 'https://ecoiran.com/fa/feeds/?p=Y2F0ZWdvcmllcz04Mg%2C%2C';
const DEFAULT_CATEGORY_ID = 1; // Default category
const DEFAULT_CATEGORY_NAME = 'اقتصادی';

export interface EcoiranArticle {
    title: string;
    url: string;
    imageUrl?: string;
    videoUrl?: string;
    content: string;
    pubDate?: string;
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
 * Main entry point: Fetch RSS, extract videos from pages, process new items
 */
export async function scrapeAndProcessEcoiran(
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

    console.log(`\n[EcoiranScraper] 🚀 Starting scrape...`);
    console.log(`[EcoiranScraper] 📋 RSS Feed: ${RSS_FEED_URL}`);

    // 1. Fetch and parse RSS feed
    const rssItems = await fetchRSSFeed(maxItems);
    console.log(`[EcoiranScraper] 📰 Found ${rssItems.length} RSS items`);

    const result: ScrapeResult = {
        totalFound: rssItems.length,
        newItems: 0,
        duplicates: 0,
        processed: 0,
        errors: 0,
        details: [],
    };

    if (rssItems.length === 0) {
        console.log(`[EcoiranScraper] ⚠️ No RSS items found`);
        return result;
    }

    // Get unified settings
    const settings = await getUnifiedSettings();
    if (!settings) {
        console.error(`[EcoiranScraper] ❌ Unified RSS settings not configured`);
        return result;
    }

    // 2. Process each RSS item
    for (const item of rssItems) {
        console.log(`\n[EcoiranScraper] ─── Processing: ${item.title?.substring(0, 60)}...`);

        try {
            const articleUrl = item.link || '';
            if (!articleUrl) {
                console.log(`[EcoiranScraper] ⚠️ No URL found, skipping`);
                continue;
            }

            // 2a. Duplicate check
            if (!skipDuplicateCheck) {
                const duplicateStatus = await isDuplicateContent(
                    item.title || '',
                    articleUrl,
                    RSS_FEED_URL
                );

                if (duplicateStatus.telegramDuplicate || duplicateStatus.unifiedLogDuplicate) {
                    console.log(`[EcoiranScraper] ⏭️ Duplicate — skipping`);
                    result.duplicates++;
                    result.details.push({ title: item.title || '', status: 'duplicate' });
                    continue;
                }
            }

            result.newItems++;

            // 2b. Fetch article page to extract video
            const article = await fetchArticlePage(articleUrl, item);
            console.log(`[EcoiranScraper] 📄 Article extracted:`);
            console.log(`  Image: ${article.imageUrl || 'none'}`);
            console.log(`  Video: ${article.videoUrl || 'none'}`);
            console.log(`  Content: ${article.content.length} chars`);

            // 2c. Create RSSItem with video
            const rssItem: RSSItem = {
                title: article.title,
                link: article.url,
                content: article.content,
                contentSnippet: article.content.substring(0, 200),
                pubDate: article.pubDate || new Date().toISOString(),
                isoDate: article.pubDate || new Date().toISOString(),
                imageUrl: article.imageUrl,
                videoUrl: article.videoUrl, // ویدیو استخراج شده
            };

            // 2d. Process through unified pipeline
            const processResult = await processRSSItemUnified(
                rssItem,
                RSS_FEED_URL,
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
                console.log(`[EcoiranScraper] ✅ Successfully processed`);
                result.processed++;
                result.details.push({ title: item.title || '', status: 'processed' });
            } else {
                console.log(`[EcoiranScraper] ❌ Processing failed: ${processResult.error}`);
                result.errors++;
                result.details.push({ title: item.title || '', status: 'error', error: processResult.error });
            }

            // Add delay between items
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
            console.error(`[EcoiranScraper] ❌ Error processing "${item.title}":`, error.message);
            result.errors++;
            result.details.push({ title: item.title || '', status: 'error', error: error.message });
        }
    }

    console.log(`\n[EcoiranScraper] 📊 Results:`);
    console.log(`  Total: ${result.totalFound} | New: ${result.newItems} | Duplicates: ${result.duplicates}`);
    console.log(`  Processed: ${result.processed} | Errors: ${result.errors}`);

    return result;
}

/**
 * Fetch RSS feed
 */
async function fetchRSSFeed(maxItems: number = 10): Promise<Parser.Item[]> {
    const parser = new Parser({
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    try {
        const feed = await parser.parseURL(RSS_FEED_URL);
        return feed.items.slice(0, maxItems);
    } catch (error: any) {
        console.error(`[EcoiranScraper] ❌ Failed to fetch RSS:`, error.message);
        return [];
    }
}

/**
 * Fetch article page and extract video from ArvanVOD/JW Player
 */
export async function fetchArticlePage(url: string, rssItem: Parser.Item = {}): Promise<EcoiranArticle> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
        const title = rssItem.title || document.querySelector('h1')?.textContent?.trim() || '';

        // 2. Extract image (fallback to RSS enclosure or og:image)
        let imageUrl: string | undefined;

        // Try RSS enclosure first
        if (rssItem.enclosure?.url) {
            imageUrl = rssItem.enclosure.url;
        }

        // Fallback: og:image
        if (!imageUrl) {
            imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined;
        }

        // 3. **Extract video from ArvanVOD/JW Player**
        let videoUrl: string | undefined;

        // الگوی 1: منبع ویدیو در script با tavoos_init_player
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
            const scriptContent = script.textContent || '';

            // جستجوی tavoos_init_player که ویدیو ArvanVOD را لود می‌کند
            if (scriptContent.includes('tavoos_init_player')) {
                // استخراج URL های m3u8 (HLS)
                const m3u8Match = scriptContent.match(/(https:\/\/[^"']+\.m3u8)/);
                if (m3u8Match) {
                    videoUrl = m3u8Match[1];
                    console.log(`[EcoiranScraper] 🎥 Found ArvanVOD video: ${videoUrl}`);
                    break;
                }

                // استخراج URL های mp4
                const mp4Match = scriptContent.match(/(https:\/\/[^"']+\.mp4)/);
                if (mp4Match) {
                    videoUrl = mp4Match[1];
                    console.log(`[EcoiranScraper] 🎥 Found MP4 video: ${videoUrl}`);
                    break;
                }
            }
        }

        // الگوی 2: ویدیو در تگ <video>
        if (!videoUrl) {
            const videoEl = document.querySelector('video source[src]');
            if (videoEl) {
                videoUrl = videoEl.getAttribute('src') || undefined;
            }
        }

        // الگوی 3: ویدیو در iframe (بعضی سایت‌ها)
        if (!videoUrl) {
            const iframe = document.querySelector('iframe[src*="video"], iframe[src*="player"]');
            if (iframe) {
                videoUrl = iframe.getAttribute('src') || undefined;
            }
        }

        // 4. Extract content
        let content = rssItem.contentSnippet || rssItem.content || '';

        // Try to get full article content from page
        const contentSelectors = [
            '.entry-content',
            '.post-content',
            '.article-content',
            'article .content',
            '.news-body',
        ];

        for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                const text = el.textContent?.trim() || '';
                if (text.length > content.length) {
                    content = text;
                }
            }
        }

        // Fallback: og:description
        if (content.length < 50) {
            const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
            if (ogDesc && ogDesc.length > content.length) {
                content = ogDesc;
            }
        }

        // For video-only with minimal text, use title
        if (videoUrl && content.length < 30) {
            content = title;
        }

        return {
            title,
            url,
            imageUrl,
            videoUrl,
            content,
            pubDate: rssItem.pubDate || rssItem.isoDate,
        };

    } finally {
        clearTimeout(timeoutId);
    }
}
