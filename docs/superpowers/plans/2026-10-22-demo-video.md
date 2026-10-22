# SafeDesk Demo Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a 2-3 minute MP4 demo of SafeDesk (customer prompts, held attack, real TideCloak admin sign-in, admin approve/deny, audit log) by scripting a recorded browser run and rendering captions and title cards in code.

**Architecture:** A standalone `demo-video/` Node/TypeScript project. One headed Playwright Chromium window is recorded for the whole run. Title cards are HTML pages and captions are an injected DOM overlay, so everything is captured in the same recording. The run starts a fresh API (reset DB) and the frontend, pauses at the Tide sign-in page for the user to type credentials, and logs cut markers. A render step uses an npm-packaged ffmpeg to drop the cut segments and encode MP4.

**Tech Stack:** Node 24, TypeScript, `tsx`, `vitest`, `playwright` (Chromium), `ffmpeg-static`. No product code (`frontend/`, `server/`) is modified.

**Spec:** `docs/superpowers/specs/2026-10-22-demo-video-design.md`

## Global Constraints

- All tooling lives in `demo-video/` with its own `package.json`; nothing under `frontend/` or `server/` changes.
- The admin credentials are never written to any file, script, log, caption or test. Automation never types into the Tide page; the user does.
- The final video must not contain the Tide credential-typing segment (cut via markers).
- Captions follow README "Real vs simulated": never claim Tide enforces the approval, payments are real, or the audit log is tamper-proof.
- Output: `demo-video/out/safedesk-demo.mp4`, 1920x1080, H.264, duration between 120 and 180 seconds, plus `demo-video/out/captions.txt` (one narration line per scene).
- Refund limit is 500,000 VND; demo orders are A-1001 (250,000), A-1002 (2,000,000), A-1003 (480,000), customer An Nguyen.
- Prompts typed by the customer are exactly the `DEMO_PROMPTS` texts in `frontend/src/lib/constants.ts` (it for A-1001, en for A-1003, pt attack for A-1002, vi genuine for A-1002).
- Team name on cards: `The Farmers` (confirmed by the user); it lives only in `demo-video/script.json` as `teamName`.
- Dev dependencies installation (playwright, ffmpeg-static, vitest, tsx) is only done with the user's go-ahead at execution time.

## Review Focus

1. API (:4000) or frontend (:5173) already running when a take starts: the run must refuse with a clear message, not record against stale state.
2. Real-LLM variance: a prompt that does not produce the expected outcome (no pending banner on the attack, no refund on the small one) must abort the take, not record a wrong story.
3. User never signs in on the Tide page: the pause must time out with a clear error rather than hang forever.
4. Cut segment at the very start, adjacent cuts, or a cut that never closed: render must still produce valid output or fail loudly.
5. Total duration outside 120-180 s: render must report it.

---

### Task 1: Project scaffold and script file

**Files:**
- Create: `demo-video/package.json`, `demo-video/tsconfig.json`, `demo-video/script.json`, `demo-video/src/script.ts`, `demo-video/.gitignore` (ignores `out/`, `raw/`, `node_modules/`)
- Test: `demo-video/src/script.test.ts`

**Interfaces:**
- Produces: `type Scene = { id: string; caption: string; narration: string; card?: { title: string; subtitle?: string }; holdMs: number }`; `loadScript(path?: string): { teamName: string; scenes: Scene[] }`; `scenes` ids in order: `hook, customer-status, customer-small-refund, attack, tide-login, admin-deny, admin-approve, audit, close`.

