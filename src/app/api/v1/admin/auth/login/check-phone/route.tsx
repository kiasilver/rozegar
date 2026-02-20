// api/auth/register/check-phone/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { sendOtp } from '@/lib/utils/sms';
import { prisma } from '@/lib/core/prisma';
import { checkAntiAbuse, recordLoginAttempt, createAntiAbuseResponse } from '@/lib/security/anti-abuse';

export async function POST(req: NextRequest) {
  const { phone, step } = await req.json();

  if (!phone || step !== 'otp') {
    return NextResponse.json({ message: 'شماره تلفن ضروری است' }, { status: 400 });
  }

  // Anti-abuse check
  const abuseCheck = await checkAntiAbuse(req, undefined, phone);
  if (!abuseCheck.allowed) {
    await recordLoginAttempt(req, 'phone', false, undefined, phone);
    return createAntiAbuseResponse(abuseCheck);
  }

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  
  if (!existingUser) {
    await recordLoginAttempt(req, 'phone', false, undefined, phone);
    return NextResponse.json({ message: 'کابر یافت نشد!' }, { status: 409 }); // Conflict
  }

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        code: otp,
        expires_at: expiresAt,
        user_id: existingUser?.id ?? null, // این خط مهمه!
      },
    });

    await sendOtp(phone, otp);
    await recordLoginAttempt(req, 'phone', true, undefined, phone);

    return NextResponse.json({ message: 'کد تأیید ارسال شد' }, { status: 200 });
  } catch (error) {
    console.error('❌ خطا در ارسال OTP:', error);
    await recordLoginAttempt(req, 'phone', false, undefined, phone);
    return NextResponse.json({ message: 'ارسال OTP با مشکل مواجه شد' }, { status: 500 });
  }
}
