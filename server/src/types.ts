export const ROLES = ['customer', 'support-agent', 'approver', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export const LANGS = ['vi', 'pt', 'fr', 'it', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type Label = 'BENIGN' | 'JAILBREAK' | 'PROMPT_INJECTION';

export interface Principal {
  sub: string;
  name: string;
  roles: Role[];
}

export interface Order {
  id: string;
  customerSub: string;
  amountVnd: number;
  status: 'paid' | 'refunded';
  item: string;
}

export type ToolCall =
  | { tool: 'get_order'; orderId: string }
  | { tool: 'issue_refund'; orderId: string; amountVnd: number; reason: string };

export interface Vote {
  approverSub: string;
  vote: 'approve' | 'deny';
}

export interface RefundRequest {
  id: string;
  orderId: string;
  amountVnd: number;
  reason: string;
  originalMessage: string;
  flag: Label;
  requestedBy: string;
  status: 'pending' | 'approved' | 'denied';
  votes: Vote[];
}

export interface AuditEvent {
  id: number;
  ts: string;
  type: string;
  actorSub: string;
  data: Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
