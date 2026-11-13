// "Ready to file" per filing (C7.6, M3-E; M3 case view r5c BR-9, BR-21; L-SA3 under P-315, P-237, P-238; P-144,
// P-151, P-155, P-172): pure rules, no database, no route. What stands between one filing and "Ready to file", and who
// owes it, never a percentage. The case's prepare view (C6.12's GET …/prepare, M3-B) gathers the inputs and shows the
// result; the filing routes (api/src/readiness.ts) refuse "Ready to file" while anything blocks or a warning is open.
//
// P-315 (L-SA3), following SA-01B v2.1 BR-4 (P-237, P-238): the only hard stop is a barcode form failing its own
// Validate. Everything that P-71, P-136, P-151 (1), P-155 and P-168 made a block is now a CRITICAL warning that a
// permitted person passes with a recorded reason (who, when, reason; AG-07 BR-26, AG07-D24 `waive-deficiency`).
// Block (cannot be passed, only fixed):
//   P-144  barcode_not_validated  a barcode form on PDF upload or Paper with no validated copy read back for today's facts
//   P-172  document_never_waivable  a document line its release marks never waivable (M3-S4: any combination's line, e.g.
//                          Express Entry's police certificates and medical exam) not received yet; a Not applicable or
//                          Waived state never lifts it (api/src/case-checklist.ts refuses both on such a line)
// CRITICAL warnings (passed with a reason, or fixed):
//   P-238  missing_facts   a required fact the form reads is not answered or not confirmed
//          fact_problem    a fact the form reads is answered with a problem (an optional one too, QA-122)
//          fields_left_empty  a field IRCC's form marks mandatory that a copy would leave empty and no copy lists by hand
//                          (QA-165, #1318; not on a line filed Online)
//          open_check      a typed value and a document disagree, unresolved (BR-7)
//   P-237  out_of_date     a signed or uploaded item whose facts changed after it (P-136)
//          missing_signature  a required signature not in (P-136; "signed by hand and scanned" needs its scan)
//          edition_expired a form edition or a fee past IRCC's accepted-until date (P-151 (1); before it: "Adopt update")
//          representative_review  the representative's review not done (P-155)
//   B162   no_copy         a form filed as a PDF (PDF upload or Paper, not a barcode form, which waits for its validated
//                          copy instead) with no copy made for filing yet, or only one older than today's facts
// Warnings (passed with a reason, or fixed): missing_document · finding · edition_superseded · copy_stale ·
// entered_out_of_date · hand_write (C7.7, BR-9: a box of a form filed as a PDF that its copy leaves "To write by hand", one
// line per box) · release_update (C9.5 BR-8: a newer release of the combination touches this filing; only filings it
// touches, SA-1B-253 rule 11). An Online section entered before a fact changed warns (P-168, r5c BR-9). Passes (review M3):
// each warning line has a key; a pass records the keys it covered when it was written, so it never covers a line that
// appears later; a CRITICAL line's key names what it is about (the missing facts, the edition, the fee amount), so a
// pass for two missing facts never covers a third. Dates are compared on their first 10 characters (YYYY-MM-DD);
// anything else is refused, never ignored (review M1). Legal points: Unconfirmed: no counsel.
import type { Channel, Signature } from "../../contracts/forms.ts";
import type { Readiness } from "../../contracts/runtime.ts";
export type { Channel, Signature };

/** Who owes a block or warning: the left list groups by these (You · Client · Employer · IRCC; r5c "One left list"). */
export type Owes = "staff" | "representative" | "client" | "employer" | "ircc";

export type BlockCode = "barcode_not_validated" | "document_never_waivable";
/** P-315: the former blocks, now CRITICAL warnings passed with a recorded reason (P-237, P-238). */
export type CriticalCode = "missing_facts" | "fact_problem" | "open_check" | "out_of_date" | "missing_signature" | "edition_expired" | "representative_review" | "fields_left_empty" | "no_copy" | "must_verify" | "hand_filled_copy";
export type WarnCode = CriticalCode | "missing_document" | "finding" | "edition_superseded" | "copy_stale" | "entered_out_of_date" | "hand_write" | "release_update";
export const BLOCK_CODES: readonly BlockCode[] = ["barcode_not_validated", "document_never_waivable"];
export const CRITICAL_CODES: readonly CriticalCode[] = ["missing_facts", "fact_problem", "open_check", "out_of_date", "missing_signature", "edition_expired", "representative_review", "fields_left_empty", "no_copy", "must_verify", "hand_filled_copy"];
export const WARN_CODES: readonly WarnCode[] = [...CRITICAL_CODES, "missing_document", "finding", "edition_superseded", "copy_stale", "entered_out_of_date", "hand_write", "release_update"];
export const isCritical = (code: string): code is CriticalCode => (CRITICAL_CODES as readonly string[]).includes(code);

