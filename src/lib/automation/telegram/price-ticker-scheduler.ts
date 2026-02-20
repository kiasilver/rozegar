import * as cron from 'node-cron';
import { prisma } from '@/lib/core/prisma';
import { fetchPricesFromDonyaEqtesad, formatPricesForTelegram } from '@/lib/automation/telegram/daily-prices';
import { sendTelegramPhoto } from '@/lib/automation/telegram/telegram-bot';

let checkTask: cron.ScheduledTask | null = null;

const log = (msg: string) => console.log(`[PriceTickerScheduler] ${msg}`);

export async function initPriceTickerScheduler() {
    try {
        log('Initializing...');

        if (checkTask) {
            checkTask.stop();
            checkTask = null;
        }

        // Setup hourly cron check - Runs every hour at minute 0
        const cronExpression = `0 * * * *`;

        log(`Scheduling check every hour (${cronExpression})`);

        checkTask = cron.schedule(cronExpression, async () => {
            await runCheckJob();
        }, { scheduled: true, timezone: "Asia/Tehran" } as any);

        checkTask.start();

        log('Scheduler started.');
    } catch (error) {
        console.error('[PriceTickerScheduler] Error initializing:', error);
    }
}

export async function restartPriceTickerScheduler() {
    await initPriceTickerScheduler();
}

/**
 * Main Check Job: Verifies if current hour is scheduled, fetches prices, and sends.
 */
async function runCheckJob() {
    try {
        // 1. Check Settings
        const settings = await prisma.siteSetting.findMany({
            where: { group_name: 'price-ticker' }
        });

        const enabled = settings.find(s => s.key === 'price_ticker_schedule_enabled')?.value === 'true';
        if (!enabled) {
            log('Schedule disabled, skipping.');
            return;
        }

        // Parse scheduled hours (e.g. "10,14,18")
        const hoursStr = settings.find(s => s.key === 'price_ticker_schedule_hours')?.value || '10,14,18';
        const scheduledHours = hoursStr.split(',')
            .map(h => parseInt(h.trim()))
            .filter(h => !isNaN(h));

        // Get current hour in Tehran time
        const now = new Date();
        const tehranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
        const currentHour = tehranTime.getHours();

        // Check if current hour is in schedule
        if (!scheduledHours.includes(currentHour)) {
            log(`Current hour (${currentHour}) is not in schedule [${scheduledHours.join(', ')}], skipping.`);
            return;
        }

        // 2. Check Duplicate Send (Prevent double sending in the same hour window)
        const duplicateWindow = new Date(Date.now() - 55 * 60 * 1000);
        const lastRun = await prisma.unifiedRSSLog.findFirst({
            where: {
                telegram_error: 'DAILY_PRICES',
                telegram_status: 'success',
                processed_at: { gte: duplicateWindow }
            },
            orderBy: { processed_at: 'desc' }
        });

        if (lastRun) {
            log(`Already sent in this hour window (Last run: ${lastRun.processed_at}), skipping.`);
            return;
        }

        // 3. Trigger Send Logic
        const rssSettings = await prisma.unifiedRSSSettings.findFirst({
            orderBy: { created_at: 'desc' },
        });

        if (!rssSettings || !rssSettings.is_active || !rssSettings.telegram_bot_token || !rssSettings.telegram_channel_id) {
            log('Telegram Unified settings missing or inactive, skipping.');
            return;
        }

        log(`⏰ Triggering send for scheduled hour ${currentHour}...`);

        // Fetch Prices
        const prices = await fetchPricesFromDonyaEqtesad();

        if (!prices || prices.length < 5) {
            await prisma.unifiedRSSLog.create({
                data: {
                    title: 'قیمت‌های روز - ارسال خودکار (خطا)',
                    target: 'telegram',
                    telegram_sent: false,
                    telegram_status: 'error',
                    telegram_error: 'Insufficient prices fetched',
                    processed_at: new Date(),
                }
            });
            log('Error: Insufficient prices fetched.');
            return;
        }

        const message = formatPricesForTelegram(prices);
        const finalPath = '/images/gheymat/gheymat.jpg';

        // Send Telegram Message
        const result = await sendTelegramPhoto(
            rssSettings.telegram_bot_token,
            rssSettings.telegram_channel_id,
            finalPath,
            message
        );

        // Log result
        await prisma.unifiedRSSLog.create({
            data: {
                title: `قیمت‌های روز - ساعت ${currentHour}:00`,
                target: 'telegram',
                telegram_sent: result.success,
                telegram_status: result.success ? 'success' : 'error',
                telegram_error: result.error || 'DAILY_PRICES',
                telegram_message_id: result.message_id || null,
                processed_at: new Date(),
            }
        });

        log(result.success ? 'Sent successfully to channel.' : `Failed to send: ${result.error}`);

    } catch (error: any) {
        console.error('[PriceTickerScheduler] Check Job Failed:', error);
    }
}
