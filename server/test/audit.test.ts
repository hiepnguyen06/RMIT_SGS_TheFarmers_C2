import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store/store.js';
import { AuditLog } from '../src/audit/audit.js';
import * as auditModule from '../src/audit/audit.js';

describe('audit log', () => {
  it('appends with increasing ids and ISO timestamps', () => {
    const a = new AuditLog(createStore());
    const e1 = a.append('message', 'u1', { text: 'hi' });
    const e2 = a.append('flag', 'u1', {});
    expect(e2.id).toBe(e1.id + 1);
    expect(new Date(e1.ts).toISOString()).toBe(e1.ts);
  });
  it('list returns a copy; mutation does not change the log', () => {
    const a = new AuditLog(createStore());
    a.append('message', 'u1', {});
    try { (a.list() as any[]).length = 0; } catch { /* frozen */ }
    try { (a.list()[0] as any).type = 'x'; } catch { /* frozen */ }
    expect(a.list()).toHaveLength(1);
    expect(a.list()[0].type).toBe('message');
  });
  it('filters by type', () => {
    const a = new AuditLog(createStore());
    a.append('message', 'u', {}); a.append('flag', 'u', {});
    expect(a.list({ type: 'flag' })).toHaveLength(1);
  });
  it('exposes no delete/update API', () => {
    expect(Object.keys(auditModule)).toEqual(['AuditLog']);
    expect(Object.getOwnPropertyNames(AuditLog.prototype).sort()).toEqual(['append', 'constructor', 'list']);
  });
  it('snapshot round trip', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sd-')), 'state.json');
    const s = createStore(file);
    new AuditLog(s).append('message', 'u1', { n: 1 });
    s.save();
    const s2 = createStore(file);
    expect(new AuditLog(s2).list()).toHaveLength(1);
    expect(new AuditLog(s2).append('x', 'u', {}).id).toBe(2);
  });
});
