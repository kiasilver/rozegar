import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import path from "path";
import fs from "fs/promises";

// Helper to check file existence
async function fileExists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        // 1. Check Settings
        const settings = await prisma.siteSetting.findMany({
            where: { group_name: 'price-ticker' }
        });

        const enabled = settings.find(s => s.key === 'price_ticker_schedule_enabled')?.value === 'true';
        if (!enabled) {
            return NextResponse.json({ skipped: true, reason: 'Schedule disabled' });
        }

        // Parse scheduled hours "8,12,16"
        const hoursStr = settings.find(s => s.key === 'price_ticker_schedule_hours')?.value || '10,14,18';
        const scheduledHours = hoursStr.split(',')
            .map(h => parseInt(h.trim()))
            .filter(h => !isNaN(h));

        // Get current hour in Tehran time
        const now = new Date();
        const tehranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
        const currentHour = tehranTime.getHours();

        // Check if current hour is in schedule
        // We allow sending if we are within the hour (e.g. 14:00 - 14:59)
        if (!scheduledHours.includes(currentHour)) {
            return NextResponse.json({
                skipped: true,
                reason: `Current hour (${currentHour}) is not in schedule [${scheduledHours.join(', ')}]`,
                serverTime: tehranTime.toString()
            });
        }

        // 2. Check Duplicate Send (Prevent double sending in the same hour)
        // Find logs for today, same hour
        const startOfHour = new Date(now);
        startOfHour.setMinutes(0, 0, 0); // Start of current hour (approx, simplistic check)

        // Better check: Check if we successfully sent "daily prices" within the last 55 minutes
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
            return NextResponse.json({
                skipped: true,
                reason: `Already sent in this hour (Last run: ${lastRun.processed_at})`
            });
        }

        // 3. Trigger Send Logic
        const rssSettings = await prisma.unifiedRSSSettings.findFirst({
            orderBy: { created_at: 'desc' },
        });

        if (!rssSettings || !rssSettings.is_active || !rssSettings.telegram_bot_token || !rssSettings.telegram_channel_id) {
            return NextResponse.json({ error: 'Telegram settings missing' }, { status: 400 });
        }

        // Dynamic imports to ensure fresh context
        const { fetchPricesFromDonyaEqtesad, formatPricesForTelegram } = require("@/lib/automation/telegram/daily-prices");
        const { sendTelegramPhoto } = require("@/lib/automation/telegram/telegram-bot");

        console.log(`⏰ [Cron Price Ticker] Triggering send for hour ${currentHour}...`);

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
            return NextResponse.json({ error: 'Not enough prices fetched' });
        }

        const message = formatPricesForTelegram(prices);

        // Image Selection Logic (Fixed)
        const finalPath = '/images/gheymat/gheymat.jpg';

        // Send
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

        return NextResponse.json({
            success: result.success,
            hour: currentHour,
            message: result.success ? 'Sent successfully' : result.error
        });

    } catch (error: any) {
        console.error('Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
