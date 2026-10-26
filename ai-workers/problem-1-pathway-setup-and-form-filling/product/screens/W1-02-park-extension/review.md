# W1-02 Park the browser extension — independent review

Reviewer agent (did not build it), 26 Oct 2026. Commit under review: d575150 (build), synced in bdd002d / 8a56f23; full
diff `git diff c01b57b d575150`. Bar: Lead note in `lanes/forms.md`, P-101, P-102, P-107 (superseded the same day by
P-114; the later-wave behaviour is the same), `WAVE-1.md` W1-02, `STANDARDS.md`, `EXPERIENCE.md`. No `concept.md` exists
for this item: the Lead note is the concept. Isolated copy `forms_rev` on :4450 (fresh database per run), US$0.

## Verdict: **Ship after fixes** — 0 Must, 1 Major, 6 Minor. Journey score **8.5 / 10** (pass; no criterion at 0)

Everything the Lead note lists is gone from the app, menus, API, tests and demo, and nothing PDF regressed. One leftover
on the author's path: the Preview tab still offers a working-looking "Fill PDF from confirmed facts" button on a line
filed Online, which always fails with words about a "portal sheet" that does not exist in wave 1.

## What I checked (evidence)
* **Removed, as asked:** Browser extension menu entry and `/extension`, `/review/capture/:id`, `/review/screen-map/:id`
  pages ("Page not found" with a way back); 12 parked routes answer 404 (`/extension/*`, `/captures`, `/portals`,
  `/combinations/:id/portal`, `use-defaults`, `online-forms`, `drafting-sources`, `online-versions/:id/screen-map`,
  `capture-template.csv`, `draft-from`); no web call to a removed route (graph G1 = 0; grep of `web/src`); To review has
  no capture or screen-map kinds for user-A, B or C; summary carries no `portal`, `onlineForms`, `defaultChannel`.
* **Kept, as asked:** Filed as offers PDF upload · Online (later wave) · Signed PDF upload; Online saves (toast 103 ms),
  the line says "Needs the browser extension (later wave)", the filing line reads "Mixed: online and PDF", the validator
  gives one **warning** (Overview and Review and release), never "cannot be filed"; reload keeps it; approver and
  reviewer see text only and get 403 on the server. A saved portal page is refused with "forms come in only as their
  official PDF". PDF fill of IMM 1295 in Preview: 64/64 values read back, file intact (808 ms).
* **Re-run on my copy:** `check_forms_channels` 53/53, `check_forms_demo` 25/25, `check_forms_pdf_hardening` 49/49,
  `check_forms_p80_guard` 41/41, `check_forms_f3a1c` 33/33 (second-draft guard), `tsc` API and web clean,
  `graph.mjs --check` exit 0 (G3/G5 items are not this item's). Reviewer journeys 57/57 (journey-test report).
* **Words sweep** (portal, capture, extension, screen map, re-capture, pairing, online form/version) over Programs,
  combination Overview / Sources / Preview / Review tabs, Add form dialog, New combination, Forms library, To review,
  AI work, Release, Activity: no hits except those in the findings below.

## Builder's choices, judged
1. **No schema change (dormant tables):** agreed. Keeps data (STANDARDS §4 expand/contract), no migration race with
   runtime; reset still empties the dormant tables (`demo.ts:167-169`). Dropping them is the Lead's call (W6 or never).
2. **Online = warning, not error:** agreed; matches P-107/P-114 and EXPERIENCE rule 9 "warn, don't block".
3. **Online lines still need PDF form fields mapped** (`engine/programs.ts:61-62`): agreed; P-102 "an online-only form is
   read from its PDF twin".
4. **Tests deleted or trimmed:** checked the removed assertions (e.g. all 10 removed from `check_forms_f3a0` are C2.12
   screen coverage of captures); none covered a PDF path. Agreed.
5. `@types/chrome` left in devDependencies: acceptable (nothing imports it).

## Findings
**Major**
* **M1 Preview offers a dead "Fill PDF" on an Online line, with portal words.** Steps: LMIA combination › set IMM 5707
  to Online › Preview › Forms and coverage › "Fill PDF from confirmed facts" on IMM 5707 → red toast "IMM 5707 is filed
  Online here: its answers go on the portal sheet, not in a PDF." (HTTP 409). The button is enabled for every line with
  an edition (`web/src/pages/preview.tsx:128`); the message (`api/src/fill.ts:30`, same words on the case side
  `api/src/fill-case.ts:118`) names a "portal sheet" that wave 1 does not have and contradicts the later-wave words.
  Fix: in Preview, show the Online line's fill as unavailable with `ONLINE_LATER` ("Needs the browser extension (later
  wave)") instead of an enabled button; reword both refusals to the P-107 words ("…filed Online: it needs the browser
  extension (later wave). File it as a PDF upload to fill its PDF."). Add a pass/fail check for both.

