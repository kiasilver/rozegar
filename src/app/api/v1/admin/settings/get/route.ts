import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const group = searchParams.get('group');

        const where: any = {};
        if (group) {
            where.group_name = group;
        }

        const settings = await prisma.siteSetting.findMany({
            where: where
        });

        return NextResponse.json({ settings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
