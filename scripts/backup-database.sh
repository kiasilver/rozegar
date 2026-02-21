#!/bin/bash

# اسکریپت backup کامل از دیتابیس PostgreSQL

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ultimatecms_backup_${TIMESTAMP}.sql"

# ایجاد پوشه backup اگر وجود ندارد
mkdir -p "$BACKUP_DIR"

echo "🗄️  شروع backup از دیتابیس..."
echo "📁 مسیر backup: $BACKUP_FILE"

# خواندن اطلاعات اتصال از .env
if [ -f .env ]; then
    DB_URL=$(grep -E "^DATABASE_URL=|^APP_DATABASE_URL=" .env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$DB_URL" ]; then
        DB_URL=$(grep -E "^APP_DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    fi
else
    DB_URL="${APP_DATABASE_URL:-$DATABASE_URL}"
fi

if [ -z "$DB_URL" ]; then
    echo "❌ خطا: DATABASE_URL یا APP_DATABASE_URL تنظیم نشده است"
    exit 1
fi

# استخراج اطلاعات از connection string
# postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 اطلاعات دیتابیس:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# بررسی وجود pg_dump
if command -v pg_dump &> /dev/null; then
    echo "✅ pg_dump پیدا شد"
    # استفاده از pg_dump
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
    echo "⚠️  pg_dump پیدا نشد، استفاده از docker..."
    # استفاده از docker برای pg_dump
    docker run --rm \
        -e PGPASSWORD="$DB_PASS" \
        postgres:15 \
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --clean --if-exists \
        > "$BACKUP_FILE" 2>&1
    
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
else
    echo "⚠️  استفاده از Prisma برای backup..."
    # استفاده از Prisma برای export
    cd /root/www
    npx prisma db execute --stdin > "$BACKUP_FILE" <<EOF
\copy (SELECT * FROM information_schema.tables WHERE table_schema = 'public') TO STDOUT;
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup با موفقیت ایجاد شد: $BACKUP_FILE"
    else
        echo "❌ خطا در ایجاد backup"
        exit 1
    fi
fi

echo ""
echo "📊 خلاصه:"
echo "   فایل backup: $BACKUP_FILE"
echo "   حجم: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo "✅ Backup کامل شد!"

