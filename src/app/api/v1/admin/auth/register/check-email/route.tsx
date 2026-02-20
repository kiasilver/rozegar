// app/(admin)/admin/api/auth/check-email/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ message: 'ایمیل الزامی است' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ message: 'این ایمیل قبلاً ثبت شده است' }, { status: 409 });
  }

  return NextResponse.json({ message: 'ایمیل معتبر است' }, { status: 200 });
}
