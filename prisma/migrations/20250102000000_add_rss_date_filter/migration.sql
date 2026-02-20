-- AlterTable
ALTER TABLE "TelegramSettings" ADD COLUMN IF NOT EXISTS "rss_date_filter" VARCHAR(20) DEFAULT 'today';
