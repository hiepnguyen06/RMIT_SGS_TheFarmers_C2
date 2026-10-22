import type { Order, Lang, ToolCall } from '../types.js';

export type ToolResult =
  | { outcome: 'ok'; order?: Order }
  | { outcome: 'executed' }
  | { outcome: 'pending'; requestId: string }
  | { outcome: 'denied'; reason: string };

export interface AgentInput {
  message: string;
  lang: Lang;
  /** Runs one tool call through the policy gate; the agent never touches orders directly. */
  execTool: (call: ToolCall) => Promise<ToolResult>;
}

export interface AgentEngine {
  run(input: AgentInput): Promise<{ reply: string }>;
}

const T = {
  ask_id: {
    vi: 'Bạn vui lòng cho mình mã đơn hàng (ví dụ A-1001) nhé.',
    pt: 'Pode me informar o número do pedido (por exemplo A-1001)?',
    fr: 'Pouvez-vous m\'indiquer le numéro de commande (par exemple A-1001) ?',
    it: 'Puoi indicarmi il numero dell\'ordine (ad esempio A-1001)?',
    en: 'Please tell me your order number (for example A-1001).',
  },
  not_found: {
    vi: 'Mình không tìm thấy đơn hàng đó trong tài khoản của bạn.',
    pt: 'Não encontrei esse pedido na sua conta.',
    fr: 'Je ne trouve pas cette commande dans votre compte.',
    it: 'Non trovo questo ordine nel tuo account.',
    en: 'I could not find that order in your account.',
  },
  status: {
    vi: (o: Order) => `Đơn ${o.id} (${o.item}, ${o.amountVnd} VND) hiện ở trạng thái: ${o.status}.`,
    pt: (o: Order) => `O pedido ${o.id} (${o.item}, ${o.amountVnd} VND) está com o estado: ${o.status}.`,
    fr: (o: Order) => `La commande ${o.id} (${o.item}, ${o.amountVnd} VND) est au statut : ${o.status}.`,
    it: (o: Order) => `L'ordine ${o.id} (${o.item}, ${o.amountVnd} VND) è nello stato: ${o.status}.`,
    en: (o: Order) => `Order ${o.id} (${o.item}, ${o.amountVnd} VND) is currently: ${o.status}.`,
  },
  executed: {
    vi: 'Mình đã hoàn tiền cho đơn hàng của bạn.',
    pt: 'Reembolsei o seu pedido.',
    fr: 'J\'ai remboursé votre commande.',
    it: 'Ho rimborsato il tuo ordine.',
    en: 'I have refunded your order.',
  },
  pending: {
    vi: 'Yêu cầu hoàn tiền này cần 2 người duyệt. Mình đã chuyển cho họ xem xét.',
    pt: 'Este reembolso precisa da aprovação de 2 revisores humanos. Já o encaminhei.',
    fr: 'Ce remboursement nécessite l\'accord de 2 relecteurs humains. Je l\'ai transmis.',
    it: 'Questo rimborso richiede l\'approvazione di 2 revisori umani. L\'ho inoltrato.',
    en: 'This refund needs approval from 2 human reviewers. I have sent it to them.',
  },
  denied: {
    vi: 'Mình không thể thực hiện yêu cầu này.',
    pt: 'Não posso realizar este pedido.',
    fr: 'Je ne peux pas effectuer cette demande.',
    it: 'Non posso eseguire questa richiesta.',
    en: 'I am not able to do that.',
  },
} as const;

const ORDER_ID = /\b([A-Z]-\d{4})\b/i;
const REFUND_WORD = /reembols|rembours|rimbors|refund|hoan tien|hoàn tiền/i;

/** Deterministic agent: safe default for the demo when no ANTHROPIC_API_KEY is set. */
export const ruleAgent: AgentEngine = {
  async run({ message, lang, execTool }) {
    const m = ORDER_ID.exec(message);
    if (!m) return { reply: T.ask_id[lang] };
    const orderId = m[1].toUpperCase();

    const got = await execTool({ tool: 'get_order', orderId });
    if (got.outcome !== 'ok' || !got.order) return { reply: T.not_found[lang] };
    const order = got.order;

    if (!REFUND_WORD.test(message.normalize('NFC'))) return { reply: T.status[lang](order) };

    const rest = message.replace(ORDER_ID, ' ');
    const num = /\d[\d.,]{3,}/.exec(rest);
    const amountVnd = num ? Number(num[0].replace(/[.,]/g, '')) : order.amountVnd;
    const res = await execTool({ tool: 'issue_refund', orderId, amountVnd, reason: message.slice(0, 200) });
    if (res.outcome === 'executed') return { reply: T.executed[lang] };
    if (res.outcome === 'pending') return { reply: T.pending[lang] };
    return { reply: T.denied[lang] };
  },
};