/** One form item of the filing, for one person. `readiness` is the built per-form P-71 result (engine/runtime/forms.ts);
 *  `owes` names who answers each missing fact (the client for client facts, else staff). */
export type FormItem = {
  item?: string; form: string; subject: string; person: string; channel: Channel;
  readiness: Readiness; owesFact?: Record<string, Owes>;
  /** C7.9 (P-242, SA-1B-261 r7): the facts this form writes that the immigration expert marked "must verify before
   *  filing" whose value was given by the client and no one on staff has checked (engine/runtime/must-verify.ts). `key`
   *  holds each value, so a pass covers only the value it was given for. */
  unverified?: { fact: string; label: string; key: string }[];
  /** A barcode form (IRCC's Validate adds the barcode): IMM 5257, 0008, 1344 … (from the edition). */
  needsValidate: boolean;
  /** A validated copy is read back and still matches today's facts (C-9, C-10). */
  validatedCurrent: boolean;
  signature: Signature; signed: boolean; signers?: string[];
  /** Who signs (contracts/workspace.ts SIGNED_BY): unset means a signature is needed; only "none" means none (S1). */
  signedBy?: string | null;
  /** Who owes a missing signature (default the client; the representative signs IMM 5476's own part). */
  signerOwes?: Owes;
  /** Signed or uploaded, then a fact changed: the fact and when (BR-12). `key` (C9.2, bot review on #926): a fingerprint of
   *  every change and its value now, so a pass covers only the changes it was given for, never a later one. */
  outOfDate?: { fact: string; since: string; key?: string;
    /** C9.5 (BR-6, challenge M4): out of date because the case moved to another release: these words, never a fact. */
    words?: string } | null;
  edition?: { label: string; superseded: boolean; acceptedUntil: string | null } | null;
  /** Online lines: the "Download PDF copy" is older than the facts (P-145); an entered section is out of date (C7.3). */
  copyStale?: boolean; enteredOutOfDate?: string[];
  /** C7.7 (BR-9): the boxes its newest copy leaves "To write by hand" (the copy's own list: the copy, the box, its label,
   *  why). The copy is part of each line's key (review M1), so a pass written for one copy never covers the next. */
  /** B162: its newest copy for filing (any release of the case): none, older than today's facts, or current; `key` is
   *  part of the line's key (the release for none, the copy for stale), so a pass never outlives what it was given for
   *  (breaker M2 on #1344). Left out: no line. */
  copy?: { state: "none" | "stale" | "current"; key: string } | null;
  /** C7.8 (B141 BR-7, F2): a blank official PDF added by the case officer: filled by hand, so it reads no facts and has no
   *  copy made by the product; its completed copy is the one upload (C8.1's signed scan when signed by hand). */
  blank?: { completed: boolean; key: string } | null;
  byHand?: { copy: string; box: string; label: string; why: string;
    /** Breaker M3: the box's own caption on the form ("Visitor", "Yes"), so two boxes of one question read apart. */
    caption?: string | null }[];
};
/** `never_waivable` (M3-S4, P-172): the release's line is never waivable; not received, it blocks whatever `required` says. */
/** `waiting` (M3-S4 break M1, re-review N1): the questions a never waivable line waits for: one that may be needed, or a
 *  needed line that is never waivable only if they call for it; either blocks until received or ruled out. */
export type DocumentItem = { item?: string; label: string; subject: string; person: string; required: boolean; received: boolean; owes?: Owes; never_waivable?: boolean; waiting?: string };
export type OpenCheck = { fact: string; label: string; subject: string; person: string };
export type Finding = { id: string; subject?: string; form?: string; severity: "CRITICAL" | "MAJOR" | "MINOR" | "INFO"; words: string };
export type Fee = { line: string; superseded?: boolean; acceptedUntil: string | null;
  /** The amount shown (e.g. "CAD 100"): part of the line's key, so a pass on one amount never covers the next (review r4 B). */
  amount?: string | null };
