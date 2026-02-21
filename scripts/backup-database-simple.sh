#!/bin/bash

# اسکریپت backup کامل از دیتابیس PostgreSQL

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ultimatecms_backup_${TIMESTAMP}.sql"

# ایجاد پوشه backup اگر وجود ندارد
mkdir -p "$BACKUP_DIR"

echo "🗄️  شروع backup از دیتابیس..."
echo "📁 مسیر backup: $BACKUP_FILE"

# خواندن DATABASE_URL از .env
cd /root/www
DB_URL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
    echo "❌ خطا: DATABASE_URL در .env پیدا نشد"
    exit 1
fi

# استخراج اطلاعات از connection string
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 اطلاعات دیتابیس:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# بررسی وجود pg_dump
if command -v pg_dump &> /dev/null; then
    echo "✅ استفاده از pg_dump"
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --clean --if-exists \
        -f "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup با موفقیت ایجاد شد: $BACKUP_FILE"
        # فشرده‌سازی
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup"
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "✅ استفاده از docker (postgres:15)"
    docker run --rm --network host \
        -e PGPASSWORD="$DB_PASS" \
        postgres:15 \
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --clean --if-exists \
        > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
        echo "✅ Backup با موفقیت ایجاد شد: $BACKUP_FILE"
        # فشرده‌سازی
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup"
        cat "$BACKUP_FILE" 2>&1
        exit 1
    fi
else
    echo "❌ pg_dump و docker پیدا نشدند"
    exit 1
fi

echo ""
echo "📊 خلاصه:"
echo "   فایل backup: $BACKUP_FILE"
echo "   حجم: $(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo 'نامشخص')"
echo ""
echo "✅ Backup کامل شد!"

