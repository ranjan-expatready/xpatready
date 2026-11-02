# Review: Add pop-up keeps what was typed when the structure list arrives late (PR #398)

Reviewed: branch `claude/screens-add-dialog-late-seed` at `398c780f`, `git diff origin/main...HEAD` (2 files). The reviewer did not
build it. App fix only; no new screen part, so concept fit is the existing Add to Program structure pop-up (P-127/P-128, AD-1…AD-8).
Isolated copy `screens_s2` on :4444 (web built at 398c780f). Rewritten screenshots restored; nothing committed.

**Verdict: Block** (screen-review: Rework; Blocker B1 and Major M1 are open). Journey score **6.5 / 10, fail** (see `journey-test-reviewer-2026-11-02.md`).

## Runs
* `check_w1_structure_browser.cjs 4444` → 138 passed, 0 failed (the new late-list step passes).
* `check_c1116_one_way_in_browser.cjs 4444` → 30 passed, 1 failed. The failure is "offers 'Find forms with AI' with its price". It
  needs `STUDIO_AI_LIVE`, which I am not allowed to set, so it is not related to this diff.
* Probe (scratchpad Playwright, the same 1.5 s hold on `GET /api/structure?…` as the new step): cases A and B below.
* `graph.mjs`: no change for this component (G3 4, G6 2 are pre-existing).

## Issues (ranked)

**B1 (Must, Blocker): the merge mixes the person's typed name with the prefill's key, so the save goes somewhere else.**
`web/src/components/add-to-structure.tsx:91–92` merges text and sel separately, one level at a time. Text keeps what was typed,
but sel still takes the prefill's key for the same level, and the levels below keep the prefill even though their parent was
retyped. This breaks the "a level changed: the levels under it start again" rule (`:150–153`).
Reproduced (case B): Immigration programs `/?p=temporary_residence&prog=temporary_residence.visitors`, list held 1.5 s, type
"Brand new pathway B" before it arrives. Result: Pathway shows "Brand new pathway B · Uses the existing pathway"; Program shows
"Visitor programs"; the trail reads "Retail › Brand new pathway B › Visitor programs". Add sent `pathway:{key:"temporary_residence"}`
and got **201**: "Late seed cat B" was written under **Temporary residence**, not the pathway shown on screen. That is wrong data
behind a screen that looks correct.
Fix: treat the merge as a single path. Take the first level the person set in this opening (text or sel) and use the person's text
and sel *together* for that level and every level below it. Use the prefill only above that level, and only where it is that
level's ancestor. If the person typed a Pathway, use no prefill at all.

**M1 (Must, Major): a name typed early is never matched against the list, so the c1116 flow still fails, now at Add.**
Text the person typed before the list arrived keeps `sel = null` (`:91–92`), because matching happens only in `typeIn` (`:149`),
and `typeIn` ran when there were no nodes yet. Reproduced (case A, no filter): type "Temporary residence", an existing name, early.
Result: it is tagged **New** ("no exact match"), Program reads "(new, under a new name)", and Add returns **409** "Temporary residence
already exists in Retail: choose it instead". `check_c1116` lines 98–100 type the existing "Temporary residence (C11.16)" then
"Visitors". On a slow nightly, the Program box is now enabled, but the check would fail on the save instead. The nightly flake has
moved, not been fixed.
Fix: when the seed keeps a typed level, match it the way `typeIn` does: `norm` equality among the options under the resolved parent,
top-down, then set sel to the matched key.

**Tests (Must, with B1/M1):** the new step (`tests/check_w1_structure_browser.cjs:455–468`) types a *new* name with *no* prefill, so
it cannot catch B1 or M1. Add two late-list steps that fail on 398c780f:
* (a) an existing Pathway typed early is "Uses the existing pathway" and Add writes under it;
* (b) with the `p`/`prog` filters, a different Pathway typed early clears Program, and Add writes under the typed Pathway (check
  the database).

