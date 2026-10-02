import { EventEmitter } from 'node:events';

export type MemoryCardEventType =
  | 'task-created'
  | 'task-updated'
  | 'task-deleted'
  | 'config-updated'
  | 'model-updated'
  | 'project-availability-changed';

export interface MemoryCardEventPayload {
  project_id: string;
  task_id?: number;
  model_name?: string;
  available?: boolean;
  timestamp: string;
}

export interface MemoryCardEvent {
  type: MemoryCardEventType;
  payload: MemoryCardEventPayload;
}

class MemoryCardEventBus extends EventEmitter {
  emitEvent(type: MemoryCardEventType, payload: Omit<MemoryCardEventPayload, 'timestamp'>): void {
    const fullPayload: MemoryCardEventPayload = {
      ...payload,
      timestamp: new Date().toISOString()
    };
    this.emit('event', { type, payload: fullPayload } as MemoryCardEvent);
  }

  onEvent(handler: (event: MemoryCardEvent) => void): void {
    this.on('event', handler);
  }

  offEvent(handler: (event: MemoryCardEvent) => void): void {
    this.off('event', handler);
  }
}

export const eventBus = new MemoryCardEventBus();
