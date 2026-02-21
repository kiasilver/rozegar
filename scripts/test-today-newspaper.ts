/**
 * اسکریپت تست برای بررسی و دانلود PDF روزنامه‌های امروز
 * این اسکریپت مشکلات احتمالی در دانلود و نمایش تاریخ را بررسی می‌کند
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testTodayNewspaper() {
  console.log('🔍 شروع تست روزنامه‌های امروز...\n');

  try {
    // 1. دریافت تاریخ امروز
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
    const today8Digit = parts.length === 3 
      ? `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`
      : null;

    console.log(`📅 تاریخ امروز (شمسی): ${dateStr}`);
    console.log(`📅 تاریخ امروز (8 رقمی): ${today8Digit}\n`);

    // 2. تست API archive
    console.log('📚 تست API archive...');
    const archiveResponse = await fetch(`${BASE_URL}/api/v1/public/newspapers/archive`);
    if (!archiveResponse.ok) {
      console.error(`❌ خطا در دریافت archive: ${archiveResponse.status}`);
      return;
    }

    const archiveData = await archiveResponse.json();
    console.log(`✅ تعداد روزنامه‌های امروز در archive: ${archiveData.count}`);
    console.log(`📋 تاریخ‌های موجود: ${Object.keys(archiveData.groupedByDate || {}).join(', ')}\n`);

    // بررسی تاریخ‌های موجود
    if (archiveData.groupedByDate) {
      const dates = Object.keys(archiveData.groupedByDate);
      const todayDateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      
      if (dates.includes(todayDateStr)) {
        console.log(`✅ تاریخ امروز (${todayDateStr}) در archive موجود است`);
        const todayPapers = archiveData.groupedByDate[todayDateStr];
        console.log(`📰 تعداد روزنامه‌ها: ${todayPapers.length}`);
        
        // بررسی هر روزنامه
        todayPapers.forEach((paper: any, index: number) => {
          console.log(`\n  ${index + 1}. ${paper.name}`);
          console.log(`     - تاریخ: ${paper.dateStr}`);
          console.log(`     - روز هفته: ${paper.dayOfWeek}`);
          console.log(`     - PDF: ${paper.pdfUrl ? '✅ موجود' : '❌ موجود نیست'}`);
          console.log(`     - تصویر: ${paper.imageUrl ? '✅ موجود' : '❌ موجود نیست'}`);
          
          // بررسی فرمت تاریخ
          if (paper.dateStr) {
            const dateMatch = paper.dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (dateMatch) {
              const year = parseInt(dateMatch[1]);
              if (year > 1500) {
                console.log(`     - فرمت تاریخ: ✅ شمسی (${year})`);
              } else {
                console.log(`     - فرمت تاریخ: ⚠️ میلادی (${year}) - باید شمسی باشد!`);
              }
            } else {
              console.log(`     - فرمت تاریخ: ⚠️ نامعتبر (${paper.dateStr})`);
            }
          }
        });
      } else {
        console.log(`⚠️ تاریخ امروز (${todayDateStr}) در archive موجود نیست!`);
        console.log(`📋 تاریخ‌های موجود: ${dates.join(', ')}`);
      }
    }

    // 3. تست API newspapers
    console.log('\n\n📰 تست API newspapers...');
    const newspapersResponse = await fetch(`${BASE_URL}/api/v1/public/newspapers?forceDownload=false`);
    if (!newspapersResponse.ok) {
      console.error(`❌ خطا در دریافت newspapers: ${newspapersResponse.status}`);
      return;
    }

    const newspapersData = await newspapersResponse.json();
    if (newspapersData.success && newspapersData.newspapers) {
      console.log(`✅ تعداد روزنامه‌ها: ${newspapersData.newspapers.length}`);
      
      // بررسی URLهای PDF
      newspapersData.newspapers.forEach((paper: any, index: number) => {
        console.log(`\n  ${index + 1}. ${paper.persianName || paper.name}`);
        if (paper.pdfUrl) {
          // بررسی فرمت URL
          if (paper.pdfUrl.includes('pdfviewer.php')) {
            try {
              const urlObj = new URL(paper.pdfUrl);
              const paperParam = urlObj.searchParams.get('paper');
              const dateParam = urlObj.searchParams.get('date');
              
              console.log(`     - PDF URL: ${paper.pdfUrl}`);
              console.log(`     - نام روزنامه در URL: ${paperParam}`);
              console.log(`     - تاریخ در URL: ${dateParam}`);
              
              // بررسی مشکلات URL
              if (paper.pdfUrl.includes('?date=') && paper.pdfUrl.includes('&date=')) {
                console.log(`     - ⚠️ مشکل: URL شامل چندین date parameter است!`);
              }
              if (paperParam && (paperParam.includes('?date=') || paperParam.includes('&date='))) {
                console.log(`     - ⚠️ مشکل: نام روزنامه شامل date parameter است!`);
              }
              if (dateParam && dateParam.length !== 8) {
                console.log(`     - ⚠️ مشکل: طول تاریخ باید 8 رقم باشد (${dateParam.length} رقم)`);
              }
              if (dateParam && dateParam !== today8Digit) {
                console.log(`     - ⚠️ مشکل: تاریخ در URL (${dateParam}) با امروز (${today8Digit}) مطابقت ندارد!`);
              } else if (dateParam === today8Digit) {
                console.log(`     - ✅ تاریخ با امروز مطابقت دارد`);
              }
            } catch (e) {
              console.log(`     - ❌ خطا در پردازش URL: ${e}`);
            }
          } else {
            console.log(`     - PDF URL: ${paper.pdfUrl} (فایل محلی)`);
          }
        } else {
          console.log(`     - PDF: ❌ موجود نیست`);
        }
      });
    }

    // 4. تست دانلود اجباری (اختیاری)
    console.log('\n\n📥 تست دانلود اجباری (forceDownload=true)...');
    console.log('⚠️ این تست ممکن است زمان‌بر باشد...');
    
    const downloadResponse = await fetch(`${BASE_URL}/api/v1/public/newspapers?forceDownload=true`);
    if (downloadResponse.ok) {
      const downloadData = await downloadResponse.json();
      console.log(`✅ دانلود انجام شد`);
      console.log(`📰 تعداد روزنامه‌های دانلود شده: ${downloadData.newspapers?.length || 0}`);
    } else {
      console.log(`⚠️ خطا در دانلود: ${downloadResponse.status}`);
    }

    console.log('\n\n✅ تست کامل شد!');

  } catch (error: any) {
    console.error('❌ خطا در تست:', error.message);
    console.error(error.stack);
  }
}

// اجرای تست
testTodayNewspaper().catch(console.error);


