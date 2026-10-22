# Frontend and API integration with real TideCloak login

Date: 22 Oct 2026. Deadline: 6:00 PM Vietnam time (submit by 5:30 PM). Project: SafeDesk, `RMIT_SGS_TheFarmers_C2`.

## Intent

The frontend (`frontend/`, React + Vite + shadcn) currently runs on an in-memory mock engine. The Express API (`server/`, merged to `main`) already implements the real rules. The goal is one demo where the frontend shows only what the API returns, and every user signs in through real TideCloak, so the PRD's blocked-attack scenario runs against the real policy gate.

Why: the hackathon entry is judged on real TideCloak login, an agent with a narrow identity, and a visible blocked attack. A mock frontend cannot show the second and third honestly.

## Goals

- Real TideCloak login (`@tidecloak/react`) for customer, approver and admin, with roles read from the token.
- Every page (Chat, Approvals, Audit) reads and writes through the API. No data lives only in the browser.
- The PRD demo scenario runs end to end across browser profiles: Italian order question, Portuguese injection held, two approvers deny, a genuine large refund approved by two different approvers.
- Approvals page updates itself by polling every few seconds.
- Chat replies and attack labels come from OpenAI (the user's choice).

## Non-goals

- Mobile layouts, multi-tenant support, a polished admin panel.
- Live push (SSE/websockets).
- Forseti-enforced quorum (stays app logic, labelled simulated).
- A rule-based chat engine in the demo path (user chose OpenAI only). The backend keeps its rule fallback for the attack check only.

## Anti-goals (a failure even if it technically works)

- A page that silently falls back to mock data when the API fails. Errors must be visible.
- Secrets (master admin password, OpenAI key, agent client secret) in frontend code or git.
- Authorization done only in the UI. The API already enforces roles; the UI only hides what a role cannot use.

## Constraints

- TideCloak runs in local Docker (user's choice). Docker Desktop is not running yet. Licence email `hiepskyc@gmail.com` and Tide terms (https://tide.org/legal) accepted by the user in chat on 22 Oct 2026.
- Tide tokens are EdDSA and DPoP-bound, and the verification key comes from the adapter JSON, not a standard JWKS endpoint. The current backend verifier (`server/src/auth/jwt.ts`, RS256 via remote JWKS) cannot verify them and must change.
- The frontend needs the Tide provider config, `public/tide_dpop_auth.html` copied from the Tide pack (never retyped), and the matching rewrite and headers.
- Sequencing (user's choice): TideCloak first, then wire pages. Nothing works end to end until Tide login works.
- Existing stack stays: Express + TypeScript backend, React 19 + Vite 8 + react-router + shadcn frontend.

## Decisions the user made

- Real TideCloak login, local Docker, TideCloak set up before wiring pages.
- OpenAI only for the agent and attack check.
- Poll for updates every few seconds.
- Remove the frontend's mock engine and mock data.

## Calls I made (change any of these)

1. **Mock-login fallback kept, tiny.** The PRD says to fall back to mock login if real login is not working by a set time. Removing the mock engine does not prevent this: the backend still accepts `AUTH_MODE=mock` tokens, so I keep a small dev-only persona picker in the frontend (`VITE_AUTH_MODE=mock`) that produces mock tokens. It is off unless that variable is set. The README states plainly which mode the demo used.
2. **Dev proxy.** Vite proxies `/api` to `http://localhost:4000`, so the frontend uses relative URLs and there is no CORS setup.
3. **Accounts.** One realm `safedesk` with roles `customer`, `approver`, `admin`, `support-agent`; two customers, three approvers, one admin. Demo uses separate browser profiles (one per signed-in person).
4. **Approvers may read the audit log.** The existing Audit page is shown to approvers and admins. The API currently allows admins only, so `GET /api/admin/audit` also accepts `approver` (read only; voting rules unchanged). Admin still cannot vote.
5. **Seed orders follow real users.** `SEED_CUSTOMER_SUBS` is set to the two customers' TideCloak user ids after the users exist.
6. **Agent identity.** The agent service account uses `client_credentials` with only `support-agent`. If Tide's service-account tokens turn out not to be verifiable the same way as user tokens, the agent identity stays simulated in the backend (FR8 labelled "simulated" in the README) rather than blocking the demo.
7. **Field mapping.** The frontend's types are adapted to the API's shapes (`amount` to `amountVnd`, `customerId` to `customerSub`, request `votes[].approverSub`), not the other way round. The API is the source of truth.
8. **Loading and error states.** Each page shows a loading state, and an inline error with retry when a call fails; chat shows "assistant unavailable" on a 502.

## Work, in order

1. Start Docker Desktop (user), fetch the Tide pack, bootstrap the `safedesk` realm locally with roles, users and the agent client; export the adapter JSON.
2. Backend: change token verification to Tide's EdDSA and DPoP rules; keep `AUTH_MODE=mock` working; allow approvers to read the audit log; tests for both modes.
3. Frontend: Tide provider and DPoP page, an API client that attaches the token, then rewire Login, Chat, Approvals and Audit; remove the mock engine and data.
4. Run the PRD scenario in browser profiles; fix what breaks.
5. README sections and demo video are separate work after this.

## Left to the builder

Exact Tide SDK versions and config, Vite proxy details, component-level layout, polling interval (a few seconds), how DPoP proofs are attached in the API client, test structure.

## Risks

- Real TideCloak setup is the longest and least predictable step; the mock fallback exists so the demo is never blocked by it.
- OpenAI only means a slow or failed call shows an error in chat. Record the video from a scripted run.
- Tide needs internet access to its network for licensing and login.
