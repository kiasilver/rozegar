
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: NextRequest) {
    try {
        const sources = await prisma.carPriceSource.findMany({
            orderBy: { order: 'asc' }
        });
        return NextResponse.json(sources);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, url, is_active, order } = body;

        const newSource = await prisma.carPriceSource.create({
            data: {
                name,
                url,
                is_active: is_active ?? true,
                order: order ?? 0,
                schedule_time: body.schedule_time ?? null,
                telegram_image: body.telegram_image ?? null
            }
        });

        return NextResponse.json(newSource);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
