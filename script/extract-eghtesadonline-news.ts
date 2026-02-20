/**
 * Test script for Eghtesadonline scraper
 * Run with: npx tsx --require ./script/preload-env.js script/extract-eghtesadonline-news.ts
 */

import { fetchListingPage, fetchArticlePage } from '../src/lib/automation/scrapers/eghtesadonline-scraper';
import { processRSSItemUnified, getUnifiedSettings } from '../src/lib/automation/undefined-rss/unified-rss-processor';
import type { RSSItem } from '../src/lib/shared/unified-content-extractor';

const RSS_SOURCE_URL = 'https://www.eghtesadonline.com/fa/services/7';

async function main() {
    console.log('🚀 Starting Eghtesadonline Scraper Test\n');
    console.log('='.repeat(60));

    // 1. Test listing page fetch
    console.log('\n📋 Step 1: Fetching listing page...');
    const newsItems = await fetchListingPage(3);
    console.log(`Found ${newsItems.length} news items:`);
    newsItems.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title.substring(0, 70)}`);
        console.log(`     URL: ${item.url}`);
        console.log(`     Thumbnail: ${item.thumbnailUrl || 'none'}`);
    });

    if (newsItems.length === 0) {
        console.log('❌ No news items found!');
        process.exit(1);
    }

    // 2. Test article fetch for first item
    console.log('\n📄 Step 2: Fetching first article...');
    const article = await fetchArticlePage(newsItems[0].url);
    console.log(`  Title: ${article.title}`);
    console.log(`  Image: ${article.imageUrl || 'none'}`);
    console.log(`  Video: ${article.videoUrl || 'none'}`);
    console.log(`  Content: ${article.content.length} chars`);
    console.log(`  Has Video: ${article.hasVideo}`);

    // 3. Test database connection
    console.log('\n🔌 Step 3: Checking database settings...');
    const settings = await getUnifiedSettings();
    if (!settings) {
        console.error('❌ No UnifiedRSSSettings found in database!');
        process.exit(1);
    }
    console.log('  ✅ Settings found');
    console.log(`  Telegram channel: ${settings.telegram_channel_id}`);

    // 4. Process through pipeline (both disabled for safe test)
    console.log('\n⚡ Step 4: Processing through pipeline (Telegram OFF, Website OFF)...');
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

    const result = await processRSSItemUnified(
        rssItem,
        RSS_SOURCE_URL,
        1,
        'اقتصادی',
        { telegram: false, website: false, skipDuplicateCheck: true },
        settings
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULT:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Extracted: ${result.extracted}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.logId) console.log(`  Log ID: ${result.logId}`);

    console.log('\n✅ Eghtesadonline scraper test completed!');
    process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
