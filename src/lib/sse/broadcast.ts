/**
 * SSE Broadcast Utility
 * Centralized function to broadcast events to all connected SSE clients
 */

import { broadcast } from '@/lib/sse/state';

export async function broadcastEvent(type: string, data?: any) {
    broadcast({ type, data });
    console.log(`[SSE] Broadcasted event: ${type}`, data);
}

// Specific broadcast functions for common events
export async function broadcastNewBlog(blogId: number, title: string, slug: string) {
    await broadcastEvent('new-blog', { blogId, title, slug });
}

export async function broadcastBlogUpdate(blogId: number, title: string, slug: string) {
    await broadcastEvent('blog-updated', { blogId, title, slug });
}

export async function broadcastBlogDelete(blogId: number) {
    await broadcastEvent('blog-deleted', { blogId });
}