**m1 (Should, Minor): focus jumps to another field while the person is typing.** The focus target `:97–98` is still computed from
the prefill `s`, not from the merged state. In case B, the field to start in is Category, so `aimPending` moves focus there while
the person is still typing in Pathway. The fix for B1 removes this if the focus target is computed from the merged result.

## Checks asked for
1. **Mixed state:** not consistent. See B1; the "below cleared when parent changes" rule at `:150–153` is broken by the seed.
2. **Clear on close:** sound. "Add and add another" keeps `open` true, so the close branch at `:74` does not run (the suite's
   add-another and filter-prefill steps pass). Reopening goes from blank state and then applies the prefill. Close only resets
   text and sel; keep, close, errors and problem are reset by the next seed, as before.
3. **Type switch:** works. `:217` clears text and sel. The seed waits for `type === initialType` and a list of that type
   (`:76`), so switching before the list arrives and switching back seeds from a blank state.
4. **Route and wait:** sound. The glob `**/api/structure?*` matches only the list GET; `name-check` is a POST without `?`, and the
   handler delays only GETs. `waitForResponse` is registered before the click, `unroute` uses the same handler, and the step
   fails on main (builder's evidence; the logic agrees). Small gap: the step checks only that Program is enabled, not what
   Add would write.

## D1–D20 (only what this diff touches; the rest unchanged from the W1 structure review)
D5 correct data: **fail** (B1, 201 under another pathway). D6 error recovery: partial (M1 gives a plain 409, and the person can
retype). D9 feedback/state: **fail** ("Uses the existing pathway" next to a new name). D11 tests prove the rule: partial (the new
step fails on main but misses B1/M1). Accessibility, sizes, words and look: no change (axe and 1024 px steps pass).
D17/D20: simulated only.

## Could not check
The Mac nightly itself; a real screen reader; a non-headless walk by an intended user; check_c1116's AI-offer step (needs a LIVE
flag).

**Verdict: Block** on 398c780f. To fix: B1 (merge as one path, `add-to-structure.tsx:91–92`), M1 (match kept text to the arrived list), and the two late-list test steps that fail on 398c780f.

---

# Round 2: head `eaeba3e1` (`git diff 398c780f eaeba3e1`, 2 files)

Isolated copy `screens_s2` on :4444, rebuilt for each build (web built at eaeba3e1; also at 398c780f for the test check, then
rebuilt at eaeba3e1). Rewritten screenshots restored; nothing committed. Note: this folder (round-1 files, uncommitted) was gone
from the working tree during the run, and nothing in the suites removes it. It was restored from the reviewer's scratchpad copy.

**Verdict: Block** (screen-review: Rework; Majors M2 and T1 are open). Journey score **8 / 10** (see the journey-test file, Round 2).

