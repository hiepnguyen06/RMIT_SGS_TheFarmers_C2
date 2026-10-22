# Frontend and API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The React frontend talks only to the Express API, and users sign in through real local TideCloak.

**Architecture:** TideCloak (local Docker, realm `safedesk`) issues EdDSA, DPoP-bound access tokens. The frontend signs in with `@tidecloak/react` and calls `/api/*` through `secureFetch` (Vite proxy to `:4000`). The backend verifies token signature against the adapter JSON's embedded `jwk`, then the DPoP proof, then maps `realm_access.roles` to the existing `Principal`. `AUTH_MODE=mock` stays as the fallback on both sides.

**Tech Stack:** TideCloak `tideorg/tidecloak-dev`, `@tidecloak/react` (version = cluster version), `jose` (EdDSA, local JWKS), Express, React 19, Vite, shadcn.

**Spec:** `docs/superpowers/specs/2026-10-22-frontend-api-integration-design.md`

## Global Constraints

- Licence email `hiepskyc@gmail.com`; pass `TIDE_LICENSE_EMAIL=hiepskyc@gmail.com TIDE_TERMS_ACCEPTED=yes` (user agreed in chat on 22 Oct 2026). Never invent either.
- Master-admin password only in `.env` (gitignored), never in scripts, compose files or code. Do not echo it.
- Realm `safedesk`, web client `safedesk-web`, app URL `http://localhost:5173` (register all redirect URIs and origins during bootstrap, before the `tide-realm-admin` grant).
- Realm roles: `customer`, `approver`, `admin`, `support-agent`. Accounts: 1 customer, 3 approvers, the bootstrap admin (also given `admin`). Each needs a browser invite-link enrolment, done by the user.
- DPoP: `useDPoP: { mode: 'strict', alg: 'ES256' }` inside the provider `config`; `public/tide_dpop_auth.html` copied byte-exact via `tide_dpop_asset`, never retyped; rewrite and CSP per `tide_doctor`.
- The backend must verify BOTH the JWT (embedded `jwk`, `iss`, `azp`) and the DPoP proof (`verifyDpop`), and accept `Authorization: Bearer|DPoP <token>`. A UI role check is never authorization.
- OpenAI only for chat (`OPENAI_API_KEY` in `.env`, never committed). Poll interval 3000 ms.
- Deadline: submit 17:30, 22 Oct 2026 (Vietnam time). If real login is not working, use the mock fallback and say so in the README.

## Review Focus

- Expired token or a DPoP-bound token replayed as plain `Bearer` (no proof) → 401, never 200.
- User with no SafeDesk role (only `default-roles`) signs in → friendly "no access" screen, not a blank page or crash.
- API returns 401/403/502 or is unreachable → page shows an inline error with retry; never silently shows stale or mock data.
- Approver tries to open `/approvals` as customer (URL typed) → redirected; API would also 403.
- Chat message while a call is in flight → send disabled; double-submit does not create two requests.
- Token expiry mid-session → token refresh or redirect to login, not a stuck spinner.

---

## File Structure

```
.env                                  # master admin password, OPENAI key (gitignored)
server/data/tidecloak.json            # adapter JSON (gitignored via data/)
server/src/auth/dpop.ts               # copied from .tide-pack/templates/dpop-verify/verifyDpop.ts
server/src/auth/tide.ts               # makeTideVerifier(adapter)
server/src/auth/jwt.ts                # modify: Verifier gets the request; Bearer|DPoP
frontend/public/tidecloak.json, tide_dpop_auth.html, silent-check-sso.html
frontend/src/auth/{AuthProvider.tsx,useAuth.ts,mockAuth.ts}
frontend/src/lib/api.ts               # secureFetch client + typed calls
frontend/src/pages/{Login,Chat,Approvals,Audit}.tsx   # rewired
```

---

### Task 1: TideCloak realm (infrastructure; some steps need the user)

**Files:** Create `.env` (gitignored); Create `scripts/tidecloak/` (copy `.tide-pack/templates/shared/{bootstrap-tidecloak.sh,realm.json.template,drain-change-requests.py}`); Modify the copied `realm.json.template` to add the four realm roles; Output `server/data/tidecloak.json` and `frontend/public/tidecloak.json`.

**Interfaces:** Produces the adapter JSON (must contain `jwk`, `vendorId`, `homeOrkUrl`, `resource: "safedesk-web"`, `realm: "safedesk"`), realm users and role assignments, and (optionally) a confidential client `safedesk-agent` with service account role `support-agent`.