- [ ] **Step 1: Write failing tests** in `script.test.ts`: `loadScript` returns the 9 scene ids above in order; every scene has non-empty `caption` and `narration`; `holdMs` is a positive integer; no caption or narration contains the substrings `password`, `tamper-proof`, or `real payments`; scenes `hook` and `close` have a `card`.
- [ ] **Step 2: Run** `npx vitest run src/script.test.ts` from `demo-video/`. Expected: FAIL (module missing).
- [ ] **Step 3: Write `script.json`** with `teamName` and the 9 scenes following the storyboard in the spec (captions short, narration one sentence each, closing card text "The agent proposes. Only a signed-in admin approves."). Implement `loadScript` in `script.ts` with runtime validation that throws on a missing field.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(demo-video): scaffold project and storyboard script`.

### Task 2: Caption overlay and title cards

**Files:**
- Create: `demo-video/src/overlay.ts`
- Test: `demo-video/src/overlay.test.ts` (Playwright, headless)

**Interfaces:**
- Consumes: Playwright `Page`.
- Produces: `showCaption(page: Page, text: string): Promise<void>` (fixed bottom-centre bar, id `demo-caption`, survives re-calls by replacing text); `clearCaption(page: Page): Promise<void>`; `showCard(page: Page, card: {title: string; subtitle?: string}): Promise<void>` (navigates to an inline full-screen dark-teal page matching SafeDesk's look, 1920x1080-safe); `installOverlayOnNavigation(page: Page): Promise<void>` (re-applies the current caption after each navigation via `addInitScript`).

- [ ] **Step 1: Write failing tests** against a `data:` URL page: after `showCaption(page,"Hello")`, `#demo-caption` has text "Hello" and is visible; second call replaces the text (one element only); after `clearCaption` the element is absent; after `showCard` the page text contains the title and subtitle; after navigating to another `data:` URL with `installOverlayOnNavigation` active, the caption is still present.
- [ ] **Step 2: Run** `npx vitest run src/overlay.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the four functions; keep caption state in a `window.__demoCaption` variable set through `addInitScript` so navigations keep it.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(demo-video): caption overlay and title cards`.

### Task 3: Stack control (fresh state, port guard)

**Files:**
- Create: `demo-video/src/stack.ts`
- Test: `demo-video/src/stack.test.ts`

**Interfaces:**
- Produces: `assertPortsFree(ports: number[]): Promise<void>` (throws `Error` listing busy ports, message names "stop the dev servers first"); `startStack(): Promise<{ stop(): Promise<void> }>` which deletes `data/safedesk.db` (repo root), spawns `npm --prefix server run dev` and `npm --prefix frontend run dev -- --port 5173 --strictPort`, and resolves when `GET http://localhost:4000/api/orders/mine` returns 200 and `http://localhost:5173` returns 200 (timeout 60 s, then kills children and throws). `stop()` kills both process trees.

- [ ] **Step 1: Write failing tests** for `assertPortsFree`: free port passes; a port held by a throwaway `net` server throws with that port number in the message.
- [ ] **Step 2: Run** `npx vitest run src/stack.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `assertPortsFree` with `net` connect/listen probing and `startStack` per the interface; on Windows kill trees with `taskkill /T /F /PID`. Confirm the DB file path and the readiness endpoint against `server/src/config.ts` and `server/src/routes` while implementing; adjust the URL if different.
- [ ] **Step 4: Run tests.** Expected: PASS. Then manual check: `npx tsx -e "import('./src/stack.ts').then(async m=>{const s=await m.startStack();console.log('up');await s.stop()})"` prints `up` and leaves no listeners on 4000/5173 (stop the existing preview servers first).
- [ ] **Step 5: Commit** `feat(demo-video): start and reset the app stack for takes`.

### Task 4: Recorder scenes (customer side)

**Files:**
- Create: `demo-video/src/record.ts` (entry), `demo-video/src/actions.ts`, `demo-video/src/markers.ts`
- Test: `demo-video/src/markers.test.ts`

**Interfaces:**
- Consumes: `loadScript`, `showCaption`, `showCard`, `clearCaption`, `installOverlayOnNavigation`, `startStack`, `assertPortsFree`.
- Produces: `class Markers { constructor(startMs: number); begin(label: 'cut'): void; end(label: 'cut'): void; cuts(): {startS: number; endS: number}[]; assertClosed(): void }` (times in seconds relative to recording start; `assertClosed` throws if a cut is open); `typeAsCustomer(page: Page, text: string, lang: 'vi'|'pt'|'it'|'en'): Promise<void>` (clicks language button, types into `#msg` with 45 ms per key, clicks the Send button, waits for the "SafeDesk AI is typing…" text to appear and disappear); `expectBanner(page: Page, kind: 'pending'|'none'): Promise<void>` (pending: text "No money has moved" visible within 20 s; none: absent; on failure throws an error that names the scene so the take aborts).

