# TideCloak realm for the SafeDesk API

The API only needs these things from TideCloak (realm `safedesk`):

| Item | Value |
| --- | --- |
| Realm roles | `admin`, `support-agent`. Customers are public and have no role or account |
| Web client | `safedesk-web` (public, used by `@tidecloak/react`); set `TIDECLOAK_AUDIENCE` if its tokens carry a custom `aud` |
| Agent client | confidential, service account enabled, **only** realm role `support-agent`; put its id/secret in `AGENT_CLIENT_ID` / `AGENT_CLIENT_SECRET` |
| Users | 1 admin (also the approver). Add more admins only together with `APPROVALS_REQUIRED` / `APPROVER_COUNT` |

Run with `AUTH_MODE=tidecloak`, `TIDECLOAK_URL=http://localhost:8080`. If login is not working by 12:00, run with `AUTH_MODE=mock` and say so in the README.

Creating the realm needs a Tide licence email and agreement to https://tide.org/legal, so it is done by a person (or with the `tide_*` tools after they supply both).