- [ ] Confirm Docker is up (`docker ps` succeeds) and `.env` is gitignored; generate a random `KC_BOOTSTRAP_ADMIN_PASSWORD` into `.env` without printing it.
- [ ] Add realm roles `customer`, `approver`, `admin`, `support-agent` to the realm template (realm roles block, not in the default composite).
- [ ] Run `REALM_NAME=safedesk CLIENT_NAME=safedesk-web CLIENT_APP_URL=http://localhost:5173 TIDE_LICENSE_EMAIL=hiepskyc@gmail.com TIDE_TERMS_ACCEPTED=yes ADAPTER_OUTPUT=./server/data/tidecloak.json bash scripts/tidecloak/bootstrap-tidecloak.sh`. Hand the invite link to the user and wait for them to open it and link their account (this is the admin account). Expected: script ends with an adapter JSON file.
- [ ] Verify: `jq 'has("jwk") and has("vendorId") and has("homeOrkUrl")' server/data/tidecloak.json` → `true`. Copy to `frontend/public/tidecloak.json`.
- [ ] Create the customer and 3 approver users with their roles via the admin API (before any later `tide-realm-admin` grant if still possible; otherwise approve change requests in the admin console), generate invite links, and have the user enrol each. Assign `admin` to the admin user.
- [ ] Commit scripts (not `.env`, not adapter JSON): `git commit -m "chore: tidecloak realm bootstrap"`.

### Task 2: Backend verifies real Tide tokens

**Files:** Create `server/src/auth/dpop.ts` (copy of `.tide-pack/templates/dpop-verify/verifyDpop.ts` and its test as `server/test/dpop.test.ts`), `server/src/auth/tide.ts`; Modify `server/src/auth/jwt.ts`, `server/src/config.ts`, `server/src/index.ts`, `server/package.json` (nothing new; `jose` already installed); Test `server/test/tide-auth.test.ts`.

**Interfaces:**
- Consumes: `verifyDpop(req, token, claims)` from the template (throws `DpopError`).
- Produces: `type Verifier = (token: string, req?: Request) => Promise<Principal>` (second parameter new, optional); `makeTideVerifier(adapter: TideAdapter): Verifier` where `adapter` is the parsed adapter JSON; `authenticate` accepts `Bearer` and `DPoP` schemes and passes `req`; config `TIDECLOAK_ADAPTER_FILE` (default `./data/tidecloak.json`), which replaces `TIDECLOAK_URL`/`TIDECLOAK_AUDIENCE` as the tidecloak-mode requirement.

- [ ] Write failing tests in `tide-auth.test.ts` using a locally generated Ed25519 key as the adapter `jwk` and a generated ES256 DPoP key: (1) valid token + valid proof for `GET /x` → principal with roles `['approver']`; (2) same token without `DPoP` header → rejected; (3) proof with wrong `htm` → rejected; (4) wrong `azp`, expired, or signed by another key → rejected; (5) token without `cnf.jkt` → rejected (fail closed); (6) missing `jwk` in adapter → `makeTideVerifier` throws at startup.
- [ ] Run `cd server && npx vitest run test/tide-auth.test.ts test/dpop.test.ts` → FAIL.
- [ ] Implement `makeTideVerifier`: `createLocalJWKSet(adapter.jwk)`, `jwtVerify` with `issuer = <auth-server-url>/realms/<realm>`, check `payload.azp === adapter.resource`, require `cnf.jkt`, call `verifyDpop`, map `realm_access.roles` through the existing known-roles filter. Wire it in `makeVerifier` when `AUTH_MODE=tidecloak`.
- [ ] Update the existing `server/test/auth.test.ts` tidecloak cases to the new config shape; run full suite → all PASS. Commit `feat(server): verify TideCloak EdDSA tokens and DPoP proofs`.

### Task 3: Backend small changes

**Files:** Modify `server/src/routes/admin.ts`, `server/src/agent/identity.ts`, `server/src/config.ts`; Test `server/test/admin.test.ts`, `server/test/identity.test.ts`.

**Interfaces:** `GET /api/admin/audit` accepts roles `admin` and `approver`; `/api/admin/stats/*` stays admin only. `AGENT_IDENTITY=simulated|client_credentials` (default `simulated` in tidecloak mode unless `AGENT_CLIENT_ID` is set) so the agent does not block the demo.

- [ ] Tests: approver gets 200 on `GET /api/admin/audit`; customer gets 403; approver still gets 403 on `/api/admin/stats/blocked-by-language`; with `AGENT_IDENTITY=simulated` in tidecloak mode `makeAgentIdentity` returns the fixed `support-agent` principal without any network call.
- [ ] Run → FAIL; implement; run full suite → PASS. Commit `feat(server): approvers read audit, simulated agent identity option`.

### Task 4: Frontend Tide provider, proxy and API client

**Files:** Modify `frontend/package.json` (add `@tidecloak/react` at the same version as the realm image reports; pin exactly), `frontend/vite.config.ts` (proxy `/api` → `http://localhost:4000`), `frontend/src/main.tsx`; Create `frontend/public/{tide_dpop_auth.html,silent-check-sso.html}`, `frontend/src/lib/api.ts`, `frontend/src/auth/{AuthProvider.tsx,useAuth.ts}`.

**Interfaces:**
- Produces: `useAuth(): { ready: boolean; user: {id, name, role: 'customer'|'approver'|'admin'} | null; login(): void; logout(): void; getFetch(): typeof fetch }` where `role` is the highest SafeDesk realm role in the token (`admin` > `approver` > `customer`), `null` user while signed out; `api.chat(message, lang)`, `api.orders()`, `api.approvals()`, `api.vote(id, vote)`, `api.audit()`, each returning typed API shapes and throwing `ApiError {status, message}`.
- Consumes: backend routes from `docs/superpowers/plans/2026-10-22-safedesk-backend.md`.