/** A warning passed with a reason: `keys` are the warning lines it covered when it was written (passKeys). */
export type Pass = { code: WarnCode; keys: string[]; reason: string; by: string; at: string };

export type FilingInput = {
  filing: string; forms: FormItem[]; documents?: DocumentItem[]; openChecks?: OpenCheck[]; findings?: Finding[]; fees?: Fee[];
  /** The representative's review of this filing (or "Self-reviewed") is recorded (BR-21) by the representative of
   *  record now, for the filing's facts as they are now. */
  reviewed: boolean;
  /** Break B2: a review exists but the facts changed after it (or another person is now the representative): its day. */
  reviewedBefore?: string | null;
  /** Break N2 (#861 round 2): the fingerprint of the filing's facts now; the review line's key carries it, so a pass of
   *  "not reviewed" never covers the filing after its facts change. */
  factsKey?: string;
  /** C9.5 (BR-6): the review was made before the case moved to a release that changes this filing: the words name it. */
  reviewWithdrawn?: string | null;
  /** C8.3 QA-345: the review counts no more because the validated copy filed is not the file its approval stamped. */
  reviewFileUnstamped?: boolean;
  /** C9.5 (BR-8): a newer release of the combination touches this filing: what it touches, and its key (one per release). */
  releaseUpdate?: { words: string; key: string } | null;
  passes?: Pass[];
  /** Today, YYYY-MM-DD (the firm's date; UTC until firms have a time zone). */
  today: string;
};
/** One block or warning: `key` is stable for the same thing (its item, else code, person and form); `unblocks` says
 *  what clearing it allows. */
export type Line<C extends string> = { code: C; key: string; item?: string; subject?: string; owes: Owes; words: string; unblocks: string;
  /** block: never passed · critical: a CRITICAL warning (P-237, P-238) · warning. */
  severity: "block" | "critical" | "warning" };
export type FilingReadiness = {
  filing: string; ready: boolean;
  blocks: Line<BlockCode>[]; warns: Line<WarnCode>[];
  /** Warnings passed with a reason (shown, never counted as open). */
  passed: (Line<WarnCode> & { reason: string; by: string; at: string })[];
  /** Open blocks and warnings per owner, in the left list's order. */
  owes: Partial<Record<Owes, number>>;
};

