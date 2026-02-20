
import * as cron from 'node-cron';
import { prisma } from '@/lib/core/prisma';
import { scrapeCarPrices, CarPriceResult } from './car-price-scraper';
import { sendTelegramMessage } from '@/lib/automation/telegram/telegram-bot';
import { formatDateWithEmoji } from '@/lib/automation/telegram/daily-prices';

// Global task variables
let globalScheduleTask: any = null;
let perSourceScheduleTask: any = null;

export async function initCarPriceScheduler() {
    try {
        console.log('[CarPriceScheduler] Initializing...');
        const settings = await (prisma as any).carPriceSetting.findFirst();

        // Stop existing tasks
        if (globalScheduleTask) {
            globalScheduleTask.stop();
            globalScheduleTask = null;
        }
        if (perSourceScheduleTask) {
            perSourceScheduleTask.stop();
            perSourceScheduleTask = null;
        }

        if (!settings || !settings.is_active) {
            console.log('[CarPriceScheduler] Feature disabled or no settings found.');
            return;
        }

        // 1. Setup Global Schedule
        let cronExpression = '';
        if (settings.schedule_type === 'interval') {
            const interval = settings.interval_hours || 24;
            cronExpression = `0 */${interval} * * *`;
            console.log(`[CarPriceScheduler] Global schedule: Every ${interval} hours (${cronExpression})`);
        } else {
            const [hour, minute] = settings.schedule_time.split(':');
            cronExpression = `${minute} ${hour} * * *`;
            console.log(`[CarPriceScheduler] Global schedule: Daily at ${settings.schedule_time} (${cronExpression})`);
        }

        globalScheduleTask = cron.schedule(cronExpression, async () => {
            console.log('[CarPriceScheduler] ⏰ Triggering GLOBAL scheduled job at:', new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }));
            // Global runs ALL active sources (default behavior)
            await runCarPriceJob({ isManual: false });
        }, { scheduled: true, timezone: "Asia/Tehran" } as any);

        globalScheduleTask.start();

        // 2. Setup Per-Source Schedule Checker (Runs every minute)
        perSourceScheduleTask = cron.schedule('* * * * *', async () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Tehran'
            }); // "14:30"

            const allActiveSources = await (prisma as any).carPriceSource.findMany({
                where: {
                    is_active: true
                }
            });

            // 1. Normal Schedule
            const scheduledSources = allActiveSources.filter((s: any) => s.schedule_time === timeString);

            // 2. Retry Logic (Error status + 10 mins passed + max 5 retries)
            const retrySources = allActiveSources.filter((s: any) => {
                if (s.last_status !== 'error') return false;
                if (!s.last_run_at) return true; // Should retry if never ran but has error status? unlikely.
                if (s.consecutive_errors >= 5) return false; // Stop after 5 retries

                const diffMs = now.getTime() - new Date(s.last_run_at).getTime();
                const diffMinutes = diffMs / 60000;
                return diffMinutes >= 10;
            });

            // Combine unique sources
            const sourcesToRun = [...new Set([...scheduledSources, ...retrySources])];

            if (sourcesToRun.length > 0) {
                const names = sourcesToRun.map((s: any) => `${s.name} (${s.schedule_time === timeString ? 'Scheduled' : 'Retry'})`).join(', ');
                console.log(`[CarPriceScheduler] ⏰ Triggering job for [${names}]`);
                await runCarPriceJob({ isManual: false, specificSources: sourcesToRun });
            }
        }, { scheduled: true, timezone: "Asia/Tehran" } as any);

        perSourceScheduleTask.start();

        console.log(`[CarPriceScheduler] Scheduler started. Timezone: Asia/Tehran.`);

    } catch (error) {
        console.error('[CarPriceScheduler] Error initializing:', error);
    }
}

export async function restartCarPriceScheduler() {
    await initCarPriceScheduler();
}

/**
 * Runs the car price scraping job.
 * @param options.isManual If true, was triggered manually (e.g. from UI).
 * @param options.specificSources If provided, only scrapes these sources. Otherwise scrapes ALL active sources.
 */
