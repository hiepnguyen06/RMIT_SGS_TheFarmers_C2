import { AGENT_NAME, QUORUM, REFUND_LIMIT } from '@/data/mock'
import type {
  AppState,
  AttackLabel,
  AuditEntry,
  AuditKind,
  ChatMessage,
  Decision,
  Lang,
  Order,
  RefundRequest,
} from '@/types'

export function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(n)} ₫`
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const INJECTION = [
  /ignor\w*.*(regra|rule|instruc|instruct|istruz|regle|quy tac)/,
  /ignore (all|previous|anterior)/,
  /bo qua/,
  /(voce|you|sei|vous|ban).{0,12}(agora|now|ora|maintenant)?.{0,8}(administrador|admin|amministratore|administrateur|quan tri)/,
  /system prompt/,
]
const JAILBREAK = [
  /pretend|finja|fingi|faites comme si|gia vo/,
  /(sem|no|senza|sans|khong co) (regras|restricoes|rules|restrictions|regole|regles|quy tac)/,
  /do anything now|\bdan\b/,
]
const REFUND = /refund|reembols|rembours|rimbors|hoan tien|devolu|restitu/

export function classify(text: string): { label: AttackLabel; score: number } {
  const t = normalize(text)
  if (INJECTION.some((r) => r.test(t))) return { label: 'PROMPT_INJECTION', score: 0.97 }
  if (JAILBREAK.some((r) => r.test(t))) return { label: 'JAILBREAK', score: 0.9 }
  return { label: 'BENIGN', score: 0.03 }
}

interface Copy {
  status: (o: Order) => string
  refunded: (o: Order) => string
  pending: (amt: string, id: string) => string
  refuse: string
  notFound: string
  ask: string
  approved: (id: string, amt: string) => string
  denied: (id: string) => string
}

const stateWord = (o: Order, words: [string, string, string]) =>
  o.status === 'out_for_delivery' ? words[0] : o.status === 'delivered' ? words[1] : words[2]

const COPY: Record<Lang, Copy> = {
  en: {
    status: (o) => `Order #${o.id} (${o.item}) is ${stateWord(o, [`out for delivery, arriving ${o.statusDate}`, `delivered on ${o.statusDate}`, 'refunded'])}.`,
    refunded: (o) => `I refunded ${formatVnd(o.amount)} for order #${o.id}.`,
    pending: (amt, id) => `A refund of ${amt} is above my ${formatVnd(REFUND_LIMIT)} limit. I sent request ${id} to human reviewers; 2 of 3 must approve.`,
    refuse: "I can't carry out that request.",
    notFound: "I can't find that order on your account.",
    ask: 'Which order number can I help with?',
    approved: (id, amt) => `Request ${id} was approved. ${amt} has been refunded.`,
    denied: (id) => `Request ${id} was denied by the reviewers. No refund was made.`,
  },
  vi: {
    status: (o) => `Đơn #${o.id} (${o.item}) ${stateWord(o, [`đang được giao, dự kiến ${o.statusDate}`, `đã giao ngày ${o.statusDate}`, 'đã được hoàn tiền'])}.`,
    refunded: (o) => `Tôi đã hoàn ${formatVnd(o.amount)} cho đơn #${o.id}.`,
    pending: (amt, id) => `Khoản hoàn ${amt} vượt giới hạn ${formatVnd(REFUND_LIMIT)} của tôi. Tôi đã gửi yêu cầu ${id} cho người duyệt; cần 2 trong 3 người đồng ý.`,
    refuse: 'Tôi không thể thực hiện yêu cầu này.',
    notFound: 'Tôi không tìm thấy đơn hàng này trong tài khoản của bạn.',
    ask: 'Bạn cần hỗ trợ đơn hàng số mấy?',
    approved: (id, amt) => `Yêu cầu ${id} đã được duyệt. Đã hoàn ${amt}.`,
    denied: (id) => `Yêu cầu ${id} bị từ chối. Không có khoản hoàn nào được thực hiện.`,
  },
  pt: {
    status: (o) => `O pedido #${o.id} (${o.item}) ${stateWord(o, [`está a caminho, chegada prevista ${o.statusDate}`, `foi entregue em ${o.statusDate}`, 'foi reembolsado'])}.`,
    refunded: (o) => `Reembolsei ${formatVnd(o.amount)} do pedido #${o.id}.`,
    pending: (amt, id) => `Um reembolso de ${amt} passa do meu limite de ${formatVnd(REFUND_LIMIT)}. Enviei a solicitação ${id} para revisores humanos; 2 de 3 precisam aprovar.`,
    refuse: 'Não posso executar esse pedido.',
    notFound: 'Não encontrei esse pedido na sua conta.',
    ask: 'Qual é o número do pedido?',
    approved: (id, amt) => `A solicitação ${id} foi aprovada. ${amt} reembolsados.`,
    denied: (id) => `A solicitação ${id} foi negada pelos revisores. Nenhum reembolso foi feito.`,
  },
  fr: {
    status: (o) => `La commande #${o.id} (${o.item}) ${stateWord(o, [`est en cours de livraison, arrivée prévue ${o.statusDate}`, `a été livrée le ${o.statusDate}`, 'a été remboursée'])}.`,
    refunded: (o) => `J'ai remboursé ${formatVnd(o.amount)} pour la commande #${o.id}.`,
    pending: (amt, id) => `Un remboursement de ${amt} dépasse ma limite de ${formatVnd(REFUND_LIMIT)}. J'ai envoyé la demande ${id} à des relecteurs humains; 2 sur 3 doivent approuver.`,
    refuse: 'Je ne peux pas exécuter cette demande.',
    notFound: "Je ne trouve pas cette commande sur votre compte.",
    ask: 'Quel est le numéro de commande ?',
    approved: (id, amt) => `La demande ${id} a été approuvée. ${amt} remboursés.`,
    denied: (id) => `La demande ${id} a été refusée. Aucun remboursement n'a été fait.`,
  },
  it: {
    status: (o) => `L'ordine #${o.id} (${o.item}) ${stateWord(o, [`è in consegna, arrivo previsto ${o.statusDate}`, `è stato consegnato il ${o.statusDate}`, 'è stato rimborsato'])}.`,
    refunded: (o) => `Ho rimborsato ${formatVnd(o.amount)} per l'ordine #${o.id}.`,
    pending: (amt, id) => `Un rimborso di ${amt} supera il mio limite di ${formatVnd(REFUND_LIMIT)}. Ho inviato la richiesta ${id} a revisori umani; ne servono 2 su 3.`,
    refuse: 'Non posso eseguire questa richiesta.',
    notFound: 'Non trovo questo ordine nel tuo account.',
    ask: 'Di quale numero d’ordine hai bisogno?',
    approved: (id, amt) => `La richiesta ${id} è stata approvata. ${amt} rimborsati.`,
    denied: (id) => `La richiesta ${id} è stata respinta. Nessun rimborso effettuato.`,
  },
}