- [ ] Install; copy the DPoP page with the command from `tide_dpop_asset`; add the `/tide_dpop/*` rewrite and CSP headers per `tide_doctor` guidance in `vite.config.ts` dev server headers.
- [ ] Wrap the app in `TideCloakContextProvider` with `config={{ ...tcConfig, useDPoP: { mode: 'strict', alg: 'ES256' } }}` and `useAuthCallback()` handling at `/auth/redirect`.
- [ ] Write `api.ts` using `secureFetch` for every call; `ApiError` for non-2xx; unit-free but typed.
- [ ] Run `npx tsc -b` → no errors; `npx tide_doctor` command from `tide_doctor` → `RESULT: OK`. Commit `feat(frontend): tidecloak provider, proxy and api client`.

### Task 5: Rewire pages to the API; remove mocks

**Files:** Modify `frontend/src/pages/{Login,Chat,Approvals,Audit}.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/src/App.tsx`, `frontend/src/types.ts`; Delete `frontend/src/data/mock.ts`, `frontend/src/lib/engine.ts`, `frontend/src/store.tsx`; Create `frontend/src/hooks/usePolling.ts`.

**Interfaces:** `usePolling<T>(fn: () => Promise<T>, ms: number): { data: T | undefined; error: ApiError | undefined; reload(): void }` (runs immediately, repeats every `ms`, stops on unmount). Types in `types.ts` become the API's shapes: `Order {id, customerSub, amountVnd, status: 'paid'|'refunded', item}`, `RefundRequest {id, orderId, amountVnd, reason, originalMessage, flag, requestedBy, status, votes: {approverSub, vote}[]}`, `AuditEvent {id, ts, type, actorSub, data}`, `ChatResult {reply, label, actions}`.

- [ ] Login page: one "Sign in with TideCloak" button calling `login()`; signed-in user with no SafeDesk role sees a "no access" message with sign out.
- [ ] Route guards: customer → `/chat`; approver → `/approvals` and `/audit`; admin → `/audit` and read-only `/approvals`. Wrong role redirects to its home.
- [ ] Chat: sends via `api.chat`, shows reply, label badge and any `pending` action with its request id; disabled while sending; 502 shows "assistant unavailable". Orders sidebar from `api.orders()`.
- [ ] Approvals: `usePolling(api.approvals, 3000)`; approve/deny buttons call `api.vote` and reload; hide vote buttons for admin and for the request's own requester; show 403/409 messages inline.
- [ ] Audit: `usePolling(api.audit, 3000)`; type filter kept.
- [ ] Delete mock files; `grep -rn "data/mock\|lib/engine\|store'" frontend/src` → no matches.
- [ ] Run `npx tsc -b && npm run build` → success. Commit `feat(frontend): wire pages to the API, remove mock engine`.

### Task 6: Mock-login fallback

**Files:** Create `frontend/src/auth/mockAuth.ts`; Modify `frontend/src/auth/AuthProvider.tsx`, `frontend/.env.example` (`VITE_AUTH_MODE=tidecloak|mock`).

**Interfaces:** with `VITE_AUTH_MODE=mock`, `useAuth()` reads a persona chosen on the login page (customer `cust-an`, approvers `ap1`..`ap3`, admin `adm`), stores it in `sessionStorage`, and `getFetch()` adds `Authorization: Bearer mock:<sub>:<role>`. Default mode is `tidecloak`.

- [ ] Implement; with the backend on `AUTH_MODE=mock` run the PRD scenario once by hand to confirm the fallback works. Commit `feat(frontend): dev mock login fallback`.

### Task 7: End-to-end check and docs

**Files:** Modify `README.md` (run instructions, which accounts, real vs simulated table updated), `server/.env`/`.env.example` (`TIDECLOAK_ADAPTER_FILE`, `AGENT_IDENTITY`).

- [ ] Start backend (`AUTH_MODE=tidecloak`, `OPENAI_API_KEY` set, `SEED_CUSTOMER_SUBS=<customer user id>`) and frontend; run `tide_doctor` with `--url http://localhost:5173` → `RESULT: OK`.
- [ ] In browser profiles: customer asks about an order in Italian; sends the Portuguese injection → shown as held with `PROMPT_INJECTION`; two approvers deny; a genuine large refund is approved by two approvers; audit page shows all events. Record any failure and fix before moving on.
- [ ] Update README; commit `docs: run instructions and real vs simulated`.

---

## Self-review

- Spec coverage: real login T1/T2/T4; pages on API T5; polling T5; mock removal T5; mock fallback T6; approvers read audit T3; agent identity fallback T3; field mapping T5; error states T5; scenario run T7.
- Deviation from spec: 1 customer instead of 2 (each account needs a manual Tide invite enrolment; the second customer only mattered for isolation tests, which the backend tests already cover).
- Tasks 1 and 4 depend on facts only visible at run time (script prompts, SDK version, exact header wiring); the executor records rulings in the ledger when they differ.
