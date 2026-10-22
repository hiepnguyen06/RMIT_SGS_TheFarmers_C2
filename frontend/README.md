# SafeDesk frontend

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui. All data is mocked in memory (`src/data/mock.ts`); login is a mock stand-in for TideCloak.

```bash
npm install
npm run dev
```

- `src/lib/engine.ts`: mock attack check, agent replies, refund limit and 2-of-3 voting rules
- `src/store.tsx`: app state (user, chat, requests, audit log)
- `src/pages/`: Login, Chat (customer), Approvals (approver, admin view-only), Audit (approver, admin)

Demo path: sign in as Linh Tran, send the Portuguese attack, then sign in as two approvers and deny it. "Reset demo data" is on the login page.
