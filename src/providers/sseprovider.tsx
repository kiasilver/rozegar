"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

interface SSEMessage {
    type: string;
    data?: any;
    timestamp: number;
}

interface SSEContextType {
    lastMessage: SSEMessage | null;
    isConnected: boolean;
    subscribe: (callback: (message: SSEMessage) => void) => () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

export const useSSEContext = () => {
    const context = useContext(SSEContext);
    if (!context) {
        throw new Error('useSSEContext must be used within an SSEProvider');
    }
    return context;
};

export const SSEProvider: React.FC<{ children: React.ReactNode; url?: string }> = ({
    children,
    url = '/api/sse'
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
    const subscribers = useRef<Set<(message: SSEMessage) => void>>(new Set());
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                try {
                    const message: SSEMessage = JSON.parse(event.data);
                    if (message.type === 'ping') return; // Ignore pings for consumers

                    setLastMessage(message);
                    subscribers.current.forEach(callback => callback(message));
                } catch (error) {
                    // Silently ignore parse errors for non-JSON messages
                }
            };

            eventSource.onerror = () => {
                setIsConnected(false);
                
                // فقط اگر connection بسته شده باشد، reconnect کن
                if (eventSource.readyState === EventSource.CLOSED) {
                    eventSource.close();
                    // Attempt to reconnect after delay (only if not already reconnecting)
                    if (!reconnectTimeoutRef.current) {
                        reconnectTimeoutRef.current = setTimeout(() => {
                            reconnectTimeoutRef.current = null;
                            connect();
                        }, 5000);
                    }
                }
            };
        } catch (error) {
            setIsConnected(false);
            // Attempt to reconnect after delay
            if (!reconnectTimeoutRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    connect();
                }, 5000);
            }
        }
    }, [url]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    const subscribe = useCallback((callback: (message: SSEMessage) => void) => {
        subscribers.current.add(callback);
        return () => {
            subscribers.current.delete(callback);
        };
    }, []);

    return (
        <SSEContext.Provider value={{ lastMessage, isConnected, subscribe }}>
            {children}
        </SSEContext.Provider>
    );
};
