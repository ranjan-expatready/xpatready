#!/usr/bin/env python3
"""qa milestone M3 (cloud, 5 Nov): one verdict file per M3 row under qa/verdicts/, and the table in README.md, from the two
checkpoint rounds (runs/cp-r1, runs/cp-r2) and the walk. Run: python3 -I verdicts.py (from this folder)."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
V = os.path.normpath(os.path.join(HERE, "../../verdicts"))
MAIN = "ffcfb45c8"

def count(rnd, pack):
    f = os.path.join(HERE, "runs", rnd, f"{pack}.out.txt")
    if not os.path.exists(f): return None
    t = open(f).read()
    p, x = len(re.findall(r"^PASS\s", t, re.M)), len(re.findall(r"^FAIL\s", t, re.M))
    return p, p + x

def fails(pack):
    f = os.path.join(HERE, "runs", "cp-r1", f"{pack}.out.txt")
    return [l[6:].split(" — ")[0][:150] for l in open(f).read().splitlines() if l.startswith("FAIL ")] if os.path.exists(f) else []

# id, capability (short), table status, proposed status, packs, J7 first red, waits on, verdict text, walk text, bugs text
ROWS = [
 ("C1.3", "Agent picks \"relies on employer case\"; pre-fills the employer's facts", "Not built", "Not built", [],
  "outside J7 (breadth); nearest 2.1",
  "#1051 (C1.3 + C11.5, building)",
  "No pack. On the checkpoint the Open a case dialog and the case header show \"Relies on an employer case\" (C11.5's offer) but no case can be linked and nothing is pre-filled.",
  "Case header at 1440 px: \"Relies on an employer case — Offered: the Visitor visa forms read 1 employer fact from a Corporate case, read-only.\" No control to pick an employer case; no pre-filled value.",
  "None new; see C11.5 for the offer on Visitor visa."),
 ("C3.16", "Shared field scope (person · filing · household · organisation), stable list ids", "Not built", "Not built", [],
  "no J7 step tests it directly; nearest 3.9 (facts asked per person and per case)",
  "#1054 (r4 approved, building)",
  "No pack. On main the field scope is `CLIENT_LEVEL | CASE_LEVEL` only (`prisma/schema.prisma:44`); the resolver says \"household is never produced; organisation is held\" (`engine/resolver.ts:62`).",
  "No screen. On the walk the case asks the representative's facts per case (\"The representative 20 missing\") and an employer fact on a Visitor visa: the scopes C3.16 adds are what would hold them once.",
  "None new."),
 ("C6.12", "Filings and fees derived from the case", "Partial", "Partial", ["C6.12", "C6.12-breadth"],
  "2.1 (\"Will be created as\" and a date of birth when adding a person are not on screen); 2.3–2.4 (filings chip, fees panel)",
  "the case page's filings and fees (C6.12-25); breadth: sponsorship, the child study question",
  "The Visitor visa part counts on the checkpoint: `C6.12.test.ts` 24/24 both rounds. Breadth 1/4 (C6.12-22 sponsorship, -23 child study question, -25 the screen).",
  "Open a case: no \"Will be created as\" (filings, one family submission, release). Add spouse or child asks only a name, no date of birth. Case page: no filings chip, no fees (the API's `/prepare` has `fees`: Visitor visa CAD 100 with IRCC's fee list as source). Submission to IRCC names one Visitor visa filing per person.",
  "Proposed new: N4 (Add a person asks no date of birth, so biometrics and age rules wait)."),
 ("C6.5", "AI reads uploaded documents and proposes facts (Confirm & use)", "Partial", "Partial", ["C6.5"],
  "3.3 (C6.5-2: the upload check) then 3.4 (\"Fill this from documents\")",
  "part 2 of #784: `POST …/sections/:s/fill-from-documents`, `…/documents/:id/confirm` answer 404 \"Cannot POST\"; the letter replay needs FQ-10 (a paid run, founder's Go)",
  "Engine steps pass (C6.5-E1…E7, 7/7); upload to the passport line 201; every route after it is not built (404 Cannot POST).",
  "Case page: no document checklist and no \"Fill this from documents\" on any section.",
  "None new (part 2 not built)."),
 ("C6.4", "Document checklist per person", "Partial", "Partial", ["C6.4"],
  "1.7 (the release's document lines: proof of financial support on everyone, no minor lines); on screen 3.1",
  "the checkpoint loader's Visitor visa document lines (QA-226, now in part); the checklist on the case page",
  "**QA-226 is fixed in part:** the configured release now has document lines (passport, proof of financial support, fee payment receipt), 18/30 (was 6/30 on 4 Nov). Still red: C6.4-4 proof of financial support is on every person, not the principal only (VV-R06, Sample); C6.4-7…8i the five minor lines (R3) are never listed; C6.4-9a/9b the lines' short reason and quote; C6.4-19 a principal of 15 travelling alone is not asked who they travel with.",
  "Case page: no document checklist anywhere (no Request, no Upload, no Received).",
  "Proposed: QA-226 retest — narrow it to what is left (financial support on the principal only; the R3 minor lines and their questions)."),
 ("C6.9", "Case check from confirmed facts (eligibility)", "Works", "Partial (held: red on the checkpoint)", ["C6.9"],
  "1.8 (the configured release has no eligibility gates); on screen 4.1",
  "the checkpoint loader setting Visitor visa's gates and the four officer's-judgement lines (J7 1.8)",
  "**Red on the checkpoint: 2/15 both rounds** (Works on 2 Nov was the fixture: `setup_vv_m3`). Every run is refused 409: \"This application's release has no eligibility rules yet. An author adds them and a reviewer releases them.\"",
  "Case page: \"Eligibility (staff only)\" lists each person \"Not run\"; Open eligibility shows the page; a run is refused for the same reason.",
  "Proposed new: N1 (the configured Visitor visa release has no eligibility gates). By the P-322 counting rule the row is not Works on its data: hold it in REGRESSION-HELD (qa lane)."),
 ("C6.11", "Firm, users and case team", "Partial", "Partial", ["C6.11"],
  "1.2 (IMM 5476's line: each applicant 18 or older); 5.1 the representative's facts typed per case",
  "IMM 5476's rules on the configured release (N2); QA-152",
  "22/25 both rounds. Red: C6.11-15 IMM 5476 is listed for every person, children too; C6.11-16c the representative's IMM 5476 facts are asked on the case, not read from the firm (QA-152); C6.11-17a a new representative does not make IMM 5476 To do.",
  "Open a case offers both Sample representatives with their CICC numbers; the team chip shows \"Second representative (Sample) · CICC R000002 · Case officer (Sample)\" with Stand-in. The Agent view asks \"The representative 20 missing\": membership ID, regulatory body \"(values: cicc, law_society, chambre_notaires_quebec)\" — engine values in the label.",
  "Proposed new: N2 (IMM 5476 never applies to a represented case once answered; listed for children before), N5 (engine values in question labels)."),
 ("C7.5", "Independent AI review of a filled form", "Partial", "Partial", ["C7.5"],
  "6.2 (the run card: `POST …/review-runs/plan` 404)",
  "part 2 (run card, replay); FQ-10: one recorded run needs a paid trial with the founder's Go (not done: US$0)",
  "9/16 both rounds: the rules cross-check (passport expiring before the visit ends, MAJOR, resolves itself), acknowledge with a reason, waive only CRITICAL, dismiss and add by hand work on the checkpoint (J7 6.1, 6.3); the AI run card (`…/review-runs/plan` 404) and the replay are not built.",
  "Case page: \"Review · Stand-in · Checks across the facts and forms… Add finding · 0 open\"; \"The AI review of the Visitor visa forms comes next (a saved run, replayed at US$0).\" No Run AI review button (nothing priced offered).",
  "None new."),
 ("C7.6", "Only a barcode form's Validate blocks Ready to file", "Partial", "Partial", ["C7.6"],
  "1.2 (no signer set on the form lines: every form warns \"missing signature\"); on screen 6.4",
  "signer rules on the configured release (QA-228); IMM 5476 on a represented case (N2); the readiness screen (QA-229)",
  "19/25 both rounds (16/25 on 4 Nov). Red: C7.6-4/-5/-7/-12 every form carries a CRITICAL missing signature (\"how it is signed is not set on the form line yet\"); C7.6-11 IMM 5476's sign steps 404 \"No such item\"; C7.6-19 Ready to file refused, 5 open warnings.",
  "Filled solo case (answers by the packs' helper, API): IMM 5707's row reads **\"Ready to file\"** while `/prepare` holds a block (IMM 5257 not validated) and five CRITICAL warnings; no screen lists blocks or warnings, no Pass, no Ready to file action, no Review the filing (QA-229). Of the five routes asked about, none has a caller in `web/src` (README).",
  "QA-229 still open (seen again); QA-228 still open."),
 ("C7.7", "Prepare application: two-stage deliverables list", "Partial", "Partial", ["C7.7"],
  "1.2–1.3 (form lines' ages: children get IMM 5409, 5475, 5476, IRM 0002); 1.4 (no Online IMM 5707)",
  "the configured release's form rules and channels (N2, N3, DEMO.md row 9 waits for B81); QA-153, QA-235, QA-229",
  "13/26 both rounds (12/26 on 4 Nov). Red: C7.7-1/-2 adults get 7 forms (IMM 5257, 5257 SCH1, 5409, 5475, 5476, 5707, IRM 0002) and children 5, not 3 and 1; C7.7-9 stage 1 still has something to confirm; C7.7-10…13 Download PDF copy needs an Online line (409); C7.7-16/-18 hand-written lines; C7.7-20/-23/-25 Paper and IMM 5476 lines.",
  "Family of four (people added on screen, no dates of birth): every person, children too, lists IMM 5257, SCH1, 5409, 5475, 5476, 5707 and IRM 0002 with \"N facts to answer\". Filled solo case: only IMM 5257, SCH1 and 5707 remain; IMM 5476 is gone although the case has a representative of record.",
  "Proposed new: N2, N3 (forms whose rule is not yet answered are listed as due, children included)."),
 ("C7.3", "Portal sheet: answers in the portal's order with copy buttons", "Partial", "Partial", ["C7.3"],
  "1.4 (no Online line in release 1: IMM 5707 is PDF upload)",
  "release 2's channels (DEMO.md row 9, waiting for B81); QA-153",
  "2/13 both rounds (2/13 on 4 Nov): `GET …/answer-sheet` 409 \"IMM 5707 is filed as PDF upload\".",
  "No answer sheet anywhere on the case page; IMM 5707 shows as a form row with Generate a copy.",
  "None new."),
 ("C8.1", "Signed-PDF states, signed scans, entered ticks", "Partial", "Partial", ["C8.1"],
  "1.2 (signer rules absent; IMM 5476 not on the case)",
  "QA-228 (signer rules on the checkpoint); N2 (IMM 5476); the sign-steps screen",
  "0/14 both rounds: signers come back `[\"person\"]` for a child, IMM 5476 is no item (\"No such item.\"), so print → signed → scan → uploaded never starts.",
  "No sign steps on screen (`/runtime/items/:id/sign-steps/print` and `/signed` have no caller in `web/src`).",
  "QA-228 still open."),
 ("C8.2", "Filing records portal, reference, number, UCI", "Partial", "Partial", ["C8.2"],
  "1.5 (the combination's IRCC account: `portal` is null on the checkpoint)",
  "the checkpoint setting \"Filed through APR Portal\" (J7 1.5); after it, Works is one step away",
  "11/12 both rounds (fixture 12/12). Red only C8.2-7: the record's portal is not `APR_PORTAL` because the configured Visitor visa has no IRCC account (`/prepare` `portal: null`).",
  "Case page: \"Submission to IRCC · One submission for 4 people applying · Record the submission… Opens once every filing is Ready to file\", each filing Not started. The dialog could not be reached (no filing can be Ready to file on screen).",
  "Proposed new: N6 (no \"Filed through\" on the configured Visitor visa: J7 1.5)."),
 ("C9.2", "A changed fact marks signed/uploaded/submitted items stale", "Not built", "Partial (built in part)", ["C9.2"],
  "1.2 / 1.4 (needs IMM 5476 signed and an Online IMM 5707 on the checkpoint)",
  "N2, QA-228, release 2's channels; the row's own remaining steps",
  "5/11 both rounds: an uploaded IMM 5257 goes Out of date naming the fact, old and new value and date (C9.2-3), it is a CRITICAL warning (-5), Undo restores (-8), answers are append-only (-11). Red: -2/-6/-10 need IMM 5476's signed scan, -9 an entered Online section, -4 the signed scan's checksum (no scan), -7 the spouse's IMM 5476 item. The table's \"Not built\" is stale.",
  "Not walked on screen (no Out of date banner without a generated, validated copy; `out-of-date.tsx` exists).",
  "None new."),
 ("C10.2", "The founder loads the finished story", "Not built", "Not built", ["C10.2"],
  "7.6 (last step; every earlier stage is red on the checkpoint)",
  "everything above; `POST /api/demo/checkpoints/finished-story` is not built (404)",
  "0/11 both rounds: no finished story to load.",
  "Demo menu has no Finished story item.",
  "None new."),
 ("C11.5", "Retail and Corporate apart; case link pre-fills employer facts", "Partial", "Partial", [],
  "2.1 (Open a case and the case header offer the employer link on a Visitor visa case)",
  "#1051 (C1.3 + C11.5); the pre-fill (BR-13, SI-10)",
  "No pack. The 1 Nov evidence (\"Not offered: the Visitor visa has no employer facts\") no longer holds on the checkpoint.",
  "Visitor visa case header: \"Relies on an employer case — Offered: the Visitor visa forms read 1 employer fact from a Corporate case, read-only.\" A visitor visa applicant reads an employer fact because the checkpoint's field maps put an organisation fact on a Visitor visa form (the same as QA-152's \"prospective employer\" question).",
  "Proposed new: N7 (Ambiguity: should Visitor visa ever offer the employer link?)."),
 ("C11.6", "Each form's channel picked inside what IRCC accepts", "Partial", "Partial", ["C11.6"],
  "1.4 (every line PDF upload, signature NONE; no Online IMM 5707); 1.5 (no portal)",
  "the checkpoint's channels and signature per line (DEMO.md row 9, B81); N6",
  "6/14 both rounds. Red: C11.6-1 no \"Filed through\" (`portal: null`); -3 every item PDF upload; -5 signature `NONE`; -8a Online on IMM 5257 is not refused (the checkpoint's library line accepts it), -8b/-9 Paper answers 409 on the checkpoint, -12. Green: IMM 5476 Online refused with IRCC's line (-6), unknown channel 400, stale version 409, audit.",
  "No Change channel on any form row on the case page.",
  "N6."),
]

PACKED = {}
for r in ROWS:
    for p in r[4]: PACKED[p] = (count("cp-r1", p), count("cp-r2", p))

def runs_txt(packs):
    if not packs: return "no pack"
    out = []
    for p in packs:
        a, b = PACKED[p]
        f = lambda c: f"{c[0]}/{c[1]}" if c else "not run"
        out.append(f"{p} {f(a)} · {f(b)}")
    return "; ".join(out)

def main_steps(packs):
    if not packs: return "—"
    a, b = PACKED[packs[0]]
    s = f"{a[0]}/{a[1]}" if a else "?"
    if b and a and b != a: s += f" (round 2 {b[0]}/{b[1]})"
    if len(packs) > 1 and PACKED[packs[1]][0]: s += f"; breadth {PACKED[packs[1]][0][0]}/{PACKED[packs[1]][0][1]}"
    return s

for (cid, cap, was, now, packs, j7, waits, verdict, walk, bugs) in ROWS:
    fl = []
    for p in packs: fl += [f"* `{p}`: {x}" for x in fails(p)]
    body = f"""# qa verdict: {cid}, 5 Nov 2026 — M3 re-score on the configured checkpoint

