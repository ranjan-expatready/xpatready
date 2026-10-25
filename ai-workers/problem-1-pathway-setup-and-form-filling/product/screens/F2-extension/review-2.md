# F2 — Browser extension: review-2, the re-score after FIX (independent reviewer, 25 Oct; head 1b93a45)

**Verdict: Ship.** The Must, both Blockers and every Major from `review.md` and `break-report.md` are fixed, each with a pass and a fail test that re-ran green on this commit. 0 Must · 0 Major · 3 Minor (two kept on purpose and documented, one tooling blind spot). **Journey score 9.5/10: pass.**

Method: skills `screen-review` and `journey-test` on the forms lane worktree at 1b93a45, fresh `npm ci` + `prisma generate` + web build (the worktree had never been installed). Isolated copies on 4454–4458, Sample portal on 4459, Playwright Chromium 1248, PostgreSQL 18.6. No model call (US$0).

## What I re-ran (exact commit, by someone other than the builder)
f1p 16/16 · f2a 34/34 · f2a_api 34/34 · f2b 39/39 · f2c 36/36 · f2c_fill 17/17 · f2d 37/37 (`--evidence`; screenshots copied to `/tmp/f2-review2/shots`, the tracked copies restored afterwards — `git status` shows only this file). Each check names its capability and the rule it proves, pass and fail.

