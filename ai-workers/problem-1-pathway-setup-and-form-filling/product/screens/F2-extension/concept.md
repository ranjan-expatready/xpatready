# F2 — Browser extension: portal capture and fill · plan input (agreed by the Lead, 25 Oct; drafted by screen-designer 23 Oct)

## Lead decisions (25 Oct, P-89: the Lead agrees concepts; the founder walks the milestone end to end)
* **Technology gate passed:** the founder approved the Chrome/Edge MV3 extension on 25 Oct (P-90): existing Vite and Playwright, `@types/chrome` (dev types, MIT); no client data stored; IRCC terms unread (Unconfirmed: no counsel); the portal answer sheet stays the fallback. Record it in ENVIRONMENT.md when installed.
* Backend path (P-68): the forms lane writes `plan.md` (a fresh challenge first), then BUILD.
* **Q1 → pairing code:** a code from the signed-in Studio gives a short-lived, scoped, revocable token held in memory; no session cookie reuse.
* **Q2 → a capture adds to the current version:** only screens seen are compared; unseen = "not seen this time"; new = "added"; "last seen on" per screen; an unknown screen at fill opens a "Capture needed" task.
* **Q3 → "You answer this on screen":** set at screen-map review by the immigration expert role, approved by a second person; until set, nothing is filled on that screen.
* Proof script (§9) on Sample screens only, US$0.

**Path:** backend path (P-68) plus one new surface, the extension's side panel; forms lane, after slice 2; the forms lane challenges this draft. **Decisions:** P-66, P-62 §8, P-61, P-65, P-71–P-73; team redesign decisions 16 and 16b; SA-1B-32. **Capabilities:** C2.9, C7.4, C9.3 (task part only). **Board:** `design/draft-extension.html`. Marks: **[F]** follows a decision · **[M]** a decision is missing · **[C]** two sources conflict. Unconfirmed: no counsel on any legal point, including a representative using automation on IRCC or ESDC portals and reading screen structure during a real client's application.

