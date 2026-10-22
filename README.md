# SafeDesk

A multilingual customer-support AI agent that cannot move money on its own. It signs in to TideCloak with a narrow role, and any refund above a limit waits for 2 of 3 human approvers.

RMIT Hackathon 2026, Challenge 2 (`RMIT_SGS_TheFarmers_C2`).

> Status: scaffold only. Nothing is implemented yet.

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
| TideCloak login and roles | Real | Local Docker server |
| Agent identity with a narrow role | TBD | Real if FR8 lands, otherwise simulated |
| Attack check | Real | LLM prompt with rule-based fallback |
| 2-of-3 approval | Simulated | Enforced in app code, not by Tide |
| Orders and refunds | Simulated | Mock data, no payments |
| Audit log | Real, in app | Not tamper-proof |

## Getting started

```bash
cp .env.example .env   # then fill in the values
```

Setup steps for TideCloak and the app will be added as they are built.

## Configuration

All settings live in `.env` (see `.env.example`). Never commit `.env`.
