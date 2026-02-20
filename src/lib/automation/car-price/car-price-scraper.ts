
import puppeteer from 'puppeteer';

export interface CarPriceItem {
    brand: string;
    model: string;
    trim: string;
    year: string;
    time: string; // e.g. "1404/11/5" or "14:00"
    type: 'market' | 'factory'; // قیمت بازار | قیمت نمایندگی
    price: string; // e.g. "3,342,000,000"
    change: string; // e.g. "0%"
    link: string;
}

export interface CarPriceResult {
    company: string;
    items: CarPriceItem[];
}

export async function scrapeCarPrices(url: string, companyName: string): Promise<CarPriceResult> {
    console.log(`[CarPriceScraper] Starting scrape for ${url} using Puppeteer...`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check if we need to click "Imported" tab manually
        if (url.includes('imported=1')) {
            console.log('[CarPriceScraper] Found "Imported" tab, ensuring it is active...');
            try {
                // Wait for tab to appear
                // Try specific selector for "Imported" chip/tab
                const importedTab = await page.evaluateHandle(() => {
                    const elements = Array.from(document.querySelectorAll('div, button, a, span'));
                    return elements.find(el => el.textContent?.trim() === 'وارداتی' && (el.className.includes('chip') || el.className.includes('tab')));
                });

                const el = importedTab.asElement() as any;
                if (el) {
                    await el.click();
                    console.log('[CarPriceScraper] Clicked "Imported" tab.');
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    console.log('[CarPriceScraper] "Imported" tab element not found by text search.');
                }
            } catch (err) {
                console.log('[CarPriceScraper] Could not find/click "Imported" tab:', err);
            }

            // Auto-Scroll AFTER clicking tab to ensure we load the imported list
            console.log('[CarPriceScraper] Auto-scrolling to load items...');
            await autoScroll(page);
        }

        // Wait for items to be present
        try {
            await page.waitForSelector('.bama-ad-holder, .inventory-item, .car-list-item, div[tabindex="1"]', { timeout: 10000 });
        } catch (e) {
            console.warn('[CarPriceScraper] Warning: Items not found immediately after scroll.');
        }

        // Extract Data
        const items = await page.evaluate(() => {
            const results: any[] = [];

            // Strategy 1: The specific div container
            let rows = document.querySelectorAll('div[tabindex="1"]');

            // Strategy 2: Fallback to specific Bama classes
            if (rows.length === 0) {
                rows = document.querySelectorAll('.bama-ad-holder, .inventory-item, .car-list-item');
            }

            if (rows.length === 0) {
                // Strategy 3: Links
                const potentialLinks = Array.from(document.querySelectorAll('a[href*="/price/"]'));
                const filteredLinks = potentialLinks.filter(a => {
                    const href = (a as HTMLAnchorElement).getAttribute('href');
                    return href && !href.includes('?');
                });
                if (filteredLinks.length > 0) {
                    rows = filteredLinks as any;
                }
            }

            rows.forEach((row) => {
                const linkElement = row.tagName.toLowerCase() === 'a' ? row as HTMLAnchorElement : row.querySelector('a');

                if (!linkElement) return;

                const link = linkElement.href;

                // Helper to clean text
                const clean = (text: string | null | undefined) => text?.trim().replace(/\s+/g, ' ').replace(/[\]]/g, '') || '';

                // Extract Title
                const nameContainer = linkElement.querySelector('span.text-base.font-semibold');
                let fullTitle = '';
                if (nameContainer) {
                    fullTitle = Array.from(nameContainer.childNodes)
                        .map(n => n.textContent?.trim())
                        .filter(t => t)
                        .join(' ');
                }

                // If no title found in span, try textContent of the link itself using a heuristic?
                // Or maybe title is in a different element for some layouts?
                if (!fullTitle) {
                    fullTitle = linkElement.textContent || '';
                }

                fullTitle = clean(fullTitle);

                // Split by English OR Persian comma
                const nameParts = fullTitle.split(/[,،]/).map(s => s.trim()).filter(s => s);

                // DEBUG: We can't log to node console from here easily, but we can capture it in result or just rely on logic.

                // Heuristic: If nameParts has 1 element, verify if it looks like "Brand Model" or just "Model"
                // e.g. "MG 5" vs "5".
                // Bama usually formats: "Brand, Model, Trim" or "Brand Model, Trim".

                const brand = nameParts[0] || '';
                const model = nameParts[1] || '';
                let trim = nameParts.slice(2).join(' ') || '';

                // Clean trim further
                trim = trim.replace(/^[:\-]/, '').trim();

                // Extract Details
                const detailsContainer = linkElement.querySelector('.pr-4.flex.flex-row.flex-wrap');
                if (detailsContainer) {
                    const spans = detailsContainer.children;
                    const year = clean(spans[0]?.textContent);
                    const time = clean(spans[1]?.textContent);
                    const typeText = clean(spans[2]?.textContent);

                    let type = 'market';
                    if (typeText.includes('نمایندگی') || typeText.includes('کارخانه')) {
                        type = 'factory';
                    }

                    // Price
                    const priceContainer = spans[3];
                    const priceElement = priceContainer?.querySelector('.text-title-medium');
                    const price = clean(priceElement?.textContent);

                    const changeElement = priceContainer?.querySelector('span[dir="ltr"]');
                    const change = clean(changeElement?.textContent);

                    if (brand && price) {
                        results.push({
                            brand,
                            model,
                            trim,
                            year,
                            time,
                            type,
                            price,
                            change,
                            link
                        });
                    }
                }
            });
            return results;
        });

        if (items.length === 0) {
            const htmlSnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 20000));
            console.warn(`[CarPriceScraper] WARNING: No items found for ${url}.`);
            // console.warn(`[CarPriceScraper] HTML Snippet: ${htmlSnippet}`); // Uncomment if huge logs are okay
        }

        console.log(`[CarPriceScraper] Scraped ${items.length} items from ${url}`);
        return {
            company: companyName,
            items: items as CarPriceItem[]
        };

    } catch (error: any) {
        console.error(`[CarPriceScraper] Error scraping ${url}:`, error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 400; // chunks
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Stop if we reached bottom or scrolled enough (e.g. 50 scrolls = 20000px)
                // Bama imported list isn't infinite, it ends.
                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 50000) { // Scroll deeper!
                    clearInterval(timer);
                    resolve();
                }
            }, 100);

            // Scroll for 60 seconds to get more items
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 60000);
        });
    });
}
