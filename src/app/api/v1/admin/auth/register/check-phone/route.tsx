// api/auth/register/check-phone/route.ts
import { NextResponse } from 'next/server';
import { sendOtp } from '@/lib/utils/sms';
import { prisma } from '@/lib/core/prisma';

export async function POST(req: Request) {
  const { phone, step } = await req.json();

  if (!phone || step !== 'otp') {
    return NextResponse.json({ message: 'شماره تلفن ضروری است' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  
  if (existingUser) {
    return NextResponse.json({ message: 'این شماره تماس قبلاً ثبت‌نام کرده است' }, { status: 409 }); // Conflict
  }

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        code: otp,
        expires_at: expiresAt
        
      },
    });

    await sendOtp(phone, otp);

    return NextResponse.json({ message: 'کد تأیید ارسال شد' }, { status: 200 });
  } catch (error) {
    console.error('❌ خطا در ارسال OTP:', error);
    return NextResponse.json({ message: 'ارسال OTP با مشکل مواجه شد' }, { status: 500 });
  }
}
