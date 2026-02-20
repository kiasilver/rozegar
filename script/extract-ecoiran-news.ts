/**
 * Test script for Ecoiran scraper
 * Run with: npx tsx --require ./script/preload-env.js script/extract-ecoiran-news.ts
 */

import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { getUnifiedSettings } from '../src/lib/automation/undefined-rss/unified-rss-processor';

const RSS_FEED_URL = 'https://ecoiran.com/fa/feeds/?p=Y2F0ZWdvcmllcz04Mg%2C%2C';

async function main() {
    console.log('🚀 Starting Ecoiran Scraper Test\n');
    console.log('='.repeat(60));

    // 1. Test RSS feed
    console.log('\n📋 Step 1: Fetching RSS feed...');
    const parser = new Parser({
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    let feed;
    try {
        feed = await parser.parseURL(RSS_FEED_URL);
        console.log(`  Feed title: ${feed.title || 'N/A'}`);
        console.log(`  Items found: ${feed.items.length}`);
    } catch (e: any) {
        console.error('❌ RSS fetch failed:', e.message);
        process.exit(1);
    }

    const items = feed.items.slice(0, 3);
    items.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title?.substring(0, 70)}`);
        console.log(`     Link: ${item.link}`);
    });

    // 2. Check database
    console.log('\n🔌 Step 2: Checking database...');
    const settings = await getUnifiedSettings();
    if (!settings) {
        console.error('❌ No UnifiedRSSSettings found in database!');
        process.exit(1);
    }
    console.log('  ✅ Settings found');

    // 3. Fetch article page and extract video
    if (items.length > 0) {
        const testUrl = items[0].link || '';
        console.log(`\n🎥 Step 3: Fetching first article for video extraction...`);
        console.log(`  URL: ${testUrl}`);

        try {
            const response = await fetch(testUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
                },
            });

            const html = await response.text();
            const dom = new JSDOM(html, { url: testUrl });
            const document = dom.window.document;

            const title = items[0].title || document.querySelector('h1')?.textContent?.trim() || '';
            console.log(`  Title: ${title}`);

            const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            console.log(`  Image: ${imageUrl || 'none'}`);

            // Video extraction
            let videoUrl: string | undefined;
            const scripts = Array.from(document.querySelectorAll('script'));

            for (const script of scripts) {
                const scriptContent = script.textContent || '';
                if (scriptContent.includes('tavoos_init_player')) {
                    console.log('  🎬 Found tavoos_init_player script!');

                    const m3u8Match = scriptContent.match(/(https:\/\/[^"']+\.m3u8)/);
                    if (m3u8Match) {
                        videoUrl = m3u8Match[1];
                        console.log(`  🎥 HLS Video: ${videoUrl}`);
                    }

                    const thumbMatch = scriptContent.match(/(https:\/\/[^"']+thumbnail\.[^"']+)/);
                    if (thumbMatch) {
                        console.log(`  🖼️  Video Thumbnail: ${thumbMatch[1]}`);
                    }
                    break;
                }
            }

            if (!videoUrl) {
                const videoEl = document.querySelector('video source[src]');
                if (videoEl) {
                    videoUrl = videoEl.getAttribute('src') || undefined;
                    console.log(`  🎥 Video tag: ${videoUrl}`);
                }
            }

            if (!videoUrl) {
                console.log('  ℹ️  No video found in this article (not all articles have video)');
            }

            // Content
            const contentSelectors = ['.entry-content', '.post-content', '.article-content', 'article .content', '.news-body'];
            let content = '';
            for (const selector of contentSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    content = el.textContent?.trim() || '';
                    if (content.length > 50) {
                        console.log(`  📄 Content found via "${selector}": ${content.length} chars`);
                        break;
                    }
                }
            }

            if (content.length < 50) {
                content = items[0].contentSnippet || items[0].content || '';
                console.log(`  📄 Using RSS content: ${content.length} chars`);
            }

        } catch (e: any) {
            console.error('  ❌ Article fetch failed:', e.message);
        }
    }

    // 4. Test specific known video article
    console.log('\n🎬 Step 4: Testing known video article (فرار آرام چین از بدهی آمریکا)...');
    const videoTestUrl = 'https://ecoiran.com/%D8%A8%D8%AE%D8%B4-%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF-%D8%A8%DB%8C%D9%86-%D8%A7%D9%84%D9%85%D9%84-82/122640-%D9%81%D8%B1%D8%A7%D8%B1-%D8%A2%D8%B1%D8%A7%D9%85-%DA%86%DB%8C%D9%86-%D8%A7%D8%B2-%D8%A8%D8%AF%D9%87%DB%8C-%D8%A2%D9%85%D8%B1%DB%8C%DA%A9%D8%A7';

    try {
        const response = await fetch(videoTestUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
        });

        const html = await response.text();
        const dom = new JSDOM(html, { url: videoTestUrl });
        const document = dom.window.document;

        const title = document.querySelector('h1')?.textContent?.trim() || '';
        console.log(`  Title: ${title}`);

        const scripts = Array.from(document.querySelectorAll('script'));
        let videoFound = false;

        for (const script of scripts) {
            const sc = script.textContent || '';
            if (sc.includes('tavoos_init_player')) {
                console.log('  ✅ tavoos_init_player FOUND!');

                const m3u8Match = sc.match(/(https:\/\/[^"']+\.m3u8)/);
                if (m3u8Match) {
                    console.log(`  🎥 Video URL: ${m3u8Match[1]}`);
                    videoFound = true;
                }

                const thumbMatch = sc.match(/(https:\/\/[^"']+thumbnail\.[^"']+)/);
                if (thumbMatch) {
                    console.log(`  🖼️  Thumbnail: ${thumbMatch[1]}`);
                }
                break;
            }
        }

        if (!videoFound) {
            console.log('  ⚠️ tavoos_init_player not found, searching for other video patterns...');
            for (const s of scripts) {
                if (s.textContent && (s.textContent.includes('player') || s.textContent.includes('video') || s.textContent.includes('tavoos'))) {
                    console.log(`  Found script with player/video keyword (length: ${s.textContent.length})`);
                }
            }
        }

    } catch (e: any) {
        console.error('  ❌ Video test failed:', e.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Ecoiran scraper test completed!');
    process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
