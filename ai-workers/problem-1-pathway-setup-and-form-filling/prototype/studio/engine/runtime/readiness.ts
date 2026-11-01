// "Ready to file" per filing (C7.6, M3-E; M3 case view r5c BR-9, BR-21; P-71, P-136, P-144, P-151, P-155, P-168):
// pure rules, no database, no route. What stands between one filing and "Ready to file", and who owes it, never a
// percentage. The case's prepare view (C6.12's GET …/prepare, M3-B) gathers the inputs and shows the result; the
// filing routes (C7.6 part 2) refuse "Ready to file" while anything blocks or a warning is not passed.
//
// Blocks (cannot be passed):
//   P-71   missing_facts   a required fact the form reads is not answered or not confirmed (only confirmed facts fill forms)
//          fact_problem    a fact the form reads is answered with a problem (an optional one too, QA-122)
//          open_check      a typed value and a document disagree, unresolved (BR-7)
//   BR-9 1 out_of_date     a signed or uploaded item whose facts changed after it
//          missing_signature  a required signature not in (P-136; "signed by hand and scanned" needs its scan)
//   BR-9 2 barcode_not_validated  a barcode form on PDF upload or Paper with no validated copy read back for today's facts (P-144)
//   BR-9 3 edition_expired a form edition or a fee past IRCC's accepted-until date (P-151; before it: a warning, "Adopt update")
//   BR-9 4 representative_review  the representative's review not done (P-155, BR-21)
// Warns (a permitted person passes each with a written reason, recorded; AG-07 BR-26):
//          missing_document · finding · edition_superseded · copy_stale · entered_out_of_date
// An Online section entered before a fact changed warns (P-168 and r5c BR-9 list it among the warnings; the earlier
// P-136 named entered items among the blocks: the newer decision is followed). Passes (review M3): each warning line
// has a key; a pass records the keys it covered when it was written, so it never covers a line that appears later.
// Dates are compared on their first 10 characters (YYYY-MM-DD); anything else is refused, never ignored (review M1).
// Not here yet: Express Entry's police and medical block (P-172, BR-9 5), other portals' rules. Legal points:
// Unconfirmed: no counsel.
import type { Channel, Signature } from "../../contracts/forms.ts";
import type { Readiness } from "../../contracts/runtime.ts";
export type { Channel, Signature };

/** Who owes a block or warning: the left list groups by these (You · Client · Employer · IRCC; r5c "One left list"). */
export type Owes = "staff" | "representative" | "client" | "employer" | "ircc";

export type BlockCode = "missing_facts" | "fact_problem" | "open_check" | "out_of_date" | "missing_signature" | "barcode_not_validated" | "edition_expired" | "representative_review";
export type WarnCode = "missing_document" | "finding" | "edition_superseded" | "copy_stale" | "entered_out_of_date";
export const BLOCK_CODES: readonly BlockCode[] = ["missing_facts", "fact_problem", "open_check", "out_of_date", "missing_signature", "barcode_not_validated", "edition_expired", "representative_review"];
export const WARN_CODES: readonly WarnCode[] = ["missing_document", "finding", "edition_superseded", "copy_stale", "entered_out_of_date"];

/** One form item of the filing, for one person. `readiness` is the built per-form P-71 result (engine/runtime/forms.ts);
 *  `owes` names who answers each missing fact (the client for client facts, else staff). */
export type FormItem = {
  item?: string; form: string; subject: string; person: string; channel: Channel;
  readiness: Readiness; owesFact?: Record<string, Owes>;
  /** A barcode form (IRCC's Validate adds the barcode): IMM 5257, 0008, 1344 … (from the edition). */
  needsValidate: boolean;
  /** A validated copy is read back and still matches today's facts (C-9, C-10). */
  validatedCurrent: boolean;
  signature: Signature; signed: boolean; signers?: string[];
  /** Who owes a missing signature (default the client; the representative signs IMM 5476's own part). */
  signerOwes?: Owes;
  /** Signed or uploaded, then a fact changed: the fact and when (BR-12). */
  outOfDate?: { fact: string; since: string } | null;
  edition?: { label: string; superseded: boolean; acceptedUntil: string | null } | null;
  /** Online lines: the "Download PDF copy" is older than the facts (P-145); an entered section is out of date (C7.3). */
  copyStale?: boolean; enteredOutOfDate?: string[];
};
export type DocumentItem = { item?: string; label: string; subject: string; person: string; required: boolean; received: boolean; owes?: Owes };
export type OpenCheck = { fact: string; label: string; subject: string; person: string };
export type Finding = { id: string; subject?: string; form?: string; severity: "CRITICAL" | "MAJOR" | "MINOR" | "INFO"; words: string };
export type Fee = { line: string; superseded?: boolean; acceptedUntil: string | null };
/** A warning passed with a reason: `keys` are the warning lines it covered when it was written (passKeys). */
export type Pass = { code: WarnCode; keys: string[]; reason: string; by: string; at: string };

