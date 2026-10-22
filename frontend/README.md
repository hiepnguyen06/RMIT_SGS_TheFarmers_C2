# SafeDesk frontend

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui. All data is mocked in memory (`src/data/mock.ts`); login is a mock stand-in for TideCloak.

```bash
npm install
npm run dev
```

- `src/lib/engine.ts`: mock attack check, agent replies, refund limit and 2-of-3 voting rules
- `src/store.tsx`: app state (user, chat, requests, audit log)
- `src/pages/`: Login (admin only), Chat (public customer, no sign-in), Approvals (admin), Audit (admin)

Demo path: open the shop chat (no sign-in), send the Portuguese attack, then use **Staff sign-in** as the admin and deny it.
