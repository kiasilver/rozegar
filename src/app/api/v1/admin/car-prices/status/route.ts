import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: NextRequest) {
    try {
        const settings = await (prisma as any).carPriceSetting.findFirst();
        
        if (!settings) {
            return NextResponse.json({
                is_active: false,
                last_run: null,
                next_run: null,
                has_error: false,
                error_message: null
            });
        }

        // Calculate next run time
        let nextRun: Date | null = null;
        if (settings.is_active && settings.last_run) {
            const lastRun = new Date(settings.last_run);
            
            if (settings.schedule_type === 'interval') {
                const intervalHours = settings.interval_hours || 24;
                nextRun = new Date(lastRun.getTime() + intervalHours * 60 * 60 * 1000);
            } else {
                // Daily mode
                const [hour, minute] = settings.schedule_time.split(':').map(Number);
                nextRun = new Date(lastRun);
                nextRun.setHours(hour, minute, 0, 0);
                
                // If the scheduled time has passed today, set for tomorrow
                if (nextRun <= new Date()) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
            }
        }

        // Check for recent errors (last 24 hours)
        // Note: We'll check for errors in title or other fields that indicate car prices
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentErrors = await (prisma as any).unifiedRSSLog.findMany({
            where: {
                OR: [
                    { title: { contains: 'قیمت خودرو' } },
                    { title: { contains: 'car-prices' } },
                    { title: { contains: 'Car Price' } }
                ],
                telegram_status: 'error',
                created_at: {
                    gte: oneDayAgo
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 10
        });

        const hasError = recentErrors.length > 0;
        const errorMessage = hasError ? recentErrors[0].telegram_error : null;

        return NextResponse.json({
            is_active: settings.is_active,
            last_run: settings.last_run,
            next_run: nextRun ? nextRun.toISOString() : null,
            schedule_type: settings.schedule_type,
            schedule_time: settings.schedule_time,
            interval_hours: settings.interval_hours,
            has_error: hasError,
            error_message: errorMessage,
            recent_errors: recentErrors.map((e: any) => ({
                id: e.id,
                error: e.telegram_error,
                created_at: e.created_at
            }))
        });
    } catch (error: any) {
        console.error('[CarPriceStatus] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