- [ ] **Step 1: Write failing tests** for `Markers`: begin/end produces one cut with `endS > startS`; two cuts are returned in order; `assertClosed` throws with an open cut and passes otherwise; `end` without `begin` throws.
- [ ] **Step 2: Run** `npx vitest run src/markers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `Markers` and the actions. In `record.ts` implement scenes `hook`, `customer-status`, `customer-small-refund`, `attack` in order: for each, show caption, perform the action, `expectBanner` where the story requires it (small refund: `none` and the order card for A-1003 shows "Refunded"; attack: `pending` and the side panel shows a Pending request), hold `holdMs`. The recording context uses `recordVideo: { dir: 'raw', size: { width: 1920, height: 1080 } }` and viewport 1920x1080. Call `assertPortsFree([4000,5173])` before `startStack`.
- [ ] **Step 4: Run tests**, then a dry customer-only take: `npx tsx src/record.ts --until attack` (add the `--until <sceneId>` flag). Expected: exits 0, a `.webm` appears in `raw/`, console prints each scene id as it completes. Watch the pane; abort and fix if a scene throws.
- [ ] **Step 5: Commit** `feat(demo-video): record customer scenes with outcome checks`.

### Task 5: Tide sign-in pause and admin scenes

**Files:**
- Modify: `demo-video/src/record.ts`, `demo-video/src/actions.ts`
- Test: `demo-video/src/waitForSignIn.test.ts`

**Interfaces:**
- Produces: `waitForSignIn(page: Page, opts: { timeoutMs: number; origin: string }): Promise<void>` (resolves when the page URL origin equals `origin` AND text "Approval queue" is visible; rejects with an Error whose message contains "sign-in timed out" otherwise); `adminVote(page: Page, requestId: string | 'first-pending', vote: 'approve'|'deny'): Promise<void>`.

- [ ] **Step 1: Write failing tests** for `waitForSignIn` using a local `http.createServer` page: resolves after the server page is switched to contain "Approval queue"; rejects with "sign-in timed out" when it never does (timeoutMs 500).
- [ ] **Step 2: Run** `npx vitest run src/waitForSignIn.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `waitForSignIn` and `adminVote`. In `record.ts` add scenes `tide-login` and onward. `tide-login`: via client-side links click "Staff sign-in" then "Continue with TideCloak"; show caption "Sign in with TideCloak"; call `markers.begin('cut')` when the URL leaves localhost:5173, print a console message telling the user to type the admin credentials in the window, `waitForSignIn` (timeout 180 000 ms), then `markers.end('cut')`. Automation must not touch any input on the Tide page. `admin-deny`: on the queue, assert the flagged request shows "untrusted", `adminVote(..., 'first-pending', 'deny')`, then navigate by client-side links to the shop chat and assert the side panel shows "Denied". Then type the Vietnamese genuine refund as the customer, `expectBanner('pending')`, return to the admin queue by links (re-sign-in is not expected; if the Approval queue is not visible, throw "admin session lost"). `admin-approve`: `adminVote(..., 'first-pending', 'approve')`, assert "Approved · refund applied". `audit`: open the Audit page and hold. `close`: `showCard` with the closing text and team name.
- [ ] **Step 4: Run tests**, then a full take: `npx tsx src/record.ts`. The user types the credentials at the pause. Expected: exits 0, one `.webm` in `raw/`, `raw/markers.json` containing one cut, and no console line contains the credentials.
- [ ] **Step 5: Commit** `feat(demo-video): TideCloak sign-in pause and admin approval scenes`.

