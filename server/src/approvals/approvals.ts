import type { Config } from '../config.js';
import type { AuditLog } from '../audit/audit.js';
import type { Store } from '../store/store.js';
import { executeRefund } from '../policy/policy.js';
import { HttpError, type Label, type Principal, type RefundRequest, type ToolCall } from '../types.js';

export function createRequest(
  store: Store,
  audit: AuditLog,
  input: { call: ToolCall; customerSub: string; originalMessage: string; flag: Label },
): RefundRequest {
  if (input.call.tool !== 'issue_refund') throw new Error('only refunds can be queued');
  const req: RefundRequest = {
    id: `R-${store.requests.size + 1}`,
    orderId: input.call.orderId,
    amountVnd: input.call.amountVnd,
    reason: input.call.reason,
    originalMessage: input.originalMessage,
    flag: input.flag,
    requestedBy: input.customerSub,
    status: 'pending',
    votes: [],
  };
  store.requests.set(req.id, req);
  audit.append('refund_pending', input.customerSub, { ...req });
  return req;
}

export function vote(
  store: Store,
  audit: AuditLog,
  config: Config,
  requestId: string,
  approver: Principal,
  v: 'approve' | 'deny',
): RefundRequest {
  const req = store.requests.get(requestId);
  if (!req) throw new HttpError(404, 'request not found');
  if (!approver.roles.includes('approver')) throw new HttpError(403, 'approver role required');
  if (req.status !== 'pending') throw new HttpError(409, `request already ${req.status}`);
  if (approver.sub === req.requestedBy) throw new HttpError(403, 'cannot vote on your own request');
  if (req.votes.some((x) => x.approverSub === approver.sub)) throw new HttpError(409, 'already voted');

  req.votes.push({ approverSub: approver.sub, vote: v });
  audit.append('vote', approver.sub, { requestId, vote: v });

  const approvals = req.votes.filter((x) => x.vote === 'approve').length;
  const denials = req.votes.length - approvals;
  if (approvals >= config.APPROVALS_REQUIRED) {
    req.status = 'approved';
    executeRefund(store, audit, { tool: 'issue_refund', orderId: req.orderId, amountVnd: req.amountVnd, reason: req.reason }, 'approvals');
  } else if (denials > config.APPROVER_COUNT - config.APPROVALS_REQUIRED) {
    req.status = 'denied';
  }
  if (req.status !== 'pending') audit.append('request_resolved', approver.sub, { requestId, status: req.status });
  store.save();
  return req;
}
