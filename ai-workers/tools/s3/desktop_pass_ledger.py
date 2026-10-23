#!/usr/bin/env python3
"""Content-level ledger for the Solution 1 one-pager, draft 4.1 (archived) → draft 4.2 (functional and desktop correction pass,
18 Oct 2026). Run: python3 tools/s3/desktop_pass_ledger.py. Compares every string in the archived s3_data.py, s3_panels.py,
s3_views.py and build_one_pager.py with the current files. Every draft 4.1 string that no longer appears word for word must match
one disposition below (kind, finding, where the content is now and why); the script fails if any does not.
Kinds: 'corrected' changes behaviour to match a source or founder decision (C-M1–C-M3); 'clarified' rewords the same behaviour
(functional-language review); 'display' changes presentation only (layout, colour, markup) with no reader-facing meaning change.
Nothing is listed as removed: no content was deleted without a replacement. Writes checks/one-pager-draft-4-2-content-ledger-2026-10-18.md."""
import ast, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ARCH = os.path.join(ROOT, "..", "archive", "ai-workers", "solution-1-v3-draft4.1-before-desktop-pass-2026-10-18")
LR = "language review (validator, 18 Oct)"

# (substring of the 4.1 string, or the exact string when shorter than 20 characters; kind; finding; where it is now, and why)
D = [
    ("v3 · one-pager draft 4.1: cohesion", "clarified", "Version", "VERSION: 'draft 4.2: functional and desktop correction pass; draft 4.1 archived whole'."),
    ("Solution 1 v3 · one-pager draft 4.1 ·", "clarified", "Version", "Footer names draft 4.2; the rest of the footer is unchanged."),
    # C-M1: hold at suspicion (AIW-D245 point 5)
    ("a suspected material mapping error is triaged as a wrong-mapping ticket (10.4): once confirmed", "corrected", "C-M1",
     "4.3 now holds the mapping and its dependent work from the moment a material mapping error is suspected, pending investigation (D245 §5); affected forms cannot be approved or submitted; a second rule gives release-with-evidence if disproved and the existing correction route (10.2, 10.3) if confirmed."),
    ("A firm's support ticket: a form or edition not yet supported, or a mapping that looks wrong", "clarified", "C-M1", "10.4 input also names a suspected error raised from a historical comparison (4.3), as its trigger already did."),
    ("Confirm what it is; register a new edition, or hold a wrong mapping", "corrected", "C-M1", "10.4 action: hold a suspected wrong mapping at once, list the cases, investigate."),
    ("Triaged ticket: change to run, or 'mapping stands' answer", "corrected", "C-M1", "10.4 output: 'mapping stands' now comes with the hold released."),
    ("Reads the report with the form's evidence; decides new form or edition, wrong mapping, or mapping stands.", "corrected", "C-M1", "10.4 person line: classify; a suspected wrong mapping is held at once while investigated; then confirm or record that it stands."),
    ("The ticket is classified; a wrong mapping is held with its dependents", "corrected", "C-M1", "10.4 done-when: held from the moment of suspicion; no approval or submission while investigated; confirmed → 'mapping under correction' with approval withdrawn; disproved → released with evidence."),
    ("Mapping stands: support tells the firm, and the agent re-checks the fact.", "corrected", "C-M1", "10.4 return route adds: the hold is released with the evidence recorded."),
    ("A wrong-person mapping on the family-information form is held, and every open case using that edition is listed.", "corrected", "C-M1", "10.4 acceptance: the mapping is held at once, before the investigation ends; a new acceptance covers a disproved suspicion (hold released, earlier approval stands)."),
    ("Wrong mapping: hold it and its dependents; list every case that uses it", "corrected", "C-M1", "10.4 step: suspected wrong mapping held at once and investigated."),
    ("Mapping stands: answer the firm through support", "corrected", "C-M1", "10.4 step: confirmed → change path (10.2); mapping stands → release the hold and answer the firm."),
    ("F|A wrong mapping is held with everything that depends on it", "corrected", "C-M1", "10.4 rule: held as soon as suspected, through the same hold as 4.4; a new proposed rule says an ordinary question holds nothing."),
    ("F|A listed impact is not enough: in every open case", "clarified", "C-M1", "Same rule, now 'once the error is confirmed'; a new preceding proposed rule covers the investigation interval ('mapping under investigation': no approval or submission; earlier approvals not yet withdrawn)."),
    ("Triage confirms the map entry's person is wrong", "corrected", "C-M1", "10.4 example split: held at once on suspicion; then the investigation confirms and the forms are marked 'mapping under correction'."),
    ("The report turns out to be a wrong fact, not a wrong mapping: support answers the firm", "clarified", "C-M1", "Same exception, adding that the hold is released with that evidence."),
    ("Before submission, every form of this filing is still approved at its current version; a form marked 'mapping under correction'", "corrected", "C-M1", "9.5 guard also stops a form whose mapping is held for investigation (D245 §5)."),
    ("Sorts a firm's support ticket into a new form or edition, a wrong mapping, or a mapping that stands.", "corrected", "C-M1", "10.4 purpose: holds a suspected wrong mapping at once while it is investigated."),
    ("Triages each firm's support ticket", "corrected", "C-M1", "Stage 10 story: holds a suspected wrong mapping at once while it is investigated."),
    ("A change to run, or 'mapping stands'", "clarified", "C-M1", "Stage 10 story result: 'mapping stands' with the hold released."),
    ("Mapping stands: support answers the firm", "corrected", "C-M1", "View 7 end: 'Mapping stands; hold released' (the firm's answer stays in 10.4's return route); a new view 7 note states the suspicion-time hold."),
    # C-M2: inclusive gateway without default
    ("What is still open?", "corrected", "C-M2", "View 4 X9 renamed 'Ready, missing, or both?': an inclusive gateway whose two conditions can apply together."),
    ("Facts ready for forms", "corrected", "C-M2", "View 4 branch 'Facts ready for a form' is a conditioned flow, no longer the default (BPMN 2.0.2: a default runs only when no other condition holds, so it suppressed ready forms whenever a client gap existed)."),
    ("Forms that read a fact 'needs review' or 'still true?' are prepared but cannot be approved or submitted", "corrected", "C-M2/C-M3", "View 4 note now states both branches can apply, and the Held boundary (filled from a verified value; waits at approval)."),
    # C-M3: one fact-state contract
    ("A form whose facts are missing or in conflict can be rendered, but stops at 8.4", "corrected", "C-M3", "8.1 done-when: missing/conflict → preview, stops at review (8.4) before filling; Held with a verified value → prepared and filled, held at approval and submission; no verified value → missing."),
    ("(a missing or held fact stops it at review, 8.4)", "corrected", "C-M3", "8.2 trigger: ready = verified, or Held with a verified value; a missing or conflicting fact allows a preview and stops at 8.4 before filling. The old wording contradicted 8.4."),
    ("A field whose fact has a replacement 'needs review' or an unanswered 'still true?' shows the current value", "clarified", "C-M3", "8.2 rule: the form can also be filled with that verified value; a new rule: no verified value yet → 'needs a fact' (missing)."),
    ("No blocked item left unresolved; every flagged item decided with a reason; if the AI meaning check did not run", "clarified", "C-M3", "8.4 done-when adds: Held fields go on to filling with their verified value; approval and submission wait for 8.1."),
    ("Supported edition or screen version; required facts verified.", "clarified", "C-M3", "9.1 prerequisite: every required fact has a verified value; a Held field is filled from it, approval stays held."),
    ("only the forms that read it wait: they can be prepared but stop at review (8.4)", "clarified", "C-M3", "Stage 6 decision: 'previewed but stop at review (8.4), before filling'."),
    ("prepared, but not approved or submitted until resolved", "corrected", "C-M3", "Stage 6 decision outcome now 'with a verified value': prepared and filled from it, not approved or submitted until resolved; with no verified value it counts as missing."),
    ("From view 4: facts ready for form preparation (a missing or conflicting fact stops only the forms that read it).", "clarified", "C-M3", "View 6 'starts': names the stop at review (8.4) and the Held boundary."),
    ("The agent resolves every blocked and flagged field and acknowledges each Critical warning", "clarified", "C-M3", "8.4 purpose: a Held field goes on to filling with its verified value but holds approval and submission."),
    # functional language: titles (stable IDs unchanged)
    ("Create the configurator row and attach its sources", "clarified", LR, "1.1 title 'Attach government forms and instructions for the combination'; its purpose names the content publisher, the base inputs, and that conditional forms come from drafted rules."),
    ("Capture portal screens", "clarified", LR, "1.2 title 'Capture the required government portal screens'."),
    ("Run the engine", "clarified", LR, "1.3 title 'Start the draft setup run'; view label 'Start the draft run'."),
    ("Split the checklist, the guide and the eligibility page", "clarified", LR, "2.2 title names its output: 'into source passages'."),
    ("Build the document list", "clarified", LR, "3.3 title 'Draft the document requirements' (setup-time definition, not a case checklist)."),
    ("Draft the eligibility gates", "clarified", LR, "3.6 title 'Draft the indicative eligibility gates'."),
    ("Recheck mapping meaning in a fresh context", "clarified", LR, "4.2 title 'Recheck the person and fact each mapping selects'; the fresh-context rule stays in its rules."),
    ("Review the lead: same person, and take the case?", "clarified", LR, "6.3 title 'Confirm client identity and decide whether to open a case'."),
    ("Review the lead", "clarified", LR, "View label 'Confirm identity, take case?'."),
    ("Convert the lead and open the case", "clarified", LR, "7.1 title 'Create the case and assign its participants'."),
    ("Open the case, add family", "clarified", LR, "View label 'Create case, add people'."),
    ("Read each uploaded document", "clarified", LR, "7.3 title 'Extract proposed values from each uploaded document' (extraction is not verification)."),
    ("Verify every fact once in the working view", "clarified", LR, "8.1 title 'Verify proposed facts and resolve differences'; the working view stays its screen."),
    ("Render the form from the facts", "clarified", LR, "8.2 title 'Prepare the form from its mapped facts'."),
    ("Render the form", "clarified", LR, "View label 'Prepare the form'."),
    ("Check the form's meaning", "clarified", LR, "8.3 title 'Check person and field selection'; view label 'Check person and field'."),
    ("Review the form's statuses and flags", "clarified", LR, "8.4 title 'Resolve form errors and review warnings'."),
    ("Fill each form type and read it back", "clarified", LR, "9.1 title 'Fill the form and verify written values'."),
    ("Resolve read-back results, type refused fields, validate", "clarified", LR, "9.2 title 'Resolve filling errors and validate the final form'."),
    ("Record each government letter", "clarified", LR, "9.6 title 'Record government responses and continue the filing'."),
    ("Watch for change", "clarified", LR, "10.1 title 'Check government sources for changes'."),
    ("Adopt the change on an open case", "clarified", LR, "10.3 title 'Apply a published update to an open case'."),
    ("Triage a support ticket", "clarified", LR, "10.4 title 'Investigate a form or mapping support ticket'; view label 'Investigate a ticket'."),
    ("Sets up one row for the combination with every official source it needs", "clarified", LR, "1.1 purpose names the actor and base inputs (forms, checklist, guide, eligibility page); conditional forms come from rules (3.5), not by hand."),
    ("Get the government's official material into the product, read once.", "clarified", LR, "Stage 1 purpose: 'the combination's base government forms and instructions, each read once'."),
    ("The pack version is imported as one pathway version", "corrected", LR, "5.3: one new version of the country pack (SA-01B: SA-1 holds countries and pack versions); every item keeps its own version."),
    ("Client A applies for a work permit from outside Canada", "clarified", LR, "Family example names Immigration, Refugees and Citizenship Canada (IRCC) on first use."),
    # stage titles and the map's labels
    ("Gather the official material", "clarified", LR, "Stage 1 'Attach government forms and instructions'."),
    ("attaches the sources", "clarified", LR, "Stage 1 who-line 'attaches the base forms and instructions'."),
    ("The content publisher attaches the government's forms, checklist and guide", "clarified", LR, "Stage 1 'does': base forms, document checklist, guide and eligibility page; the draft run; conditional forms added by stage 2's rules."),
    ("AI drafts the configuration", "clarified", LR, "Stage 2 'AI prepares the draft combination setup'."),
    ("Open the case", "clarified", LR, "Stage 4 'Create the case and assign participants' (panel links renamed with it)."),
    ("Stage 4 · Open the case", "clarified", LR, "Panel link 'Stage 4 · Create the case and assign participants'."),
    ("Reuse verified information", "clarified", LR, "Stage 5 'Pre-fill from each person's verified facts'."),
    ("Stage 5 · Reuse verified information", "clarified", LR, "Panel link renamed with stage 5."),
    ("Open the case (stage 4), then reuse verified information (stage 5).", "clarified", LR, "4B next step: 'Create the case (stage 4), then pre-fill from each person's verified facts (stage 5)'."),
    ("Collect and verify the gaps", "clarified", LR, "Stage 6 'Collect missing information and verify proposed values'."),
    ("Prepare and check each form", "clarified", LR, "Stage 7 'Prepare, check and fill each form' (the stage includes filling and read-back)."),
    ("Record the responses", "clarified", LR, "Stage 9 'Record responses and continue after the decision'."),
    ("Each filing's decision", "clarified", "D3", "Stage 9 handoff arrow 'Decision recorded'."),
    ("What follows a decision?", "clarified", "D3", "Stage 9 card decision 'What follows a recorded decision?': Always → After decision; Also, if a route level was approved → next filing; Once every filing is closed → the case closes. Outcomes apply together (tooltip says so)."),
    ("After decision: the follow-up steps run", "clarified", "D3", "Same outcome: 'the filing continues in After decision'."),
    ("The government approved a route level", "clarified", "D3", "Same outcome: 'Also, if the government approved a route level'."),
    ("Every filing closed", "clarified", "D3", "Same outcome: 'Once every filing is closed'."),
    ("Find the change", "clarified", LR, "Stage 10 'Identify government changes and reported mapping issues'."),
    ("Open cases adopt it", "clarified", LR, "Stage 12 'Apply published changes to affected cases'."),
    # case initiation (4A / 4B)
    ("New client", "clarified", "Case initiation", "Route 4A label '4A · New client'; card title 'Review the enquiry and establish identity'."),
    ("Existing client", "clarified", "Case initiation", "Route 4B label '4B · Existing client'; card title 'Start another service'."),
    ("Existing client, new service", "clarified", "Case initiation", "Card title 'Start another service'; BPMN start events keep the words with a '4B · ' prefix."),
    ("decides", "clarified", "Case initiation", "4A who-line 'decides identity and whether the firm takes the case'."),
    ("opens a new case from the client's record", "clarified", "Case initiation", "4B who-line 'starts another service from the client's record'."),
    ("open the case", "clarified", "Case initiation", "4A decision outcome 'create the case (stage 4)'."),
    ("lead closed", "clarified", "Case initiation", "4A decision outcome 'lead closed; no case is created' (no case exists before the firm accepts)."),
    ("Accepted: open the case (stage 4).", "clarified", "Case initiation", "4A next step: 'create the case (stage 4); a rejected enquiry stops here, before any case exists'."),
    ("Two ways in · stages 4–9", "clarified", "Case initiation", "Band range 'Start a new case (4A, 4B) · stages 4–9'."),
    ("Starts on the pack version that is current when the case opens.", "clarified", "Case initiation", "Band note 'A case starts on the pack version that is current when it is created.'"),
    ("A, B, 4–6", "clarified", "Case initiation", "View 4 stages '4A, 4B, 4–6'."),
    ("Prospect arrives", "clarified", "Case initiation", "Overview start '4A · Enquiry received'."),
    ("Lead form opened", "clarified", "Case initiation", "View 4 start '4A · Lead form opened'."),
    # end strips
    ("end:Pack version published: it joins the shared record below", "clarified", "D3", "Setup end strip 'Ends: pack version published | It joins the shared record below; new cases read it.'"),
    ("end:A decision moves its filing to After decision; the case closes when every filing is closed", "corrected", "D3", "Case band strip 'Continues in After decision' (a handoff, not an end), with the next filing, and case closure on its own line."),
    ("end:Affected forms go back to stage 7; only their approvals are withdrawn", "clarified", "D3", "Change end strip 'Ends: case on the new version | Affected forms go back to stage 7; only their approvals are withdrawn.'"),
    # terms key
    ("the case's licensed person ('Lead RCIC' in the product) who normally approves each form and submits; the government fee", "clarified", "D2", "Terms key keeps the short definition; the fee payer stays in Who is who (ACTOR_ROLE rep) and stage 8."),
    # colours (display only)
    ("#1d4ed8", "display", "Actor colour", "Super Admin roles now muted navy #34557a (founder, 18 Oct: three product-side families)."),
    ("#7c3aed", "display", "Actor colour", "Immigration SME: Super Admin navy family."),
    ("#0f766e", "display", "Actor colour", "Second-person approver: Super Admin navy family."),
    ("#b45309", "display", "Actor colour", "AI: system slate #56606b."),
    ("#374151", "display", "Actor colour", "Platform: system slate #56606b."),
    ("#be185d", "display", "Actor colour", "Client and family: muted plum #7a4a6f."),
    ("#15803d", "display", "Actor colour", "Agent: firm teal #2b6a70."),
    ("#0e7490", "display", "Actor colour", "Lead representative: firm teal #2b6a70."),
    ("#6b7280", "display", "Actor colour", "Government: grey #626970 (4.5:1 on the case band; 'for example IRCC' added to its sub-label)."),
    ("#4b5563", "display", "Actor colour", "System bracket colour: slate #56606b."),
    # builder: visible labels
    ("Good to know", "clarified", LR, "Card and panel label 'Key rules' (the pointers are rules)."),
    ("Way in", "clarified", "Case initiation", "Labels '4A · New client' / '4B · Existing client' and 'Start a new case'."),
    ("way in", "clarified", "Case initiation", "Aria labels and Back text name the route ('4A · New client'); 'Back returns to this route'."),
    ("Way in · start", "clarified", "Case initiation", "Panel badge '4A · New client · start a new case'."),
    ("Way in · ", "clarified", "Case initiation", "Panel bar label '4A · New client · process map'."),
    ("Resolved client", "clarified", "Case initiation", "Arrow 'Client record resolved'."),
    ("Side-by-side mark: these steps run at the same time", "clarified", LR, "Runs label 'In parallel', tooltip 'Parallel mark'; 'Runs' shows as 'Repeats'; the per-filing tooltip is now escaped and complete."),
    # builder: markup, CSS and script (presentation only)
    ("<div class='mend'><span class='ring'", "display", "D3", "End strip markup: heading with an end ring, or a handoff arrow for After decision; closure line separate."),
    ("<section class='blk' id='overview'><h2>End to end", "clarified", "D2", "Map introduction shortened (same instructions: bands, eye, Example, numbering) and a one-line actor-side key added."),
    ("<div class='msec'><p class='mlab'>Good to know</p>", "clarified", LR, "Label 'Key rules'; a compact route card may show fewer pointers (card_pointers); the panel shows all."),
    ("<div class='mrail mrail-x' role='note'>", "display", "D5", "Rail arrows placed from the column weights (style variables)."),
    ("<div class='mrail mrail-pkg' id='released-package' role='note'>", "display", "D5", "Rail arrows placed from the column weights."),
    ("<div class='sgways'><span class='sgsub'>Two ways in</span>", "clarified", "Case initiation", "Stage strip 'Start a new case'."),
    ("<div class='mgate'><p class='mlab q' data-tip='Decision mark: one of the outcomes below is taken'>", "corrected", "Tooltip", "Decision tooltip now says whether outcomes are exclusive ('exactly one') or may apply together (D.DECISIONS_TOGETHER)."),
    ("<div class='mwrap' aria-hidden='true'><span class='hl'>", "display", "D5", "6 → 7 wrap placed from the column weights."),
    ("<header><span class='snum start' aria-hidden='true' data-tip='Start mark: where a case begins'>", "corrected", "Tooltip", "Start mark tooltip per route: 4A 'an enquiry arrives; no case exists until the firm accepts it'; 4B 'the agent starts another service from an existing client's record'."),
    ("-h'><span class='kick'>Start</span>", "clarified", "Case initiation", "Kicker shows the route label ('4A · New client')."),
    ("<div class='mdoors' role='group' aria-label='Two ways in'>", "clarified", "Case initiation", "Group label 'Start a new case'."),
    (":root{--bg:#f6f6f3;--panel:#fff;--ink:#1b1b1a", "display", "D1/D2/D5/D6/D7", "Stylesheet: neutral canvas and text, muted phase washes and thin rules, column templates, 900–1099px two-card reflow, compact end strips, story rows in the pane, wider docked pane at ≥1760px."),
    ("@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){--bg:#121314", "display", "D7", "Dark palette re-tuned to the same roles."),
    ("(function(){   const DATA = JSON.parse(", "display", "D6", "Script: the details open as a side panel from 900px (was 1000px), so a 960px reading pane keeps the selected stage visible."),
]

