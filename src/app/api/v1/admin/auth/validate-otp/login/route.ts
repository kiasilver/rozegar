import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { checkAntiAbuse, recordLoginAttempt, createAntiAbuseResponse } from '@/lib/security/anti-abuse';

// ???? ???? ???? userId? ??? ? ?????????
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
  const { phone, otp } = await req.json();

  if (!phone || !otp) {
    return NextResponse.json({ message: '????? ???? ? ?? ????? ?????? ???' }, { status: 400 });
  }

  // Anti-abuse check
  const abuseCheck = await checkAntiAbuse(req, undefined, phone);
  if (!abuseCheck.allowed) {
    await recordLoginAttempt(req, 'otp', false, undefined, phone);
    return createAntiAbuseResponse(abuseCheck);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      include: {
        userrole: {
          include: {
            role: {
              include: {
                rolepermission: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!existingUser) {
      await recordLoginAttempt(req, 'otp', false, undefined, phone);
      return NextResponse.json({ message: '?????? ?? ??? ????? ???? ???' }, { status: 404 });
    }

    const otpRecord = await prisma.verificationCode.findFirst({
      where: {
        code: otp,
        user_id: existingUser.id,
        expires_at: { gt: new Date() }
      },
      orderBy: { expires_at: 'desc' }
    });

    if (!otpRecord) {
      await recordLoginAttempt(req, 'otp', false, undefined, phone);
      return NextResponse.json({ message: '?? ???? ??? ??????? ?? ????? ??? ???' }, { status: 401 });
    }

    // ????? ??? ? ?????????
    const roleData = existingUser.userrole[0]?.role;
    const userRole = roleData?.name || 'guest';
    const permissions = roleData?.rolepermission.map(rp => rp.permission?.name || '') ?? [];

    // ???? JWT
    const token = await generateJWT(existingUser.id, userRole, permissions);

    // ????? ?? ????
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 ???
    });

    // ????? ?? ???????
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await prisma.userSession.create({
      data: {
        user_id: existingUser.id,
        token,
        expires_at: expiresAt,
      }
    });

    // Record successful login attempt
    await recordLoginAttempt(req, 'otp', true, undefined, phone);

    return NextResponse.json({
      message: '???? ?? ?????? ????? ??',
      user: {
        id: existingUser.id,
        role: userRole,
        permissions,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('? ??? ?? ????? ?? OTP:', error);
    await recordLoginAttempt(req, 'otp', false, undefined, phone);
    return NextResponse.json({ message: '??? ?? ??????????' }, { status: 500 });
  }
}
