import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface RSSItem {
    title: string;
    link: string;
    pubDate: string;
    content?: string;
    contentSnippet?: string;
    guid?: string;
    categories?: string[];
    isoDate?: string;
    imageUrl?: string;
    videoUrl?: string; // Stored as absolute URL guarantees
    description?: string;
    category?: string;
    enclosure?: { url?: string; type?: string; length?: string };
}

export interface ExtractedContent {
    title: string;
    rawContent: string;
    cleanContent: string;
    sourceUrl: string;
    rssSourceUrl: string;
    imageUrl?: string;
    videoUrl?: string;
    publishDate?: Date;
    wordCount: number;
}

/**
 * Modular Unified Extraction
 * 1. Extract Text (Readability)
 * 2. Extract Image (OG Meta)
 * 3. Extract Video (OG Video / HTML Video)
 */
export async function extractContentOnce(
    rssItem: RSSItem,
    categoryId: number,
    categoryName: string,
    rssSourceUrl: string
): Promise<ExtractedContent> {
    console.log(`\n[UnifiedExtractor] 🚀 Starting Modular Extraction for: ${rssItem.link}`);

    // Initial values from RSS item (fallback)
    let finalTitle = rssItem.title;
    let finalContent = rssItem.content || rssItem.description || '';
    let finalImage = rssItem.imageUrl;
    let finalVideo = rssItem.videoUrl;

    // A.0 Try RSS enclosure first (highest priority — direct from feed)
    if (!finalImage && rssItem.enclosure?.url) {
        const encUrl = rssItem.enclosure.url;
        const encType = rssItem.enclosure.type || '';
        if (encUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?|$)/i) || encType.startsWith('image/')) {
            finalImage = encUrl;
            console.log(`[UnifiedExtractor] 🖼️ Image from RSS enclosure: ${finalImage}`);
        }
    }

    // A. Text Extraction
    // If RSS content is short, always attempt full scrape
    // Or if we want high quality, just always scrape for metadata too
    try {
        const keyData = await scrapeUrl(rssItem.link);

        if (keyData) {
            // Text: Prefer scraped content if longer/better
            if (keyData.textContent && keyData.textContent.length > (finalContent.length || 0)) {
                finalContent = keyData.content || keyData.textContent;
                console.log(`[UnifiedExtractor] 📄 Text Extracted (${keyData.textContent.length} chars)`);
            }

            // Image: Prefer scraped OG Image (usually higher res)
            if (keyData.imageUrl) {
                finalImage = keyData.imageUrl;
                console.log(`[UnifiedExtractor] 🖼️  Extracted Image: ${finalImage}`);
            }

            // Video: Prefer scraped Video
            if (keyData.videoUrl) {
                finalVideo = keyData.videoUrl;
                console.log(`[UnifiedExtractor] 🎥 Extracted Video: ${finalVideo}`);
            }
        }
    } catch (e: any) {
        console.warn(`[UnifiedExtractor] ⚠️ Scrape warning: ${e.message}`);
    }

    // Clean up text
    const cleanContent = finalContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = cleanContent.split(/\s+/).length;

    return {
        title: finalTitle,
        rawContent: finalContent, // HTML structure preferred
        cleanContent: cleanContent,
        sourceUrl: rssItem.link,
        rssSourceUrl: rssSourceUrl,
        imageUrl: finalImage,
        videoUrl: finalVideo,
        publishDate: new Date(rssItem.pubDate),
        wordCount: wordCount
    };
}