export async function runCarPriceJob(options: { isManual?: boolean; specificSources?: any[] } = {}) {
    console.log(`[CarPriceScheduler] Starting job... (Manual: ${options.isManual}, Specific Sources: ${options.specificSources?.length || 'All'})`);
    try {
        const settings = await (prisma as any).carPriceSetting.findFirst();
        if (!settings) return;

        let sources = [];
        if (options.specificSources && options.specificSources.length > 0) {
            sources = options.specificSources;
        } else {
            sources = await (prisma as any).carPriceSource.findMany({
                where: { is_active: true },
                orderBy: { order: 'asc' }
            });
        }

        if (sources.length === 0) {
            console.log('[CarPriceScheduler] No sources to process.');
            return;
        }

        const results: CarPriceResult[] = [];

        // Process sources in parallel
        const scrapePromises = sources.map(async (source: any) => {
            try {
                // Update last_run_at
                await (prisma as any).carPriceSource.update({
                    where: { id: source.id },
                    data: { last_run_at: new Date() }
                });

                console.log(`[CarPriceScheduler] Scraping ${source.name}...`);
                const result = await scrapeCarPrices(source.url, source.name);

                // Save to Database (Replace existing for this source)
                if (result.items.length > 0) {
                    await prisma.$transaction(async (tx) => {
                        // Delete old prices for this source
                        await (tx as any).carPrice.deleteMany({
                            where: { source_id: source.id }
                        });

                        // Insert new prices
                        await (tx as any).carPrice.createMany({
                            data: result.items.map(item => ({
                                source_id: source.id,
                                brand: item.brand,
                                model: item.model,
                                trim: item.trim,
                                year: item.year,
                                price: item.price,
                                type: item.type,
                                change: item.change,
                                time: item.time
                            }))
                        });

                        // Update Success Status
                        await (tx as any).carPriceSource.update({
                            where: { id: source.id },
                            data: {
                                last_success_at: new Date(),
                                last_status: 'success',
                                consecutive_errors: 0
                            }
                        });
                    });
                    console.log(`[CarPriceScheduler] Saved ${result.items.length} prices for ${source.name} to DB.`);
                    return result; // Return successfully scraped result
                } else {
                    // Empty results but no error thrown? treat as warning or error?
                    // Scraper usually throws if it fails. If regular 0 items, maybe specific error?
                    // Let's treat 0 items as error if we want retry?
                    // Bama 0 items means something is wrong with scraper or site.
                    throw new Error("No items found");
                }
            } catch (e: any) {
                console.error(`[CarPriceScheduler] Error scraping ${source.name}:`, e);

                // Update Error Status
                try {
                    await (prisma as any).carPriceSource.update({
                        where: { id: source.id },
                        data: {
                            last_status: 'error',
                            consecutive_errors: { increment: 1 }
                        }
                    });
                } catch (dbErr) { console.error("Failed to update error status", dbErr); }
            }
            return null; // Return null on failure or empty
        });

        // Wait for all scrapes to finish
        const scrapeResults = await Promise.all(scrapePromises);

        // Filter out nulls
        const scrapedResults = scrapeResults.filter((r: CarPriceResult | null): r is CarPriceResult => r !== null);
        results.push(...scrapedResults);

        if (results.length > 0) {
            // 1. Send to Telegram
            // For manual runs: send only sources with telegram_enabled = true
            // For scheduled runs: send if global telegram_enabled is true
            if (options.isManual) {
                // Manual run: send only sources that have telegram_enabled = true
                const telegramEnabledSources = sources.filter((s: any) => s.telegram_enabled);
                if (telegramEnabledSources.length > 0) {
                    const telegramResults = results.filter((r: CarPriceResult) =>
                        telegramEnabledSources.some((s: any) => s.name === r.company)
                    );

                    if (telegramResults.length > 0) {
                        const telegramSettings = await (prisma as any).unifiedRSSSettings.findFirst({
                            orderBy: { created_at: 'desc' }
                        });

                        if (telegramSettings && telegramSettings.telegram_bot_token && telegramSettings.telegram_channel_id) {
                            await sendToTelegram(telegramResults, telegramSettings.telegram_bot_token, telegramSettings.telegram_channel_id);
                        } else {
                            console.warn('[CarPriceScheduler] Telegram enabled but no tokens found in UnifiedRSSSettings.');
                        }
                    }
                }
            } else if (settings.telegram_enabled) {
                // Scheduled run: send if global enabled
                console.log('[CarPriceScheduler] 📤 Scheduled run - Telegram enabled, preparing to send...');
                const telegramSettings = await (prisma as any).unifiedRSSSettings.findFirst({
                    orderBy: { created_at: 'desc' }
                });

                if (telegramSettings && telegramSettings.telegram_bot_token && telegramSettings.telegram_channel_id) {
                    // Filter results to only include sources with telegram_enabled = true
                    const telegramEnabledSources = sources.filter((s: any) => s.telegram_enabled);
                    console.log('[CarPriceScheduler] 📋 Telegram enabled sources:', telegramEnabledSources.map((s: any) => s.name));

                    // Match results to sources
                    const telegramResults = results.filter((r: CarPriceResult) => {
                        const match = telegramEnabledSources.some((s: any) => s.name === r.company);
                        if (!match) console.log(`[CarPriceScheduler] Skipping result for source '${r.company}' (Telegram disabled or source not found)`);
                        return match;
                    });

                    console.log('[CarPriceScheduler] 📊 Filtered results for telegram:', telegramResults.length, 'out of', results.length);

                    if (telegramResults.length > 0) {
                        console.log('[CarPriceScheduler] ✅ Sending to telegram...');
                        await sendToTelegram(telegramResults, telegramSettings.telegram_bot_token, telegramSettings.telegram_channel_id);
                    } else {
                        console.warn('[CarPriceScheduler] ⚠️ No results to send to telegram after filtering. Results were:', results.map(r => r.company));

                        // Log this specific "no data" event to DB for visibility
                        try {
                            await (prisma as any).unifiedRSSLog.create({
                                data: {
                                    title: 'قیمت خودرو - عدم ارسال (دیتای جدید یافت نشد)',
                                    target: 'telegram',
                                    telegram_sent: false,
                                    telegram_status: 'warning',
                                    telegram_error: 'لیست قیمت‌ها برای ارسال خالی بود',
                                    processed_at: new Date(),
                                },
                            });
                        } catch (e) { console.error('Error logging warning', e) }
                    }
                } else {
                    console.warn('[CarPriceScheduler] ⚠️ Telegram enabled but no tokens found in UnifiedRSSSettings.');
                }
            } else {
                console.log('[CarPriceScheduler] ℹ️ Telegram disabled in settings, skipping telegram send');
            }

            // 2. Website update is disabled - only update the car-prices page via database
            // The page reads from database, so no need to publish to website
            // Data is already saved to database above

            // Update last_run only if it was a GLOBAL run (no specific sources)
            if (!options.specificSources) {
                await (prisma as any).carPriceSetting.update({
                    where: { id: settings.id },
                    data: { last_run: new Date() }
                });
            }

            // 3. Cleanup old logs (keep last 3 days) - Only on global run
            if (!options.specificSources) {
                try {
                    const threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

                    const deleted = await (prisma as any).unifiedRSSLog.deleteMany({
                        where: {
                            title: { startsWith: 'قیمت خودرو' },
                            created_at: { lt: threeDaysAgo }
                        }
                    });
                    if (deleted.count > 0) {
                        console.log(`[CarPriceScheduler] 🧹 Cleaned up ${deleted.count} old car price logs.`);
                    }
                } catch (cleanupError) {
                    console.error('[CarPriceScheduler] Error cleaning up old logs:', cleanupError);
                }
            }
        }

        console.log('[CarPriceScheduler] Job finished.');

    } catch (error) {
        console.error('[CarPriceScheduler] Job failed:', error);
    }
}

