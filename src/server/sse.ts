import { IncomingMessage, ServerResponse } from 'node:http';
import { eventBus, MemoryCardEvent } from '../watcher/event-bus.js';

class SseManager {
  private clients = new Set<ServerResponse>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    eventBus.onEvent((event: MemoryCardEvent) => {
      this.broadcast(event);
    });

    this.pingInterval = setInterval(() => {
      for (const res of this.clients) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          this.clients.delete(res);
        }
      }
    }, 20000);
    this.pingInterval.unref();
  }

  handleRequest(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(': connected\n\n');
    this.clients.add(res);

    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(event: MemoryCardEvent): void {
    const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const res of this.clients) {
      try {
        res.write(data);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const res of this.clients) {
      try {
        res.end();
      } catch {}
    }
    this.clients.clear();
  }
}

export const sseManager = new SseManager();
