/**
 * اسکریپت Debug برای بررسی دقیق دانلود و نمایش روزنامه‌ها
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const fs = require('fs');
const path = require('path');

async function debugNewspaperDownload() {
  console.log('🔍 شروع Debug کامل روزنامه‌ها...\n');
  console.log('='.repeat(80));

  try {
    // 1. بررسی فایل‌های موجود
    console.log('\n📁 بررسی فایل‌های موجود در /public/uploads/newspapers/');
    const newspapersDir = path.join(process.cwd(), 'public', 'uploads', 'newspapers');
    
    if (!fs.existsSync(newspapersDir)) {
      console.log('❌ پوشه newspapers وجود ندارد!');
      return;
    }

    const files = fs.readdirSync(newspapersDir);
    const pdfFiles = files.filter((f: string) => f.endsWith('.pdf'));
    const jpgFiles = files.filter((f: string) => f.endsWith('.jpg'));

    console.log(`📄 تعداد فایل‌های PDF: ${pdfFiles.length}`);
    console.log(`🖼️  تعداد فایل‌های JPG: ${jpgFiles.length}`);

    // بررسی فایل‌های با نام اشتباه
    const badPdfFiles = pdfFiles.filter((f: string) => f.includes('?date=') || f.includes('&date='));
    const badJpgFiles = jpgFiles.filter((f: string) => f.includes('?date=') || f.includes('&date='));

    if (badPdfFiles.length > 0) {
      console.log(`\n⚠️  فایل‌های PDF با نام اشتباه (${badPdfFiles.length}):`);
      badPdfFiles.forEach((f: string) => console.log(`   - ${f}`));
    }

    if (badJpgFiles.length > 0) {
      console.log(`\n⚠️  فایل‌های JPG با نام اشتباه (${badJpgFiles.length}):`);
      badJpgFiles.forEach((f: string) => console.log(`   - ${f}`));
    }

    // بررسی فایل‌های امروز
    const today = new Date();
    const todayInIran = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
      timeZone: 'Asia/Tehran',
    }).format(todayInIran);

    // تبدیل اعداد فارسی به انگلیسی
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const englishDigits = '0123456789';
    let dateStr = persianDate;
    for (let i = 0; i < 10; i++) {
      const regex = new RegExp(persianDigits[i], 'g');
      dateStr = dateStr.replace(regex, englishDigits[i]);
    }

    const parts = dateStr.split('/');
    const todayDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;

    console.log(`\n📅 تاریخ امروز: ${todayDateStr}`);

    // فایل‌های امروز
    const todayPdfFiles = pdfFiles.filter((f: string) => f.includes(todayDateStr) || f.includes(dateStr.replace(/\//g, '-')));
    const todayJpgFiles = jpgFiles.filter((f: string) => f.includes(todayDateStr) || f.includes(dateStr.replace(/\//g, '-')));

    console.log(`\n📰 فایل‌های PDF امروز (${todayPdfFiles.length}):`);
    todayPdfFiles.forEach((f: string) => {
      console.log(`   ✅ ${f}`);
      // بررسی نام
      const nameMatch = f.match(/^(.+?)-(\d{4}-\d{2}-\d{2})\.pdf$/);
      if (nameMatch) {
        const name = nameMatch[1];
        if (name.includes('?date=') || name.includes('&date=')) {
          console.log(`      ⚠️  نام شامل date parameter است!`);
        } else {
          console.log(`      ✅ نام صحیح: ${name}`);
        }
      }
    });

    // 2. تست API Archive
    console.log('\n' + '='.repeat(80));
    console.log('\n📚 تست API Archive');
    console.log('-'.repeat(80));

    const archiveResponse = await fetch(`${BASE_URL}/api/v1/public/newspapers/archive`);
    if (!archiveResponse.ok) {
      console.error(`❌ خطا در دریافت archive: ${archiveResponse.status}`);
      return;
    }

    const archiveData = await archiveResponse.json();
    console.log(`✅ تعداد روزنامه‌ها: ${archiveData.count}`);
    console.log(`📋 تاریخ‌های موجود: ${Object.keys(archiveData.groupedByDate || {}).join(', ')}`);

    if (archiveData.newspapers && archiveData.newspapers.length > 0) {
      console.log(`\n📰 لیست روزنامه‌ها:`);
      archiveData.newspapers.forEach((paper: any, index: number) => {
        console.log(`\n  ${index + 1}. ${paper.name}`);
        console.log(`     - فایل: ${paper.filename}`);
        console.log(`     - تاریخ: ${paper.dateStr}`);
        console.log(`     - روز هفته: ${paper.dayOfWeek}`);
        console.log(`     - PDF: ${paper.pdfUrl ? '✅' : '❌'}`);
        console.log(`     - تصویر: ${paper.imageUrl ? '✅' : '❌'}`);

        // بررسی مشکلات
        if (paper.name.includes('?date=') || paper.name.includes('&date=')) {
          console.log(`     ⚠️  مشکل: نام شامل date parameter است!`);
        }
        if (paper.filename && (paper.filename.includes('?date=') || paper.filename.includes('&date='))) {
          console.log(`     ⚠️  مشکل: نام فایل شامل date parameter است!`);
        }
        if (paper.dateStr) {
          const dateMatch = paper.dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            if (year > 1500) {
              console.log(`     ✅ فرمت تاریخ صحیح (شمسی: ${year})`);
            } else {
              console.log(`     ⚠️  فرمت تاریخ اشتباه (میلادی: ${year})`);
            }
          } else {
            console.log(`     ⚠️  فرمت تاریخ نامعتبر: ${paper.dateStr}`);
          }
        }
      });
    }

    // 3. تست نمایش تاریخ
    console.log('\n' + '='.repeat(80));
    console.log('\n📅 تست نمایش تاریخ');
    console.log('-'.repeat(80));

    const testDates = ['1404-12-02', '1404-11-30', '2025-02-19'];
    testDates.forEach((testDate) => {
      console.log(`\nتاریخ تست: ${testDate}`);
      const year = parseInt(testDate.split('-')[0]);
      if (year > 1500) {
        // تاریخ شمسی
        const parts = testDate.split('-');
        const persianYear = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        const gregorianYear = persianYear + 621;
        const gregorianYearAdjusted = month <= 6 ? gregorianYear : gregorianYear + 1;
        const date = new Date(Date.UTC(gregorianYearAdjusted, month - 1, day, 12, 0, 0));
        
        if (!isNaN(date.getTime())) {
          const formatted = new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            calendar: 'persian',
            timeZone: 'Asia/Tehran',
          }).format(date);
          console.log(`   فرمت شده: ${formatted}`);
        } else {
          console.log(`   ❌ تبدیل ناموفق`);
        }
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Debug کامل شد!');

  } catch (error: any) {
    console.error('❌ خطا در Debug:', error.message);
    console.error(error.stack);
  }
}

// اجرای Debug
debugNewspaperDownload().catch(console.error);


