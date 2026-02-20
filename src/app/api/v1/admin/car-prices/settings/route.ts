import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { restartCarPriceScheduler } from '@/lib/automation/car-price/car-price-scheduler';

export async function GET() {
    try {
        let setting = await prisma.carPriceSetting.findFirst();

        if (!setting) {
            // Create default settings if none exist
            setting = await prisma.carPriceSetting.create({
                data: {
                    is_active: false,
                    schedule_type: 'daily',
                    schedule_time: '12:00',
                    interval_hours: 24,
                    telegram_enabled: false,
                    website_enabled: false
                }
            });
        }

        return NextResponse.json(setting);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const data = await req.json();

        // 1. If it's a schedule setting update
        if ('is_active' in data && 'schedule_type' in data) {
            const setting = await prisma.carPriceSetting.findFirst();
            if (!setting) {
                const newSetting = await prisma.carPriceSetting.create({
                    data: {
                        is_active: data.is_active,
                        schedule_type: data.schedule_type,
                        schedule_time: data.schedule_time,
                        interval_hours: Number(data.interval_hours),
                        telegram_enabled: data.telegram_enabled,
                        website_enabled: data.website_enabled
                    }
                });
                return NextResponse.json(newSetting);
            } else {
                const updated = await prisma.carPriceSetting.update({
                    where: { id: setting.id },
                    data: {
                        is_active: data.is_active,
                        schedule_type: data.schedule_type,
                        schedule_time: data.schedule_time,
                        interval_hours: Number(data.interval_hours),
                        telegram_enabled: data.telegram_enabled,
                        website_enabled: data.website_enabled
                    }
                });
                
                // Restart scheduler when settings change
                try {
                    await restartCarPriceScheduler();
                    console.log('[CarPriceSettings] Scheduler restarted after settings update');
                } catch (schedulerError) {
                    console.error('[CarPriceSettings] Error restarting scheduler:', schedulerError);
                }
                
                return NextResponse.json(updated);
            }
        }

        // 2. If it's a Source update (generic PUT for sources list not typical, usually by ID)
        // But if we received a source update payload without ID here? 
        // We should handle that in [id]/route.ts. This main route.ts is likely for settings or creating sources.

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
