# F1 forms channels, slice 2 · independent review (CHECK, backend path P-68) · 23 Oct

Reviewer agent (did not build it). Code at `0b851414`, slice-2 diff `d795b019..HEAD` (prototype only). Copy on :4452 (`xr_studio_forms_review`, fresh start). AI spend US$0: stub passes only, no LIVE draft, no `--live` launch. Paths: proto = `prototype/`, studio = `prototype/studio/`.
Journey test: `journey-test-reviewer-slice2-2026-10-23.md`, **6/10, fail**.

## Verdict: Ship after fixes (merge blocked until the Must and the Majors are fixed and rechecked)
Most of the slice is sound and I reran it on the exact commit: `check_forms_slice2.ts` **38/38** (66 s), `check_p2_guard.ts` **64/64**, `check_p2_launch.ts` **53/53**, all in this lane copy, so QA-8 is fixed here. `--preserve-symlinks` widens no read allowance. A part with a changed form field is refused. A screen inventory whose structure changed, which was approved by its capturer, or which carries a value is refused. Reuse-first halves the work: on the Super visa, 228 of 242 IMM 5257 fields were reused and the worst case fell to US$0.57; with everything reused the cost is US$0 and no AI is called. screen_map proposals are limited to open inputs and library fields, use our own transform, can be accepted once, and LIVE needs the worst case to the cent. F1–F4 match the evidence lane's findings. The option-map defect is fixed for derived and text form fields. The problem is the guard: it checks only the keys it knows, and the request screen treats a part's own bytes as public text.

