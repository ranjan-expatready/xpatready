# Nomenclature: the team's own words (requirement documents and code), applied to the one-pager's prose.
# Draft 3 (17 Oct 2026). Evidence per term: checks/one-pager-nomenclature-2026-10-17.md.
# norm(text) is used once to rewrite s3_data.py and s3_views.py prose, and by s3_ledger.py so that a draft 1 rule whose only
# change is a nomenclature change still counts as kept. Protected phrases keep their own meaning (the SME's sign-off of
# rules, the legal "Unconfirmed: no counsel", the founder's "no manual mapping", copying as a verb).
import re

PROTECT = [
    "Unconfirmed: no counsel", "unconfirmed, no counsel", "no counsel", "re-confirmation", "Re-confirmation", "re-confirmed", "re-confirm",
    "specialist confirms", "specialist can confirm", "specialist has confirmed", "specialist-confirmed", "specialist confirmed",
    "Confirm rules", "Confirms rules", "Confirms rule meaning", "Confirmed rules and gates", "confirmed by the specialist",
    "unconfirmed rule", "An unconfirmed gate", "An unconfirmed or corrected item", "is not confirmed again", "All confirmed?",
    "Triage confirms", "Confirm what it is", "Client A confirms or corrects", "Confirm or correct each dra", "confirmation permission",
    "specialist's confirmation", "the SME confirms", "copy the latest case", "copying the latest case", "No manual mapping", "no manual mapping",
    "Copy replaced", "Waiting copy replaced", "waiting copy is replaced", "copy is replaced", "replaced after adoption", "Replaced after adoption",
    "Release 1",
]

