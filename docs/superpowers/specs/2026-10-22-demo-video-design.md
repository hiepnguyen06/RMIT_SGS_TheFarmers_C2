# SafeDesk demo video: design

## Intent

A product demo video of at most 2 minutes (target 1:45-1:55) for the RMIT Hackathon 2026 judging committee (Challenge 2). Judges compare many teams and will not run the app, so the video has to land one idea quickly: **SafeDesk's AI support agent serves customers, but anything risky waits for a human admin's approval, and that admin identity is enforced through TideCloak.**

Success: a judge who watches once can say, in one sentence, "the agent can't move money on its own; a signed-in admin has to approve."

## Decisions made with the user

- Audience: judging committee.
- Key message: human-in-the-loop safety.
- Length: at most 2 minutes (user tightened this from 2-3 minutes after the storyboard was written).
- Style: mix of title cards, a recorded run of the real app, and on-screen captions. Captions first; a voiceover can be added later, so the script is written as narration lines that double as captions.
- Production: automated end to end (browser run recorded by script, final video rendered by code).
- Show the **real TideCloak admin login**. The user types the admin credentials themselves on camera; automation pauses on the Tide page and resumes once the app is back on localhost:5173. The credentials are never written to files, scripts, logs or captions.
- App runs locally, real TideCloak mode (`AUTH_MODE=tidecloak`, `VITE_AUTH_MODE=tidecloak`), the OpenAI agent is configured, and the TideCloak container is up.

## Goals

- Show the full core flow with the real app: customer prompts, guardrails visible, admin sign-in via TideCloak, approval queue, approve and deny, audit trail.
- Make the safety idea visible, not just claimed: "No money has moved", the amber pending banner, the untrusted original message in the admin queue, the agent guardrails panel.
- Honest captions about what is real and what is simulated (see README "Real vs simulated").

## Non-goals

- No changes to the product. The video shows the app as it is. If a flow is broken, that is reported, not silently fixed.
- No architecture deep dive or code walkthrough.
- No voiceover in this pass.
- The `npm run demo` contrast shot (same attack against an admin-token agent) is optional and only used if time allows.

## Anti-goals

- The video must not overclaim. It does not say Tide enforces the approval (approval is enforced in app code), that payments are real, or that the audit log is tamper-proof.
- The admin password must never appear in the final video. The Tide sign-in typing segment is cut or sped past.

## Storyboard (my proposal, about 1:50; scene times below are the original 2:30 draft and must be compressed, with waiting for the AI and typing sped up in the render)

1. **Hook card (0:00-0:12).** "AI agents are useful. Agents that can move money are risky." Then: "SafeDesk: a support agent that can't move money on its own."
2. **Customer, normal (0:12-0:35).** Shop chat, Italian: order status for A-1001. Agent answers. Guardrails panel shows BENIGN.
3. **Customer, small refund (0:35-0:50).** English refund of A-1003 (480,000 VND, under the 500,000 limit). Refunded straight away, order turns Refunded.
4. **Attack (0:50-1:20).** Portuguese prompt injection asking to refund A-1002 (2,000,000 VND). Message gets an attack badge, agent replies that the request is held, banner "No money has moved", request shows Pending in the side panel. Caption: the agent has a narrow role and a limit, even a missed attack cannot pay out.
5. **Admin sign-in with TideCloak (1:20-1:45).** Staff sign-in, "Continue with TideCloak", Tide sign-in page. Automation pauses; the user types the credentials; the video cuts to the signed-in approval queue.
6. **Admin decides (1:45-2:15).** Queue shows the flagged request with the original message marked untrusted. Admin **denies** it. Back in the customer chat the request shows Denied. Then the genuine Vietnamese refund for A-1002 (broken grinder) appears as a held request; admin **approves**, refund applied, order shows Refunded.
7. **Audit and close (2:15-2:35).** Audit log page lists every step. Closing card: "The agent proposes. Only a signed-in admin approves." plus Real vs simulated note and team name.

## How it gets made (my calls, not agreed with the user)

- Recording: Playwright driving a headed Chromium against http://localhost:5173, with video recording at 1920x1080. Headed mode is required so the user can type on the Tide page.
- Rendering: title cards, captions, cuts and speed-ups composed in code from the recorded clips. ffmpeg is not installed; use an npm-packaged ffmpeg or a Remotion-style renderer rather than a system install. Installing dev dependencies for this is part of the build and needs the user's go-ahead at that time.
- The tooling lives outside product code, in a new folder such as `demo-video/`, with its own package.json, and does not touch `frontend/` or `server/`.
- Captions are authored as a script file (one line per scene) so a voiceover can be generated or recorded from the same text later.
- Output: an MP4 in `demo-video/out/`, plus the script text file.

## Constraints and known risks

- **Tide sign-in is external.** The password form is on Tide's hosted service (`ork1.tideprotocol.com`), so the user types the credentials; automation never does. The run needs a human present. The Tide login depends on network access to that service.
- **State persists.** Orders and requests are saved to `data/safedesk.db` (gitignored). Before each recording take, state must be reset to the seed (all orders paid, no requests), otherwise A-1002 or A-1003 may already be refunded and the story breaks. The reset method (stop the API, delete the DB file, restart) is for the builder to confirm.
- **Real LLM agent.** The agent and attack check use OpenAI, so replies vary. The builder should run each prompt once beforehand and, if wording is off, retake or fall back to captions that summarise rather than quote the reply.
- **Admin-only constraints.** Admin cannot vote on a request they raised; the requester is the public customer, so this does not block the admin. The admin account needs the `admin` role approved in TideCloak, which the user confirmed works.
- Polling interval is 3 seconds, so the customer view may take up to 3 seconds to show a decision. Account for this in timing.
- The admin session is in the Playwright browser profile, not the user's Chrome. A fresh recording means a fresh sign-in.

## Left to the builder

- Exact visual style of title cards and captions (match SafeDesk's dark teal and clean look).
- Music: optional, royalty-free only, or none.
- Exact timing, zooms and highlights on the key UI (the amber banner, the untrusted message, the Approve button).
- How to reset app state and how to make takes repeatable.
- Whether to include the `npm run demo` contrast shot.

## Open items for the user

- Team name and any tagline for the opening and closing cards.
- Whether the judging format requires a specific file type, resolution or hard length limit (assumed MP4, 1080p, under 2 minutes).
