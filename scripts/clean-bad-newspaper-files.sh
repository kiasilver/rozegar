#!/bin/bash

# اسکریپت برای حذف فایل‌های روزنامه با نام اشتباه
# فایل‌هایی که شامل ?date= در نامشان هستند

NEWSPAPERS_DIR="/root/www/public/uploads/newspapers"

echo "🧹 شروع تمیز کردن فایل‌های روزنامه با نام اشتباه..."
echo ""

# شمارش فایل‌های مشکل‌دار
BAD_FILES=$(find "$NEWSPAPAPERS_DIR" -type f \( -name "*?date=*" -o -name "*&date=*" \) | wc -l)

if [ "$BAD_FILES" -eq 0 ]; then
    echo "✅ هیچ فایل مشکل‌داری یافت نشد."
    exit 0
fi

echo "⚠️  تعداد فایل‌های مشکل‌دار: $BAD_FILES"
echo ""
echo "فایل‌های مشکل‌دار:"
find "$NEWSPAPAPERS_DIR" -type f \( -name "*?date=*" -o -name "*&date=*" \) -ls

echo ""
read -p "آیا می‌خواهید این فایل‌ها را حذف کنید؟ (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  در حال حذف فایل‌ها..."
    find "$NEWSPAPAPERS_DIR" -type f \( -name "*?date=*" -o -name "*&date=*" \) -delete
    echo "✅ فایل‌ها حذف شدند."
else
    echo "❌ عملیات لغو شد."
fi


