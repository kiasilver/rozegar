import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

async function generateJWT(userId: number, role: string, permissions: string[]) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ userId, role, permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  return token;
}

export async function POST(req: Request) {
  const { phone, otp } = await req.json();
  const customerRoleId = 10;

  if (!phone || !otp) {
    return NextResponse.json({ message: '????? ???? ? ?? ????? ?????? ???' }, { status: 400 });
  }

  try {
    let existingUser = await prisma.user.findUnique({
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

    const otpRecord = await prisma.verificationCode.findFirst({
      where: {
        code: otp,
        User: existingUser ? { id: existingUser.id } : undefined,
        expires_at: { gt: new Date() }
      },
      orderBy: { expires_at: 'desc' }
    });

    if (!otpRecord) {
      return NextResponse.json({ message: '?? ???? ??? ??????? ?? ????? ??? ???' }, { status: 401 });
    }

    // ??? ????? ???? ?????? ????? ????????
    let userId = existingUser?.id;

    if (!existingUser) {
      const newUser = await prisma.user.create({
        data: {
          phone,
          name: '????? ????',
          userrole: {
            create: {
              role: { connect: { id: customerRoleId } }
            }
          }
        },
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

      userId = newUser.id;
      existingUser = newUser;

      await prisma.verificationCode.update({
        where: { id: otpRecord.id },
        data: { user_id: userId }
      });
    }

    // ????? ??? ? ??????
    const roleData = existingUser.userrole[0]?.role;
    const userRole = roleData?.name || 'customer';
    const permissions = roleData?.rolepermission.map(rp => rp.permission?.name || '') ?? [];

    // ???? JWT
    const token = await generateJWT(userId!, userRole, permissions);

    // ????? ???? ?? ????
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // ????? ?? ???? sessions
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await prisma.userSession.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
      }
    });

    return NextResponse.json({
      message: '???? ?? ?????? ????? ??',
      user: {
        id: userId,
        role: userRole,
        permissions,
      }
    }, { status: 200 });
    

  } catch (error) {
    console.error('? ??? ?? ?????????? OTP:', error);
    return NextResponse.json({ message: '??? ?? ??????????' }, { status: 500 });
  }
}
