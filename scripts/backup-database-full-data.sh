#!/bin/bash

# اسکریپت backup کامل از دیتابیس PostgreSQL با تمام داده‌های جداول

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ultimatecms_full_backup_${TIMESTAMP}.sql"

# ایجاد پوشه backup اگر وجود ندارد
mkdir -p "$BACKUP_DIR"

echo "🗄️  شروع backup کامل از دیتابیس (با تمام داده‌های جداول)..."
echo "📁 مسیر backup: $BACKUP_FILE"
echo ""

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
echo ""

# بررسی وجود pg_dump
if command -v pg_dump &> /dev/null; then
    echo "✅ استفاده از pg_dump (کامل با تمام داده‌ها)"
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --no-owner \
        --no-acl \
        --inserts \
        --file="$BACKUP_FILE" 2>&1
    
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ Backup کامل با موفقیت ایجاد شد: $BACKUP_FILE"
        # بررسی محتوا
        echo "📊 بررسی محتوای backup..."
        TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE" 2>/dev/null || echo "0")
        INSERT_COUNT=$(grep -c "^INSERT INTO" "$BACKUP_FILE" 2>/dev/null || echo "0")
        COPY_COUNT=$(grep -c "^COPY" "$BACKUP_FILE" 2>/dev/null || echo "0")
        DATA_COUNT=$((INSERT_COUNT + COPY_COUNT))
        echo "   تعداد جداول: $TABLE_COUNT"
        echo "   تعداد دستورات داده (INSERT): $INSERT_COUNT"
        echo "   تعداد دستورات داده (COPY): $COPY_COUNT"
        echo "   مجموع دستورات داده: $DATA_COUNT"
        
        # فشرده‌سازی
        echo ""
        echo "📦 در حال فشرده‌سازی..."
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup (کد خروجی: $EXIT_CODE)"
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "✅ استفاده از docker (postgres:15) - backup کامل با تمام داده‌ها"
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
        --inserts \
        > "$BACKUP_FILE" 2>&1
    
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
        echo ""
        echo "✅ Backup کامل با موفقیت ایجاد شد: $BACKUP_FILE"
        # بررسی محتوا
        echo "📊 بررسی محتوای backup..."
        TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE" 2>/dev/null || echo "0")
        INSERT_COUNT=$(grep -c "^INSERT INTO" "$BACKUP_FILE" 2>/dev/null || echo "0")
        COPY_COUNT=$(grep -c "^COPY" "$BACKUP_FILE" 2>/dev/null || echo "0")
        DATA_COUNT=$((INSERT_COUNT + COPY_COUNT))
        ROW_COUNT=$(grep -E "^INSERT INTO|^COPY" "$BACKUP_FILE" | wc -l)
        echo "   تعداد جداول: $TABLE_COUNT"
        echo "   تعداد دستورات داده (INSERT): $INSERT_COUNT"
        echo "   تعداد دستورات داده (COPY): $COPY_COUNT"
        echo "   مجموع دستورات داده: $DATA_COUNT"
        
        # بررسی حجم فایل
        FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "   حجم فایل: $FILE_SIZE"
        
        # فشرده‌سازی
        echo ""
        echo "📦 در حال فشرده‌سازی..."
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo "✅ فایل فشرده شد: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup (کد خروجی: $EXIT_CODE)"
        if [ -f "$BACKUP_FILE" ]; then
            echo "📄 محتوای خطا:"
            head -30 "$BACKUP_FILE"
        fi
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
echo "   جداول: $TABLE_COUNT"
echo "   داده‌ها: $DATA_COUNT دستور"
echo ""
echo "✅ Backup کامل با تمام داده‌های جداول انجام شد!"

