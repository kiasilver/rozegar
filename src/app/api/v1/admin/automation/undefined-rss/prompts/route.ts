/**
 * AI Prompts API - Database Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

// GET - List all prompts
export async function GET() {
    try {
        const prompts = await prisma.aIPrompt.findMany({
            where: { is_active: true },
            orderBy: [
                { target: 'asc' },
                { prompt_type: 'asc' },
            ],
        });

        // Group by target
        const grouped = {
            telegram: prompts.filter((p) => p.target === 'telegram'),
            website: prompts.filter((p) => p.target === 'website'),
            manual: prompts.filter((p) => p.target === 'manual'),
            combined: prompts.filter((p) => p.target === 'combined'),
        };

        return NextResponse.json({ success: true, data: prompts, grouped });
    } catch (error: any) {
        console.error('[AI Prompts] GET Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در دریافت پرامپت‌ها' },
            { status: 500 }
        );
    }
}

// POST - Create new prompt
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { key, target, prompt_type, content } = body;

        if (!key || !target || !prompt_type || !content) {
            return NextResponse.json(
                { success: false, error: 'فیلدهای الزامی مشخص نشده‌اند' },
                { status: 400 }
            );
        }

        const prompt = await prisma.aIPrompt.create({
            data: {
                key,
                target,
                prompt_type,
                content,
                is_active: true,
            },
        });

        return NextResponse.json({ success: true, data: prompt });
    } catch (error: any) {
        console.error('[AI Prompts] POST Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در ایجاد پرامپت' },
            { status: 500 }
        );
    }
}

// PUT - Update prompt
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'شناسه پرامپت مشخص نشده است' },
                { status: 400 }
            );
        }

        const { key, target, prompt_type, content, is_active } = updateData;

        // Only include fields that are present in the update
        const dataToUpdate: any = {};
        if (key !== undefined) dataToUpdate.key = key;
        if (target !== undefined) dataToUpdate.target = target;
        if (prompt_type !== undefined) dataToUpdate.prompt_type = prompt_type;
        if (content !== undefined) dataToUpdate.content = content;
        if (is_active !== undefined) dataToUpdate.is_active = is_active;
        // Always update updated_at
        dataToUpdate.updated_at = new Date();

        const prompt = await prisma.aIPrompt.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
        });

        return NextResponse.json({ success: true, data: prompt });
    } catch (error: any) {
        console.error('[AI Prompts] PUT Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در به‌روزرسانی پرامپت' },
            { status: 500 }
        );
    }
}

// DELETE - Remove prompt
export async function DELETE(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'شناسه پرامپت مشخص نشده است' },
                { status: 400 }
            );
        }

        await prisma.aIPrompt.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[AI Prompts] DELETE Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در حذف پرامپت' },
            { status: 500 }
        );
    }
}
