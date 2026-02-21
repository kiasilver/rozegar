/**
 * اسکریپت تست برای بررسی مشکل timeout در دانلود PDF
 */

import fetch from 'node-fetch';

// تنظیمات
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';
const TEST_URL = `${BASE_URL}/api/v1/public/newspapers?forceDownload=true`;

async function testPDFDownload() {
  console.log('🧪 شروع تست دانلود PDF...\n');
  console.log(`📍 URL تست: ${TEST_URL}\n`);

  const startTime = Date.now();
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // ایجاد AbortController برای timeout
    const controller = new AbortController();
    
    // تنظیم timeout (5 دقیقه)
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes
    timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`\n❌ Timeout بعد از ${TIMEOUT / 1000} ثانیه!`);
    }, TIMEOUT);

    console.log(`⏱️  Timeout تنظیم شده: ${TIMEOUT / 1000} ثانیه\n`);

    // درخواست با timeout
    const response = await fetch(TEST_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal as any,
      timeout: TIMEOUT,
    } as any);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ پاسخ دریافت شد بعد از ${elapsedTime.toFixed(2)} ثانیه`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ خطا در پاسخ:`);
      console.error(errorText.substring(0, 500));
      return;
    }

    const data = await response.json();
    
    console.log(`\n📰 تعداد روزنامه‌ها: ${data.count || 0}`);
    console.log(`📄 روزنامه‌های با PDF: ${data.newspapers?.filter((p: any) => p.pdfUrl).length || 0}\n`);

    // بررسی روزنامه‌های با PDF
    const newspapersWithPDF = data.newspapers?.filter((p: any) => p.pdfUrl) || [];
    
    if (newspapersWithPDF.length > 0) {
      console.log('📋 لیست روزنامه‌های با PDF:');
      newspapersWithPDF.slice(0, 5).forEach((paper: any, index: number) => {
        console.log(`  ${index + 1}. ${paper.name || paper.persianName || 'نامشخص'}`);
        console.log(`     PDF URL: ${paper.pdfUrl?.substring(0, 80)}...`);
      });
      if (newspapersWithPDF.length > 5) {
        console.log(`  ... و ${newspapersWithPDF.length - 5} مورد دیگر`);
      }
    } else {
      console.log('⚠️  هیچ روزنامه‌ای با PDF پیدا نشد');
    }

    console.log(`\n✅ تست کامل شد در ${elapsedTime.toFixed(2)} ثانیه`);

  } catch (error: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const elapsedTime = (Date.now() - startTime) / 1000;
    
    console.error(`\n❌ خطا بعد از ${elapsedTime.toFixed(2)} ثانیه:`);
    
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      console.error('⏱️  مشکل: Timeout - درخواست بیش از حد طول کشید');
      console.error(`💡 پیشنهاد: timeout را افزایش دهید یا دانلود را به صورت async انجام دهید`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 مشکل: اتصال رد شد - سرور در حال اجرا نیست');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 مشکل: DNS - آدرس سرور پیدا نشد');
    } else {
      console.error(`📝 خطا: ${error.message || error}`);
      console.error(`📝 نوع خطا: ${error.name || 'Unknown'}`);
      console.error(`📝 کد خطا: ${error.code || 'N/A'}`);
    }

    // نمایش stack trace برای دیباگ
    if (error.stack) {
      console.error('\n📚 Stack Trace:');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

// اجرای تست
testPDFDownload()
  .then(() => {
    console.log('\n✨ تست به پایان رسید');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 خطای غیرمنتظره:', error);
    process.exit(1);
  });