### Task 6: Render to MP4

**Files:**
- Create: `demo-video/src/render.ts`, `demo-video/src/ffmpegArgs.ts`
- Test: `demo-video/src/ffmpegArgs.test.ts`

**Interfaces:**
- Consumes: `raw/*.webm`, `raw/markers.json`, `loadScript`.
- Produces: `keepRanges(totalS: number, cuts: {startS:number;endS:number}[]): {startS:number;endS:number}[]` (complement of the cuts; merges overlapping or adjacent cuts; clamps to `[0,totalS]`; drops zero-length ranges); `buildFfmpegArgs(input: string, ranges: {startS:number;endS:number}[], output: string): string[]` (a `filter_complex` with `trim`/`setpts` per range and `concat`, scale 1920x1080, `libx264 -pix_fmt yuv420p`, no audio); `render(): Promise<{ output: string; durationS: number }>` which runs `ffmpeg-static`, writes `out/safedesk-demo.mp4` and `out/captions.txt`, and prints a warning if `durationS` is outside 120-180.

- [ ] **Step 1: Write failing tests** for `keepRanges`: no cuts returns the whole range; one middle cut gives two ranges; a cut starting at 0 gives one range; overlapping cuts merge; a cut past `totalS` is clamped. For `buildFfmpegArgs`: output contains one `trim=` per range and a `concat=n=<count>`; the last arg is the output path.
- [ ] **Step 2: Run** `npx vitest run src/ffmpegArgs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions and `render` (probe total duration from ffmpeg's stderr; fail with a clear message if `raw/` has no webm or markers show an unclosed cut).
- [ ] **Step 4: Run tests**, then `npx tsx src/render.ts`. Expected: prints output path and duration; file exists and plays.
- [ ] **Step 5: Commit** `feat(demo-video): render recording to MP4 with credential segment cut`.

### Task 7: Final take, verification and handoff

**Files:**
- Create: `demo-video/README.md` (how to run a take: stop dev servers, `npm run record`, type credentials at the pause, `npm run render`)
- Modify: `demo-video/package.json` (scripts `record`, `render`, `test`)

- [ ] **Step 1:** Stop any running dev servers, run `npm run record`, let the user sign in at the pause, then `npm run render`.
- [ ] **Step 2: Verify** with ffprobe-equivalent output from render: duration 120-180 s, 1920x1080. Extract frames at the scene boundaries (using ffmpeg-static) and check by eye: no frame shows the Tide sign-in form with typed text; the amber "No money has moved" banner, the untrusted original message, and the "Approved · refund applied" pill are all visible in the video. Report any failed check; do not claim success otherwise.
- [ ] **Step 3: Review captions** against the "Real vs simulated" table.
- [ ] **Step 4: Commit** `docs(demo-video): usage notes`. Do not commit `out/` or `raw/`.

---

## Self-review notes

- Spec coverage: storyboard scenes 1-7 map to script ids in Task 1 and recorder scenes in Tasks 4-5; credential handling and cut in Tasks 4-6; reset state and port guard in Task 3; captions-first narration file in Tasks 1 and 6; non-goals untouched (no product changes).
- Types are consistent across tasks: `Scene`, `Markers.cuts()` feeding `keepRanges`, `waitForSignIn` used only in Task 5.
- Known soft spots for the executor to confirm in the code: the readiness endpoint and DB path (Task 3), exact button and link labels in the UI (read from `frontend/src/pages/*` and `components/AppShell.tsx`), and whether the Tide session survives client-side navigation (Task 5 throws "admin session lost" if not).
