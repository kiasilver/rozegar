// app/(admin)/admin/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// توابع برای تولید توکن JWT
async function generateJWT(userId: number) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

export async function POST(req: Request) {
  const customerRoleId = 6;
  const { email, password } = await req.json();

  // بررسی اطلاعات ورودی
  if (!email || !password) {
    return NextResponse.json({ message: 'اطلاعات ناقص است' }, { status: 400 });
  }

  // بررسی وجود کاربر با ایمیل مشابه
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ message: 'کاربر از قبل وجود دارد' }, { status: 409 });
  }

  // هش کردن پسورد
  const hashedPassword = await bcrypt.hash(password, 10);

  // ایجاد کاربر جدید
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: "Guest", // یا فیلد دلخواه
      userrole: {
        create: {
          role: {
            connect: { id: customerRoleId }
          }
        }
      }
    },
  });

  // تولید توکن JWT برای کاربر جدید
  const token = await generateJWT(newUser.id);

  // اضافه کردن توکن به کوکی‌ها
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  // ذخیره اطلاعات session در دیتابیس
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.userSession.create({
    data: {
      user_id: newUser.id,
      token,
      expires_at: expiresAt,
    },
  });

  // بازگشت پیام موفقیت
  return NextResponse.json({ message: 'ثبت‌نام با موفقیت انجام شد', user: newUser });
}
