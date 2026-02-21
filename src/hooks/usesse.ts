import { useEffect, useRef } from 'react';
import { useSSEContext } from '@/providers/sseprovider';

interface SSEMessage {
    type: string;
    data?: any;
    timestamp: number;
}

interface UseSSEOptions {
    onMessage?: (message: SSEMessage) => void;
    onError?: (error: Event) => void;
    // These options are now handled by the SSEProvider
    reconnect?: boolean;
    reconnectInterval?: number;
}

/**
 * Custom React Hook for Server-Sent Events (SSE)
 * Now uses a shared connection from SSEProvider to prevent connection limit exhaustion.
 */
export function useSSE(url: string = '/api/sse', options: UseSSEOptions = {}) {
    const { onMessage } = options;
    const { isConnected, lastMessage, subscribe } = useSSEContext();

    // Use ref to keep track of the latest onMessage callback
    const onMessageRef = useRef(onMessage);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        const unsubscribe = subscribe((message) => {
            onMessageRef.current?.(message);
        });

        return () => {
            unsubscribe();
        };
    }, [subscribe]);

    return {
        isConnected,
        lastMessage,
        // Methods below are now simplified as they are managed by the provider
        disconnect: () => { },
        reconnect: () => { },
    };
}

