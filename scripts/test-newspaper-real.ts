/**
 * تست واقعی و کامل روزنامه‌ها
 * بررسی همخوانی عکس، PDF، نام و تاریخ
 */

const fs = require('fs');
const path = require('path');

async function testNewspaperReal() {
  console.log('🔍 تست واقعی و کامل روزنامه‌ها...\n');
  console.log('='.repeat(80));

  const newspapersDir = path.join(process.cwd(), 'public', 'uploads', 'newspapers');
  
  if (!fs.existsSync(newspapersDir)) {
    console.log('❌ پوشه newspapers وجود ندارد!');
    return;
  }

  // دریافت تاریخ امروز
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
  const todayDateStrPersian = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;

  console.log(`📅 تاریخ امروز: ${todayDateStr}\n`);

  // خواندن فایل‌های PDF
  const files = fs.readdirSync(newspapersDir);
  const pdfFiles = files.filter((f: string) => f.endsWith('.pdf'));
  const jpgFiles = files.filter((f: string) => f.endsWith('.jpg'));

  console.log(`📄 تعداد فایل‌های PDF: ${pdfFiles.length}`);
  console.log(`🖼️  تعداد فایل‌های JPG: ${jpgFiles.length}\n`);

  // بررسی فایل‌های امروز (با پشتیبانی از اعداد فارسی و انگلیسی)
  const todayPdfFiles = pdfFiles.filter((f: string) => {
    // بررسی با اعداد انگلیسی
    if (f.includes(todayDateStr) || f.includes(dateStr.replace(/\//g, '-'))) {
      return true;
    }
    // بررسی با اعداد فارسی
    const persianDateStr = persianDate.replace(/\//g, '-');
    if (f.includes(persianDateStr)) {
      return true;
    }
    // بررسی با فرمت YYYY-MM-DD فارسی
    const persianYear = parts[0];
    const persianMonth = parts[1];
    const persianDay = parts[2];
    // تبدیل اعداد انگلیسی به فارسی برای مقایسه
    let persianDateForMatch = '';
    for (let i = 0; i < persianYear.length; i++) {
      const digit = parseInt(persianYear[i]);
      if (!isNaN(digit)) {
        persianDateForMatch += persianDigits[digit];
      }
    }
    persianDateForMatch += '-';
    for (let i = 0; i < persianMonth.length; i++) {
      const digit = parseInt(persianMonth[i]);
      if (!isNaN(digit)) {
        persianDateForMatch += persianDigits[digit];
      }
    }
    persianDateForMatch += '-';
    for (let i = 0; i < persianDay.length; i++) {
      const digit = parseInt(persianDay[i]);
      if (!isNaN(digit)) {
        persianDateForMatch += persianDigits[digit];
      }
    }
    return f.includes(persianDateForMatch);
  });

  console.log(`📰 فایل‌های PDF امروز: ${todayPdfFiles.length}\n`);

  const results: any[] = [];

  for (const pdfFile of todayPdfFiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 بررسی: ${pdfFile}`);
    console.log('-'.repeat(80));

    const result: any = {
      pdfFile,
      errors: [],
      warnings: [],
      success: true
    };

    // 1. بررسی نام فایل (با پشتیبانی از اعداد فارسی و انگلیسی)
    const nameMatch = pdfFile.match(/^(.+?)-(\d{4}-\d{2}-\d{2})\.pdf$/);
    let dateFromFile = '';
    
    if (nameMatch) {
      result.newspaperName = nameMatch[1];
      dateFromFile = nameMatch[2];
    } else {
      // بررسی با اعداد فارسی
      const persianMatch = pdfFile.match(/^(.+?)-([\u06F0-\u06F9]{4}-[\u06F0-\u06F9]{2}-[\u06F0-\u06F9]{2})\.pdf$/);
      if (persianMatch) {
        result.newspaperName = persianMatch[1];
        dateFromFile = persianMatch[2];
        // تبدیل اعداد فارسی به انگلیسی
        for (let i = 0; i < 10; i++) {
          const regex = new RegExp(persianDigits[i], 'g');
          dateFromFile = dateFromFile.replace(regex, englishDigits[i]);
        }
      } else {
        result.errors.push('❌ فرمت نام فایل نامعتبر است');
        result.success = false;
        results.push(result);
        continue;
      }
    }
    
    result.dateFromFilename = dateFromFile;

    // بررسی نام شامل کاراکترهای اضافی
    if (result.newspaperName.includes('?date=') || result.newspaperName.includes('&date=')) {
      result.errors.push(`❌ نام شامل کاراکترهای اضافی: ${result.newspaperName}`);
      result.success = false;
    } else {
      console.log(`✅ نام صحیح: ${result.newspaperName}`);
    }

    // 2. بررسی تاریخ
    if (result.dateFromFilename) {
      // تبدیل اعداد فارسی به انگلیسی اگر لازم باشد
      let cleanDate = result.dateFromFilename;
      for (let i = 0; i < 10; i++) {
        const regex = new RegExp(persianDigits[i], 'g');
        cleanDate = cleanDate.replace(regex, englishDigits[i]);
      }

      if (cleanDate === todayDateStr) {
        console.log(`✅ تاریخ صحیح: ${cleanDate}`);
      } else {
        result.errors.push(`❌ تاریخ اشتباه: ${cleanDate} (امروز: ${todayDateStr})`);
        result.success = false;
      }
    }

    // 3. بررسی وجود فایل PDF
    const pdfPath = path.join(newspapersDir, pdfFile);
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`✅ فایل PDF موجود (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      result.pdfSize = stats.size;
    } else {
      result.errors.push('❌ فایل PDF وجود ندارد');
      result.success = false;
    }

    // 4. بررسی وجود فایل تصویر
    const jpgFile = pdfFile.replace('.pdf', '.jpg');
    const jpgPath = path.join(newspapersDir, jpgFile);
    
    if (fs.existsSync(jpgPath)) {
      const stats = fs.statSync(jpgPath);
      console.log(`✅ فایل تصویر موجود (${(stats.size / 1024).toFixed(2)} KB)`);
      result.imageSize = stats.size;
      result.hasImage = true;
    } else {
      result.warnings.push(`⚠️  فایل تصویر وجود ندارد: ${jpgFile}`);
      result.hasImage = false;
    }

    // 5. بررسی همخوانی نام PDF و تصویر
    if (result.hasImage) {
      const imageNameMatch = jpgFile.match(/^(.+?)-(\d{4}-\d{2}-\d{2})\.jpg$/);
      if (imageNameMatch) {
        const imageName = imageNameMatch[1];
        if (imageName === result.newspaperName) {
          console.log(`✅ نام PDF و تصویر همخوانی دارند`);
        } else {
          result.errors.push(`❌ نام PDF و تصویر همخوانی ندارند: PDF=${result.newspaperName}, Image=${imageName}`);
          result.success = false;
        }
      }
    }

    results.push(result);
  }

  // خلاصه نتایج
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 خلاصه نتایج:');
  console.log('-'.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const warningCount = results.filter(r => r.warnings.length > 0).length;

  console.log(`✅ موفق: ${successCount}`);
  console.log(`❌ خطا: ${errorCount}`);
  console.log(`⚠️  هشدار: ${warningCount}`);

  if (errorCount > 0) {
    console.log(`\n❌ فایل‌های با خطا:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`\n  📄 ${r.pdfFile}`);
      r.errors.forEach((e: string) => console.log(`     ${e}`));
    });
  }

  if (warningCount > 0) {
    console.log(`\n⚠️  فایل‌های با هشدار:`);
    results.filter(r => r.warnings.length > 0).forEach(r => {
      console.log(`\n  📄 ${r.pdfFile}`);
      r.warnings.forEach((w: string) => console.log(`     ${w}`));
    });
  }

  // تست API
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n🌐 تست API Archive:');
  console.log('-'.repeat(80));

  try {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${BASE_URL}/api/v1/public/newspapers/archive`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API پاسخ داد: ${data.count} روزنامه`);
      
      if (data.newspapers && data.newspapers.length > 0) {
        console.log(`\n📰 روزنامه‌های API:`);
        data.newspapers.forEach((paper: any, index: number) => {
          console.log(`\n  ${index + 1}. ${paper.name}`);
          console.log(`     - فایل: ${paper.filename}`);
          console.log(`     - تاریخ: ${paper.dateStr}`);
          console.log(`     - روز هفته: ${paper.dayOfWeek}`);
          
          // بررسی مشکلات
          const issues: string[] = [];
          if (paper.name.includes('?date=') || paper.name.includes('&date=')) {
            issues.push('❌ نام شامل date parameter');
          }
          if (paper.filename && (paper.filename.includes('?date=') || paper.filename.includes('&date='))) {
            issues.push('❌ نام فایل شامل date parameter');
          }
          if (paper.dateStr !== todayDateStr) {
            issues.push(`❌ تاریخ اشتباه: ${paper.dateStr} (امروز: ${todayDateStr})`);
          }
          
          if (issues.length > 0) {
            issues.forEach(i => console.log(`     ${i}`));
          } else {
            console.log(`     ✅ همه چیز درست است`);
          }
        });
      }
    } else {
      console.log(`❌ خطا در API: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`❌ خطا در تست API: ${error.message}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\n✅ تست کامل شد!');
}

testNewspaperReal().catch(console.error);

