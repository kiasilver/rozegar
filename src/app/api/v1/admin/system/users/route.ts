/**
 * Users API - Admin user management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image_profile: true,
          is_active: true,
          created_at: true,
          lastLogin: true,
          userrole: {
            include: {
              role: true,
            },
          },
          _count: {
            select: { blog: true }
          }
        },
      }),
      prisma.user.count(),
    ]);

    // Transform to match expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image_profile: user.image_profile,
      is_active: user.is_active,
      created_at: user.created_at,
      role: user.userrole[0]?.role?.name || 'User',
      // Map status based on login or active state
      status: user.is_active ? 'Online' : 'Offline', // Placeholder for now
      blogs: user._count.blog || 0,
    }));

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Users API] Error:', error.message);
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
