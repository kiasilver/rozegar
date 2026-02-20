/**
 * SSE State Management
 * Singleton module to hold active SSE client connections.
 * Decoupled from the Next.js API route to prevent circular dependencies and re-compilation loops.
 */

// Store active connections globally
export const clients = new Set<ReadableStreamDefaultController>();

// Broadcast function to send events to all connected clients
export function broadcast(event: { type: string; data?: any }) {
    const message = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
    const encoded = new TextEncoder().encode(message);

    clients.forEach((controller) => {
        try {
            controller.enqueue(encoded);
        } catch (error) {
            // Client disconnected or controller closed
            clients.delete(controller);
        }
    });
}
