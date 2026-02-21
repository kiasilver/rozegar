╔══════════════════════════════════════════════════════════════╗
║          راهنمای سریع دیدن لاگ‌های Backend                  ║
╚══════════════════════════════════════════════════════════════╝

📋 روش 1: استفاده از اسکریپت (پیشنهادی)
   ./view-logs.sh nextjs    # لاگ Next.js
   ./view-logs.sh errors   # فقط خطاها
   ./view-logs.sh all       # همه لاگ‌ها

📋 روش 2: دستورات مستقیم
   tail -f /tmp/nextjs.log              # لاگ Next.js (Real-time)
   tail -100 /tmp/nextjs.log            # آخرین 100 خط
   grep -i error /tmp/nextjs.log        # فقط خطاها
   docker logs -f www_db_1              # لاگ دیتابیس

📋 روش 3: Docker Compose
   docker-compose logs -f web          # لاگ سرویس web
   docker-compose logs -f db           # لاگ دیتابیس

📋 فایل راهنمای کامل: LOGS_GUIDE.md

