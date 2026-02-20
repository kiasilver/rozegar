
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { scrapeCarPrices } from '@/lib/automation/car-price/car-price-scraper';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idStr } = await params;
        const id = Number(idStr);

        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // 1. Get Source
        const source = await prisma.carPriceSource.findUnique({
            where: { id }
        });

        if (!source) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // 2. Scrape Data
        // Update last_run_at
        await (prisma as any).carPriceSource.update({
            where: { id },
            data: { last_run_at: new Date(), last_status: 'pending' }
        });

        console.log(`[ManualUpdate] Scraping ${source.name}...`);

        let result;
        try {
            result = await scrapeCarPrices(source.url, source.name);
        } catch (scrapeError: any) {
            // Update Error Status
            await (prisma as any).carPriceSource.update({
                where: { id },
                data: {
                    last_status: 'error',
                    consecutive_errors: { increment: 1 }
                }
            });
            throw scrapeError;
        }

        if (result.items.length === 0) {
            // Update Error Status
            await (prisma as any).carPriceSource.update({
                where: { id },
                data: {
                    last_status: 'error',
                    consecutive_errors: { increment: 1 }
                }
            });
            return NextResponse.json({ error: 'No data scraped from source' }, { status: 400 });
        }

        // 3. Update Database
        await prisma.$transaction(async (tx) => {
            // Delete old prices for this source
            await (tx as any).carPrice.deleteMany({
                where: { source_id: id }
            });

            // Insert new prices
            await (tx as any).carPrice.createMany({
                data: result.items.map(item => ({
                    source_id: id,
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
                where: { id },
                data: {
                    last_success_at: new Date(),
                    last_status: 'success',
                    consecutive_errors: 0
                }
            });
        });

        console.log(`[ManualUpdate] Updated ${result.items.length} prices for ${source.name}`);

        return NextResponse.json({
            success: true,
            message: `Updated ${result.items.length} prices`,
            count: result.items.length
        });

    } catch (error: any) {
        console.error('[ManualUpdate] Error:', error);

        // Ensure error status is set if we crash here (though likely handled above or we can't touch DB)
        // But for generic error catch:
        try {
            const { id: idStr } = await params;
            const id = Number(idStr);
            if (!isNaN(id)) {
                await (prisma as any).carPriceSource.update({
                    where: { id },
                    data: {
                        last_status: 'error',
                        consecutive_errors: { increment: 1 }
                    }
                });
            }
        } catch (e) { }

        return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
    }
}
