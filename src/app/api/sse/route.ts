import { NextRequest } from 'next/server';
import { clients } from '@/lib/sse/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const stream = new ReadableStream({
        start(controller) {
            // Add client to active connections
            clients.add(controller);

            // Send initial connection message
            const data = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));

            // Keep-alive ping every 30 seconds
            const keepAlive = setInterval(() => {
                try {
                    const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(ping));
                } catch (error) {
                    clearInterval(keepAlive);
                    clients.delete(controller);
                }
            }, 30000);

            // Cleanup on close
            req.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
                clients.delete(controller);
                try {
                    controller.close();
                } catch (e) {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
