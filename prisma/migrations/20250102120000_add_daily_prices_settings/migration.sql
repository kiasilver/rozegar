-- AlterTable
ALTER TABLE "TelegramSettings" ADD COLUMN "daily_prices_auto_send" BOOLEAN DEFAULT false;
ALTER TABLE "TelegramSettings" ADD COLUMN "daily_prices_schedule" TEXT;