**Verdict: {now}** (table: {was}). {cap}.

* **Commit tested:** main {MAIN} (5 Nov, after #1055 and #1009).
* **Tester:** the independent cloud qa for M3 (`/qa milestone`, cloud machine). It built none of this; it fixes nothing.
* **Data (P-322, P-344 (2)):** the configured checkpoint. Each pack ran **alone** (no fixture setup) on a fresh isolated copy after Demo › Reset demo and Demo › Load the configured checkpoint as the author (`/api/demo/reset`, `/api/demo/load {{sample:"configured"}}`, 81–100 s), twice (`run-checkpoint.mjs`; rounds `cp-r1`, `cp-r2`). Live AI off (every `*_LIVE` switch and AI key removed), US$0, no priced button, no live switch. Each copy was stopped and its database dropped.
* **Walk:** a fresh copy, Demo menu › Reset demo › Load the configured checkpoint on screen (89 s), then the case officer at 1440 px, headless Playwright (`walk-1440.cjs`, `walk-solo.cjs`; no display on this cloud machine for a headed browser). No browser error on any page.
* **Evidence:** `qa/reports/2026-11-05-milestone-m3-cloud/` (README, `runs/cp-r1/*.out.txt`, `walk/`).

## Pack on the checkpoint (passed / steps · round 1 · round 2)
{runs_txt(packs)}

{verdict}

## First red step of journey J7 (`prototype/studio/acceptance/journeys/J7-visitor-visa-end-to-end.md`)
**{j7}.** Waits on: {waits}.

## Walk at 1440 px
{walk}

## Bugs
{bugs}
"""
    if fl:
        body += "\n## Red steps on the checkpoint (round 1; round 2 the same)\n" + "\n".join(fl) + "\n"
    open(os.path.join(V, f"2026-11-05-M3-{cid}.md"), "w").write(body)

# The table for README.md
lines = ["| Row | Status (table → proposed) | Steps passed on the checkpoint (r1; r2 same unless named) | First red J7 step | Waits on |", "|---|---|---|---|---|"]
for (cid, cap, was, now, packs, j7, waits, *_ ) in ROWS:
    lines.append(f"| {cid} | {was} → **{now}** | {main_steps(packs)} | {j7} | {waits} |")
open(os.path.join(HERE, "table.md"), "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
