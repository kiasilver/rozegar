#!/bin/bash

# اسکریپت تست برای بررسی روزنامه‌های امروز
# این اسکریپت مشکلات احتمالی در دانلود و نمایش تاریخ را بررسی می‌کند

echo "🔍 شروع تست روزنامه‌های امروز..."
echo ""

# بررسی وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js یافت نشد. لطفاً Node.js را نصب کنید."
    exit 1
fi

# بررسی وجود tsx یا ts-node
if command -v tsx &> /dev/null; then
    RUNNER="tsx"
elif command -v ts-node &> /dev/null; then
    RUNNER="ts-node"
else
    echo "⚠️ tsx یا ts-node یافت نشد. در حال نصب tsx..."
    npm install -g tsx
    RUNNER="tsx"
fi

# تنظیم متغیرهای محیطی
export NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-"http://localhost:3000"}

# اجرای تست
echo "📝 در حال اجرای تست..."
echo ""

$RUNNER scripts/test-today-newspaper.ts

echo ""
echo "✅ تست کامل شد!"