**Minor**
* **m1 Same message four times on one screen.** Option "Online (later wave)", cell note, filing-line note
  (`web/src/components/channels.tsx:50`) and the warning (`engine/channels.ts:58`) all say it. Drop the filing-line note;
  the cell note and the warning are enough (EXPERIENCE "nothing extra").
* **m2 Demo chrome still says "parked portal captures"** in the Reset dialog row label (`api/src/demo.ts:124`). Use
  "Answer lists and merges"; the dormant count can stay in the total silently.
* **m3 Dead code for parked paths** (STANDARDS §7 "no dead code"): `api/src/sources.ts:72-73` (screen_map batch
  cleanup), `engine/channels.ts:78` and `api/src/fill.ts:31` (`m.channel !== "ONLINE"`: field maps no longer carry a
  channel), comment `web/src/pages/ai.tsx:52`. Removing the screen-map retry refusal (`api/src/ai.ts`, was line 360)
  makes a pre-W1-02 screen_map batch retryable through the generic path; only older databases, cleared by reset (P-108).
* **m4 Older databases:** a release made before W1-02 with an Online line or a portal no longer matches its draft
  fingerprint (snapshot drops `online_versions`, `portal`: `engine/snapshot.ts`), so it shows a draft change. Reset
  fixes it (P-108); say so in build-notes.
* **m5 Decision cites:** code cites P-107 (`contracts/forms.ts:16`, `engine/channels.ts:4,55`,
  `web/src/components/channels.tsx:3,55`), superseded by P-114 the same day. Behaviour fits P-114; cite P-114 so W1-06
  (route × channel) builds on the right decision.
* **m6 For the Lead and qa lane (not builder-owned):** `DEMO.md:9,16,27` still present rows 2 and 13 and the APR Portal
  as current; `qa/CAPABILITIES.md` C1.7, C2.10, C2.11, C3.9 still read as current; `tests/qa/check_qa_s2_probe.ts:16`
  imports the removed `screenMapProposals` and will not start; three more qa probes drive 404 routes (build-notes).

## D1–D20 (1–5)
D1 5 every listed removal done, PDF kept, Online kept with the P-107 words · D2 5 403 for B/C, stale-save 409 and
checklist refusal pass (channels 53/53) · D3 5 no change to reuse; field maps PDF-only · D4 4 Online lines now counted
for PDF mapping; fingerprint drift on old DBs (m4) · D5 5 reload keeps choice; reset empties dormant tables · D6 4
draft change and history unchanged · D7 5 second-draft guard 33/33, no AI path changed · D8 5 path and tabs unchanged ·
D9 4 dead Fill button (M1) · D10 3 "portal sheet" (M1), repetition (m1), reset label (m2) · D11 5 toast, filing line,
warning count update at once · D12 4 repetition crowds the Forms card (m1) · D13 5 axe 0 on all states, 400 / 1024 /
1024 at 200 % no sideways scroll, keyboard pick saves once · D14 5 team shell and components unchanged · D15 5 pages
0.5–0.8 s to network idle · D16 4 rules tested pass and fail; no test on Preview for an Online line (M1) · D17
simulated only · D18 4 Online marked "later wave" everywhere; refusal names the rule · D19 4 PDF journey closes end to
end; Online closes only in W6 by design · D20 simulated only.

## Could not check
A headed (visible) browser: walks were headless Playwright with every screenshot read. A real screen reader. A mutation
spot-check (told not to edit app code): instead I read the assertions (warning level, no error, 403, 404) in
`check_forms_channels` and `check_screen01_channels`. The case officer's fill of an Online line in a case (read only,
`fill-case.ts:118`). My f3a1c run appended 12 stub rows (US$0) to `prototype/p2/ledger/spend.jsonl` and 6 used launch
tickets (left; the ledger is append-only); evidence JSON and canary digest it rewrote were restored.
