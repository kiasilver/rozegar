/**
 * Manual Send API
 * POST: Manually process and send an RSS item
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { processRSSItemUnified } from '@/lib/automation/undefined-rss/unified-rss-processor';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';

import { DEFAULT_MANUAL_PROMPT } from '@/lib/automation/undefined-rss/improved-prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, categoryId, telegram, website, customPrompt } = body;

    if (!url || !title) {
      return NextResponse.json(
        { success: false, error: 'URL and title are required' },
        { status: 400 }
      );
    }

    // Auto-detect swapped url/title (user put URL in title field or vice-versa)
    let finalUrl = url;
    let finalTitle = title;
    const urlPattern = /^https?:\/\//i;
    if (urlPattern.test(title) && !urlPattern.test(url)) {
      // Title looks like a URL and URL doesn't — swap them
      console.log(`[ManualSend] ⚠️ Auto-swapped url/title (title was a URL)`);
      finalUrl = title;
      finalTitle = url;
    }

    // Get settings
    const settings = await prisma.unifiedRSSSettings.findFirst();

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings not configured' },
        { status: 400 }
      );
    }

    // Get category name
    const category = await prisma.blogCategory.findUnique({
      where: { id: parseInt(String(categoryId)) || 1 },
      include: { translations: true },
    });
    const categoryName = category?.translations?.find(t => t.lang === 'FA')?.name || category?.translations?.[0]?.name || 'General';

    // SMART RSS/HTML DETECTION
    let rssEnclosure = undefined;
    let rssParsed = false;

    console.log(`[ManualSend] 🔍 Processing URL: ${finalUrl}...`);

    // Strategy 1: Try RSS Parsing first
    try {
      const parser = new Parser();
      const feed = await parser.parseURL(finalUrl);

      if (feed.items && feed.items.length > 0) {
        console.log(`[ManualSend] ✅ parsed as RSS feed with ${feed.items.length} items`);
        rssParsed = true;

        const normalize = (s: string) => s.replace(/[^\w\u0600-\u06FF]/g, '').toLowerCase();
        const targetTitleNorm = normalize(finalTitle);

        const matchedItem = feed.items.find((item: any) =>
          item.title && normalize(item.title).includes(targetTitleNorm)
        );

        if (matchedItem && matchedItem.link) {
          console.log(`[ManualSend] ✅ Found matching item in feed!`);
          console.log(`[ManualSend] 🔄 Article URL: ${matchedItem.link}`);
          finalUrl = matchedItem.link;

          if (matchedItem.enclosure) {
            rssEnclosure = {
              url: matchedItem.enclosure.url,
              type: matchedItem.enclosure.type,
              length: matchedItem.enclosure.length ? String(matchedItem.enclosure.length) : undefined
            };
          }
        } else {
          console.warn(`[ManualSend] ⚠️ RSS loaded but title "${finalTitle}" not found in items.`);
          // CRITICAL: Do not proceed if it's an RSS feed but item is missing.
          // Trying to scrape the RSS URL itself will result in garbage content and no image.
          return NextResponse.json(
            {
              success: false,
              error: `خبر با عنوان "${finalTitle}" در فید RSS پیدا نشد. لطفاً لینک مستقیم خبر را وارد کنید.`
            },
            { status: 404 }
          );
        }
      }
    } catch (err: any) {
      console.log(`[ManualSend] ℹ️ Not an RSS feed (${err.message?.split('\n')[0]}).`);
    }

    // Strategy 2: Try HTML Scraping (if not RSS)
    if (!rssParsed) {
      try {
        console.log(`[ManualSend] 🔍 Treating as HTML listing/category page, scanning for links matching title...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(finalUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          const dom = new JSDOM(html);
          const doc = dom.window.document;

          const normalize = (s: string) => s.replace(/[^\w\u0600-\u06FF]/g, '').toLowerCase().trim();
          const targetTitleNorm = normalize(finalTitle);
          // If title is very short, be strict. If long, be looser.
          const isStrict = targetTitleNorm.length < 10;

          console.log(`[ManualSend] 🔍 Scanning HTML for link with title: "${targetTitleNorm.substring(0, 20)}..." (Strict: ${isStrict})`);

          // Find all links
          const links = Array.from(doc.querySelectorAll('a'));
          let foundLink: string | undefined;

          for (const a of links) {
            const text = normalize(a.textContent || '');
            const titleAttr = normalize(a.getAttribute('title') || '');

            let match = false;
            // Check match
            if (isStrict) {
              match = text === targetTitleNorm || titleAttr === targetTitleNorm;
            } else {
              // Contains match
              match = (!!text && text.includes(targetTitleNorm)) || (!!titleAttr && titleAttr.includes(targetTitleNorm));
            }

            if (match) {
              const href = a.getAttribute('href');
              if (href) {
                // Ensure absolute URL
                try {
                  foundLink = new URL(href, finalUrl).href;
                  console.log(`[ManualSend] ✅ Found matching link in HTML!`);
                  console.log(`[ManualSend]    Text: "${a.textContent?.trim().substring(0, 30)}..."`);
                  console.log(`[ManualSend] 🔄 Updated Article URL: ${foundLink}`);
                  break;
                } catch (e) { /* ignore invalid urls */ }
              }
            }
          }

          if (foundLink) {
            finalUrl = foundLink;
          } else {
            console.warn(`[ManualSend] ⚠️ HTML scanned but matching link not found. Will try processing original URL.`);
          }
        }
      } catch (scrapeErr: any) {
        console.error(`[ManualSend] ❌ HTML scrape failed: ${scrapeErr.message}`);
      }
    }

    // Process the item
    // create a mock RSS item structure
    const rssItem = {
      title: finalTitle,
      link: finalUrl,
      content: '', // Content will be extracted from URL if missing
      contentSnippet: '',
      pubDate: new Date().toISOString(),
      isoDate: new Date().toISOString(),
      enclosure: rssEnclosure,
    };

    // Get Manual Prompt from DB
    const manualPrompt = await prisma.aIPrompt.findFirst({
      where: {
        target: 'manual',
        is_active: true
      }
    });

    const result = await processRSSItemUnified(
      rssItem,
      finalUrl, // Pass potentially updated finalUrl as source
      parseInt(String(categoryId)) || 1,
      categoryName,
      {
        telegram: telegram ?? true,
        website: website ?? true,
        customPrompt: customPrompt || manualPrompt?.content || DEFAULT_MANUAL_PROMPT,
        skipDuplicateCheck: true, // Manual send should never be blocked by duplicate check
      },
      settings
    );

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