export type FilingInput = {
  filing: string; forms: FormItem[]; documents?: DocumentItem[]; openChecks?: OpenCheck[]; findings?: Finding[]; fees?: Fee[];
  /** The representative's review of this filing (or "Self-reviewed") is recorded (BR-21). */
  reviewed: boolean;
  passes?: Pass[];
  /** Today, YYYY-MM-DD (the firm's date; UTC until firms have a time zone). */
  today: string;
};
/** One block or warning: `key` is stable for the same thing (its item, else code, person and form); `unblocks` says
 *  what clearing it allows. */
export type Line<C extends string> = { code: C; key: string; item?: string; subject?: string; owes: Owes; words: string; unblocks: string };
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
  type In<C extends string> = Omit<Line<C>, "key" | "unblocks"> & { form?: string; part?: string };
  const keyOf = (l: In<string>) => `${l.item ?? `${l.code}|${l.subject ?? ""}|${l.form ?? ""}`}${l.part ? `|${l.part}` : ""}`;
  const block = ({ form, part, ...l }: In<BlockCode>) => blocks.push({ ...l, key: keyOf({ ...l, form, part }), unblocks: UNBLOCKS });
  const warn = ({ form, part, ...l }: In<WarnCode>) => warns.push({ ...l, key: keyOf({ ...l, form, part }), unblocks: PASS_OR_FIX });
  const today = dayOf(x.today, "today")!;
  for (const f of x.forms) {
    if (f.channel === "NOT_NEEDED") continue;   // the portal asks it itself: shown greyed, never a block
    const at = { item: f.item, subject: f.subject, form: f.form };
    // P-71: missing or unconfirmed facts, by who owes them; a fact with a problem on its own line.
    const missing = f.readiness.missing.filter((m) => m.reason !== "needs a fix"), problems = f.readiness.missing.filter((m) => m.reason === "needs a fix");
    const byOwner = new Map<Owes, string[]>();
    for (const m of missing) { const o = f.owesFact?.[m.fact] ?? "staff"; byOwner.set(o, [...(byOwner.get(o) ?? []), m.label]); }
    for (const [owes, labels] of byOwner) block({ code: "missing_facts", ...at, part: owes, owes, words: `${ofWho(f)}: ${labels.length} fact${labels.length === 1 ? "" : "s"} missing or not confirmed (${list(labels)}). Only confirmed facts fill the form.` });
    for (const m of problems) block({ code: "fact_problem", ...at, part: m.fact, owes: f.owesFact?.[m.fact] ?? "staff", words: `${ofWho(f)}: "${m.label}" has a problem, so it would be written wrong. Fix it, then confirm it.` });
    // BR-9 1: out of date, or a required signature missing.
    if (f.outOfDate) block({ code: "out_of_date", ...at, owes: "staff", words: `${ofWho(f)} is out of date: "${f.outOfDate.fact}" changed on ${dayOf(f.outOfDate.since, `${f.form}'s out-of-date mark`)} after it was signed or uploaded. Make a new copy.` });
    if (f.signature !== "NONE" && f.signature !== "TYPED_NAME" && !f.signed) {
      const how = f.signature === "HAND_SCANNED" ? "signed by hand and its scan uploaded" : "signed in pen";
      block({ code: "missing_signature", ...at, owes: f.signerOwes ?? "client", words: `${ofWho(f)} must be ${how}${f.signers?.length ? ` by ${list(f.signers)}` : ""}.` });
    }
    // BR-9 2 (P-144): IRCC returns a barcode form unprocessed without its Validate.
    if (f.needsValidate && (f.channel === "PDF_UPLOAD" || f.channel === "PAPER") && !f.validatedCurrent)
      block({ code: "barcode_not_validated", ...at, owes: "staff", words: `${ofWho(f)}: no validated copy read back for today's facts. Validate it in Adobe and upload the validated copy; IRCC returns it unprocessed otherwise.` });
    // BR-9 3 (P-151): past the accepted-until date blocks; before it, a superseded edition warns.
    const e = f.edition, until = dayOf(e?.acceptedUntil, `${f.form}'s accepted-until date`);
    if (e && until && today > until) block({ code: "edition_expired", ...at, owes: "staff", words: `${ofWho(f)}: edition ${e.label} was accepted by IRCC until ${until}. Adopt update to the current edition.` });
    else if (e?.superseded) warn({ code: "edition_superseded", ...at, owes: "staff", words: `${ofWho(f)}: edition ${e.label} has a newer edition${until ? `; IRCC accepts it until ${until}` : ""}. Adopt update.` });
    if (f.channel === "ONLINE" && f.copyStale) warn({ code: "copy_stale", ...at, owes: "staff", words: `${ofWho(f)}: the PDF copy is older than today's facts (a copy, not for filing). Download it again.` });
    // One line per entered section (review r2 m2): a pass for one section never covers another that goes out of date later.
    if (f.channel === "ONLINE") for (const sec of f.enteredOutOfDate ?? []) warn({ code: "entered_out_of_date", ...at, part: sec, owes: "staff", words: `${ofWho(f)}: "${sec}" was entered in the portal before a fact changed. Enter it again.` });
  }
  for (const c of x.openChecks ?? []) block({ code: "open_check", subject: c.subject, owes: "staff", words: `${c.person}: "${c.label}" differs between the answer and the document. Resolve the check.` });
  for (const fee of x.fees ?? []) {
    const until = dayOf(fee.acceptedUntil, `Fee "${fee.line}"'s valid-until date`), at = { item: `fee|${fee.line}`, form: fee.line };
    if (until && today > until) block({ code: "edition_expired", ...at, owes: "staff", words: `Fee "${fee.line}" was valid until ${until}. Adopt the current fee table.` });
    else if (fee.superseded) warn({ code: "edition_superseded", ...at, owes: "staff", words: `Fee "${fee.line}" has a newer amount${until ? `; it is accepted until ${until}` : ""}. Adopt update.` });
  }
  if (!x.reviewed) block({ code: "representative_review", owes: "representative", words: "The representative of record has not reviewed this filing. Nothing reaches IRCC unreviewed." });
  for (const d of x.documents ?? []) if (d.required && !d.received) warn({ code: "missing_document", item: d.item, form: d.label, subject: d.subject, owes: d.owes ?? "client", words: `${d.person}: ${d.label} not received.` });
  for (const g of x.findings ?? []) warn({ code: "finding", item: `finding|${g.id}`, subject: g.subject, owes: "staff", words: `${g.severity} finding${g.form ? ` on ${g.form}` : ""}: ${g.words}` });

  // A pass covers the warning lines it named when it was written, with a reason (BR-26); a new line needs a new pass.
  const passOf = (w: Line<WarnCode>) => (x.passes ?? []).find((p) => p.code === w.code && p.keys.includes(w.key) && passProblem(p.reason) === null);
  const passed: FilingReadiness["passed"] = [], open: Line<WarnCode>[] = [];
  for (const w of warns) { const p = passOf(w); if (p) passed.push({ ...w, reason: p.reason, by: p.by, at: p.at }); else open.push(w); }
  const owes: FilingReadiness["owes"] = {};
  for (const o of ORDER) { const n = [...blocks, ...open].filter((l) => l.owes === o).length; if (n) owes[o] = n; }
  const sort = <T extends { owes: Owes }>(xs: T[]) => [...xs].sort((a, b) => ORDER.indexOf(a.owes) - ORDER.indexOf(b.owes));
  return { filing: x.filing, ready: blocks.length === 0 && open.length === 0, blocks: sort(blocks), warns: sort(open), passed, owes };
}

/** The keys a pass of `code` covers now: the open warning lines of that code (optionally only `key`). The route stores
 *  them with the pass, so a line that appears later is never covered by it. */
export function passKeys(r: FilingReadiness, code: WarnCode, key?: string): string[] {
  return r.warns.filter((w) => w.code === code && (!key || w.key === key)).map((w) => w.key);
}

/** Why a pass's reason is refused (null: accepted). A written reason of at least 5 characters (as the case team's). */
export function passProblem(reason: unknown): string | null {
  const t = typeof reason === "string" ? reason.trim() : "";
  if (t.length < 5) return "Say why this warning is passed (at least 5 characters).";
  if (t.length > 500) return "Keep the reason under 500 characters.";
  return null;
}

/** People's words for each code (never the key itself). */
export const CODE_WORDS: Record<BlockCode | WarnCode, string> = {
  missing_facts: "Missing facts", fact_problem: "A fact with a problem", open_check: "An open check", out_of_date: "Out of date",
  missing_signature: "A missing signature", barcode_not_validated: "No validated copy read back", edition_expired: "Past IRCC's accepted-until date",
  representative_review: "The representative's review", missing_document: "A missing document", finding: "A review finding",
  edition_superseded: "A newer edition or fee", copy_stale: "A PDF copy out of date", entered_out_of_date: "A portal section entered before a change",
};

/** Why a code cannot be passed (null: it can): blocks are never passed, only fixed; an unknown code is named. */
export function cannotPass(code: string): string | null {
  if ((BLOCK_CODES as readonly string[]).includes(code)) return `${CODE_WORDS[code as BlockCode]} blocks Ready to file and cannot be passed: fix it instead.`;
  if (!(WARN_CODES as readonly string[]).includes(code)) return "There is no such warning on this filing.";
  return null;
}
