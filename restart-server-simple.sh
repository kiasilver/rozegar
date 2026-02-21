#!/bin/bash

# اسکریپت ساده برای restart کردن سرور
# این نسخه فقط next-server را kill و restart می‌کند

set -e

cd /root/www

echo "🔄 Restart کردن سرور..."

# پیدا کردن و kill کردن next-server
NEXT_PID=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}')

if [ ! -z "$NEXT_PID" ]; then
    echo "⏹️  متوقف کردن next-server (PID: $NEXT_PID)..."
    kill -TERM $NEXT_PID 2>/dev/null || kill -9 $NEXT_PID 2>/dev/null || true
    sleep 3
fi

# kill کردن npm run dev اگر در حال اجرا است
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# راه‌اندازی مجدد
echo "🚀 راه‌اندازی مجدد..."
nohup npm start > /tmp/nextjs-restart.log 2>&1 &

sleep 5

echo "✅ Restart کامل شد!"
echo "📋 لاگ: tail -f /tmp/nextjs-restart.log"

