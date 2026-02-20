-- CreateTable
CREATE TABLE "UnifiedRSSSettings" (
    "id" SERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "site_url" VARCHAR(500),
    "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
    "telegram_auto_start" BOOLEAN NOT NULL DEFAULT false,
    "telegram_bot_token" VARCHAR(255),
    "telegram_channel_id" VARCHAR(100),
    "telegram_language" VARCHAR(5) NOT NULL DEFAULT 'fa',
    "telegram_content_length" VARCHAR(20) NOT NULL DEFAULT 'short',
    "telegram_tone" VARCHAR(50) NOT NULL DEFAULT 'reporter',
    "telegram_enable_video" BOOLEAN NOT NULL DEFAULT false,
    "telegram_enable_watermark" BOOLEAN NOT NULL DEFAULT true,
    "telegram_rss_feeds" TEXT,
    "telegram_prompt" TEXT,
    "website_enabled" BOOLEAN NOT NULL DEFAULT false,
    "website_auto_start" BOOLEAN NOT NULL DEFAULT false,
    "website_language" VARCHAR(5) NOT NULL DEFAULT 'fa',
    "website_content_length" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "website_tone" VARCHAR(50) NOT NULL DEFAULT 'reporter_analytical',
    "website_enable_video" BOOLEAN NOT NULL DEFAULT false,
    "website_enable_watermark" BOOLEAN NOT NULL DEFAULT true,
    "website_enhance_content" BOOLEAN NOT NULL DEFAULT true,
    "website_force_seo" BOOLEAN NOT NULL DEFAULT true,
    "website_rss_feeds" TEXT,
    "website_prompt_rewrite" TEXT,
    "website_prompt_analysis" TEXT,
    "use_separate_website_rss" BOOLEAN NOT NULL DEFAULT false,
    "watermark_logo_path" VARCHAR(500),
    "send_interval" INTEGER NOT NULL DEFAULT 30,
    "rss_date_filter" VARCHAR(20) NOT NULL DEFAULT 'today',
    "news_link_source" VARCHAR(20) NOT NULL DEFAULT 'rss',
    "use_short_link" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedRSSSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedRSSLog" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "rss_source_url" VARCHAR(500),
    "original_url" VARCHAR(500),
    "category_id" INTEGER,
    "target" VARCHAR(20) NOT NULL,
    "telegram_sent" BOOLEAN NOT NULL DEFAULT false,
    "telegram_message_id" INTEGER,
    "telegram_status" VARCHAR(50),
    "telegram_error" TEXT,
    "telegram_content" TEXT,
    "telegram_tokens_in" INTEGER,
    "telegram_tokens_out" INTEGER,
    "telegram_cost" DOUBLE PRECISION,
    "website_sent" BOOLEAN NOT NULL DEFAULT false,
    "website_blog_id" INTEGER,
    "website_status" VARCHAR(50),
    "website_error" TEXT,
    "website_content" TEXT,
    "website_tokens_in" INTEGER,
    "website_tokens_out" INTEGER,
    "website_cost" DOUBLE PRECISION,
    "website_slug" VARCHAR(500),
    "extracted_content" TEXT,
    "extracted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "UnifiedRSSLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnifiedRSSSettings_telegram_enabled_idx" ON "UnifiedRSSSettings"("telegram_enabled");

-- CreateIndex
CREATE INDEX "UnifiedRSSSettings_website_enabled_idx" ON "UnifiedRSSSettings"("website_enabled");

-- CreateIndex
CREATE INDEX "UnifiedRSSSettings_telegram_auto_start_idx" ON "UnifiedRSSSettings"("telegram_auto_start");

-- CreateIndex
CREATE INDEX "UnifiedRSSSettings_website_auto_start_idx" ON "UnifiedRSSSettings"("website_auto_start");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_target_idx" ON "UnifiedRSSLog"("target");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_telegram_sent_idx" ON "UnifiedRSSLog"("telegram_sent");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_website_sent_idx" ON "UnifiedRSSLog"("website_sent");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_telegram_status_idx" ON "UnifiedRSSLog"("telegram_status");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_website_status_idx" ON "UnifiedRSSLog"("website_status");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_created_at_idx" ON "UnifiedRSSLog"("created_at");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_category_id_idx" ON "UnifiedRSSLog"("category_id");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_rss_source_url_idx" ON "UnifiedRSSLog"("rss_source_url");

-- CreateIndex
CREATE INDEX "UnifiedRSSLog_title_idx" ON "UnifiedRSSLog"("title");

-- AddForeignKey
ALTER TABLE "UnifiedRSSLog" ADD CONSTRAINT "UnifiedRSSLog_website_blog_id_fkey" FOREIGN KEY ("website_blog_id") REFERENCES "Blog"("id") ON DELETE SET NULL ON UPDATE CASCADE;