## 1. Job and journey
* **Capture mode** (content team; run by a licensed representative, either the immigration expert or the design-partner firm's representative, during real work): record each portal screen's structure in portal order, never an answer, so the library gets an exact portal twin with element ids, option codes and rules. A second person approves it. Journey step 2 Sources (C2.9). [F] P-66 §0–§1
* **Fill mode** (agent, in their own logged-in portal session): one click fills the open screen from the case's confirmed facts and shows what was filled and where each value came from. If the screen differs from the approved version, nothing is filled and "Re-capture needed" opens. Journey steps 7 Fill and 9 Changes (C7.4, C9.3). [F] decision 16, P-62 §8, P-66 §2

## 2. Ten layers (on main → new in F2)
| Layer | Exists (app; team code has no extension and no portal model) | New in F2 |
|---|---|---|
| Masters | PortalCapture, online version (FormEdition ONLINE), Portal list (Sample) | ExtensionSession (pairing), RecaptureTask, FillEvent; map outcome `person_answers_on_screen` [M] Q3 |
| Links | FormFieldMap per online input (screen, person, transform, option map) | Task → online version + screen; FillEvent → filing, version, screen (filing from the runtime lane's case, R1) |
| Engine (pure) | `capture.ts` whole-record fingerprint and difference | Per-screen structure, fingerprint and difference; `fillPlan(map rows, case facts)` using `transformFor` and option maps |
| Contract | `portal-capture/v1`; `POST captures/:id/screens` takes **files only** | zod: ExtensionScreen (one screen, structure only), FillPlan, FillOutcome, Pairing |
| Screen | none | Side panel (React + Vite, team tokens); Studio "Connect the browser extension" panel (owner to settle with the screens lane) |
| AI | none | none: filling and identity are never AI (P-62 §4) [F] |
| Governance | held → second person approves (author ≠ approver, server side) | Re-capture task → re-capture → approve, the existing flow (P-32, P-66 §2.3) [F] |

## 3. Business rules
* BR-1 **Structure only.** The content script reads label, id or name, type, required, length and pattern, help (aria-describedby), legend and options (code and label). It never reads value, checked, selected, selectedIndex, editable text, password or hidden inputs. The server checks again (contract, `noAnswers`, the reader's client-detail patterns) and refuses the whole screen. [F] P-66 §1, P-65
* BR-2 **One screen, one fingerprint, whichever way it was captured:** the extension reader and the saved-page reader give identical structure for every fixture (a conformance test, because two readers run in two runtimes). [F] P-66 §1
* BR-3 **Check before sending.** The panel lists every text it will send. A text that matches a client-detail pattern is refused. The capturer can mark a label holding client details (for example "Details of <name>") → `[client detail]`, matched as a wildcard when filling. [M] not decided; for the challenge
* BR-4 **Guided capture:** start (portal, form, title, application type) → "Capture this screen" for each screen in portal order → a duplicate is refused → "Finish capture" → held for a second person. [F] P-66 §0, P-57 as amended
* BR-5 **Branches:** a real-work capture sees only some of the screens. Today `difference()` compares whole records, so every unseen screen would show as "removed". [M] Q2
* BR-6 **Fill on a click only, one screen per click.** It never logs in, never touches password fields, never clicks Next, Save or Submit, and never runs unattended. [F] decision 16
* BR-7 **Compare before fill.** The live screen's structure (no values) goes to the server, which compares it with the approved twin's screen. On any difference it fills nothing, returns the differing inputs, and opens or updates one "Re-capture needed" task per version and screen, listing affected combinations and open filings. [F] P-66 §2
* BR-8 **Only confirmed facts fill:** an unconfirmed fact gives "Confirm <section> in the case first"; a missing fact gives "No answer yet". [F] P-72
* BR-9 **Declaration and background inputs are never filled;** the representative answers them on screen. [F] decision 16 · marker and owner [M] Q3
* BR-10 **Portal's own format:** date parts and option codes come from the option map per channel; a value with no code is not filled (REFUSE). [F] P-62 §3, F1
* BR-11 **Read-back:** after writing, each value is read back; a difference is highlighted on the page and in the panel as "Not accepted by the screen". [F] decision 16, P-66 §2.1
* BR-12 **Fills empty inputs only.** An input that already holds a different answer is left alone and listed. [M] the Lead's safe default, after P-65 "never overwrite"
* BR-13 **Fetch only this screen, keep nothing:** the plan is held in memory and dropped on navigation, on panel close or after 5 min (Sample). No `storage.local`. [F] decision 16
* BR-14 **Events carry no client data:** version, screen, input id, outcome, firm, time. [F] P-66 §3 (the Form health view is M3)
* BR-15 **Roles:** capture mode only for people given the capture duty; fill mode only for filings the person may open; deny by default, server side. [F] P-66 §0, STANDARDS §6

## 4. Layout and states (board)
Pattern: **Side panel** (EXPERIENCE §3) as the Chrome side panel at 360 px, with a pinned header (logo, mode, filing or capture, status), a scrolling body and a pinned footer with one primary action. The mode switch shows only for a person with both duties (one tab row). Fill states: not connected · choose filing · ready · filled with sources · read-back problem · screen looks different (nothing filled) · screen not captured yet · declaration screen · not a portal page · error with Retry · loading · session ended. Capture states: start · check before sending · refused (client detail) · screen N captured · already captured · not read (custom control) · held for a second person · no capture duty. Plus the Studio pairing panel. Data is the F1 Sample fixtures (visitor visa, IMM 5257 online, Client A).

## 5. Copy (key strings)
"Fill this screen" · "Filled 8 of 9 · 1 needs you" · "Not filled: confirm Identity in the case first" · "You answer this on screen" · "This screen looks different from the approved version. Nothing was filled. Re-capture needed is open for the content team." · "Capture this screen" · "Screen 3 captured · go to the next screen in the portal" · "Finish capture" · "Held for a second person" · "Refused: this text looks like a client's detail (a long number). Nothing was sent." · "Connect the browser extension: enter this code in the extension within 5 minutes."

## 6. Contract (new unless marked) and tests
| Endpoint | Purpose |
|---|---|
| `POST /api/extension/pairings` (Studio, signed in) → one-time 8-character code, 5 min · `POST /api/extension/sessions {code}` → opaque token, 8 h (Sample), modes, person · `DELETE …/sessions/current` | Pairing [M] Q1 |
| `POST /api/captures` (exists, `way: extension`) · `POST /api/captures/:id/extension-screens {screen}` · remove screen, finish, approve (exist) | Capture |
| `POST /api/filings/:id/fill-plans {portal, screen}` → `{match, planId, person, inputs[{id, label, value, source, status}]}` or `{match:false, differences, task}` | Fill and compare |
| `POST /api/fill-plans/:id/outcomes {inputs[{id, outcome}]}` (no values) · `GET /api/recapture-tasks` | Events, tasks |
Tests: a pass and a fail per BR. Key cases: blank s1 typed into by Playwright, captured → same fingerprint as the saved blank s1 (BR-1, BR-2); `hostile-label-answer`, `-option-passport` → refused; `-aria-unread` → not read; `s1-reworded` at fill → nothing filled, task lists "Surname" and the added option, and a second mismatch updates the same task; an unconfirmed fact is not filled; a declaration input is not filled; read-back shows a rejected code; no `submit` event, `requestSubmit` or button click fires (spied); `storage.local` is empty after a fill; the production manifest has no localhost and no wildcard host; a token from another firm or an expired token → 401 or 403; capturer = approver → 403. Keyboard: every panel action works by Tab and Enter; axe on every panel state.

## 6b. Capability or Scaffolding · Needed for the proof or Not built
**Capability · Needed:** side panel in both modes; content-script reader and filler; pairing and session; extension-screens, fill-plans, outcomes and tasks endpoints; per-screen compare; RecaptureTask; never-fill marker. **Scaffolding · Needed:** local fixture server serving the F1 Sample screens on port 4459; dev build with a localhost host permission; unpacked load in Playwright; Sample case facts from R1; Acting-as. **Not built:** Form health view and failure-rate rule, "This screen looks different" button, changed-screen marks on open cases, per-screen "entered" tick (M3, P-66 §4, C8.1); "Report a mapping problem" (M4, P-73); store publishing and hardening (team, M3); Firefox and Safari; real-portal capture (needs a representative's account).

## 7. Security model
Manifest V3; permissions `sidePanel`, `storage` only; host permissions = the exact portal hosts, to be confirmed by the immigration expert from a real session (no `*.gc.ca`, no `<all_urls>`), plus the ExpatReady API origin. Content script in the isolated world, portal hosts only, no `externally_connectable`, messages accepted only from its own extension id. No remote code, no `eval`; values are written through the input's own setter and events, never as HTML. The API allows only the fixed extension origin (CORS). The token is opaque, stored hashed on the server, bound to person, firm, modes and extension id, revocable, and kept in `storage.session` (memory) only. Values are never logged (pino redaction). The page cannot change what is filled: fill writes only to ids that match the twin, after a type check. Signed builds: Chrome Web Store private listing or managed install (team, M3).

## 8. Technology gate (STANDARDS §1)
New: a Chrome MV3 extension (Chrome and Edge). Problem: decision 16 requires it; the portal sheet stays the fallback. Options weighed: portal sheet only · bookmarklet (no isolation, no permissions model) · server robot (rejected, P-62 §8) · desktop automation. Build with the existing Vite (no plugin); `@types/chrome` (dev types, MIT); existing Playwright Chromium for tests. Upkeep: MV3 changes, store review, a new extension version when portal hosts change. Data and licence: no client data stored; IRCC terms unread (Unconfirmed: no counsel). Reconsider if IRCC publishes a filing API or its terms forbid automation.

## 9. Proof script (US$0)
Pair → capture s1–s3 of the Sample visitor-visa screens, s1 with typed values → finish → a second person approves → screen map (no AI) → mark a Sample background input → R1 case with confirmed facts → fill s1 → read-back → serve `s1-reworded` → nothing filled, task opened → re-capture → difference → approve.

## 10. Questions for the Lead (recommendation first)
1. **How does the extension sign in to ExpatReady?** Recommend a pairing code from the signed-in Studio, giving a short-lived, scoped, revocable token held in memory. The alternative, reusing the web session cookie, gives broader rights, is harder to revoke on its own and depends on SameSite behaviour.
2. **Branches (BR-5):** recommend that a capture **adds to** the current version: only the screens it saw are compared; an unseen screen is "not seen this time"; a new screen is "added"; the twin keeps "last seen on" for each screen. At fill, an unknown screen opens a "Capture needed" task rather than a change.
3. **Who marks never-filled inputs (BR-9)?** Recommend a map outcome "You answer this on screen", set at screen-map review by the immigration expert and approved by a second person; until it is set, the extension fills nothing on that screen.
Noted, no question: AG-10's non-goal "no browser extension" (AG16-41) is partly reversed by the newer redesign decision 16 and by P-66 [C]; to be listed for the team's retrofit.

## Definition of Ready
- [ ] Board agreed (`design/draft-extension.html`) · [x] every element labelled (§6b) · [ ] data and API needs known: the R1 case and filing model, and the per-screen compare, need confirming · [ ] every decision agreed: Q1–Q3 and BR-3, BR-12 open · [ ] no open questions.