/**
 * Escape Markdown special characters to prevent "can't parse entities" errors.
 * Escapes: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMarkdown(text: string): string {
    if (!text) return '';
    // Escaping for MarkdownV2: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Extract the "Base Model" from the full model name for grouping.
 * E.g. "MVM X22 Pro IE" -> "MVM X22"
 */
function extractBaseModel(modelName: string): string {
    if (!modelName) return '';
    const clean = modelName.replace(/[\[\]]/g, '').trim();

    // Pattern: 2 Latin words (e.g. MVM X22, KMC T8, Tiggo 8)
    const latinMatch = clean.match(/^([A-Za-z0-9]+\s+[A-Za-z0-9]+)/);
    if (latinMatch) {
        return latinMatch[1];
    }

    // Pattern: 1 Latin word (e.g. Dena, Tara - if written in English)
    const latinSingle = clean.match(/^([A-Za-z0-9]+)/);
    if (latinSingle) {
        return latinSingle[1];
    }

    // Persian: Take first word
    const persianMatch = clean.split(' ')[0];
    return persianMatch || clean;
}

// Helper function to split message if too long (Telegram limit: 4096 chars for text, 1024 for caption with photo)
function splitTelegramMessage(message: string, maxLength: number = 3500): string[] {
    if (message.length <= maxLength) {
        return [message];
    }

    const parts: string[] = [];
    const lines = message.split('\n');
    let currentPart = '';

    for (const line of lines) {
        // If adding this line would exceed limit, save current part and start new one
        if (currentPart.length + line.length + 1 > maxLength && currentPart.length > 0) {
            parts.push(currentPart.trim());
            currentPart = line + '\n';
        } else {
            currentPart += line + '\n';
        }
    }

    // Add remaining part
    if (currentPart.trim().length > 0) {
        parts.push(currentPart.trim());
    }

    return parts;
}

