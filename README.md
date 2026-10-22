# SafeDesk

A multilingual customer-support AI agent that cannot move money on its own. It signs in to TideCloak with a narrow role, and any refund above a limit waits for an admin's approval. Customers are public and need no account; the admin is the only signed-in human and also the approver.

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
| TideCloak login and roles | Wired, mock fallback kept | The `safedesk` realm is licensed and the app has a real Tide login with DPoP (`VITE_AUTH_MODE=tidecloak`); the API verifies EdDSA tokens and DPoP proofs. Roles still have to be granted to Tide users (see "Real TideCloak login"). `VITE_AUTH_MODE=mock` is the fallback. |
| Agent identity with a narrow role | Simulated | `AGENT_IDENTITY=simulated`: the API gives the agent the `support-agent` role itself. The realm has no agent service client yet; `client_credentials` is coded but untested against a Tide realm |
| Attack check | Real | LLM prompt with rule-based fallback |
| Admin approval | Simulated | Enforced in app code, not by Tide. One approval by default (`APPROVALS_REQUIRED=1`, `APPROVER_COUNT=1`); raise both if you add admin accounts |
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

Open http://localhost:5173: the shop chat needs no sign-in and acts as one fixed public customer (An Nguyen, `PUBLIC_CUSTOMER_SUB` / `PUBLIC_CUSTOMER_NAME`). Demo path: the customer sends the Portuguese attack, it is flagged and held; click **Staff sign-in**, sign in as the admin, and deny it; then a genuine large refund is approved by the admin and applied, and the audit log shows every step. Checked end to end in the browser on 22 Oct 2026 (mock admin login, one approval). The contrast shot (same attack against an admin-token agent) runs through the API only: `cd server && npm run demo`. The public chat is rate limited per client address (`CHAT_RATE_LIMIT`, 30 per 10 minutes).

The agent and attack check use OpenAI when `OPENAI_API_KEY` is set, otherwise the rule-based fallback.

### Real TideCloak login

1. Start TideCloak and bootstrap the realm: `scripts/tidecloak/bootstrap-tidecloak.sh` (needs `TIDE_LICENSE_EMAIL`, `TIDE_TERMS_ACCEPTED=yes` and `TIDECLOAK_ADMIN_PASSWORD` in `.env`). It exports `data/tidecloak.json`.
2. Copy the adapter into the frontend: `cp data/tidecloak.json frontend/public/tidecloak.json` (gitignored; it is per realm).
3. In `.env` set `AUTH_MODE=tidecloak` and `TIDECLOAK_AUDIENCE=safedesk-web`; in `frontend/.env.local` set `VITE_AUTH_MODE=tidecloak`.
4. Run the API on :4000 and the frontend on :5173 (the realm only redirects to `http://localhost:5173`).

How it works: the browser signs in through the Tide enclave and gets a DPoP-bound, EdDSA-signed access token. `frontend/src/auth/TideAuthProvider.tsx` sends every API call through `secureFetch`, which adds a DPoP proof. `server/src/auth/jwt.ts` checks the token against the key embedded in the adapter JSON (no remote key fetch), the issuer, audience and `azp`, then the proof (`server/src/auth/dpop.ts`: method, URL, token hash, key binding, replay). A stolen token replayed as `Bearer` is rejected. The jti replay store is in memory, so it is correct for one API process only.

Only admins sign in. A signed-in user without the `admin` role sees a "not an admin" message. The `admin` role is granted in the TideCloak console and, because IGA is on, approved there before it takes effect. Customers never sign in, so there is no `customer` or `approver` role to grant.

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
| `POST /api/chat` | public (fixed customer) | message, attack check, agent, policy gate; rate limited |
| `GET /api/orders/mine` | public (fixed customer) | the customer's orders |
| `GET /api/approvals?status=pending` | admin | pending refund requests |
| `POST /api/approvals/:id/vote` | admin | approve or deny (quorum from `APPROVALS_REQUIRED`) |
| `GET /api/admin/audit` | admin | read-only audit log |
| `GET /api/admin/stats/blocked-by-language` | admin | flagged messages per language |

## Configuration

All settings live in `.env` (see `.env.example`). Never commit `.env`.
