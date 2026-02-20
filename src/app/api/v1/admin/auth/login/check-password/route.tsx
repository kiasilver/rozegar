import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { checkAntiAbuse, recordLoginAttempt, createAntiAbuseResponse } from '@/lib/security/anti-abuse';

async function generateJWT(userId: number, role: string, permissions: string[]) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  const token = await new SignJWT({ userId, role, permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!password || !email) {
    return NextResponse.json({ message: 'ایمیل و پسورد را وارد نمایید' }, { status: 400 });
  }

  // Anti-abuse check
  const abuseCheck = await checkAntiAbuse(req, email);
  if (!abuseCheck.allowed) {
    await recordLoginAttempt(req, 'password', false, email);
    return createAntiAbuseResponse(abuseCheck);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      userrole: {
        include: {
          role: {
            include: {
              rolepermission: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!existingUser) {
    await recordLoginAttempt(req, 'password', false, email);
    return NextResponse.json({ message: 'کاربر یافت نشد!' }, { status: 404 });
  }

  const passwordMatch = await bcrypt.compare(password, existingUser.password!);
  if (!passwordMatch) {
    await recordLoginAttempt(req, 'password', false, email);
    return NextResponse.json({ message: 'پسورد اشتباه است' }, { status: 401 });
  }

  // گرفتن نقش و دسترسی‌ها
  const roleData = existingUser.userrole[0]?.role;
  const userRole = roleData?.name || 'guest';
  const permissions = roleData?.rolepermission.map(
    (rp) => rp.permission?.name || ''
  ) ?? [];

  const token = await generateJWT(existingUser.id, userRole, permissions);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 روز
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.userSession.create({
    data: {
      user_id: existingUser.id,
      token,
      expires_at: expiresAt,
    },
  });

  // Record successful login attempt
  await recordLoginAttempt(req, 'password', true, email);

  return NextResponse.json({
    message: 'ورود با موفقیت انجام شد',
    user: {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: userRole,
      permissions,
    },
  });
}
