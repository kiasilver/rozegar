/**
 * RSS Sources API - Per Category Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

// GET - List all RSS sources grouped by category
export async function GET() {
    try {
        const sources = await prisma.rSSSource.findMany({
            where: { is_active: true },
            orderBy: [
                { category_id: 'asc' },
                { priority: 'desc' },
            ],
            include: {
                category: {
                    include: {
                        translations: true,
                    },
                },
            },
        });

        return NextResponse.json({ success: true, data: sources });
    } catch (error: any) {
        console.error('[RSS Sources] GET Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در دریافت منابع RSS' },
            { status: 500 }
        );
    }
}

// POST - Add new RSS source
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category_id, rss_url, target, priority } = body;

        if (!category_id || !rss_url || !target) {
            return NextResponse.json(
                { success: false, error: 'فیلدهای الزامی مشخص نشده‌اند' },
                { status: 400 }
            );
        }

        const source = await prisma.rSSSource.create({
            data: {
                category_id: parseInt(category_id),
                rss_url,
                target, // 'telegram', 'website', or 'both'
                priority: priority || 0,
                is_active: true,
            },
        });

        return NextResponse.json({ success: true, data: source });
    } catch (error: any) {
        console.error('[RSS Sources] POST Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در ایجاد منبع RSS' },
            { status: 500 }
        );
    }
}

// PUT - Update existing RSS source
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'شناسه منبع RSS مشخص نشده است' },
                { status: 400 }
            );
        }

        const source = await prisma.rSSSource.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: source });
    } catch (error: any) {
        console.error('[RSS Sources] PUT Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در به‌روزرسانی منبع RSS' },
            { status: 500 }
        );
    }
}

// DELETE - Remove RSS source
export async function DELETE(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'شناسه منبع RSS مشخص نشده است' },
                { status: 400 }
            );
        }

        await prisma.rSSSource.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[RSS Sources] DELETE Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'خطا در حذف منبع RSS' },
            { status: 500 }
        );
    }
}