export async function scrapeUrl(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const doc = new JSDOM(html, { url });
        // ... code ...

        // --- Modular Extractors ---

        // 1. Image Extractor (multiple fallback strategies)
        let extractedImage: string | undefined;

        // Strategy 1: OG Image meta tag
        const ogImage = doc.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) {
            extractedImage = ogImage;
            console.log(`[UnifiedExtractor] 🖼️ Image source: og:image`);
        }

        // Strategy 2: Twitter card image
        if (!extractedImage) {
            const twitterImage = doc.window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
            if (twitterImage) {
                extractedImage = twitterImage;
                console.log(`[UnifiedExtractor] 🖼️ Image source: twitter:image`);
            }
        }

        // Strategy 3: Eghtesadonline lead image
        if (!extractedImage) {
            const leadImage = doc.window.document.querySelector('img.lead_image')?.getAttribute('src');
            if (leadImage) {
                extractedImage = leadImage;
                console.log(`[UnifiedExtractor] 🖼️ Image source: eghtesadonline lead_image`);
            }
        }

        // Strategy 4: Article figure/img (common in Persian news sites like mehrnews)
        if (!extractedImage) {
            const figureImg = doc.window.document.querySelector('figure.item-img img')?.getAttribute('src') ||
                doc.window.document.querySelector('.item-summary img')?.getAttribute('src') ||
                doc.window.document.querySelector('article img')?.getAttribute('src') ||
                doc.window.document.querySelector('.news-body img')?.getAttribute('src') ||
                doc.window.document.querySelector('.body img')?.getAttribute('src');
            if (figureImg) {
                extractedImage = figureImg;
                console.log(`[UnifiedExtractor] 🖼️ Image source: article figure/img`);
            }
        }

        // Strategy 4: First large image in content
        if (!extractedImage) {
            const allImages = doc.window.document.querySelectorAll('img');
            for (const img of allImages) {
                const src = img.getAttribute('src');
                const width = parseInt(img.getAttribute('width') || '0');
                // Skip tiny images (icons, logos)
                if (src && (width >= 300 || !img.getAttribute('width'))) {
                    // Skip common non-content images
                    if (!src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
                        extractedImage = src;
                        console.log(`[UnifiedExtractor] 🖼️ Image source: first large img`);
                        break;
                    }
                }
            }
        }

        // Ensure absolute URL
        if (extractedImage && !extractedImage.startsWith('http')) {
            try { extractedImage = new URL(extractedImage, url).href; } catch (e) { extractedImage = undefined; }
        }

        // 2. Video Extractor (Strict)
        // Check standard OG Video tags
        let videoUrl = doc.window.document.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
            doc.window.document.querySelector('meta[property="og:video:url"]')?.getAttribute('content') ||
            doc.window.document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content');

        // Check HTML5 Video tags if no meta
        if (!videoUrl) {
            videoUrl = doc.window.document.querySelector('video')?.getAttribute('src') ||
                doc.window.document.querySelector('video source')?.getAttribute('src');
        }

        // Strategy 3: ArvanVOD / tavoos_init_player (used by ecoiran.com)
        if (!videoUrl) {
            const scripts = Array.from(doc.window.document.querySelectorAll('script'));
            for (const script of scripts) {
                const scriptContent = script.textContent || '';

                // ArvanVOD player: tavoos_init_player
                if (scriptContent.includes('tavoos_init_player')) {
                    const m3u8Match = scriptContent.match(/(https:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
                    if (m3u8Match) {
                        videoUrl = m3u8Match[1];
                        console.log(`[UnifiedExtractor] 🎥 Video source: ArvanVOD (m3u8)`);
                        break;
                    }
                    const mp4Match = scriptContent.match(/(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
                    if (mp4Match) {
                        videoUrl = mp4Match[1];
                        console.log(`[UnifiedExtractor] 🎥 Video source: ArvanVOD (mp4)`);
                        break;
                    }
                }

                // General: any arvanvod.ir URL in scripts
                if (!videoUrl && scriptContent.includes('arvanvod.ir')) {
                    const arvanMatch = scriptContent.match(/(https:\/\/[^"'\s]*arvanvod\.ir[^"'\s]*\.(?:m3u8|mp4)[^"'\s]*)/);
                    if (arvanMatch) {
                        videoUrl = arvanMatch[1];
                        console.log(`[UnifiedExtractor] 🎥 Video source: ArvanVOD URL in script`);
                        break;
                    }
                }
            }
        }

        // Strategy 4: MP4/video links in page (direct link from eghtesadonline etc.)
        if (!videoUrl) {
            // Check for direct video file links in the HTML source
            const htmlStr = doc.window.document.documentElement.outerHTML;
            const directVideoMatch = htmlStr.match(/(https?:\/\/[^"'\s]+\.mp4)(?:\?[^"'\s]*)?/i);
            if (directVideoMatch) {
                videoUrl = directVideoMatch[1];
                console.log(`[UnifiedExtractor] 🎥 Video source: direct MP4 link in page`);
            }
        }

        // Strategy 5: iframe with video/player URL
        if (!videoUrl) {
            const iframe = doc.window.document.querySelector('iframe[src*="video"], iframe[src*="player"], iframe[src*="aparat"]');
            if (iframe) {
                videoUrl = iframe.getAttribute('src') || undefined;
                if (videoUrl) console.log(`[UnifiedExtractor] 🎥 Video source: iframe`);
            }
        }

        // Validate Video URL (Ensure absolute)
        if (videoUrl && !videoUrl.startsWith('http')) {
            try { videoUrl = new URL(videoUrl, url).href; } catch (e) { videoUrl = undefined; }
        }


        // Parse content with Readability (happens AFTER custom extraction to preserve scripts)
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        return {
            content: article?.content, // HTML with main content
            textContent: article?.textContent, // Plain text
            length: article?.length,
            imageUrl: extractedImage,
            videoUrl: videoUrl
        };
    } finally {
        clearTimeout(timeoutId);
    }
}