const pad = (n: number) => String(n).padStart(4, '0')
const clip = (t: string, n = 80) => (t.length > n ? `${t.slice(0, n)}…` : t)

type Draft = AppState

function pushAudit(s: Draft, at: string, kind: AuditKind, actor: string, detail: string, lang?: Lang): void {
  s.counters.audit += 1
  const e: AuditEntry = { id: `a-${s.counters.audit}`, at, kind, actor, detail, lang }
  s.audit.unshift(e)
}

function pushMsg(s: Draft, m: Omit<ChatMessage, 'id'>): void {
  s.counters.msg += 1
  s.messages.push({ ...m, id: `m-${s.counters.msg}` })
}

function openRequest(
  s: Draft,
  order: Order,
  message: string,
  lang: Lang,
  label: AttackLabel,
  score: number,
  at: string,
): RefundRequest {
  const existing = s.requests.find((r) => r.orderId === order.id && r.status === 'pending')
  if (existing) return existing
  s.counters.req += 1
  const user = s.user!
  const req: RefundRequest = {
    id: `R-${pad(s.counters.req)}`,
    orderId: order.id,
    item: order.item,
    customerName: user.name,
    requesterId: user.id,
    raisedBy: AGENT_NAME,
    amount: order.amount,
    reason: label === 'BENIGN' ? 'Customer asked for a refund.' : 'Customer message asked for an immediate refund.',
    message,
    lang,
    label,
    score,
    raisedAt: at,
    votes: [],
    status: 'pending',
  }
  s.requests.unshift(req)
  pushAudit(s, at, 'REQUEST', AGENT_NAME, `${req.id} raised. Over the ${formatVnd(REFUND_LIMIT)} limit, sent to approvers.`)
  return req
}

