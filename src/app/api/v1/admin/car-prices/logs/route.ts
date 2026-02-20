import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const skip = (page - 1) * limit;
        const all = searchParams.get('all') === 'true'; // Get all logs for debugging

        // Get car price logs - search in title for car price related logs
        let where: any = {};

        if (!all) {
            where = {
                title: { startsWith: 'قیمت خودرو' }
            };
        }
        // If all=true, where will be empty object to get all logs

        console.log('[CarPriceLogs] Fetching logs with where:', JSON.stringify(where), 'all:', all);

        const [logs, total] = await Promise.all([
            (prisma as any).unifiedRSSLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    title: true,
                    target: true,
                    telegram_sent: true,
                    telegram_status: true,
                    telegram_error: true,
                    telegram_message_id: true,
                    telegram_content: true,
                    created_at: true,
                    processed_at: true,
                },
            }),
            (prisma as any).unifiedRSSLog.count({ where }),
        ]);

        console.log('[CarPriceLogs] Found logs:', logs.length, 'Total:', total);

        return NextResponse.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        console.error('[CarPriceLogs] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const action = searchParams.get('action');

        if (action === 'clear_errors') {
            const result = await (prisma as any).unifiedRSSLog.deleteMany({
                where: {
                    title: { startsWith: 'قیمت خودرو' },
                    telegram_status: 'error'
                }
            });
            return NextResponse.json({ success: true, count: result.count });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[CarPriceLogs] Delete Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

