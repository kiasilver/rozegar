import jwt from 'jsonwebtoken';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/core/prisma';

interface TokenPayload {
  userId: number;
  phone: string;
}

// تابع کمکی برای ساخت توکن
export function generateJwtToken(payload: TokenPayload) {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return token;
  } catch (error) {
    console.error('❌ خطا در ساخت توکن:', error);
    throw new Error('خطا در ساخت توکن');
  }
}

// تابع کمکی برای verify کردن JWT و دریافت role
export async function verifyJWT(token: string): Promise<{ userId: number; role: string; phone: string }> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const userId = Number(payload.userId);
    if (!userId) {
      throw new Error('Invalid token payload');
    }
    
    // دریافت role از دیتابیس از طریق UserRole relation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        userrole: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // دریافت role از UserRole (اولین role)
    const role = user.userrole[0]?.role?.name || 'guest';
    
    return {
      userId,
      role,
      phone: user.phone || '',
    };
  } catch (error) {
    console.error('❌ خطا در verify کردن توکن:', error);
    throw new Error('Invalid or expired token');
  }
}
