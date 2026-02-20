const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        database: 'ultimatecms',
        user: 'postgres',
        password: '3791',
    });

    try {
        await client.connect();
        console.log('🔌 Connected to database\n');

        console.log('📝 Seeding AI Prompts...\n');

        // Telegram Prompts
        const telegramPrompts = [
            {
                key: 'telegram_summary',
                target: 'telegram',
                prompt_type: 'summary',
                content: 'شما یک دستیار هوشمند هستید که خبرها را برای کانال تلگرام خلاصه می‌کنید. خبر زیر را به صورت خلاصه و جذاب برای مخاطبان تلگرام بازنویسی کنید:\n\n{content}\n\nالزامات:\n- طول: 100-150 کلمه\n- لحن: خبری و رسمی\n- زبان: فارسی\n- فقط متن خلاصه را برگردان (بدون عنوان)',
            },
            {
                key: 'telegram_short',
                target: 'telegram',
                prompt_type: 'short_summary',
                content: 'خبر زیر را در حداکثر 3 پاراگراف کوتاه و با لحن خبری خلاصه کنید:\n\n{content}',
            },
        ];

        // Website Prompts
        const websitePrompts = [
            {
                key: 'website_rewrite',
                target: 'website',
                prompt_type: 'rewrite',
                content: 'شما یک نویسنده محتوای حرفه‌ای هستید. خبر زیر را برای انتشار در وبسایت به صورت کامل و با رعایت اصول SEO بازنویسی کنید:\n\n{content}\n\nالزامات:\n- طول: حداقل 500 کلمه\n- لحن: تحلیلی و خبری\n- زبان: فارسی\n- استفاده از کلمات کلیدی مناسب',
            },
            {
                key: 'website_analysis',
                target: 'website',
                prompt_type: 'analysis',
                content: 'به عنوان یک تحلیلگر خبری، یک تحلیل کوتاه و کارشناسانه در مورد خبر زیر بنویسید:\n\n{content}',
            },
            {
                key: 'website_seo',
                target: 'website',
                prompt_type: 'seo_optimize',
                content: 'عنوان و توضیحات SEO برای خبر زیر بنویسید که برای موتورهای جستجو بهینه باشد:\n\n{content}',
            },
        ];

        const allPrompts = [...telegramPrompts, ...websitePrompts];

        for (const prompt of allPrompts) {
            const result = await client.query(
                `INSERT INTO "AIPrompt" (key, target, prompt_type, content, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (key) DO NOTHING
         RETURNING id`,
                [prompt.key, prompt.target, prompt.prompt_type, prompt.content, true]
            );

            if (result.rowCount > 0) {
                console.log(`✅ Added prompt: ${prompt.key} (${prompt.target})`);
            } else {
                console.log(`⏭️  Skipped (already exists): ${prompt.key}`);
            }
        }

        // نمایش تمام پرامپت‌ها
        const prompts = await client.query(`
      SELECT key, target, prompt_type, is_active
      FROM "AIPrompt"
      ORDER BY target, prompt_type
    `);

        console.log(`\n📋 Total ${prompts.rowCount} prompts in database:`);
        prompts.rows.forEach((p) => {
            console.log(`   ${p.is_active ? '✓' : '✗'} ${p.target}/${p.prompt_type} (${p.key})`);
        });

        console.log('\n✨ Prompt seeding completed!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

main();