# Ordered: longer, more specific phrases first. (pattern, replacement); patterns are regular expressions on word boundaries.
RULES = [
    # --- people and roles
    (r"Second publisher \(releaser\)", "Second-person approver"), (r"second publisher \(releaser\)", "second-person approver"),
    (r"Second publisher", "Second-person approver"), (r"second publisher", "second-person approver"),
    (r"\bReleaser\b", "Approver"), (r"\breleaser\b", "approver"),
    (r"Immigration specialist", "Immigration SME"), (r"immigration specialist", "Immigration SME"),
    (r"\bthe specialist\b", "the SME"), (r"\bThe specialist\b", "The SME"), (r"\bspecialist\b", "SME"),
    (r"Licensed representative", "Lead representative"), (r"licensed representative", "lead representative"),
    (r"copy owner", "form's applicant"),
    # --- screens and setup objects
    (r"Pathway Configurator", "Content Pack Configurator"),
    (r"combination row", "configurator row"), (r"Combination row", "Configurator row"),
    (r"master \(canonical\) fields", "canonical fields"), (r"master fields", "canonical fields"), (r"master field", "canonical field"),
    (r"master section list", "library's sections"), (r"master library", "library"),
    (r"Configuration library", "Library"), (r"configuration library", "library"),
    (r"pathway tree", "programme hierarchy"),
    (r"form field mappings", "form field maps"), (r"form field mapping", "form field map"), (r"Form field mappings", "Form field maps"),
    (r"mapping sets", "form field maps"), (r"mapping set", "form field map"), (r"mapping entry", "map entry"), (r"mapping entries", "map entries"),
    (r"mapping version", "map version"), (r"mapping's", "map entry's"),
    (r"A value-list miss", "An answer-list miss"), (r"value-list miss", "answer-list miss"), (r"value-list entry", "answer-list entry"), (r"value list", "answer list"),
    (r"check report", "validation report"), (r"Check report", "Validation report"),
    (r"test families", "sample families"), (r"Test families", "Sample families"),
    (r"difference report", "version comparison"), (r"Difference report", "Version comparison"),
    (r"initial validation", "initial review"), (r"Initial validation", "Initial review"),
    # --- publishing (the team: draft → review → approve → publish; pack versions)
    (r"Released combination package", "Published pack version"), (r"released combination package", "published pack version"),
    (r"Released package", "Published pack version"), (r"released package", "published pack version"),
    (r"versioned combination package", "pack version"), (r"combination package", "pack version"),
    (r"Release the versioned package", "Approve and publish the pack version"), (r"Release the package", "Approve and publish"),
    (r"Re-run and release the change", "Re-run and publish the change"), (r"Re-run and release change", "Re-run and publish change"),
    (r"review and release", "review and publish"), (r"Review and release", "Review and publish"),
    (r"a second person releases", "a second person approves and publishes"), (r"A second person releases", "A second person approves and publishes"),
    (r"Package released", "Pack version published"), (r"package released", "pack version published"),
    (r"new released version", "new published version"), (r"New released version", "New published version"),
    (r"released version", "published version"), (r"Released version", "Published version"),
    (r"\bthe release's\b", "the pinned pack version's"), (r"\bthe current release\b", "the current pack version"),
    (r"\bthe release that is current\b", "the pack version that is current"), (r"\bthe released setup\b", "the published setup"),
    (r"release criterion", "acceptance criterion"), (r"Release criterion", "Acceptance criterion"),
    (r"release readiness", "publishing readiness"), (r"Release decision", "Publishing decision"), (r"release decision", "publishing decision"),
    (r"Release waits", "Publishing waits"), (r"release waits", "publishing waits"), (r"release is blocked", "publishing is blocked"),
    (r"before release", "before publishing"), (r"for release", "for publishing"), (r"release authority", "publishing authority"),
    (r"earlier release version", "earlier pack version"), (r"release version", "pack version"), (r"pinned release", "pinned pack version"),
    (r"on the current release", "on the current pack version"), (r"applies the release", "applies the pack version"),
    (r"release and adoption", "publishing and adoption"), (r"a first release", "a first publication"),
    (r"two-person release", "two-person approval and publishing"), (r"release and copy approval", "publication and form approval"),
    (r"checks and release", "checks and publishing"), (r"bypass release", "bypass publishing"),
    (r"\breleased mapping\b", "published map"), (r"\breleased\b", "published"), (r"\bReleased\b", "Published"),
    (r"\breleases\b", "publishes"), (r"\bRelease\b", "Publish"), (r"\brelease\b", "publish"),
    (r"\bthe package\b", "the pack version"), (r"\bThe package\b", "The pack version"),
    (r"submitted package", "submission record"),
    # --- facts: the team's statuses are DECLARED and VERIFIED; a new value supersedes the prior one
    (r"\bunconfirmed\b", "unverified"), (r"\bUnconfirmed\b", "Unverified"),
    (r"\bconfirmed\b", "verified"), (r"\bConfirmed\b", "Verified"), (r"\bconfirms\b", "verifies"), (r"\bConfirms\b", "Verifies"),
    (r"\bconfirming\b", "verifying"), (r"\bConfirming\b", "Verifying"), (r"\bconfirm\b", "verify"), (r"\bConfirm\b", "Verify"),
    (r"fact snapshot", "answer snapshot"), (r"submitted snapshot", "submitted answer snapshot"),
    (r"A replaced value", "A superseded value"), (r"correctly replaced by", "correctly superseded by"),
    (r"not replaced by a later", "not superseded by a later"), (r"replaces the current one", "supersedes the current one"),
    (r"replaces the old one with history", "supersedes the old one, kept as history"), (r"replaces Address 1", "supersedes Address 1"),
    (r"a move that replaces", "a move that supersedes"), (r"never replaces it", "never supersedes it"),
    (r"'to review'", "'needs review'"), (r"'pending review'", "'needs review'"), (r"pending review", "needs review"),
    # --- case, forms and filing
    (r"One copy per form\b", "One instance of each form"), (r"One copy per person", "One form per person"), (r"Employer copies", "Employer forms"),
    (r"Prepare each form copy", "Prepare each form"), (r"each form copy", "each form"), (r"form copies", "forms"), (r"form copy", "form"),
    (r"form-copy", "form"), (r"\bcopies\b", "forms"), (r"\bCopies\b", "Forms"), (r"\bcopy's\b", "form's"), (r"\bcopy\b", "form"), (r"\bCopy\b", "Form"),
    (r"'Needs attention'", "'Fields to check'"), (r"Needs attention", "Fields to check"), (r"needs attention", "fields to check"),
    (r"required document lines", "required checklist items"), (r"required document line", "required checklist item"),
    (r"document lines", "checklist items"), (r"document line", "checklist item"), (r"checklist lines", "checklist items"), (r"checklist line", "checklist item"),
    (r"government messages", "government letters"), (r"Government messages", "Government letters"),
    (r"government message", "government letter"), (r"Government message", "Government letter"),
    (r"agent requests", "tasks"), (r"an agent request", "a task"), (r"agent request", "task"),
    (r"support reports", "support tickets"), (r"Support reports", "Support tickets"), (r"support report", "support ticket"), (r"Support report", "Support ticket"),
    (r"Support inbox", "Support queue"), (r"support inbox", "support queue"), (r"Report to support", "Raise a support ticket"),
    (r"'what changes for this file'", "'what changes for this case'"), (r"what changes for this file", "what changes for this case"),
    (r"Client portal › Sign\b", "Client portal › Signing room"),
]
_COMPILED = [(re.compile(p), r) for p, r in RULES]

def norm(text):
    keep = {}
    for i, ph in enumerate(sorted(PROTECT, key=len, reverse=True)):
        tok = f"\x00{i}\x00"
        if ph in text: keep[tok] = ph; text = text.replace(ph, tok)
    for rx, rep in _COMPILED: text = rx.sub(rep, text)
    for tok, ph in keep.items(): text = text.replace(tok, ph)
    # the protected SME phrases read in the team's words once the role name is normalised
    text = text.replace("specialist", "SME").replace("Immigration SME's confirmation", "Immigration SME's confirmation")
    return text

def rewrite_file(path):
    # rewrite only prose string literals (those with a space); identifiers and keys such as "copy" or "copy.sys" are left alone
    import io, tokenize
    src = open(path).read(); out = []; last = (1, 0); lines = src.splitlines(keepends=True)
    def offset(pos): return sum(len(l) for l in lines[:pos[0] - 1]) + pos[1]
    pieces, prev = [], 0
    for tok in tokenize.generate_tokens(io.StringIO(src).readline):
        if tok.type == tokenize.STRING and " " in tok.string and not tok.string.lstrip("rbuRBUfF").startswith(('"""', "'''")):
            a, b = offset(tok.start), offset(tok.end)
            pieces.append(src[prev:a]); pieces.append(norm(tok.string)); prev = b
    pieces.append(src[prev:])
    new = "".join(pieces)
    open(path, "w").write(new)
    return new != src