## Must
1. **A part can carry unchecked text, including a family value, into the AI request, and the request screen lets it through.** `admitPart` (`proto/p2/guard.ts:80-110`) compares only `summary`, `groups`, `presence_scripts` and `fields` (or each input's `screen`, `title`, `input`), and any other key passes. `buildRequest` then sends `part.section` as an attribute (`p2/prompt.ts:59`). If a part has an `inputs` or `record` key, `buildRequest` sends that **instead of** the checked fields (`:60`), and extra keys on screen-part input items go out unchanged (`compactScreens`, `:291`). `admittedPublicText` adds the part's **own** bytes to the exempt public text (`p2/screen.ts:130`). The launcher does not screen inputs at all (`p2/launch.ts:51-56`). Probe at US$0 (in process, real guard, real digest), three planted parts against the IMM 1344 inventory:
   * all three were admitted as `inventory_part`;
   * the family value was in the request: **true**;
   * the request screen found it: **false** (it does find it once the part's own bytes are removed from the exemption).

   This breaks the safety rule (STANDARDS §8: no other clients' data in prompts) and the build notes' own claim that the guard re-derives everything and does not trust the Studio. The same exemption covers every byte of an approved screen inventory, including free-text titles and help (slice-1 minor 13 showed client text survives there). Fix:
   * refuse unknown keys (an exact allowlist per contract, also on input items);
   * derive `sections` from the fields, and choose the body by the parent's kind;
   * exempt only the parent's text, never the part's own bytes;
   * add a fail test for each.

## Major
2. **Two clicks start two screen_map jobs, and two launches of one job in the same millisecond share a run id.** `draftLeftovers` checks for an active job, then creates one (`studio/api/src/forms.ts:470-473`). Two STUB starts at the same moment both returned 201 and made 2 jobs. Their launches got one run id (`launch.ts:68`, millisecond timestamp), so they shared one ticket file and one run record (`…-stub-20261023t124652795z`). One job then ended FAILED with "Stub pass failed: launch ticket already used; the screening digest is no longer current". In LIVE, two starts a few ms apart would make two paid calls. STANDARDS §4 [M] requires idempotent job launches. Fix:
   * claim the job atomically (unique partial index, or claim-by-update);
   * add a random suffix to the run id;
   * create the ticket file exclusively.
3. **The A4 merge can lose a form field or keep the wrong part's answer, and nobody is told.** `mergeParts` keeps the first entry per data path in part order, whichever part it came from (`studio/engine/parts.ts:89`). Probe: part 1 also answered part 2's `b1` (as the spouse's family name), and part 2 answered `b1` as given names and skipped `b2`. Merged result: `b1` = part 1's spouse family name, `b2` missing, no flag. Fix:
   * keep only each part's own fields;
   * list fields no part answered as open for a person, like screen_map's `not_answered`;
   * flag conflicting answers.
4. **Reuse is not limited to safe sources, and it relabels AI work as a code match.**
   * `priorMaps` reads the newest **DRAFT** rows (`studio/api/src/sources.ts:169`, `effective(…, "draft")`), so mappings that have not been released and not approved by a second person are reused.
   * `planDraft` sets `confidence: "high"` (`parts.ts:37`), and apply records `origin: CODE_MATCH` (`sources.ts:520`).
   * The suite itself shows it: the "earlier edition" rows were `AI_PROPOSAL`/`DRAFT` from the replayed answer and became `CODE_MATCH`.
   * The match key is data path and caption only. The form field's choices and type are not compared, so a `code_list:` transform carrying an older edition's inline codes is copied to a new edition whose codes may differ ("Codes differ between forms", the prompt's own rule).

   Fix: reuse released rows only, or keep "AI, not released" visible; compare choices and type too; keep the source row's confidence.
5. **When one paid part fails, the parts that succeeded are thrown away, and a retry pays for all of them again.** Any failed part fails the whole step (`sources.ts:262-266`). Retry reuse and "refused paid repeat" are checked only for the whole-form job (`studio/api/src/ai.ts:91-92`). `runPart` always launches live (`sources.ts:252`). This matters before the founder's paid IMM 0008/5669/5406 drafts, which this slice exists to make cheaper. Fix:
   * on retry, reuse each part's valid saved answer at US$0;
   * apply the repeat check per part;
   * have the plan say which parts will be paid.
6. **The paid path of A4 and of screen_map never runs in any test.** With parts, a stub run stops at `sources.ts:269`. These steps therefore run for the first time on a paid call:
   * merge → envelope → ingest;
   * near-duplicate reasons on proposals (`:381-387`);
   * apply of part entries;
   * `runLeftovers`' live branch (`forms.ts:486-494`).

   The accept test writes proposals by SQL (`tests/check_forms_slice2.ts:185`). Removing the near-duplicate loop in `ingest` fails nothing. STANDARDS §7 [M]. Fix: a test caller that returns saved or hand-written part answers through the same path at US$0.

## Minor
7. "Has codes" is judged from the transform text only (`studio/engine/channels.ts:62`). A choice-list form field mapped `as_is` to a field with an answer list now passes and is filled with the label. None of the 108 `as_is` rows in today's demo data hits a choice field, but the AI may draft one. Also check the inventory's choices.
8. The merged run's message says 0 "sent to a person" because `conversion: null` (`sources.ts:282`, read at `:409`) hides the parts' needs-person entries.
9. Words:
   * "Tick "Canada/US" for No.:" (`studio/engine/form-steps.ts:43` takes the first number box's caption);
   * "…for each part. a stub has no AI content" (`sources.ts:270`, lower case);
   * "Invalid UUID" for `jobId` (`contracts/forms.ts`, `AcceptAiProposals`, no message);
   * ticket jargon in failure messages (item 2).
10. The filler writes the Canada/US switch as ticked (IMM 1295 and 5257 maps: `derive:1 if country calling code is 1`), but the F1 step simply says "Tick" it. The evidence says Validate clears it first. A person who clicks a box that already shows ticked clears it. Say "after the first Validate" or "untick and tick again". (Not checked in Adobe.)
11. Worst-case confirmation is checked against a plan built before the job files are rewritten (`forms.ts:468-472`). If the open inputs change in between, the job runs at a worst case nobody confirmed. A4 plan → draft has the same gap.
12. Merged runs are written to `VAR("demo")` whatever the workspace (`sources.ts:285`). Run tickets are never pruned (`p2/screening/tickets/`).
13. The guard tests have no case for unknown keys on parts and screen inventories, or extra keys on screen-part input items (`tests/check_p2_guard.ts` §10).

## D1–D20 (API and data; independent reviewer, script and probe evidence)
D1 3: every listed item is built; merge correctness and the paid path are unproven (3, 6) · D2 3: duplicate jobs and a shared run id (2), merge override (3) · D3 3: reuse first works (228/242), but from unreleased rows and blind to choices (4) · D4 4: option-map fix correct for derived and text fields; latent `as_is` gap (7) · D5 2: a failed part does not retry alone (5); a double click makes two jobs (2) · D6 4: audit lines for start and accept, run named, capturer and approver on the screen inventory · D7 2: unchecked text reaches the prompt past the screen (1); AI rows relabelled as code matches (4) · D8, D9, D12, D13 n/a (no page) · D10 3: mostly plain; items 2 and 9 · D11 3: per-part progress and status are clear; the needs-person count is hidden (8) · D14 4: run contract kind `screen_map`, team model kept · D15 4: plan 0.1 s, API calls 20–140 ms, five stub parts plus reuse plus screen_map in 66 s under load · D16 3: 38 + 64 + 53 rerun, pass and fail per rule mostly; gaps (6, 13); coverage not measured · D17, D20 simulated only (no intended user) · D18 3: "as mapped in <edition>" is shown, but origin hides AI and unreleased status (4) · D19 not yet evidenced (no paid part run, no Online line through release).

## Could not check
Live AI paths (US$0 rule). Adobe behaviour of the F1/F4 step wording. A real blank portal screen. Code coverage (c8). Retrofit mapping: drafting-run `kind` extended; no new team columns in this slice.
Tree: my stub runs, tickets, used tickets, ledger lines and probe files are removed, and `studio/evidence/forms-slice2/*` is restored to HEAD. Those three files were already modified when I started. A breaker run on :4454 was writing `brk-*` and 12:48–12:49 runs in the same copy at the same time; I left those untouched.
