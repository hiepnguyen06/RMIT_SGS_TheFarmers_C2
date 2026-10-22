import { Router } from 'express';
import { z } from 'zod';
import type { Deps } from '../app.js';
import { publicCustomer, rateLimit } from '../auth/customer.js';
import { createRequest } from '../approvals/approvals.js';
import { authorize, executeRefund } from '../policy/policy.js';
import { getOrderOnBehalf } from '../orders/orders.js';
import type { ToolResult } from '../agent/agent.js';
import { HttpError, LANGS, type ToolCall } from '../types.js';

const body = z.object({ message: z.string().min(1).max(2000), lang: z.enum(LANGS) });

export function chatRouter(deps: Deps) {
  const r = Router();

  r.post('/api/chat', rateLimit(deps.config.CHAT_RATE_LIMIT), publicCustomer(deps.config), async (req, res) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'message (1-2000 chars) and lang (vi|pt|fr|it|en) are required');
    const { message, lang } = parsed.data;
    const customer = req.principal!;
    const { audit, store, config } = deps;

    audit.append('message', customer.sub, { text: message, lang });
    const { label, source } = await deps.classifier(message, lang);
    if (label !== 'BENIGN') audit.append('flag', customer.sub, { label, lang, source, text: message });

    const unsafe = config.UNSAFE_DEMO === 'true' && config.NODE_ENV !== 'production' && req.header('x-demo-admin-agent') === '1';
    if (unsafe) audit.append('unsafe_demo', customer.sub, { note: 'agent running with admin-level power' });

    const actions: { tool: ToolCall['tool']; outcome: ToolResult['outcome']; requestId?: string }[] = [];
    const execTool = async (call: ToolCall): Promise<ToolResult> => {
      const actor = await deps.agentIdentity(unsafe);
      const d = authorize(call, actor, { store, audit, config, customerSub: customer.sub, flag: label, unsafe });
      let result: ToolResult;
      if (!d.allow) result = { outcome: 'denied', reason: d.reason };
      else if (call.tool === 'get_order') result = { outcome: 'ok', order: getOrderOnBehalf(store, customer.sub, call.orderId) };
      else if (d.mode === 'execute') {
        executeRefund(store, audit, call, actor.sub);
        result = { outcome: 'executed' };
      } else {
        const pending = createRequest(store, audit, { call, customerSub: customer.sub, originalMessage: message, flag: label });
        result = { outcome: 'pending', requestId: pending.id };
      }
      actions.push({ tool: call.tool, outcome: result.outcome, ...(result.outcome === 'pending' ? { requestId: result.requestId } : {}) });
      return result;
    };

    try {
      const { reply } = await deps.agent.run({ message, lang, execTool });
      res.json({ reply, label, actions });
    } catch (e) {
      console.error('agent error:', e instanceof Error ? e.message : e);
      audit.append('agent_error', customer.sub, { error: e instanceof Error ? e.message : String(e) });
      throw new HttpError(502, 'the assistant is unavailable, please try again');
    }
  });

  return r;
}