export function formatCarPricesForTelegram(results: CarPriceResult[]): string {
    const { dateStr } = formatDateWithEmoji();
    const safeDateStr = escapeMarkdown(dateStr);
    const RLM = '\u200F'; // Right-to-Left Mark to force RTL direction

    let message = ``;

    // Filter and group
    for (const res of results) {
        // Company
        const company = escapeMarkdown(res.company);
        message += `${RLM}🔻 *${company}*\n\n`;

        // Filter for MARKET prices only
        const marketItems = res.items.filter(i => i.type === 'market');

        if (marketItems.length === 0) {
            message += `${RLM}_قیمت بازار موجود نیست_\n\n`;
            continue;
        }

        // Group items by "Base Model" AND "Year"
        const groups: { [key: string]: typeof res.items } = {};

        for (const item of marketItems) {
            // CRITICAL FIX: Clean both [ and ] and trim whitespace immediately
            let fullModelName = item.model.replace(/[\[\]]/g, '').trim();
            const brand = item.brand ? item.brand.replace(/[\[\]]/g, '').trim() : '';

            // Ensure Brand is at the start of the model name - Fix duplicate brand issue
            if (brand) {
                try {
                    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Remove brand if it's at the start (to avoid duplicates)
                    const brandRegex = new RegExp(`^${escapedBrand}\\s+`, 'i');
                    fullModelName = fullModelName.replace(brandRegex, '').trim();
                    // Only add brand if model doesn't already start with it
                    if (!fullModelName.toLowerCase().startsWith(brand.toLowerCase())) {
                        fullModelName = `${brand} ${fullModelName}`.trim();
                    }
                } catch (regexError) {
                    console.error('[CarPriceScheduler] Regex error for brand:', brand, regexError);
                }
            }

            // Extract Base Model
            let baseModel = extractBaseModel(fullModelName);

            // Special Case: "ام جی" (MG) might be split as "ام" by extractBaseModel if it takes first word.
            if (brand && brand.includes(' ') && baseModel === brand.split(' ')[0]) {
                // Allow longer models for multi-word brands (e.g. "بی ای دبلیو (BAW) 212" is 5 words)
                if (fullModelName.split(' ').length <= 6) {
                    baseModel = fullModelName;
                } else {
                    baseModel = brand;
                }
            }

            // If baseModel is too short (e.g. "300") or purely numeric, maybe we lost the brand?
            // Ensure baseModel also starts with Brand
            if (brand && !baseModel.toLowerCase().startsWith(brand.toLowerCase())) {
                baseModel = `${brand} ${baseModel}`;
            }

            const year = item.year || 'نامشخص';

            // Create composite key for grouping
            const key = `${baseModel}|${year}`;

            if (!groups[key]) groups[key] = [];

            // Store modified fullModelName in item for later use in trim extraction?
            // "item" is a reference to the original object in "results".
            // We shouldn't mutate "item" permanently if "results" is reused, but here "results" is local scope for this run.
            // But better to store the "clean" name somewhere.
            // Let's create a new object or just re-calculate below.
            // IMPORTANT: valid "fullModelName" logic is needed inside the next loop too.
            // So let's attach the clean name to the item temporarily or just repeat logic.
            // Repeating logic is safer than mutating.
            groups[key].push(item);
        }

        // Sort Groups
        // We want to sort by Base Model, then by Year
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const [modelA, yearA] = a.split('|');
            const [modelB, yearB] = b.split('|');

            // Compare Models
            const modelCompare = modelA.localeCompare(modelB, 'fa');
            if (modelCompare !== 0) return modelCompare;

            // Compare Years (Descending: 1404 before 1403)
            return yearB.localeCompare(yearA, 'fa');
        });

        for (const key of sortedKeys) {
            const [baseModel, year] = key.split('|');
            const items = groups[key];

            // Header: 🔹 قیمت (MVM X22 1403)
            // Clean baseModel from brackets and duplicates
            let cleanBaseModel = baseModel.replace(/[\[\]]/g, '').trim();
            // Remove duplicate words (e.g., "آریسان آریسان" -> "آریسان")
            const words = cleanBaseModel.split(/\s+/);
            const uniqueWords: string[] = [];
            for (const word of words) {
                if (uniqueWords.length === 0 || uniqueWords[uniqueWords.length - 1].toLowerCase() !== word.toLowerCase()) {
                    uniqueWords.push(word);
                }
            }
            cleanBaseModel = uniqueWords.join(' ');

            const escapedBaseModel = escapeMarkdown(cleanBaseModel);
            const escapedYear = escapeMarkdown(year);
            // Reformatted Header as requested: 🔹 قیمت ( اطلس 1404 )
            message += `${RLM}🔹 قیمت \\(${escapedBaseModel} ${escapedYear}\\)\n`;

            // Sort items within group
            items.sort((a, b) => a.model.localeCompare(b.model, 'fa'));

            for (const item of items) {
                // Determine Trim (Remove Base Model from Full Name)
                // REPEAT CLEANUP Logic - Remove ALL brackets and clean
                let fullModelName = item.model.replace(/[\[\]]/g, '').trim();
                const brand = item.brand ? item.brand.replace(/[\[\]]/g, '').trim() : '';

                // Fix: Remove duplicate brand name and clean up
                if (brand) {
                    try {
                        const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Remove brand if it's at the start (case insensitive)
                        const brandRegex = new RegExp(`^${escapedBrand}\\s+`, 'i');
                        fullModelName = fullModelName.replace(brandRegex, '').trim();
                        // Also remove if brand appears anywhere at the start
                        if (fullModelName.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
                            fullModelName = fullModelName.substring(brand.length).trim();
                        }
                        // Only add brand if model doesn't already start with it
                        if (!fullModelName.toLowerCase().startsWith(brand.toLowerCase())) {
                            fullModelName = `${brand} ${fullModelName}`.trim();
                        }
                    } catch (e) { }
                }

                // Remove duplicate consecutive words (e.g., "آریسان آریسان" -> "آریسان")
                const words = fullModelName.split(/\s+/);
                const uniqueWords: string[] = [];
                for (let i = 0; i < words.length; i++) {
                    if (i === 0 || words[i] !== words[i - 1]) {
                        uniqueWords.push(words[i]);
                    }
                }
                fullModelName = uniqueWords.join(' ');

                let groupingName = fullModelName;

                // Remove base model logic
                const escapedBaseModelForRegex = baseModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let trim = groupingName.replace(new RegExp(`^${escapedBaseModelForRegex}\\s*`, 'i'), '').trim();

                // Also clean up Year if it appears in the trim
                if (item.year) {
                    const yearRegex = new RegExp(`${item.year}\\s*`, 'g');
                    trim = trim.replace(yearRegex, '').trim();
                }

                if (item.trim) {
                    const cleanTrim = item.trim.replace(/[\[\]]/g, '').trim();
                    if (cleanTrim && !trim.includes(cleanTrim)) {
                        trim = `${trim} ${cleanTrim}`.trim();
                    }
                }

                // Clean up trim - remove any remaining brackets, duplicates, and extra spaces
                trim = trim.replace(/[\[\]]/g, '');
                // Remove duplicate words in trim too
                const trimWords = trim.split(/\s+/);
                const uniqueTrimWords: string[] = [];
                for (let i = 0; i < trimWords.length; i++) {
                    if (i === 0 || trimWords[i] !== trimWords[i - 1]) {
                        uniqueTrimWords.push(trimWords[i]);
                    }
                }
                trim = uniqueTrimWords.join(' ').replace(/^[:\-]/, '').replace(/\s+/g, ' ').trim();

                // Convert price from Rial to Toman (divide by 10) and format
                let priceStr = item.price.replace(/[,\s]/g, '');
                let priceNum = parseInt(priceStr);
                if (!isNaN(priceNum)) {
                    // Already in Toman (Source is likely Toman)
                    // priceNum = Math.floor(priceNum / 10);
                    // Format with commas
                    priceStr = priceNum.toLocaleString('fa-IR');
                }
                const price = escapeMarkdown(priceStr);
                const escapedTrim = escapeMarkdown(trim);

                let line = `${RLM}▫️ `;
                if (escapedTrim) {
                    // Reformatted Item as requested: [ Trim ] : Price -> ( Trim ) : Price
                    line += `\\(${escapedTrim}\\) : `;
                } else {
                    // Fallback if no trim
                    line += `\\(پایه\\) : `;
                }

                line += `${price} تومان`;

                message += `${line}\n`;
            }
            message += `\n`;
        }
    }

    // Add Date at the bottom with spacing
    message += `\n${RLM}${safeDateStr}\n\n`;

    message += `🔗 [مشاهده قیمت درب کارخانه](https://rozeghar.com/car-prices)\n\n`;

    const companies = Array.from(new Set(results.map(r => r.company)));
    let hashtags = '';
    for (const company of companies) {
        let cleanCompany = company.replace(/[:\-]/g, ' ').trim();
        const escapedTagName = `قیمت_${cleanCompany.replace(/\s+/g, '_')}`.replace(/_/g, '\\_');
        hashtags += `\\#${escapedTagName} `;
    }

    hashtags += `\n\\#قیمت\\_خودرو \\#بازار\\_خودرو \\#قیمت\\_روز\\_خودرو \\#قیمت\\_ماشین`;
    message += hashtags;

    return message;
}

