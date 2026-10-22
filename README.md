# SafeDesk

A multilingual customer-support AI agent that cannot move money on its own. It signs in to TideCloak with a narrow role, and any refund above a limit waits for 2 of 3 human approvers.

RMIT Hackathon 2026, Challenge 2 (`RMIT_SGS_TheFarmers_C2`).

> Status: backend API implemented (`server/`); frontend in progress.

## 1. Vision and originality

_TODO_

## 2. Trust constraint insight

_TODO_

## 3. Value and impact

_TODO_

## 4. Why TideCloak matters

_TODO_

## 5. Prototype and storytelling

_TODO: link to demo video._

## Real vs simulated

| Part | Status | Note |
|---|---|---|
| TideCloak login and roles | Simulated for now | Dev persona login (`VITE_AUTH_MODE=mock`). The real TideCloak realm could not be created on 22 Oct: Tide's licensing service returned errors (`setUpTideRealm`, 4 attempts). Bootstrap scripts are in `scripts/tidecloak/`. |
| Agent identity with a narrow role | TBD | Real if FR8 lands, otherwise simulated |
| Attack check | Real | LLM prompt with rule-based fallback |
| 2-of-3 approval | Simulated | Enforced in app code, not by Tide |
| Orders and refunds | Simulated | Mock data, no payments |
| Audit log | Real, in app | Not tamper-proof |

## Getting started

```bash
cp .env.example .env   # then fill in the values
```

### Run the whole app (mock login)

```bash
# terminal 1: API on :4000 (mock auth; set OPENAI_API_KEY in .env for the real agent)
cd server && AUTH_MODE=mock npm run dev
# terminal 2: frontend on :5173, proxies /api to the API
cd frontend && npm install && npm run dev
```

Sign in as a persona on the login page. Demo path: An Nguyen sends the Portuguese attack, then sign in as Approver 1 and Approver 2 (separate browser tabs or profiles) and deny it. Checked end to end in the browser on 22 Oct 2026 (mock login, rule-based agent): Italian order question, Portuguese injection held and flagged, two approvers deny it, a genuine large refund approved by two different approvers and applied, audit log shows every step. The contrast shot (same attack against an admin-token agent) runs through the API only: `cd server && npm run demo`.

The agent and attack check use OpenAI when `OPENAI_API_KEY` is set, otherwise the rule-based fallback.

### Backend (Express + TypeScript)

```bash
cd server
npm install
npm test          # unit and end-to-end tests
npm run demo      # scripted run of the demo scenario (mock auth)
npm run dev       # API on http://localhost:4000
```

`AUTH_MODE=mock` accepts `Authorization: Bearer mock:<sub>:<role,role>` for local work; `AUTH_MODE=tidecloak` verifies real TideCloak tokens (see `server/scripts/seed-realm.md`). Without `OPENAI_API_KEY` the agent and attack check use the rule-based fallback.

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /api/chat` | customer | message, attack check, agent, policy gate |
| `GET /api/orders/mine` | customer | own orders |
| `GET /api/approvals?status=pending` | approver | pending refund requests |
| `POST /api/approvals/:id/vote` | approver | approve or deny (2 of 3) |
| `GET /api/admin/audit` | admin | read-only audit log |
| `GET /api/admin/stats/blocked-by-language` | admin | flagged messages per language |

## Configuration

All settings live in `.env` (see `.env.example`). Never commit `.env`.
