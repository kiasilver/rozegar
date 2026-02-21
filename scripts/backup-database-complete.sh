#!/bin/bash

# اسکریپت backup کامل از دیتابیس PostgreSQL (با همه داده‌ها)

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ultimatecms_complete_backup_${TIMESTAMP}.sql"

# ایجاد پوشه backup اگر وجود ندارد
mkdir -p "$BACKUP_DIR"

echo "🗄️  شروع backup کامل از دیتابیس..."
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
    echo "✅ استفاده از pg_dump (کامل با همه داده‌ها)"
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-owner \
        --no-acl \
        --file="$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup کامل با موفقیت ایجاد شد: $BACKUP_FILE"
        # فشرده‌سازی
        echo "📦 در حال فشرده‌سازی..."
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup"
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "✅ استفاده از docker (postgres:15) - backup کامل"
    docker run --rm --network host \
        -e PGPASSWORD="$DB_PASS" \
        postgres:15 \
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-owner \
        --no-acl \
        > "$BACKUP_FILE" 2>&1
    
    if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
        echo "✅ Backup کامل با موفقیت ایجاد شد: $BACKUP_FILE"
        # بررسی محتوا
        echo "📊 بررسی محتوای backup..."
        TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE" 2>/dev/null || echo "0")
        DATA_COUNT=$(grep -c "COPY\|INSERT" "$BACKUP_FILE" 2>/dev/null || echo "0")
        echo "   تعداد جداول: $TABLE_COUNT"
        echo "   تعداد دستورات داده: $DATA_COUNT"
        
        # فشرده‌سازی
        echo "📦 در حال فشرده‌سازی..."
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup"
        cat "$BACKUP_FILE" 2>&1 | head -20
        exit 1
    fi
else
    echo "❌ pg_dump و docker پیدا نشدند"
    exit 1
fi

echo ""
echo "📊 خلاصه Backup کامل:"
echo "   فایل backup: $BACKUP_FILE"
echo "   حجم: $(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo 'نامشخص')"
echo "   تاریخ: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "✅ Backup کامل با همه داده‌ها انجام شد!"

