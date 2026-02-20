
import * as cron from 'node-cron';
import Parser from 'rss-parser';
import { prisma } from '@/lib/core/prisma';
import { processRSSItemUnified, getUnifiedSettings } from '@/lib/automation/undefined-rss/unified-rss-processor';
import { isDuplicateTitle } from '@/lib/automation/telegram/rss-duplicate-checker';

// Global variables
let checkTask: cron.ScheduledTask | null = null;
let queueProcessorTimeout: NodeJS.Timeout | null = null;
let feedQueue: Array<{ item: any; sourceId: number; categoryId: number; categoryName: string; rssUrl: string }> = [];
let isProcessingQueue = false;

// Logger helper
const log = (msg: string) => console.log(`[UnifiedRSSScheduler] ${msg}`);

export async function initUnifiedRSSScheduler() {
    try {
        log('Initializing...');
        const settings = await getUnifiedSettings();

        // 1. Cleanup existing tasks
        if (checkTask) {
            checkTask.stop();
            checkTask = null;
        }
        if (queueProcessorTimeout) {
            clearTimeout(queueProcessorTimeout);
            queueProcessorTimeout = null;
        }

        if (!settings || !settings.is_active) {
            log('Feature disabled or no settings found.');
            await updateStatus("Inactive");
            return;
        }

        // 2. Setup Check Interval (Cron)
        // Default to 30 mins if not set
        const checkIntervalMin = settings.check_interval || 30;
        const cronExpression = `*/${checkIntervalMin} * * * *`;

        log(`Scheduling check every ${checkIntervalMin} minutes (${cronExpression})`);

        checkTask = cron.schedule(cronExpression, async () => {
            await runCheckJob();
        }, { scheduled: true, timezone: "Asia/Tehran" } as any);

        checkTask.start();

        // 3. Setup Queue Processor
        // We start the loop immediately
        processQueueLoop();

        log('Scheduler started.');
        await updateStatus("Idle (Waiting for next check)");

    } catch (error) {
        console.error('[UnifiedRSSScheduler] Error initializing:', error);
    }
}

export async function restartUnifiedRSSScheduler() {
    await initUnifiedRSSScheduler();
}

/**
 * Main Check Job: Fetches feeds and populates queue
 */
async function runCheckJob() {
    log('⏰ Triggering Check Job...');
    await updateStatus("Checking feeds...");

    try {
        const settings = await getUnifiedSettings();
        if (!settings || !settings.is_active) return;

        // Update last check time
        await prisma.unifiedRSSSettings.update({
            where: { id: settings.id },
            data: { last_check_at: new Date() }
        });

        // 1. Get Active Sources
        const sources = await prisma.rSSSource.findMany({
            where: { is_active: true },
            include: { category: { include: { translations: true } } },
            orderBy: { priority: 'desc' }
        });

        if (sources.length === 0) {
            log('No active sources found.');
            return;
        }

        const parser = new Parser();
        let newItemsCount = 0;

        // 2. Process each source
        for (const source of sources) {
            try {
                log(`Fetching ${source.rss_url}...`);
                const feed = await parser.parseURL(source.rss_url);

                const categoryName = source.category?.translations?.find(t => t.lang === 'FA')?.name || source.category?.translations?.[0]?.name || 'General';

                // Check items (newest first usually)
                // Limit to recent 10 items to avoid overloading
                const itemsToCheck = feed.items.slice(0, 10);

                for (const item of itemsToCheck) {
                    if (!item.title || !item.link) continue;

                    // CHECK DUPLICATE (Before Queueing)
                    // We check against UnifiedRSSLog to see if processed previously
                    const isDup = await isDuplicateTitle(item.title, item.link, source.rss_url);

                    // Also check if already in queue
                    const isInQueue = feedQueue.some(q => q.item.link === item.link);

                    if (!isDup && !isInQueue) {
                        feedQueue.push({
                            item: {
                                ...item,
                                isoDate: item.isoDate || new Date().toISOString() // Ensure date exists
                            },
                            sourceId: source.id,
                            categoryId: source.category_id,
                            categoryName,
                            rssUrl: source.rss_url
                        });
                        newItemsCount++;
                        log(`➕ Queued: ${item.title.substring(0, 30)}...`);
                    }
                }

            } catch (err: any) {
                console.error(`Error fetching source ${source.rss_url}:`, err.message);
            }
        }

        log(`Check Job Finished. Added ${newItemsCount} items to queue. Total Queue: ${feedQueue.length}`);

        if (feedQueue.length === 0) {
            await updateStatus(`Idle (Last check: ${new Date().toLocaleTimeString('fa-IR')})`);
        } else {
            await updateStatus(`Processing queue (${feedQueue.length} items left)...`);
        }

    } catch (error) {
        console.error('[UnifiedRSSScheduler] Check Job Failed:', error);
        await updateStatus("Error in check job");
    }
}

/**
 * Queue Processor Loop
 * Processes 1 item -> waits publish_interval -> Recurses
 */
async function processQueueLoop() {
    // Check if we should stop (e.g. re-init)
    // We rely on queueProcessorTimeout being cleared in init

    try {
        const settings = await getUnifiedSettings();
        if (!settings) {
            queueProcessorTimeout = setTimeout(processQueueLoop, 60000); // Retry in 1 min
            return;
        }

        // Processing Interval (Publish Interval)
        const intervalSec = settings.publish_interval || 30;
        const intervalMs = Math.max(intervalSec * 1000, 5000); // Min 5s

        if (feedQueue.length > 0 && !isProcessingQueue) {
            isProcessingQueue = true;

            // Pop first item
            const task = feedQueue.shift();

            if (task) {
                await updateStatus(`Processing: ${task.item.title.substring(0, 40)}... (Queue: ${feedQueue.length})`);

                try {
                    // Process Item
                    await processRSSItemUnified(
                        task.item,
                        task.rssUrl,
                        task.categoryId,
                        task.categoryName,
                        {
                            telegram: settings.telegram_enabled,
                            website: settings.website_enabled,
                            // skipdup is false by default, we checked before queueing but safe to check again or pass true?
                            // passing false (check again) is safer race-condition wise, but redundant. 
                            // Let's pass true to skip redundant DB check for speed, since we checked before queue.
                            skipDuplicateCheck: true
                        },
                        settings
                    );

                } catch (err) {
                    console.error('Error processing queue item:', err);
                }
            }

            isProcessingQueue = false;
        } else {
            if (feedQueue.length === 0 && !checkTask) {
                // If queue empty, status might be idle
            }
        }

        // Schedule next run
        queueProcessorTimeout = setTimeout(processQueueLoop, intervalMs);

    } catch (error) {
        console.error('[UnifiedRSSScheduler] Queue Loop Error:', error);
        // Retry loop
        queueProcessorTimeout = setTimeout(processQueueLoop, 30000);
    }
}

async function updateStatus(msg: string) {
    // We can't update status every second or it will flood DB logs if we log queries.
    // But we need UI to see it.
    // Let's just update UnifiedRSSSettings.status_message
    try {
        // Only update if changed significantly? 
        // For now just update.
        // We fetch first valid ID.
        const settings = await prisma.unifiedRSSSettings.findFirst();
        if (settings) {
            await prisma.unifiedRSSSettings.update({
                where: { id: settings.id },
                data: { status_message: msg }
            });
        }
    } catch (e) {
        // ignore status update errors
    }
}