Independent spot checks (not the builder's tests):
* `screenIdentity` on the colliding headings: "Personal details of the principal applicant" vs "…'s spouse or common-law partner" vs "(Spouse …)" vs "(Principal applicant)" → 4 distinct identities; the 40+-character education/employment headings distinct with checksum-qualified ids (≤ 40 chars); `個人情報` keeps its letters; `Détails` ≠ `Details`; a punctuation-only heading falls back to a checksum. Break B1 cannot come back through any of these paths.
* Code read: `panel.tsx` sends the screen it read with the plan (`expect`), `content.ts`/`filler.ts` re-read and compare input by input before writing (`sameScreen`, filler.ts:86-89); `api/src/extension.ts:69-72` counts a wrong-code try synchronously before the database lookup; the `not_captured` task stores `unknown-<checksum>` plus element ids, never live text, capped at 10 per version; the filler resolves elements as the reader did (form field, outside search forms, by id else unique name, kind checked); `GET /captures` + `GET /captures/:id` back the panel's Continue; `demo.ts` reset deletes `recapture_task`, `extension_session`, `extension_pairing`.

## Every earlier finding, verified
* **Review Must 1 = break B1 (wrong-person fill):** whole-heading identity (`twin.ts:52-68`), same-path reuse keyed `screenIdentity|rawId` (`twin.ts:101`, `forms.ts:485-489`). f2a_api: bracketed heading added not "already captured"; f2c: "Personal details (Spouse …)" → `not_captured`, no applicant value. **Fixed.**
* **Break B2 (Next during fill):** content script refuses a moved page; f2c_fill pass and fail. **Fixed.**
* **Break M1 (parallel code tries):** f2b "thirty wrong codes at the same moment: 5 tried, 25 refused". **Fixed.**
* **Break M2 (client text in tasks; task flood):** f2c "heading with a passport-like code and a name is in no task" (`leak: 0`); 13 unknown screens → 10 tasks. **Fixed.**
* **Break M3 (writer took a search box):** f2c_fill `{search:"", family:"SAMPLE"}`; m4 div-id and m5 hidden input also covered. **Fixed.**
* **Break M4 (20 newest cases only):** `GET /extension/cases?q=` + panel search; f2c and f2d. **Fixed.**
* **Review Major 1 (capture lost on panel reload):** f2d reloads the panel mid-capture, "Continue IMM 5257 · 3 screens so far" resumes the same capture (1 OPEN row, never a second). **Fixed.**
* **Lead item, demo reset:** f2b "before: a live session and an open code; after: 0:0:0; the old token and code 401". **Done.**
* **Lead item, dead-end button:** after "This screen looks different" the panel says to enter the answers from the Studio and its primary is "Check this screen again" (f2d, shot 08). **Done.**
* Review Minors 1–3, 5–6, 8–9: fixed and covered (Start another capture; merge words; panel words in the Studio list; release date in the M2 message; captures/:id now used; `--tsconfig` usage line; own-window tab + type check). Minor 4: "Browser extension" is now under Configure after Programs (`App.tsx:42,65`). Minor 7: f2d now runs the full §9 proof — re-capture in the panel, second person approves, a new case fills the re-captured screen.

## Journeys walked (the f2d evidence run is the scripted walk; my screenshots `/tmp/f2-review2/shots`)
pair → capture s1–s3 (s1 typed into) → client-detail screen refused → held → second person approves → officer connects, finds the case, fills s1 ("Filled 6 of 9 · 3 need you", sources in words) → refused value shown and marked → reworded screen fills nothing, task opens → not a portal page → disconnect → re-capture → approve → new case fills it. axe clean on every panel state and the Studio page; Connect and Fill by keyboard.

## Journey score (QUALITY.md; one score per check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The whole §9 proof completes in the panel and Studio (f2d 37/37) |
| Next step obvious | 1 | "Check this screen again", "Start another capture", "Continue IMM 5257…" |
| Plain words | 1 | Tasks named in words ("A screen that is not in the approved version"), "choices changed" |
| Feedback and state | 1 | "Compared 1 screen seen (1 changed); 2 not seen this time" — no more miscount |
| Correct data | 1 | Wrong-person fill impossible (identity + sameScreen); read-back catches refusals |
| Error recovery | ½ | Reload, moved tab, 401, changed/unknown screen all recover; **but** the wrong-code pause is per address in memory — five wrong codes from one person behind a shared office address pauses the office's sign-ins for 5 minutes, and a restart clears it (Minor 1) |
| Accessibility and screen sizes | 1 | axe clean on every state at 360 px and 1440 px; keyboard paths (1024 px/200 % verified last round, layout unchanged) |
| Speed | 1 | All suites fast; f2d end-to-end ≈ 2 min including builds and browser |
| Visual quality | 1 | Team tokens, logo, pinned primary action, tidy at 360 px (shots 01–10) |
| Trust and sources | 1 | Every filled value names the case question and "confirmed"; nothing sent without the check list |

## Minor
1. **Wrong-code limit is per address, in memory** (`extension.ts:43-46, 69-72`). The parallel-try and ordering bugs are fixed, but a shared NAT office still shares the limit and a restart clears it (break m2, partly kept). *Fix:* per-code void after 5 tries and/or a persisted counter — the plan's own words.
2. **Break m1 kept:** a later mismatch replaces a task's differences (`extension.ts:204` `differences = excluded.differences`). Kept on purpose ("the task shows what the portal shows now"; `times` counts). Acceptable, recorded.
3. **Break m7 kept:** a stolen token replayed with a forged Origin works until expiry/revoke. Stated plainly in build notes; hardening is the team's M3. Acceptable, recorded.

Not findings: plan E-1's "step id" is documented as deferred (no Sample or real page carries one; the reader adds it when the expert's session shows one). Break m6, m9, review m9 (kinds) are covered by f2c_fill.

## Graph (P-86)
`graph.mjs --check`: G3 lists `GET /extension/captures` and `GET /extension/captures/:id` as untested — a **blind spot, not a gap**: the panel calls both and f2d drives them (the graph does not see the extension panel as a page; same as `GET /extension/cases` last round). G5's two capabilities and G6's badge are pre-existing, outside F2.

## Could not check
A real screen reader · the panel inside Chrome's real side-panel surface (tested as a tab, as before) · Edge · a real portal and its hosts (Sample `.invalid` until the expert confirms) · the team code (`code/` not in this copy) · 320/480 px and 1024 px/200 % not re-run this round (unchanged since verified) · D17 and D20 (need the founder's or an intended user's unaided walk).
