
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { scrapeCarPrices } from '@/lib/automation/car-price/car-price-scraper';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr);

        // 1. Get Source
        const source = await prisma.carPriceSource.findUnique({
            where: { id }
        });

        if (!source) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // 2. Scrape Data
        const result = await scrapeCarPrices(source.url, source.name);

        if (result.items.length === 0) {
            return NextResponse.json({ error: 'No data scraped or source is empty' }, { status: 400 });
        }

        // 3. Save to Database
        await prisma.$transaction(async (tx) => {
            // Delete old prices for this source
            await tx.carPrice.deleteMany({
                where: { source_id: source.id }
            });

            // Insert new prices
            await tx.carPrice.createMany({
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
        });

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${result.items.length} items for ${source.name}`,
            count: result.items.length
        });

    } catch (error: any) {
        console.error('Manual Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
