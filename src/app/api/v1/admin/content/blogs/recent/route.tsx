import { NextResponse } from 'next/server';
import prisma from '@/lib/core/prisma'; // همین فایل خودت

export async function GET() {
  const blogs = await prisma.blog.findMany({
    orderBy: { created_at: 'desc' },
    take: 6,
    include: {
      blogcategory: {
        include: {
          translations: {
            where: { lang: 'FA' },
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(blogs);
}
