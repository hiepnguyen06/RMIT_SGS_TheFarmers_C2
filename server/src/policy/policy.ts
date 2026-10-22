import type { Config } from '../config.js';
import type { AuditLog } from '../audit/audit.js';
import type { Store } from '../store/store.js';
import { getOrderOnBehalf, markRefunded } from '../orders/orders.js';
import type { Label, Principal, ToolCall } from '../types.js';

export type Decision =
  | { allow: true; mode: 'execute' | 'pending' }
  | { allow: false; reason: string };

export interface PolicyCtx {
  store: Store;
  audit: AuditLog;
  config: Config;
  /** Customer on whose behalf the agent is acting. */
  customerSub: string;
  /** Classifier label for the triggering message; anything but BENIGN forces human approval. */
  flag?: Label;
  /** Contrast demo only: skips the limit and the role check. */
  unsafe?: boolean;
}

export function authorize(call: ToolCall, actor: Principal, ctx: PolicyCtx): Decision {
  const deny = (reason: string): Decision => {
    ctx.audit.append('tool_denied', actor.sub, { call, reason, customerSub: ctx.customerSub });
    return { allow: false, reason };
  };

  if (!ctx.unsafe && !actor.roles.includes('support-agent')) return deny('actor lacks support-agent role');

  const order = getOrderOnBehalf(ctx.store, ctx.customerSub, call.orderId);
  if (!order) return deny('order not found for this customer');

  if (call.tool === 'get_order') return { allow: true, mode: 'execute' };
  if (call.tool !== 'issue_refund') return deny('unknown tool');

  const amt = call.amountVnd;
  if (typeof amt !== 'number' || !Number.isInteger(amt) || amt < 1) return deny('invalid refund amount');
  if (order.status === 'refunded') return deny('order already refunded');
  if (amt > order.amountVnd) return deny('refund exceeds order total');
  for (const r of ctx.store.requests.values()) {
    if (r.orderId === call.orderId && r.status === 'pending') return deny('a refund request for this order is already pending');
  }

  if (ctx.unsafe) return { allow: true, mode: 'execute' };
  if (ctx.flag && ctx.flag !== 'BENIGN') return { allow: true, mode: 'pending' };
  return { allow: true, mode: amt <= ctx.config.REFUND_LIMIT_VND ? 'execute' : 'pending' };
}

export function executeRefund(store: Store, audit: AuditLog, call: ToolCall, actorSub: string): void {
  if (call.tool !== 'issue_refund') throw new Error('not a refund');
  markRefunded(store, call.orderId);
  audit.append('refund_executed', actorSub, { orderId: call.orderId, amountVnd: call.amountVnd });
}