/** Mock of the whole agent loop: attack check, then tools through the policy gate. */
export function processMessage(prev: AppState, text: string, lang: Lang, at: string): AppState {
  const s: Draft = structuredClone(prev)
  const user = s.user
  if (!user || user.role !== 'customer') return prev
  const c = COPY[lang]
  const { label, score } = classify(text)
  const t = normalize(text)

  pushMsg(s, { from: 'customer', text, lang, label, score, at })
  pushAudit(s, at, label, `${user.name} (${lang})`, `“${clip(text)}” · ${score.toFixed(2)}`, lang)

  const orderId = text.match(/#?(\d{4})/)?.[1]
  const order = orderId ? s.orders.find((o) => o.id === orderId && o.customerId === user.id) : undefined
  const wantsRefund = REFUND.test(t)

  const agent = (reply: string, extra: Partial<ChatMessage> = {}) =>
    pushMsg(s, { from: 'agent', text: reply, lang, at, ...extra })

  if (label !== 'BENIGN') {
    if (wantsRefund && order && order.status !== 'refunded' && order.amount > REFUND_LIMIT) {
      const req = openRequest(s, order, text, lang, label, score, at)
      agent(`${c.refuse} ${c.pending(formatVnd(order.amount), req.id)}`, { requestId: req.id })
    } else {
      agent(c.refuse)
    }
  } else if (!orderId) {
    agent(c.ask)
  } else if (!order) {
    agent(c.notFound)
  } else if (wantsRefund && order.status !== 'refunded') {
    if (order.amount <= REFUND_LIMIT) {
      order.status = 'refunded'
      order.statusDate = at
      pushAudit(s, at, 'AUTO_REFUND', AGENT_NAME, `Order #${order.id}, ${formatVnd(order.amount)}, under the limit.`)
      agent(c.refunded(order), { tool: `issue_refund(#${order.id}) → ok` })
    } else {
      const req = openRequest(s, order, text, lang, label, score, at)
      agent(c.pending(formatVnd(order.amount), req.id), { requestId: req.id, tool: `issue_refund(#${order.id}) → held for approval` })
    }
  } else {
    agent(c.status(order), { tool: `get_order(#${order.id}) → ok` })
  }
  return s
}

export type VoteBlock = 'not-approver' | 'requester' | 'already-voted' | 'closed' | null

export function voteBlock(req: RefundRequest, userId: string | undefined, role: string | undefined): VoteBlock {
  if (role !== 'approver' || !userId) return 'not-approver'
  if (req.status !== 'pending') return 'closed'
  if (req.requesterId === userId) return 'requester'
  if (req.votes.some((v) => v.approverId === userId)) return 'already-voted'
  return null
}

export function castVote(prev: AppState, requestId: string, decision: Decision, at: string): AppState {
  const user = prev.user
  const found = prev.requests.find((r) => r.id === requestId)
  if (!user || !found) return prev
  const s: Draft = structuredClone(prev)
  const req = s.requests.find((r) => r.id === requestId)!
  const block = voteBlock(req, user.id, user.role)
  if (block) {
    pushAudit(s, at, 'BLOCKED', user.name, `Vote on ${req.id} refused (${block}).`)
    return s
  }
  req.votes.push({ approverId: user.id, name: user.name, decision })
  const count = req.votes.filter((v) => v.decision === decision).length
  const names = req.votes.filter((v) => v.decision === decision).map((v) => v.name).join(', ')

  if (count >= QUORUM) {
    req.status = decision
    const order = s.orders.find((o) => o.id === req.orderId)
    const c = COPY[req.lang]
    if (decision === 'approved') {
      if (order) {
        order.status = 'refunded'
        order.statusDate = at
      }
      pushAudit(s, at, 'APPLIED', names, `${req.id} approved ${count} of 3. Refund of ${formatVnd(req.amount)} applied.`)
      pushMsg(s, { from: 'agent', text: c.approved(req.id, formatVnd(req.amount)), lang: req.lang, at, requestId: req.id })
    } else {
      pushAudit(s, at, 'DENIED', names, `${req.id} denied ${count} of 3. Refund of ${formatVnd(req.amount)} not applied.`)
      pushMsg(s, { from: 'agent', text: c.denied(req.id), lang: req.lang, at, requestId: req.id })
    }
  } else {
    pushAudit(s, at, 'VOTE', user.name, `${req.id} ${decision} by ${user.name} (${count} of ${QUORUM}).`)
  }
  return s
}