def strings(path):
    out = []
    for n in ast.walk(ast.parse(open(path).read())):
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 3: out.append(n.value)
    return list(dict.fromkeys(out))

def norm(s): return " ".join(s.split())

def run():
    rows, errs, added = [], [], 0
    for f in ("s3_data.py", "s3_panels.py", "s3_views.py", "build_one_pager.py"):
        old, new = strings(os.path.join(ARCH, f)), strings(os.path.join(HERE, f))
        sn, so = set(new), set(old); added += sum(1 for s in new if s not in so)
        for s in old:
            if s in sn: continue
            hit = next((d for d in D if (d[0] == s if len(d[0]) < 20 else norm(d[0]) in norm(s))), None)
            if not hit: errs.append(f"{f}: no disposition for '{s[:90]}'"); continue
            rows.append((f, s, *hit[1:]))
    return rows, errs, added

if __name__ == "__main__":
    rows, errs, added = run()
    from collections import Counter
    c = Counter(r[2] for r in rows); fnd = Counter(r[3] for r in rows)
    L = ["# One-pager draft 4.1 → draft 4.2: content-level ledger", "",
         "18 October 2026 · generated by `tools/s3/desktop_pass_ledger.py`. Draft 4.1 HTML, builder, checks and data/layout sources are archived whole in "
         "`archive/ai-workers/solution-1-v3-draft4.1-before-desktop-pass-2026-10-18/` (HTML `bee3a7a3…d01b4`, `manifest.sha256`).", "",
         f"Every draft 4.1 string in `s3_data.py`, `s3_panels.py`, `s3_views.py` and `build_one_pager.py` was compared with draft 4.2. **{len(rows)} no longer appear word for word**: "
         + ", ".join(f"{k} {v}" for k, v in sorted(c.items())) + f". **Removed without replacement: 0.** {added} strings are new (corrections, an example, acceptance checks, labels, style). "
         "Unchanged strings are kept word for word; stable stage and activity IDs (1–12, A, B, 1.1–10.4) are unchanged.", "",
         "By finding: " + ", ".join(f"{k} {v}" for k, v in sorted(fnd.items())) + ".", "",
         "'Corrected' changes behaviour to match a team source or founder decision; 'clarified' rewords the same behaviour; 'display' changes presentation only. "
         "Meaning-preservation check for each clarified title or label: actor, condition, authority, person/data/version, outcome and recovery are unchanged; the panel's purpose, rules and examples carry the detail.", "",
         "| File | Draft 4.1 wording | Kind | Finding | Where it is now, and why |", "|---|---|---|---|---|"]
    L += [f"| {f} | {s[:300].replace('|', '/').replace(chr(10), ' ')}{'…' if len(s) > 300 else ''} | {k} | {fd} | {w.replace('|', '/')} |" for f, s, k, fd, w in rows]
    out = os.path.join(ROOT, "checks", "one-pager-draft-4-2-content-ledger-2026-10-18.md")
    open(out, "w").write("\n".join(L) + "\n")
    print(f"{len(rows)} changed strings dispositioned ({dict(c)}); {added} added; wrote {os.path.relpath(out, ROOT)}")
    if errs: print("UNDISPOSITIONED:"); [print("  - " + e) for e in errs]; sys.exit(1)