## Runs
* `check_w1_structure_browser.cjs 4444` on eaeba3e1: **140 passed, 0 failed** (the builder's number is confirmed).
* The same suite on a **398c780f** web build: also 140/140. The new steps do not catch B1 or M1 (cause: T1 below).
* A scratch copy of the suite with only the T1 fix applied: on 398c780f, **138/2**. Both new steps FAIL: M1 gets 409 "already
  exists"; B1 sends `pathway:{key:"temporary_residence"}`. On eaeba3e1, **140/0**.
* `check_c1116_one_way_in_browser.cjs 4444 xr_studio_screens_s2`: 30/1. The one failure is the same LIVE-AI offer as in round 1,
  and it is not related to this diff.
* Probes (scratchpad `probe2.cjs`, `probe3.cjs`, `probe4.cjs`; the list GET is held 1.5 s; probe4 was run on the 398c780f build):
  * Case A (existing "Temporary residence" typed early, no filter) → "Uses the existing pathway". Add sends the keys and gets 201;
    the category is under Visitor programs.
  * Case B (filters `p`/`prog`, "Brand new pathway B" typed early) → Pathway is New and Program is empty. Add sends
    `pathway:{label:"Brand new pathway B"}` with no key. The server answers 409 close-names ("Did you mean … add yours anyway"),
    which is the AD-4 guard working.
  * Two levels typed early ("temporary  residence" plus "Visitor programs") → both are matched ("Uses the existing …"), and focus
    goes to Category.

## Round-1 items
* **B1: fixed.** `add-to-structure.tsx:93–103`: the typed path is taken whole, the prefill is not mixed in, and the levels below
  are cleared at the first empty level. Case B is correct on screen and in the request.
* **M1: fixed.** The top-down `norm` match under the resolved parent (`:99`) uses the same rule as `typeIn`. Case A writes under
  the existing nodes.
* **m1: replaced by M2** (below). Focus no longer jumps because of the prefill, but it now jumps whenever anything was typed.

## Open issues

**M2 (Must, Major): focus jumps out of the field the person is typing in when the list arrives, so the rest of the word goes into
Program.** `web/src/components/add-to-structure.tsx:108–109`. When anything was typed, `focus` is the first empty typed level
(Program), and `aimPending` moves focus there as soon as the list renders.
Reproduced (probe3, no filter and with filters): type "Temporary res" with the keyboard, the list arrives, then type "idence".
Result: Pathway is "Temporary res" (New pathway), Program is "idence", and focus is on Program. If the person does not notice,
Add writes two wrong new names.
On 398c780f, with no filter, focus stayed on Pathway (`FIELDS.find(!s)` = pathway), so this is new in eaeba3e1. It is a
change of focus the person did not ask for (WCAG 3.2.2) in exactly the slow-list case this PR is about.
Fix: when anything was typed before the list arrived, do not move focus. Set `aim`/`startAt` if needed, but leave
`aimPending.current = null`. The person stays where they are typing, and Enter/pick moves on as usual (`next`). Add a late-list
step that types with `pressSequentially` across the arrival and expects the whole word in Pathway, with focus still on Pathway.

**T1 (Must, Major): the two new late-list steps never type before the list arrives, so they pass on 398c780f and cannot catch B1 or
M1 coming back.** `tests/check_w1_structure_browser.cjs:477` `return back;` inside the `async` helper `lateOpen`. An async function
that returns a promise adopts it, so `await lateOpen(...)` (`:480`, `:489`) waits for the held list itself. The fill runs about
1.5 s later, after the seed has run (measured: GET at t, fill at t+1.52 s, list finished at t+1.525 s).
The setup needed, verified on both builds:
* `:477` → `return { back };`
* `:480` → `let { back } = await lateOpen("");`
* `:489` → `({ back } = await lateOpen(\`?p=…&prog=…\`));`

With only this change, 398c780f fails both steps (409 "already exists"; `pathway.key = temporary_residence`) and eaeba3e1 passes
both. Also assert in the M1 step that the request carries `pathway.key === pwNode.key`, not only that the server answered 201.
The server can resolve some labels to existing nodes (seen in the builder's note), so a 201 alone is weak evidence.
The builder's honest note was right to raise this. It is not acceptable as it stands: round 1 asked for steps that fail on
398c780f, and these steps do not exercise the late list at all.

## Checks
Mixed state: consistent now (typed path whole; nothing from the prefill under a retyped level). Clear on close, type switch and the
route glob: unchanged from round 1, still sound. D5 correct data: pass for B1/M1 cases; at risk from M2 (split word). D9 feedback:
pass ("Uses the existing …" matches the request). D11 tests prove the rule: **fail** (T1). D12 accessibility: partial (M2 focus
move). D17/D20: simulated only.

**Verdict: Block** on eaeba3e1. To fix:
1. M2: no focus move when something was typed (`add-to-structure.tsx:108–109`), plus a step that types across the list arrival.
2. T1: `lateOpen` returns `{ back }` (`check_w1_structure_browser.cjs:477, 480, 489`), and the M1 step asserts the sent pathway
   key. Show in the PR that both steps fail on 398c780f.
