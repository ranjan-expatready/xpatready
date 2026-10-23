#!/usr/bin/env python3
"""Working edition W1: apply AIW-D251–D254, the D253 history rule (checked against official sources on 19 Oct 2026)
and the row 13 terminology fix to the working copies in tools/s3-working/. Never touches tools/s3/ (frozen, read-only).
Each edit: (file, old, new, reason). Every old string must occur exactly once, or nothing is written.
Run once, from a fresh copy of B0: python3 tools/s3-working/apply_w1.py. The edit list is the correction record's source."""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
D251, D252, D253, D254 = "AIW-D251 (row 1)", "AIW-D252 (row 2)", "AIW-D253 (row 3)", "AIW-D254 (row 4)"
HIST = "AIW-D253 history check: IMM 5257 (09-2023) 'Do not leave gaps. If retired, not working or studying, please indicate'; no enforcing script; IMM 1295 asks 10 years without gap wording"
R13 = "Conflict row 13 (terminology): team glossary 99-Phasing-and-Glossary v1.8 renames Drafter to Writer"
VER = "Working edition label"

EDITS = [
    # ---- version labels
    ("s3_data.py", 'VERSION = "v3 · one-pager draft 4.3: wrong-fact hold and continuation-arrow correction; draft 4.2 frozen with its audit · 19 Oct 2026"',
     'VERSION = "v3 · prototype working edition W1, from accepted draft 4.3 (B0): review, form-fix, blocking and SME-duty decisions applied; not accepted · 19 Oct 2026"', VER),
    ("s3_data.py", 'FOOTER = ("Solution 1 v3 · one-pager draft 4.3 ·', 'FOOTER = ("Solution 1 v3 · working edition W1 (from accepted draft 4.3; not accepted) ·', VER),

    # ---- D254: the Immigration SME is a duty of a Content publisher, not a seventh role
    ("s3_data.py", '("spec", "Immigration SME", "Expat Ready · Super Admin role (proposed)", "#34557a")',
     '("spec", "Immigration SME", "Expat Ready · a duty assigned to a Content publisher (no seventh role)", "#34557a")', D254),
    ("s3_data.py", "The immigration specialist is not one of today's six staff roles: proposed.",
     "The Immigration SME is a duty assigned to a Content publisher, not a seventh role (AIW-D254).", D254),
    ("s3_data.py", '"Add an Immigration SME role (or a confirmation permission held by that person) for confirming (signing off) rules, gates, documents and values and signing expected answers; it cannot publish."',
     '"Decided: no new role. Confirming (signing off) rules, gates, documents, values and expected answers is an explicitly assigned duty of a qualified Content publisher, using existing permissions or assignments; a control is added only for a concrete gap. The pack\'s author or submitter never approves or publishes it, the Platform Owner included."', D254),
    ("s3_data.py", '"R|The approver is a second person, never the pack version\'s author or submitter (the content publisher who prepared it or submitted it for approval), and never edits", ',
     '"R|The approver is a second person, never the pack version\'s author or submitter (the content publisher who prepared it or submitted it for approval), and never edits", "F|The same applies when the author or submitter is the Platform Owner: that person cannot approve or publish the version", ', D254),
    ("build_one_pager.py", "The Immigration SME is not one of today's staff roles: it is proposed.",
     "The Immigration SME is not a seventh role: it is a duty assigned to a qualified Content publisher.", D254),

    # ---- row 13: terminology
    ("s3_data.py", "named in the team's design Drafter, Reader (documents) and Checker (cross-checks)",
     "named in the team's design Writer (formerly Drafter), Reader (documents) and Checker (cross-checks)", R13),

    # ---- D251: one review workspace, flagged first, section confirmation
    ("s3_data.py", '"Reviews leads, opens cases, verifies each fact once, resolves flags,',
     '"Reviews leads, opens cases, reviews each person\'s facts in one workspace (flagged items first) and confirms them section by section, resolves flags,', D251),
    ("s3_data.py", '"the agent verifies each fact once", "rules render',
     '"the agent reviews facts in one workspace, conflicts and uncertain values first, and confirms them section by section", "rules render', D251),
    ("s3_data.py", 'human="Verifies proposed values, least certain first; decides conflicts; enters facts that are collected from staff.",',
     'human="Reviews each person\'s facts by section in one workspace: conflicts and uncertain values first, each beside its source; decides each of those explicitly; confirms a section once reviewed; enters facts that are collected from staff.",', D251),
    ("s3_data.py", "or a form reports a fact to correct; facts are verified one at a time, not after every reading is done.",
     "or a form reports a fact to correct; a section can be confirmed as soon as its information is reviewed, not after every reading is done.", D251),
    ("s3_data.py", 'actions=["Verify proposed values, least certain first", "Decide conflicts", "Enter facts collected from the staff working view, once"],',
     'actions=["Review flagged items first: conflicts and uncertain values, deduplicated, each beside its source", "Decide each conflict or uncertain value explicitly", "Confirm each section once its information is reviewed", "Enter facts collected from the staff working view, once"],', D251),
    ("s3_data.py", '  rules=["One current value per person per field; a newer verified value supersedes with history;',
     '  rules=["F|One staff workspace grouped by person and section; conflicts and uncertain values come first, deduplicated, each with its source evidence beside it; AI-read values are visibly marked and reviewable against their source",\n'
     '         "F|Confirming a section verifies the reviewed values in it without a separate acknowledgement for each AI-read value; a conflicting or uncertain value needs its own explicit decision or stays unresolved, and a section confirmation never marks it verified",\n'
     '         "F|Per-fact provenance, status and confirmation history stay underneath: which value, from which source, confirmed by whom, when, and through which section confirmation (one stored value per fact)",\n'
     '         "One current value per person per field; a newer verified value supersedes with history;', D251),
    ("s3_data.py", "('agt', 'verifies each fact once')]", "('agt', 'confirms facts section by section, flagged first')]", D251),
    ("s3_data.py", 'AI proposes values from documents; the agent verifies each fact once.",',
     'AI proposes values from documents; the agent reviews flagged items first and confirms facts section by section.",', D251),
    ("s3_panels.py", '"8.1": "The agent turns declared and proposed values into verified facts, once per fact.",',
     '"8.1": "The agent turns declared and proposed values into verified facts: flagged items first, then one confirmation per reviewed section.",', D251 + " (found by visual inspection of the 8.1 panel)"),
    ("s3_panels.py", '("agt", "Verifies each fact once and decides conflicts", "Verified facts with history")',
     '("agt", "Reviews flagged items first, decides each conflict and confirms each section", "Verified facts with history")', D251),

    # ---- D252: a fix on a form asks information, mapping or not sure
    ("s3_data.py", '"The agent fixes the fact, never the field; a field that shows the wrong fact is a mapping flag to the content team",',
     '"F|A fix on a form field first shows the field\'s person, shared fact and source, then asks what is wrong: the information (the case fact is corrected, 8.1), the mapping (the correction stays on this form and a mapping issue is reported, 10.4) or not sure (no shared fact changes; the issue is recorded)",', D252),
    ("s3_data.py", 'human="Looks at every blocked, warning, held and flagged field, and every important field even when it is filled and checked; decides correct, wrong fact or wrong mapping.",',
     'human="Looks at every blocked, warning, held and flagged field, and every important field even when it is filled and checked; decides correct, wrong information, wrong mapping or not sure.",', D252),
    ("s3_data.py", 'authority="Decides flags; fixes facts in the working view, never a field or a mapping.",',
     'authority="Decides flags; corrects facts (8.1) or makes a reviewed, form-only field correction when the mapping is wrong; never edits a mapping.",', D252),
    ("s3_data.py", 'ret="Wrong fact: back to 8.1 (the form re-renders). Wrong mapping: reported to Expat Ready\'s support; the form waits (showing how long) or is completed by hand if urgent.",',
     'ret="Wrong information: the confirmed case fact is corrected (8.1); affected editable drafts re-render and show the effect on their review and approval status. Wrong mapping: a reviewed correction stays on this form, the mapping issue is reported to Expat Ready automatically (10.4), and the form continues. Not sure: nothing shared changes; the issue is recorded and the field stays unresolved.",', D252),
    ("s3_data.py", '"Decide each flag: correct, wrong fact or wrong mapping", "Acknowledge each Warning (Critical) with a reason; Advisory items need no reason",\n           "Report a wrong mapping to Expat Ready\'s support"],',
     '"Decide each flag: correct, wrong information, wrong mapping or not sure", "Pass a Warning (Critical) only with the waive permission and a recorded reason; Advisory items need no reason",\n           "For a wrong mapping, make a reviewed form-only correction; the mapping issue is reported automatically"],', D252 + "; " + D253),
    ("s3_data.py", '         "The agent fixes the fact, never the field",\n         "F|A wrong mapping is reported to Expat Ready\'s support; the form waits until the case adopts the corrected version, or authorised staff complete it by hand if urgent",',
     '         "F|Information wrong: the confirmed case fact is updated; updating the client\'s profile is a separate choice, unchecked by default; affected editable drafts refresh and show the effect on their review and approval status; signed and filed versions are preserved unchanged",\n'
     '         "F|Mapping wrong: the reviewed correction stays on this form only, shared facts are untouched, and the mapping issue is reported to Expat Ready automatically, as a support ticket (10.4); the form need not wait for the corrected mapping. Not sure: no shared fact changes; an information problem and a mapping problem can both be recorded on one fix",\n'
     '         "F|Filling again keeps intentional manual corrections; when a correction\'s source fact, mapping or form edition changes, it is flagged for review, never silently treated as current; corrections stay visible and can be cleared; who changed what, when and why is recorded in the existing history",', D252),
    ("s3_data.py", '["Partner\'s date of birth", "Flagged (red)", "meaning flag: the value is Client A\'s", "\'wrong mapping\': reported to support; the form waits"]',
     '["Partner\'s date of birth", "Flagged (red)", "meaning flag: the value is Client A\'s", "\'wrong mapping\': a reviewed form-only correction; the mapping issue is reported automatically"]', D252),
    ("s3_data.py", "gates=[('Anything wrong?', [('Wrong fact', 'back to stage 6; forms that read it are prepared again'), ('Wrong mapping', 'support ticket to Expat Ready (stage 10)'), ('All clear', 'to the representative')])],",
     "gates=[('Anything wrong?', [('Wrong information', 'case fact corrected (stage 6); forms that read it are prepared again'), ('Wrong mapping', 'form-only correction; issue reported to Expat Ready (stage 10)'), ('Not sure', 'recorded; nothing shared changes; the field stays unresolved'), ('All clear', 'to the representative')])],", D252),
    ("s3_data.py", '"A wrong fact goes back to stage 6; a wrong mapping goes to Expat Ready as a support ticket",',
     '"A wrong fact goes back to stage 6; a wrong mapping is corrected on that form only and reported to Expat Ready automatically",', D252),
    ("s3_data.py", 'io=("A firm\'s support ticket, or a suspected mapping error from a historical comparison (4.3)',
     'io=("A firm\'s support ticket, a mapping issue reported automatically with a form-only correction (8.4), or a suspected mapping error from a historical comparison (4.3)', D252),
    ("s3_data.py", '         "A ticket that does not suggest a wrong value on a form (a question about how a field is used, or a form not yet supported) holds nothing",',
     '         "F|In the case that reported it, a reviewed form-only correction of the affected field (8.4) resolves that form\'s output: the form may continue while the mapping issue stays reported and held for other cases",\n'
     '         "A ticket that does not suggest a wrong value on a form (a question about how a field is used, or a form not yet supported) holds nothing",', D252 + "; " + D253),
    ("s3_data.py", "a form kept held because the investigation found a wrong fact cannot be approved until the fact is corrected in 8.1 and the form is prepared again\",",
     "a form kept held because the investigation found a wrong fact cannot be approved until the fact is corrected in 8.1 and the form is prepared again; a form whose affected field carries a reviewed form-only correction (8.4) may be approved while the mapping issue stays reported\",", D252 + "; " + D253),

    # ---- D253: few hard stops; waivers with a recorded reason; history gap is a warning
    ("s3_data.py", "history gaps block submission until filled with a recorded history entry and checked again.",
     "a history gap is a warning: the official form asks applicants not to leave gaps and to indicate periods retired, not working or studying, recorded as a history entry; it stops approval only if it leaves a material fact unresolved.", HIST),
    ("s3_data.py", "In the team's words: block = a failed hard check (red, stops approval, never waived); warn = a Critical warning (amber, acknowledged with a reason before approval);",
     "Stops (decided for the prototype): approval and submission of the affected form only, while its required validation fails, a material fact it uses is unresolved, or the person a value belongs to is uncertain; these are resolved with a recorded, evidence-based decision, never waived; drafting, saving and previews continue. warn = a Critical warning (amber), passed only by a holder of the waive permission with a recorded reason shown to the representative; a waiver never marks information verified;", D253),
    ("s3_data.py", '"A history gap longer than allowed blocks submission until the gap is filled: the explanation is recorded as a history entry and the check runs again."),',
     '"A gap in the past 10 years of employment history gives a warning asking for the period (for example \'not working\' or \'studying\', as the form instructs); recording it as a history entry clears the warning; it stops approval only if it leaves a material fact unresolved."),', HIST),
    ("s3_data.py", '"R|A history gap longer than allowed blocks submission until it is filled; the explanation is recorded as a history entry (a fact) and the check runs again; it is not a waiver",',
     '"F|A history gap is a warning, not a stop: the official instruction (IMM 5257: \'Do not leave gaps. If retired, not working or studying, please indicate\') is met by recording the period as a history entry (a fact); the gap stops approval only when it leaves a material fact unresolved (the team\'s SA-1B-15 block is not adopted as written)",', HIST),
    ("s3_data.py", '("History coverage blocks until explained", "SA-1B-15")', '("History coverage: a warning in this edition, not a block", "SA-1B-15")', HIST),
    ("s3_data.py", '"Keep that for advisory warnings; a failed hard check (form-native or official rule, or a wrong-person value) blocks approval until it is fixed and checked again, and cannot be waived."',
     '"Decided for the prototype: approval and submission of the affected form stop only while its required validation fails, a material fact is unresolved or the person a value belongs to is uncertain; these are resolved, never waived. Every other warning keeps the waive permission, with a recorded reason shown to the representative."', D253),
    ("s3_data.py", "Blocked (red): a block-severity check failed, or a fact is missing or in conflict; resolve it and check again, it is never acknowledged.",
     "Blocked (red): the form's required validation failed, a material fact is missing or in conflict, or the person a value belongs to is uncertain; resolve it with a recorded, evidence-based decision and check again; it is never waived or acknowledged.", D253),
    ("s3_data.py", "Warning (amber): a Critical warning, including warn-severity consistency checks; acknowledge it with a reason before approval.",
     "Warning (amber): a Critical warning, including warn-severity consistency checks; a holder of the waive permission passes it with a recorded reason, shown to the representative; a waiver never marks information verified.", D253),
    ("s3_data.py", 'human="Reads each value against its source, including every hand-entered value; acknowledges every Critical warning, flagged and important item (Advisory items are only listed; a Held field cannot be acknowledged); approves or returns.',
     'human="Reads each value against its source, including every hand-entered value; sees every waived Critical warning with its reason; acknowledges every flagged and important item (Advisory items are only listed; a Held field cannot be acknowledged); approves or returns.', D253),
    ("s3_data.py", '"A blocked item prevents approval even when acknowledged; an unacknowledged Warning (Critical) or flagged item also prevents it; Advisory items are listed and do not."),',
     '"A blocked item prevents approval even when acknowledged; a Warning (Critical) not waived with a recorded reason, or an unacknowledged flagged item, also prevents it; Advisory items are listed and do not."),', D253),
    ("s3_data.py", '"One approval per form, with explicit acknowledgement of every Warning (Critical), flagged and important item; Advisory items are listed only; no blocked item may remain",',
     '"One approval per form: every Warning (Critical) has been waived with a recorded reason and is shown to the representative, and every flagged and important item is acknowledged; Advisory items are listed only; no blocked item may remain",', D253),
    ("s3_panels.py", '"The agent resolves every blocked and flagged field and acknowledges each Critical warning,',
     '"The agent resolves every blocked and flagged field and passes each Critical warning only with the waive permission and a recorded reason,', D253),

    # ---- AIW-D264 (20 Oct 2026): condition language is the team's 11 operators (source conflict found in P2 testing)
    ("s3_data.py", '"Rules are written only in the product\'s condition language (equals, in, exists, and, or, not) over canonical fields"',
     '"F|Rules are written only in the product\'s condition language: the team\'s closed set of 11 operators (eq, neq, in, gt, gte, lt, lte, exists, and, or, not) in its structured condition format over canonical fields, each with a plain-language explanation; a calculated input (age from date of birth at the rule\'s reference date, days until a document expires, a count of people) is a named derived field, executable only with a tested helper and otherwise a recorded dependency, never guessed or published as executable"', "AIW-D264 (condition language)"),
]


def main():
    texts = {}
    for f, old, new, why in EDITS:
        if f not in texts:
            texts[f] = open(os.path.join(HERE, f)).read()
        n = texts[f].count(old)
        if n != 1:
            sys.exit(f"STOP: {f}: expected 1 match, found {n}: {old[:90]!r}")
        texts[f] = texts[f].replace(old, new)
    for f, t in texts.items():
        p = os.path.join(HERE, f)
        if os.path.dirname(os.path.realpath(p)) != HERE:
            sys.exit(f"STOP: {p} is not a working-edition source")
        open(p, "w").write(t)
    json.dump([dict(file=f, old=o, new=n, reason=w) for f, o, n, w in EDITS],
              open(os.path.join(HERE, "w1_edits.json"), "w"), indent=1, ensure_ascii=False)
    print(f"applied {len(EDITS)} edits to {len(texts)} files")


if __name__ == "__main__":
    main()
