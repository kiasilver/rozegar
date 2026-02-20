-- Seed Initial AI Prompts
-- Run this after migration to populate default prompts

-- Telegram Prompts
INSERT INTO "AIPrompt" (key, target, prompt_type, content, is_active, created_at, updated_at)
VALUES 
('telegram_summary', 'telegram', 'summary', 'شما یک دستیار هوشمند هستید که خبرها را برای کانال تلگرام خلاصه می‌کنید. خبر زیر را به صورت خلاصه و جذاب برای مخاطبان تلگرام بازنویسی کنید:', true, NOW(), NOW()),
('telegram_short', 'telegram', 'short_summary', 'خبر زیر را در حداکثر 3 پاراگراف کوتاه و با لحن خبری خلاصه کنید:', true, NOW(), NOW());

-- Website Prompts  
INSERT INTO "AIPrompt" (key, target, prompt_type, content, is_active, created_at, updated_at)
VALUES
('website_rewrite', 'website', 'rewrite', 'شما یک نویسنده محتوای حرفه‌ای هستید. خبر زیر را برای انتشار در وبسایت به صورت کامل و با رعایت اصول SEO بازنویسی کنید:', true, NOW(), NOW()),
('website_analysis', 'website', 'analysis', 'به عنوان یک تحلیلگر خبری، یک تحلیل کوتاه و کارشناسانه در مورد خبر زیر بنویسید:', true, NOW(), NOW()),
('website_seo', 'website', 'seo_optimize', 'عنوان و توضیحات SEO برای خبر زیر بنویسید که برای موتورهای جستجو بهینه باشد:', true, NOW(), NOW());
