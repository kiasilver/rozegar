import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idStr } = await params;
        const id = Number(idStr);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        await prisma.carPriceSource.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idStr } = await params;
        const id = Number(idStr);
        const data = await req.json();
        const { name, url, is_active, telegram_enabled, order } = data;

        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const updated = await prisma.carPriceSource.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(url && { url }),
                ...(is_active !== undefined && { is_active }),
                ...(telegram_enabled !== undefined && { telegram_enabled }),
                ...(order !== undefined && { order: Number(order) }),
                ...(data.schedule_time !== undefined && { schedule_time: data.schedule_time }),
                ...(data.telegram_image !== undefined && { telegram_image: data.telegram_image })
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating source:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