async function sendToTelegram(results: CarPriceResult[], botToken: string, channelId: string) {
    if (results.length === 0) return;

    // Send one message per company
    for (const res of results) {
        try {
            const message = formatCarPricesForTelegram([res]);
            console.log(`[CarPriceScheduler] Sending Telegram message for ${res.company}...`);

            // Text ONLY message (Images removed to avoid caption limit issues)
            const maxLength = 4000;
            const messageParts = splitTelegramMessage(message, maxLength);

            let result;
            for (let i = 0; i < messageParts.length; i++) {
                const partMessage = messageParts[i];

                console.log(`[CarPriceScheduler] Sending message part ${i + 1}/${messageParts.length}`);
                result = await sendTelegramMessage(botToken, channelId, partMessage, {
                    parse_mode: 'MarkdownV2'
                });

                // Wait between messages to avoid rate limiting
                if (i < messageParts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (result && result.success) {
                console.log(`[CarPriceScheduler] Telegram sent for ${res.company} (ID: ${result.message_id})`);

                try {
                    await (prisma as any).unifiedRSSLog.create({
                        data: {
                            title: `قیمت خودرو - ${res.company}`,
                            target: 'telegram',
                            telegram_sent: true,
                            telegram_message_id: result.message_id,
                            telegram_status: 'success',
                            telegram_content: message, // Save content
                            processed_at: new Date(),
                        },
                    });
                } catch (logError) {
                    console.error('[CarPriceScheduler] Error logging success:', logError);
                }
            } else {
                const errorMsg = result?.error || 'خطا در ارسال پیام';
                console.error(`[CarPriceScheduler] Failed to send Telegram for ${res.company}:`, errorMsg);
                throw new Error(errorMsg);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e: any) {
            const errorMsg = e?.message || 'خطا در ارسال پیام';
            console.error(`[CarPriceScheduler] Exception sending for ${res.company}:`, e);

            try {
                await (prisma as any).unifiedRSSLog.create({
                    data: {
                        title: `قیمت خودرو - ${res.company} (خطا)`,
                        target: 'telegram',
                        telegram_sent: false,
                        telegram_status: 'error',
                        telegram_error: errorMsg,
                        processed_at: new Date(),
                    },
                });
            } catch (logError) {
                console.error('[CarPriceScheduler] Error logging exception:', logError);
            }
        }
    }
}

async function publishToWebsite(results: CarPriceResult[]) {
    const slug = 'car-prices-daily';
    const date = new Date();
    const jalaliDate = date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const title = `قیمت روز خودرو - ${jalaliDate}`;

    let content = `<p>آخرین بروزرسانی: <strong>${jalaliDate} ساعت ${timeStr}</strong></p>`;
    content += `<p>قیمت روز جدیدترین خودروهای داخلی و مونتاژی بازار ایران را در جدول‌های زیر مشاهده کنید.</p>`;

    for (const res of results) {
        content += `<h3>${res.company}</h3>`;
        content += `<div style="overflow-x: auto;">`;
        content += `<table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95rem;">`;
        content += `<thead style="background:#f3f4f6; color:#1f2937;"><tr>
            <th style="padding:10px; border:1px solid #e5e7eb; text-align:right;">مدل</th>
            <th style="padding:10px; border:1px solid #e5e7eb; text-align:right;">سال</th>
            <th style="padding:10px; border:1px solid #e5e7eb; text-align:left;">قیمت (تومان)</th>
        </tr></thead><tbody>`;

        const marketItems = res.items.filter(i => i.type === 'market');
        for (const item of marketItems) {
            // Ensure Model includes Brand if needed (Fix for "Price 5" on website)
            let displayModel = item.model;
            if (item.brand && !displayModel.toLowerCase().startsWith(item.brand.toLowerCase())) {
                displayModel = `${item.brand} ${displayModel}`;
            }

            content += `<tr>
                <td style="padding:10px; border:1px solid #e5e7eb;">${displayModel} ${item.trim || ''}</td>
                <td style="padding:10px; border:1px solid #e5e7eb;">${item.year}</td>
                <td style="padding:10px; border:1px solid #e5e7eb; text-align:left; font-weight:bold; color:#059669;">${item.price}</td>
            </tr>`;
        }
        content += `</tbody></table></div>`;
    }

    try {
        const existingBlog = await prisma.blog.findFirst({
            where: { slug }
        });

        if (existingBlog) {
            const translation = await prisma.blogTranslation.findFirst({
                where: {
                    blog_id: existingBlog.id,
                    lang: 'FA'
                }
            });

            if (translation) {
                await prisma.blogTranslation.update({
                    where: { id: translation.id },
                    data: {
                        title,
                        content
                    }
                });
            } else {
                await prisma.blogTranslation.create({
                    data: {
                        blog_id: existingBlog.id,
                        lang: 'FA',
                        title,
                        content,
                        slug
                    }
                });
            }

            await prisma.blog.update({
                where: { id: existingBlog.id },
                data: { updated_at: new Date() }
            });

            console.log(`[CarPriceScheduler] Updated website post: ${slug}`);
        } else {
            const admin = await prisma.user.findFirst();
            const authorId = admin ? admin.id : undefined;

            await prisma.blog.create({
                data: {
                    slug,
                    status: 'PUBLISHED',
                    image: '/uploads/default-car.jpg',
                    author_id: authorId,
                    published_at: new Date(),
                    is_active: true,
                    view_count: 0,
                    translations: {
                        create: {
                            lang: 'FA',
                            title,
                            content,
                            slug
                        }
                    }
                }
            });
            console.log(`[CarPriceScheduler] Created new website post: ${slug}`);
        }

    } catch (e) {
        console.error('Error publishing to website', e);
    }
}