const ORDER: Owes[] = ["staff", "representative", "client", "employer", "ircc"];
const list = (xs: string[]) => xs.length <= 3 ? xs.join(", ") : `${xs.slice(0, 3).join(", ")} and ${xs.length - 3} more`;
/** YYYY-MM-DD of a date or timestamp; null stays null; anything else is refused (review M1: never fail open). */
export function dayOf(d: string | null | undefined, what: string): string | null {
  if (d === null || d === undefined) return null;
  if (typeof d !== "string") throw new Error(`${what} is not a date string: ${JSON.stringify(d)}`);
  const m = /^(\d{4}-\d{2}-\d{2})(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.exec(d.trim());
  if (!m || Number.isNaN(Date.parse(m[1])) || new Date(`${m[1]}T00:00:00Z`).toISOString().slice(0, 10) !== m[1]) throw new Error(`${what} is not a date: ${JSON.stringify(d)}`);
  return m[1];
}
const UNBLOCKS = "Ready to file and Record", PASS_OR_FIX = "Ready to file, once passed with a reason or fixed";
const ofWho = (f: { form: string; person: string }) => `${f.form} for ${f.person}`;

/** The blocks and warnings of one filing, and whether it may be marked "Ready to file". */
export function filingReadiness(x: FilingInput): FilingReadiness {
  const blocks: Line<BlockCode>[] = [], warns: Line<WarnCode>[] = [];
  // `item` stays the item's own id (the prepare view links the row by it); `part` tells apart several lines of one code
  // on one item (missing facts per owner, each fact with a problem, each entered section), so a pass is never wider.
  type In<C extends string> = Omit<Line<C>, "key" | "unblocks" | "severity"> & { form?: string; part?: string };
  const keyOf = (l: In<string>) => `${l.item ?? `${l.code}|${l.subject ?? ""}|${l.form ?? ""}`}${l.part ? `|${l.part}` : ""}`;
  const block = ({ form, part, ...l }: In<BlockCode>) => blocks.push({ ...l, key: keyOf({ ...l, form, part }), unblocks: UNBLOCKS, severity: "block" });
  const warn = ({ form, part, ...l }: In<WarnCode>) => warns.push({ ...l, key: keyOf({ ...l, form, part }), unblocks: PASS_OR_FIX, severity: isCritical(l.code) ? "critical" : "warning" });
  // P-315 (P-237, P-238): a former block is a CRITICAL warning; its words say so.
  const critical = (l: In<CriticalCode>) => warn({ ...l, words: `CRITICAL: ${l.words}` });
  // Review r4 A: no today means no expiry check, so it is refused, never read as "not expired" (never fail open).
  const today = dayOf(x.today, "today");
  if (today === null) throw new Error("today is required to judge accepted-until dates");
  for (const f of x.forms) {
    if (f.channel === "NOT_NEEDED") continue;   // the portal asks it itself: shown greyed, never a block
    const at = { item: f.item, subject: f.subject, form: f.form };
    // C7.8 (B141 BR-7, F2: one new line, for added blank forms only): a blank official PDF is filled by hand, so no fact,
    // empty box or product copy is asked of it; until its completed copy is uploaded it is a CRITICAL line, passed only
    // with a reason. The upload is also its signed copy when it is signed (one upload, never two: M5), so no second
    // signature line is raised for it.
    if (f.blank) {
      if (!f.blank.completed) critical({ code: "hand_filled_copy", ...at, part: f.blank.key, owes: "staff", words: `${ofWho(f)}: filled by hand: upload the completed copy. It is the blank official PDF the case officer added, so nothing on it is filled from the case.` });
      continue;
    }
    // P-71: missing or unconfirmed facts, by who owes them; a fact with a problem on its own line. An unconfirmed answer
    // already fills the form (P-411, B150 review M1), so the words never say it is blank.
    // QA-165: a mandatory form field a copy would leave empty is its own line (no answer is missing; the form is).
    const missing = missingFirst(f.readiness.missing.filter((m) => m.reason !== "needs a fix" && m.reason !== "left empty on the form")), problems = f.readiness.missing.filter((m) => m.reason === "needs a fix");
    // Devin on #1318: an Online form is typed into IRCC's portal; its PDF is a "Copy, not for filing" (P-145), so the PDF's
    // empty mandatory boxes never stand before Ready to file (its card still names them). Facts and fixes still do.
    // Tech lead on #1318 (P-294): one line per box. A mandatory box the newest copy already lists "To write by hand" is
    // written in Adobe before filing and has its own passable hand_write line (C7.7, BR-9, below), so it is not counted here;
    // a box with no copy yet, or with no writer at all, still is.
    // Review on #1318 (the date Minor): a line covering several form fields (a date's parts) leaves the count only when every
    // one of them is by hand.
    const byHandBox = new Set((f.byHand ?? []).map((b) => b.box));
    const empty = f.channel === "ONLINE" ? [] : f.readiness.missing.filter((m) => m.reason === "left empty on the form" && !(m.boxes ?? [m.fact.replace(/^box:/, "")]).every((b) => byHandBox.has(b)));
    const byOwner = new Map<Owes, string[]>(), factsOf = new Map<Owes, string[]>();
    for (const m of missing) { const o = f.owesFact?.[m.fact] ?? "staff"; byOwner.set(o, [...(byOwner.get(o) ?? []), missingLabel(m)]); factsOf.set(o, [...(factsOf.get(o) ?? []), m.fact]); }
    // The key names the facts (P-315): a pass written for these facts never covers another that goes missing later.
    for (const [owes, labels] of byOwner) critical({ code: "missing_facts", ...at, part: `${owes}|${[...new Set(factsOf.get(owes))].sort().join(",")}`, owes, words: `${ofWho(f)}: ${labels.length} fact${labels.length === 1 ? "" : "s"} missing or not confirmed (${list(labels)}). An answer fills the form as soon as it is given (P-242, P-411); each is confirmed before filing.` });
    // QA-165: a box refused with a fix says the fix in its own words ("…is answered No, but … is recorded").
    for (const m of problems) critical({ code: "fact_problem", ...at, part: m.fact, owes: f.owesFact?.[m.fact] ?? "staff", words: m.why ? `${ofWho(f)}: "${m.label}" is not written: ${m.why.replace(/[.\s]+$/, "")}.` : `${ofWho(f)}: "${m.label}" has a problem, so it would be written wrong. Fix it, then confirm it.` });
    // P-71 (QA-165): "Ready" is never said over a mandatory form field that will be empty. The key names the fields (P-315).
    // Tech lead on #1318 (option 1): its own CRITICAL code, so "missing facts" means facts only; passed with a reason like any
    // readiness line (P-237, P-238), e.g. "written by hand in Adobe before filing".
    if (empty.length) critical({ code: "fields_left_empty", ...at, part: `empty|${empty.map((m) => m.fact).sort().join(",")}`, owes: "staff", words: `${ofWho(f)}: ${empty.length} form field${empty.length === 1 ? "" : "s"} IRCC's form marks mandatory would be left empty (${list(empty.map((m) => m.why ? `${m.label}: ${m.why}` : m.label))}).` });
    // C7.9 (P-242, P-237): a must-verify fact given by the client and checked by no one on staff: CRITICAL, passable with a
    // reason, never a block. The form still fills from the declared value meanwhile (SA-1B-261 r1).
    if (f.unverified?.length) critical({ code: "must_verify", ...at, part: f.unverified.map((u) => u.key).sort().join(","), owes: "staff",
      words: `${ofWho(f)}: ${list(f.unverified.map((u) => `"${u.label}"`))} not verified: the client gave ${f.unverified.length === 1 ? "it" : "them"} and no one on staff has checked ${f.unverified.length === 1 ? "it" : "them"}. Check against the document and confirm, or pass with a reason.` });
    // BR-9 1: out of date, or a required signature missing.
    if (f.outOfDate) critical({ code: "out_of_date", ...at, part: `${f.outOfDate.key ?? f.outOfDate.fact}|${dayOf(f.outOfDate.since, `${f.form}'s out-of-date mark`)}`, owes: "staff", words: f.outOfDate.words ? `${ofWho(f)}: ${f.outOfDate.words}` : `${ofWho(f)} is out of date: "${f.outOfDate.fact}" changed on ${dayOf(f.outOfDate.since, `${f.form}'s out-of-date mark`)} after it was signed or uploaded. Make a new copy.` });
    if (signatureNeeded(f) && !f.signed) {
      const how = f.signature === "HAND_SCANNED" ? "signed by hand and its scan uploaded" : f.signature === "PEN" ? "signed in pen"
        : "signed (how it is signed is not set on the form line yet; until it is, the signature is waited for)";
      // S1 review m3: when the line does not say how it is signed, staff set that first (the client cannot), so staff owe it.
      critical({ code: "missing_signature", ...at, owes: f.signature === "NONE" ? "staff" : f.signerOwes ?? "client", words: `${ofWho(f)} must be ${how}${f.signers?.length ? ` by ${list(f.signers)}` : ""}.` });
    }
    // B162 (the tech lead's answer 3 on #1331): a form filed as a PDF with no copy made for filing has nothing to upload or
    // print yet. A CRITICAL line (P-315: only the barcode form's Validate is a hard stop); a barcode form waits for its
    // validated copy in the block below instead, so it is not asked twice.
    // Breaker M1 on #1344: a copy older than today's facts (made before the answers, or before a fact changed) would file
    // old or empty answers, so it keeps the line too, asking for a new copy.
    // Review m8: an item already "out of date" (signed or uploaded before a fact changed) asks for a new copy itself, so
    // its out-of-date copy raises no second line.
    if ((f.channel === "PDF_UPLOAD" || f.channel === "PAPER") && !f.needsValidate && f.copy && f.copy.state !== "current" && !(f.copy.state === "stale" && f.outOfDate)) {
      const how = f.channel === "PAPER" ? "on Paper" : "a PDF upload";
      critical({ code: "no_copy", ...at, part: `${f.copy.state}|${f.copy.key}`, owes: "staff", words: f.copy.state === "none"
        ? `${ofWho(f)} has no copy made for filing yet (${how}). Generate a copy under Prepare application before Ready to file.`
        : `${ofWho(f)}: its copy for filing is older than today's facts (${how}), so it would be filed with old or missing answers. Generate a new copy under Prepare application before Ready to file.` });
    }
    // BR-9 2 (P-144): IRCC returns a barcode form unprocessed without its Validate.
    if (f.needsValidate && (f.channel === "PDF_UPLOAD" || f.channel === "PAPER") && !f.validatedCurrent)
      block({ code: "barcode_not_validated", ...at, owes: "staff", words: `${ofWho(f)}: no validated copy read back for today's facts. Validate it in Adobe and upload the validated copy; IRCC returns it unprocessed otherwise.` });
    // BR-9 3 (P-151): past the accepted-until date blocks; before it, a superseded edition warns.
    const e = f.edition, until = dayOf(e?.acceptedUntil, `${f.form}'s accepted-until date`);
    if (e && until && today > until) critical({ code: "edition_expired", ...at, part: `${e.label}|${until}`, owes: "staff", words: `${ofWho(f)}: edition ${e.label} was accepted by IRCC until ${until}. Adopt update to the current edition.` });
    else if (e?.superseded) warn({ code: "edition_superseded", ...at, part: e.label, owes: "staff", words: `${ofWho(f)}: edition ${e.label} has a newer edition${until ? `; IRCC accepts it until ${until}` : ""}. Adopt update.` });
    if (f.channel === "ONLINE" && f.copyStale) warn({ code: "copy_stale", ...at, owes: "staff", words: `${ofWho(f)}: the PDF copy is older than today's facts (a copy, not for filing). Download it again.` });
    // One line per entered section (review r2 m2): a pass for one section never covers another that goes out of date later.
    // C7.7 (BR-9, C7.7-18; the tech lead's ruling on #1317): each box a form filed as a PDF leaves "To write by hand" is
    // its own line, in the box's own words, so a pass for one box never covers another found later. An Online line's PDF
    // copy is not for filing, so it raises none.
    // Review M1: the key holds the copy and the box, so a new copy's box needs its own pass. Review m2: the words say the
    // box is still to be written; the reason follows in brackets when there is one.
    if (f.channel === "PDF_UPLOAD" || f.channel === "PAPER") for (const b of f.byHand ?? []) { const why = (b.why ?? "").trim().replace(/[.\s]+$/, ""); warn({ code: "hand_write", ...at, part: `${b.copy}|${b.box}`, owes: "staff", words: `${ofWho(f)}: "${b.label}"${b.caption && b.caption.trim() && b.caption.trim() !== b.label ? ` (the form's box "${b.caption.trim()}")` : ""} is still to be written by hand on the form before filing${why ? ` (${why})` : ""}.` }); }
    if (f.channel === "ONLINE") for (const sec of f.enteredOutOfDate ?? []) warn({ code: "entered_out_of_date", ...at, part: sec, owes: "staff", words: `${ofWho(f)}: "${sec}" was entered in the portal before a fact changed. Enter it again.` });
  }
  for (const c of x.openChecks ?? []) critical({ code: "open_check", subject: c.subject, part: c.fact, owes: "staff", words: `${c.person}: "${c.label}" differs between the answer and the document. Resolve the check.` });
  for (const fee of x.fees ?? []) {
    const until = dayOf(fee.acceptedUntil, `Fee "${fee.line}"'s valid-until date`), at = { item: `fee|${fee.line}`, form: fee.line, part: `${fee.amount ?? ""}|${until ?? ""}` };
    if (until && today > until) critical({ code: "edition_expired", ...at, owes: "staff", words: `Fee "${fee.line}" was valid until ${until}. Adopt the current fee table.` });
    else if (fee.superseded) warn({ code: "edition_superseded", ...at, owes: "staff", words: `Fee "${fee.line}" has a newer amount${until ? `; it is accepted until ${until}` : ""}. Adopt update.` });
  }
  const before = x.reviewed ? null : dayOf(x.reviewedBefore, "the earlier review");
  if (!x.reviewed) critical({ code: "representative_review", part: `${before ?? "none"}|${x.factsKey ?? ""}`, owes: "representative", words: x.reviewWithdrawn && before
    ? `${x.reviewWithdrawn}; this filing was reviewed on ${before}, before the move. The representative of record reviews it again.` : x.reviewFileUnstamped && before
    ? `A validated copy was read back after this filing was reviewed on ${before}, and the review did not stamp it. The representative of record re-approves it (one click on the review).` : before
    ? `The filing changed after it was reviewed on ${before} (or the representative of record changed). The representative of record reviews it again.`
    // B149 (P-342, P-408): any firm staff may pass this with a reason (P-330 (3)), so the words say what happens.
    : "The representative of record has not reviewed this filing. Passing it needs a reason, which is kept in the history." });
  if (x.releaseUpdate) warn({ code: "release_update", item: `release|${x.filing}`, part: x.releaseUpdate.key, owes: "staff", words: x.releaseUpdate.words });
  for (const d of x.documents ?? []) {
    if (d.received) continue;
    // M3-S4 (P-172): a line its release marks never waivable blocks until received; passing it with a reason is refused.
    if (d.never_waivable) block({ code: "document_never_waivable", item: d.item, form: d.label, subject: d.subject, owes: d.waiting && !d.required ? "staff" : d.owes ?? "client",
      words: d.waiting && d.required ? `${d.person}: ${d.label} not received. Its release says it can never be waived if ${d.waiting} calls for it, so Ready to file waits until it is received or that answer rules it out.`
        : d.waiting ? `${d.person}: ${d.label} may be needed: answer ${d.waiting} first. Its release says it can never be waived, so Ready to file waits until that is answered and, if it is needed, until it is received.`
        : `${d.person}: ${d.label} not received. Its release says it can never be waived, so Ready to file waits until it is received.` });
    else if (d.required) warn({ code: "missing_document", item: d.item, form: d.label, subject: d.subject, owes: d.owes ?? "client", words: `${d.person}: ${d.label} not received.` });
  }
  for (const g of x.findings ?? []) warn({ code: "finding", item: `finding|${g.id}`, subject: g.subject, owes: "staff", words: `${g.severity} finding${g.form ? ` on ${g.form}` : ""}: ${g.words}` });

  // A pass covers the warning lines it named when it was written, with a reason (BR-26); a new line needs a new pass.
  const passOf = (w: Line<WarnCode>) => (x.passes ?? []).find((p) => p.code === w.code && p.keys.includes(w.key) && passProblem(p.reason) === null);
  const passed: FilingReadiness["passed"] = [], open: Line<WarnCode>[] = [];
  for (const w of warns) { const p = passOf(w); if (p) passed.push({ ...w, reason: p.reason, by: p.by, at: p.at }); else open.push(w); }
  const owes: FilingReadiness["owes"] = {};
  for (const o of ORDER) { const n = [...blocks, ...open].filter((l) => l.owes === o).length; if (n) owes[o] = n; }
  // By who owes it (You · Representative · Client …); within one owner, CRITICAL warnings first (stable otherwise).
  const rank = (l: { severity: string }) => (l.severity === "warning" ? 1 : 0);
  const sort = <T extends { owes: Owes; severity: string }>(xs: T[]) => [...xs].sort((a, b) => ORDER.indexOf(a.owes) - ORDER.indexOf(b.owes) || rank(a) - rank(b));
  return { filing: x.filing, ready: blocks.length === 0 && open.length === 0, blocks: sort(blocks), warns: sort(open), passed, owes };
}

/** The keys a pass of `code` covers now: the open warning lines of that code (optionally only `key`). The route stores
 *  them with the pass, so a line that appears later is never covered by it. */
export function passKeys(r: FilingReadiness, code: WarnCode, key?: string): string[] {
  return r.warns.filter((w) => w.code === code && (!key || w.key === key)).map((w) => w.key);
}

/** Break m1 on #1246: the answers waiting for the client's re-confirmation first, so a long list's "and N more" never
 *  hides them (stable otherwise). */
export const missingFirst = <T extends { reason: string }>(ms: T[]): T[] => [...ms.filter((m) => m.reason === "waits for the client to re-confirm"), ...ms.filter((m) => m.reason !== "waits for the client to re-confirm")];
/** C6.18 (P-244): a missing fact's words on Ready to file; a background answer staff recorded is named as the client's
 *  to re-confirm. */
export const missingLabel = (m: { label: string; reason: string }) => m.reason === "waits for the client to re-confirm" ? `${m.label}: recorded by staff, the client re-confirms it` : m.label;

/** Why a pass's reason is refused (null: accepted). A written reason of at least 5 characters (as the case team's). */
export function passProblem(reason: unknown): string | null {
  // The same rule as the contract's reason (contracts/runtime.ts `reason`: 5–300 characters, a letter or digit, no
  // control or invisible characters; review r4 m2).
  const t = typeof reason === "string" ? reason.trim() : "";
  // Break B5: only characters a person can see count: format characters (joiners, soft hyphen, tags, U+180E), the
  // combining grapheme joiner, blank Hangul fillers and the braille blank are left out of the count.
  // Break B5 (round 2): combining marks never count on their own (a letter with accents is one character).
  const seen = [...t.replace(/[\p{Cf}\p{M}\u115f\u1160\u3164\uffa0\u2800\s]/gu, "")];
  if (seen.length < 5 || !/[\p{L}\p{N}]/u.test(seen.join(""))) return "Say why this warning is passed (at least 5 characters, with words).";
  if (t.length > 300) return "Keep it to 300 characters.";
  if (/[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069\ufeff]/.test(t)) return "Remove the control or invisible characters from this text.";
  // Break B5 (round 2): no hidden format character inside a reason (word joiner, soft hyphen, tags …); the joiners some
  // scripts need (U+200C, U+200D) stay allowed, as for the case team's reasons.
  if (/\p{Cf}/u.test(t.replace(/[\u200c\u200d]/g, ""))) return "Remove the invisible characters from this text.";
  return null;
}

/** S1 (SA-1B-102 rule 3, AG16-60: "a missing signature rule must default to needs a signature"; "Duplicate beats a
 *  miss"): whether "Ready to file" waits for this line's signature. Only `signedBy: "none"` means no signature; an unset
 *  `signedBy` needs one. A hand or pen signature the line names is always waited for; a typed name is signed as the form
 *  is typed, and an Online line with no method is signed in the portal at submission. The default method `NONE` on a PDF
 *  upload or Paper line means "how it is signed is not set", so the signature is waited for, never assumed absent (prisma/schema/pathways.prisma combination_form
 *  `signature @default(NONE)` stays: no migration). */
export function signatureNeeded(f: Pick<FormItem, "channel" | "signature" | "signedBy">): boolean {
  if (f.signature === "HAND_SCANNED" || f.signature === "PEN") return true; // a signature the line names is always waited for
  if (f.signature !== "NONE") return false;                                   // a typed name is signed as it is typed
  return (f.channel === "PDF_UPLOAD" || f.channel === "PAPER") && f.signedBy !== "none";
}

/** People's words for each code (never the key itself). */
export const CODE_WORDS: Record<BlockCode | WarnCode, string> = {
  missing_facts: "Missing facts", fields_left_empty: "Mandatory form fields left empty", fact_problem: "A fact with a problem", open_check: "An open check", out_of_date: "Out of date",
  missing_signature: "A missing signature", barcode_not_validated: "No validated copy read back", document_never_waivable: "A document that can never be waived", edition_expired: "Past IRCC's accepted-until date",
  representative_review: "The representative's review", must_verify: "A value to verify before filing", missing_document: "A missing document", finding: "A review finding",
  edition_superseded: "A newer edition or fee", copy_stale: "A PDF copy out of date", entered_out_of_date: "A portal section entered before a change",
  hand_write: "A line to write by hand", no_copy: "No current copy made for filing", hand_filled_copy: "Filled by hand: upload the completed copy", release_update: "A newer release",
};

/** Why a code cannot be passed (null: it can): blocks are never passed, only fixed; an unknown code is named. */
export function cannotPass(code: string): string | null {
  if ((BLOCK_CODES as readonly string[]).includes(code)) return `${CODE_WORDS[code as BlockCode]} blocks Ready to file and cannot be passed: fix it instead.`;
  if (!(WARN_CODES as readonly string[]).includes(code)) return "There is no such warning on this filing.";
  return null;
}
