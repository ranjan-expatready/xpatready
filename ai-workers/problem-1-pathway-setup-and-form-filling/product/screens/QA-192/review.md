# QA-192 review (forms lane, C11.13): a near duplicate is accepted only with a person's reason

Commit reviewed: **22c9f0fd0** (branch claude/forms-qa192-near-reason, base origin/main 4d1973b8f). Reviewer: not the builder.
Read word for word: P-120 ("a near duplicate needs a one-line reason, shown to the second person at release") and P-149 (2)
("One identity rule per type ..., run at proposal and again at approval; an exact duplicate is refused, a near one needs a
reason"). I read all of decide(), undo(), insertProposals(), nearOf(), rule-facts.ts addForRule and the queue panel.

Run (isolated copy `rvq`, port 4459, forms range; live AI off, US$0): tests/check_c1113_near_release.ts **22/22**;
acceptance/C11.13.test.ts **16/16** on a fresh database (a first run on a database my probes had used failed 6, all
because "Family name at birth" was already in the library from those probes, not because of the change). Probes through the
API and the one door, plus a Chrome walk of the side panel (16/16 steps, axe clean). Probe scripts were deleted afterwards.
Note: while I was reviewing, uncommitted edits appeared in this worktree (proposals.ts, proposals.tsx,
check_forms_c1113_acceptance.ts: "Devin on #726"). They are not part of 22c9f0fd0 and this review does not cover them. My
twin probe ran before they appeared.

## Verdict for 22c9f0fd0: **Block** (0 Blocker, 2 Major, 5 Minor)
## Answers to the five questions
1. **Every producer.** Rule-fact items that come with a proposer's own reason (rule-facts.ts:240,261) need no second reason.
   The release view shows that reason as given, by a person (verified). AI items (field-draft-items.ts:115, sources.ts:640:
   the AI's reason) and rule-found matches (the rule's own words) need the decider's reason. Accept is refused with 400
   without it (verified on accept and on edit). Field-map items are left out correctly: acceptOnItsPage
   (proposals.ts:222-223) refuses a new field with a candidate ≥0.55, so it is decided on its own page with a reason
   (BR-7). Reuse items add nothing, so leaving them out is right. Bulk: near items are always Check, and a two-item accept
   is refused with 409 (verified). **Twins: not covered (M1).**
2. **Faked or lost.** It cannot be faked through the one door: `Identity` is `.strict()` (contracts/proposal-item.ts:66), so
   no producer can set `nearReasonBy`. Only decide() writes it. It is not lost on edit: the edit with a reason stores it as a
   person's, and `work.nearBefore` keeps the old identity (verified). Undo puts the original identity back, and accepting
   again without a reason gets 400 (verified). Lost or skipped: a **twin resolved to "new"** at accept (M1), and an **edit
   that renames the item close to a library field** (M2).
3. **Release view.** When the decider gives the reason, the release view shows given:true, by:"person", for both AI and
   rules items (/draft and the Release page text verified; the Approver's batch shows it). Old rows with only the rule's
   words are still marked not given. Edge case: a decider who types the rule's own words gets given:false (m2).
4. **UI.** Sound overall. axe finds no A/AA violation. 1024, 512 (200 % of 1024) and 400 px have no sideways scroll. The
   keyboard path works (Open → Enter → type → Tab to Accept → Enter). The textarea's label states the requirement
   (WCAG 3.3.2). The gaps are Minor (m1, m3).
5. **Tests.** Nothing important is weaker. #640's wrong assertion ("accepted with no reason") is now a fail and a pass. The
   "rule words → not given" check now runs on a row shaped by SQL as an old one, which is fair now that the real path
   requires a reason. The C11.13 seed accept always passes a reason, which is harmless. Missing tests are in m4.

## Issues
**M1 (Major, Must): a twin that resolves to "new" at accept adds a near duplicate with no person's reason.**
`needsNearReason(r)` runs at proposals.ts:573. That is *before* the twin's reuse is resolved at :589, and it reads the stored
`reuse.match === "reuse"`. On top of that, the one door never computes `near` for a twin: proposals.ts:173 runs only for
`reuse.match === "new"`, and the twin was switched to reuse just above. Evidence: (a) two AI copies for editions A and B,
both near "Application Date". Accepting B first with no reason → 201. It landed as the new field
`person.application_date_probe_twin`, and the release shows the AI's words, `by:"ai"`. (b) Two masters_edition copies with
no near from the producer: the first gets `near:["Family name","person.family_name"]` from the door, and the twin gets
`near:[]`. So a fix that only counts unresolved twins in `needsNearReason` still lets this through (b). Fix: decide whether
a reason is needed *after* resolution, using `near` computed for the payload as it will land (see M2). At minimum, compute
the door's `near` for twins too and check after :589. Add a fail test: twin accepted first, refused without a reason.

**M2 (Major, Must; P-149 (2) "again at approval"): an edit that renames an item close to a library field is accepted with
no reason.** `near` is only the one door's reading of the proposed name. decide() checks only an exact twin again
(:578-580). Evidence: an AI item "Zebra quokka wombat" (near:[]) edited to "Application Date at birth" with no reason → 201.
It landed as `person.application_date_at_birth`, close to `case.application_date`. In the UI, "Accept the checker's
reading" is that same edit with the checker's name. Fix: in decide(), for an item that will add to the library, run
`nearMatches` (engine/near.ts) for the decided payload against the library and the waiting new fields. If that finds
something and no person has given a reason, ask for one (one change fixes M1 and M2). Add a fail test.

- m1 (Minor, Should) web/src/pages/proposals.tsx:198: the panel shows the rule's words as "Why it is not the same: one name
  holds the other" just above the field that asks the person for exactly that reason. The two contradict each other, and
  P-120 says the rule's words are never shown as a reason. Use the release view's `given` rule, as near-line.tsx does
  ("found close by the rules; no one said why").
- m2 (Minor, Should) proposals.ts:573-575 / library-changes.ts:92: a decider who types one of the rule's three phrases
  (e.g. "one name holds the other") is accepted, and the release then shows given:false. Refuse `isRuleWhy(reason)` at
  accept.
- m3 (Minor, Should) proposals.tsx:169-170,201: the label never says "8 characters or more". At 7 characters Accept stays
  off with no word of why, and the disabled button is skipped by Tab and has no `aria-describedby`. "Accept the checker's
  reading" (:169) is not disabled, so it reaches the server's 400 instead.
- m4 (Minor, Should) tests: nothing checks the panel's new state in a browser. check_c1113_near_release_browser.cjs covers
  only the release side, and its setup item has a proposer's reason. Nothing tests that Undo restores the identity and that
  accepting again is refused. Both work in my probes.
- m5 (Minor) proposals.ts:291-292: any non-AI `nearReason` that is not the rule's words counts as a person's. That is true
  today only because rule-facts.ts:261 is the one rules producer that writes one. A future rules producer that writes its
  own sentence would skip the check without anyone noticing. Mark the rule-fact reason as a person's where it is written.
  Cosmetic: the Release row repeats the decider's reason twice (the change reason, then the near line).

## D1–D20 (scoped to this change)
D1 3 near reason enforced on the main AI, rules and bulk paths; twin and edit-rename paths missed (M1, M2) · D2 2 a near
duplicate still gets in with no reason by two paths · D3 4 twins and reuse are unchanged · D4 n/a · D5 4 undo puts the
identity back and accepting again is refused; the server refuses a double accept (409) · D6 4 the decider's reason, who
gave it and the audit line are stored · D7 4 an AI reason is never passed off as a person's; the AI's words are kept in
nearBefore · D8 4 unchanged · D9 3 the panel says a reason is needed but shows a "reason" from the rules above it (m1) ·
D10 3 the label is long and gives no minimum · D11 3 Accept stays off with no count (m3) · D12 4 team components ·
D13 4 axe clean, three widths, keyboard path · D14 4 · D15 4 the queue loaded in 1.5 s by networkidle, which includes Playwright's 0.5 s idle and my 0.4 s wait, so about 0.6 s; the accept toast was showing within 0.8 s ·
D16 3 the main rule is tested both ways; no tests for twin, edit, undo or the UI (m4) · D17 simulated only · D18 4 at
release, the person's words and the AI's words are labelled apart · D19 4 the reason reaches the Approver and Release ·
D20 simulated only.

**Journey score: 7.5/10** (below the 8 pass mark; no criterion at 0): journey-test-reviewer-2026-11-03.md.
Graph (P-86): graph.mjs ran (no `--write`); C11.13 is named by tests; `near_reason_needed` and the panel state have no browser test (m4).

## Could not check
A real screen reader. An unaided walk by an intended user (D17, D20 stay with the founder). Whether the uncommitted
"Devin on #726" edits fix M1: they recheck after resolution, but because of (b) the twin's `near` is still empty. The
s6_queue and near_release browser checks were not re-run here: they hard-code a Homebrew psql path.

**To fix before Approve:** M1, M2 (one change: a near check at accept for the payload as it lands, after twin resolution), each
with a fail test. Minors m1–m5 can follow.
