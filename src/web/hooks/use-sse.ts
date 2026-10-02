'use client';

import { useEffect, useRef } from 'react';

export type SseEventHandler = (event: { type: string; payload: any }) => void;

export function useSSE(handler: SseEventHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/events');

        const eventTypes = [
          'task-created',
          'task-updated',
          'task-deleted',
          'config-updated',
          'model-updated',
          'project-availability-changed'
        ];

        eventTypes.forEach((type) => {
          eventSource?.addEventListener(type, (e: MessageEvent) => {
            try {
              const payload = JSON.parse(e.data);
              handlerRef.current({ type, payload });
            } catch (err) {
              console.error('Falha ao processar evento SSE:', err);
            }
          });
        });

        eventSource.onerror = () => {
          eventSource?.close();
          // Tenta reconectar em 3 segundos
          retryTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        retryTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);
}
