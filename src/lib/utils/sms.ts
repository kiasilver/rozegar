// lib/sms.ts
import { Smsir } from 'sms-typescript';

import { prisma } from '@/lib/core/prisma'; // وارد کردن Prisma برای مدیریت دیتابیس

// کلید API و شماره خط خود را در اینجا وارد کنید
const apiKey = 'JkdFWbPtoacF6dczclHe4uH2R35wtqomzZrcABiUadxa9fh8'; // کلید API خود از پنل SMS.ir
const lineNumber = 30002108000718; // شماره خط از پنل SMS.ir

// ساخت نمونه از Smsir
const smsClient = new Smsir(apiKey, lineNumber);

// تابع ارسال OTP به شماره موبایل
export async function sendOtp(phone: string, otp: string) {
  try {
    const response = await smsClient.SendVerifyCode(
      phone,  // شماره موبایل گیرنده
      975769, // شناسه قالب (TemplateId) که از پنل sms.ir می‌گیرید
      [
        { name: 'Code', value: otp }  // پارامترهای قالب (کد OTP)
      ]
    );


    return response.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('ارسال کد تایید با مشکل مواجه شد');
  }
}

// تابع ذخیره OTP در دیتابیس
export async function storeOtp(phone: string) {


  try {
    console.log('📥 در حال جستجو برای کاربر با شماره تلفن:', phone);

    // جستجو برای کاربر با شماره تلفن
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      console.error('❌ کاربری با این شماره تلفن یافت نشد:', phone);
      throw new Error('کاربری با این شماره تلفن یافت نشد');
    }

    console.log('📚 کاربر یافت شد:', user);

    // بروزرسانی دیتابیس


    console.log('✅ OTP در دیتابیس ذخیره شد');
  } catch (error) {
    console.error('❌ خطا در ذخیره OTP:', error);
    throw error;
  }
}


// تابع برای اعتبارسنجی OTP
