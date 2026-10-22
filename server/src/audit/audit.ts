import type { Store } from '../store/store.js';
import type { AuditEvent } from '../types.js';

export class AuditLog {
  constructor(private store: Store) {}

  append(type: string, actorSub: string, data: Record<string, unknown>): AuditEvent {
    const event: AuditEvent = Object.freeze({
      id: this.store.audit.length + 1,
      ts: new Date().toISOString(),
      type,
      actorSub,
      data: structuredClone(data),
    });
    this.store.audit.push(event);
    this.store.save();
    return event;
  }

  list(filter: { type?: string } = {}): readonly AuditEvent[] {
    return Object.freeze(this.store.audit.filter((e) => !filter.type || e.type === filter.type));
  }
}
