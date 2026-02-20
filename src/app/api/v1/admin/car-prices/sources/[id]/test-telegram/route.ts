
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { scrapeCarPrices } from '@/lib/automation/car-price/car-price-scraper';
import { sendTelegramMessage } from '@/lib/automation/telegram/telegram-bot';
import { formatCarPricesForTelegram } from '@/lib/automation/car-price/car-price-scheduler';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr);

        // 1. Get Source
        const source = await prisma.carPriceSource.findUnique({
            where: { id }
        });

        if (!source) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // 2. Get Telegram Settings
        const settings = await prisma.unifiedRSSSettings.findFirst({
            orderBy: { created_at: 'desc' }
        });

        if (!settings || !settings.telegram_bot_token || !settings.telegram_channel_id) {
            return NextResponse.json({ error: 'Telegram settings not configured' }, { status: 400 });
        }

        // 3. Scrape Data
        // 3. Scrape Data with Fallback
        let items: any[] = [];
        try {
            const result = await scrapeCarPrices(source.url, source.name);
            items = result.items;
        } catch (error) {
            console.warn('Scraping failed, falling back to database:', error);
        }

        if (items.length === 0) {
            // Try fetching from DB
            const dbItems = await prisma.carPrice.findMany({
                where: { source_id: id },
                orderBy: { id: 'desc' } // or consistent ordering
            });

            if (dbItems.length > 0) {
                items = dbItems.map(item => ({
                    brand: item.brand || '', // Ensure brand is mapped
                    model: item.model,
                    trim: item.trim,
                    year: item.year,
                    price: item.price,
                    type: item.type as 'market' | 'factory',
                    change: item.change,
                    time: item.time,
                    link: ''
                }));
            }
        }

        if (items.length === 0) {
            return NextResponse.json({ error: 'No data scraped or found in database for this source' }, { status: 400 });
        }

        const result = { company: source.name, items };

        // 4. Format Message
        const formattedMessage = formatCarPricesForTelegram([result]);

        let message = `🧪 *تست ارسال قیمت خودرو*\n\n${formattedMessage}`;
        // Note: In MarkdownV2, bold is *text*, italic is _text_ or __text__ depending on strictness?
        // Actually MarkdownV2 bold is *text*, italic is _text_.
        // Wait, standard Markdown bold is **text**. 
        // Telegram MarkdownV2:
        // *bold \*text*
        // _italic \*text_
        // __underline__
        // ~strikethrough~
        // ||spoiler||
        // *bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
        // [inline URL](http://www.example.com/)
        // [inline mention of a user](tg://user?id=123456789)
        // `inline fixed-width code`
        // ```
        // pre-formatted fixed-width code block
        // ```
        // ```python
        // pre-formatted fixed-width code block written in the Python programming language
        // ```

        // So ** is NOT bold in MarkdownV2. It is * for bold.
        // I need to fix the bold syntax in formatCarPricesForTelegram too!

        // Let's check formatCarPricesForTelegram again.
        // It uses **${res.company}**. This is wrong for MarkdownV2. It should be *${res.company}*.

        // Fixing test message header first:
        message = `🧪 *تست ارسال قیمت خودرو*\n\n${formattedMessage}`;

        // 5. Send to Telegram
        const telegramResult = await sendTelegramMessage(
            settings.telegram_bot_token,
            settings.telegram_channel_id,
            message,
            { parse_mode: 'MarkdownV2' }
        );

        if (!telegramResult.success) {
            return NextResponse.json({ error: `Telegram Send Failed: ${telegramResult.error}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Message sent successfully' });

    } catch (error: any) {
        console.error('Test Telegram Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
