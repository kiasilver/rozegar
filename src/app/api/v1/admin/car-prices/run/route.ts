
import { NextRequest, NextResponse } from 'next/server';
import { runCarPriceJob } from '@/lib/automation/car-price/car-price-scheduler';

export async function POST(req: NextRequest) {
    try {
        // Trigger the job
        // Returning success first, but maybe we want to await?
        // Let's await to catch immediate errors.
        // Let's await to catch immediate errors.
        await runCarPriceJob({ isManual: true });

        return NextResponse.json({ success: true, message: 'Job finished successfully.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
