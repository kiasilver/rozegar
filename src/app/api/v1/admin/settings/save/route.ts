import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { group_name, settings } = body;

        if (!Array.isArray(settings)) {
            return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 });
        }

        const updates = settings.map((s: { key: string; value: string }) => {
            return prisma.siteSetting.upsert({
                where: {
                    key: s.key
                },
                update: { value: s.value },
                create: {
                    group_name: group_name || 'general',
                    key: s.key,
                    value: s.value
                }
            });
        });

        await prisma.$transaction(updates);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Save Settings Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
