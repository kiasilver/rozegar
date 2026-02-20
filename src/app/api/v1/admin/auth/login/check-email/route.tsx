// app/(admin)/admin/api/auth/check-email/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { checkAntiAbuse, recordLoginAttempt, createAntiAbuseResponse } from '@/lib/security/anti-abuse';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ message: 'ایمیل الزامی است' }, { status: 400 });
  }

  // Anti-abuse check
  const abuseCheck = await checkAntiAbuse(req, email);
  if (!abuseCheck.allowed) {
    await recordLoginAttempt(req, 'email', false, email);
    return createAntiAbuseResponse(abuseCheck);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    await recordLoginAttempt(req, 'email', false, email);
    return NextResponse.json({ message: "کاربر یافت نشد!" }, { status: 409 });
  }

  await recordLoginAttempt(req, 'email', true, email);
  return NextResponse.json({ message: 'ایمیل معتبر است' }, { status: 200 });
}
