import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';

// Store for active connections
const connections = new Set<ReadableStreamDefaultController>();

// Track last blog ID
let lastBlogId: number | null = null;

// Initialize last blog ID on server start
async function initializeLastBlogId() {
  const latestBlog = await prisma.blog.findFirst({
    where: {
      status: 'PUBLISHED',
      is_active: true,
    },
    orderBy: {
      published_at: 'desc',
    },
    select: {
      id: true,
    },
  });
  
  if (latestBlog) {
    lastBlogId = latestBlog.id;
  }
}

// Initialize on module load
initializeLastBlogId();

/**
 * Broadcast new blog to all connected clients
 */
export function broadcastNewBlog(blogId: number) {
  if (blogId !== lastBlogId) {
    lastBlogId = blogId;
    
    const message = `data: ${JSON.stringify({ type: 'new_blog', blogId })}\n\n`;
    const encodedMessage = new TextEncoder().encode(message);
    
    // Create a copy of connections to avoid modification during iteration
    const connectionsToNotify = Array.from(connections);
    
    connectionsToNotify.forEach((controller) => {
      try {
        controller.enqueue(encodedMessage);
      } catch (error) {
        // Connection closed, remove it
        connections.delete(controller);
      }
    });
  }
}

export async function GET(req: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to set
      connections.add(controller);
      
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMessage));
      
      // Send current last blog ID if available
      if (lastBlogId !== null) {
        const currentMessage = `data: ${JSON.stringify({ type: 'current', blogId: lastBlogId })}\n\n`;
        controller.enqueue(new TextEncoder().encode(currentMessage));
      }
      
      // Keep connection alive with periodic ping
      const pingInterval = setInterval(() => {
        try {
          const pingMessage = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(pingMessage));
        } catch (error) {
          clearInterval(pingInterval);
          connections.delete(controller);
        }
      }, 30000); // Ping every 30 seconds
      
      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        connections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
    },
    
    cancel() {
      // Remove connection when cancelled
      connections.forEach((controller) => {
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
      connections.clear();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}

