import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/automation/telegram/telegram-bot';

export async function POST(req: NextRequest) {
    try {
        const { botToken, channelId } = await req.json();

        if (!botToken || !channelId) {
            return NextResponse.json(
                { success: false, error: 'Bot Token and Channel ID are required' },
                { status: 400 }
            );
        }

        const result = await sendTelegramMessage(
            botToken,
            channelId,
            '🔍 <b>Test Message from Rozeghar Admin</b>\n\n✅ Your connection to Telegram is working correctly!',
            { parse_mode: 'HTML' }
        );

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 } // Or 500
            );
        }
    } catch (error: any) {
        console.error('Error testing telegram:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
