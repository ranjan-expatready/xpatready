// C7.5 part 2 The independent AI review of one filled form (runtime lane, M3-E; r5c BR-19; AG-11-69, -70; P-121, P-164 (2),
// P-71, P-168; stand-in SI-6). Pure: no I/O. What the two AI rounds read and how their answers become findings:
//  - the review sheet: the form edition and, box by box, what the case's copy of it would read today (caption, fact and
//    value), in a fixed order with nothing about when or for which case it was made. So the same form values give the
//    same sheet and the same checksum, which is what a saved run is found by ("replay is keyed on the form edition and its
//    field values, not the PDF checksum");
//  - the rules on each AI finding (AG-11-70, never fabricate): it names a fact on the sheet, quotes words found in that
//    fact's value on the sheet, has a severity of the team's four and a reason; otherwise it is dropped with the reason;
//  - P-121: both rounds raise the same fact with the same severity and the rules pass → High; any other case → Low, with
//    both rounds' reasons (a round that raised nothing says so); no third round, a person decides;
//  - a finding's fingerprint (person, form, fact, quoted words) is how a dismissed finding is not raised again.
import { createHash } from "node:crypto";
import { compareRounds, type RoundAnswer } from "../agreement.ts";

export const REVIEW_SHEET = "review-sheet/v1" as const;
export const SEVERITIES = ["CRITICAL", "MAJOR", "MINOR", "INFO"] as const;
export type Severity = (typeof SEVERITIES)[number];
/** One box of the filled form as the review reads it. */
export type SheetRow = { box: string; caption: string; fact: string | null; value: string };
export type ReviewSheet = { contract: typeof REVIEW_SHEET; form_edition: string; fields: SheetRow[] };
/** A box as the shared renderer gives it (engine/render.ts BoxRow), read loosely. */
export type SheetBox = { box: string; caption?: string | null; fact?: string | null; about?: string | null; coverage?: string; value?: unknown; meaning?: string | null };
/** A box's words: its printed caption without the required mark; when that has no words ("*", "DD"), the fact's meaning
 *  first ("Date of birth (DD)"), so neither the AI nor the person reads a bare mark. */
export function boxWords(b: Pick<SheetBox, "box" | "caption" | "meaning">): string {
  const cap = plain(b.caption ?? "", SHEET_LIMITS.caption).replace(/^\*\s*/, "").trim();
  const meaning = plain(b.meaning ?? "", 200);
  if (/[A-Za-z]{3}/.test(cap.replace(/^(DD|MM|YYYY)$/, ""))) return cap;
  return plain(meaning ? `${meaning}${cap ? ` (${cap})` : ""}` : cap || b.box, SHEET_LIMITS.caption);
}

/** The launcher's own rule for a line sent to the AI (p2/guard.ts LABEL_BAD): no control, format, line or paragraph
 *  separator, no angle bracket of any kind, so nothing in a value can forge a line or close the input it is sent in. */
const BAD = /[\p{C}\p{Zl}\p{Zp}<>＜＞‹›«»〈〉〈〉⟨⟩﹤﹥˂˃ᐸᐳ❮❯⧼⧽]+/gu;
/** Break m (8 Nov): look-alike column bars, read as "|" by a model. */
const BARS = /[|｜│∣ǀ׀‖⏐❘￨]/g;
/** A value that is itself a contact detail (an email address, or a telephone number written with a space, bracket or +). */
export const CONTACT_VALUE = /[^\s@]+@[^\s@]+\.[a-z]{2,}|^(?=.*[\s()+])\+?[\d\s().-]{7,}$/i;
/** One plain line: no BAD character, and no "|" (the column mark of the sheet's lines in the prompt, challenge m1). */
const plain = (t: string, max: number) => Array.from(t.replace(BAD, " ").replace(BARS, "/").replace(/\s+/g, " ").trim()).slice(0, max).join("").trim();
export const SHEET_LIMITS = { rows: 2000, box: 200, caption: 300, value: 500, fact: 120 } as const;
const FACT = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

/** Review M1 (8 Nov): the words of a coded choice. Inventories list choices in two shapes: pairs [[words, code], …]
 *  (IMM 5257's resolved lists, IMM 5707's Yes/No) or two parallel lists [[words…], [codes…]] (IMM 5707's marital
 *  status). A 2 × 2 list reads both ways, so each reading is tried and the one that names this code wins; null when none. */
export function choiceWords(lists: unknown[], code: string): string | null {
  for (const o of lists) {
    if (!Array.isArray(o)) continue;
    const pairs = o.every((x) => Array.isArray(x) && x.length === 2) ? (o as unknown[][]).find((x) => String(x[1]) === code) : undefined;
    if (pairs && String(pairs[0]).trim()) return String(pairs[0]);
    if (o.length === 2 && Array.isArray(o[0]) && Array.isArray(o[1]) && o[0].length === o[1].length) {
      const i = (o[1] as unknown[]).findIndex((x) => String(x) === code);
      if (i >= 0 && String(o[0][i]).trim()) return String(o[0][i]);
    }
  }
  return null;
}

/** A value as the form shows it: text as typed, a list joined, Yes or No for a tick. Empty → null (not on the sheet). */
export function valueWords(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  if (typeof v === "string") return v.trim() ? v : null;
  if (Array.isArray(v)) { const xs = v.map(valueWords).filter((x): x is string => !!x); return xs.length ? xs.join("; ") : null; }
  if (typeof v === "object") { const xs = Object.values(v as Record<string, unknown>).map(valueWords).filter((x): x is string => !!x); return xs.length ? xs.join(", ") : null; }
  return null;
}

/** Contact details are not on the sheet: the Checker cross-checks names, dates of birth, document numbers and dates
 *  (AG-11-69), not how to reach the client, so no email address, telephone or fax number is sent to the AI (fewer
 *  personal data sent; the launcher's screen also refuses the pack's sample email, a made-up family value). */
export const CONTACT_FACT = /(^|[._])(e_?mail|phone|telephone|fax|mobile)([._]|$)/;
/** The review sheet of one form for one person: every box that would be written with a value, never the representative's
 *  (the firm's own record, not the client's answers) and never a contact detail (CONTACT_FACT), sorted by box. `formEdition` is the printed edition,
 *  "IMM 5257 (09-2023)". */
export function reviewSheet(formEdition: string, boxes: readonly SheetBox[]): ReviewSheet {
  const rows = new Map<string, SheetRow>();
  for (const b of boxes) {
    if (!b.box || b.about === "representative" || (b.fact ?? "").startsWith("representative.") || CONTACT_FACT.test(b.fact ?? "")) continue;
    const w = valueWords(b.value);
    if (w === null) continue;
    const value = plain(w, SHEET_LIMITS.value), box = plain(b.box, SHEET_LIMITS.box);
    if (CONTACT_VALUE.test(value) && !/date|_on$|_at$/.test(b.fact ?? "")) continue;
    if (!value || !box || rows.has(box)) continue;
    const fact = b.fact && FACT.test(b.fact) && b.fact.length <= SHEET_LIMITS.fact ? b.fact : null;
    rows.set(box, { box, caption: boxWords(b) || box, fact, value });
  }
  const fields = [...rows.values()].sort((a, b) => (a.box < b.box ? -1 : a.box > b.box ? 1 : 0)).slice(0, SHEET_LIMITS.rows);
  return { contract: REVIEW_SHEET, form_edition: formEdition, fields };
}
/** The sheet as written to its file: one JSON text, so its checksum is the sheet's. */
export const sheetText = (s: ReviewSheet) => `${JSON.stringify(s, null, 1)}\n`;
export const sheetSha256 = (s: ReviewSheet) => createHash("sha256").update(sheetText(s)).digest("hex");

/** One AI round's answer (p2/prompts/form-review-output.v1.schema.json). */
export type AiFinding = { field: string; box: string; severity: Severity; quote: string; reason: string };
export type ReviewAnswer = { form_edition: string; findings: AiFinding[]; unreadable: { box: string; why: string }[] };
const str = (x: unknown) => typeof x === "string";
/** The answer has the output's shape (the launcher checked the schema; a saved answer is checked again before use). */
export function reviewShapeOk(o: unknown): o is ReviewAnswer {
  const a = o as ReviewAnswer;
  return !!a && typeof a === "object" && str(a.form_edition) && Array.isArray(a.findings) && Array.isArray(a.unreadable)
    && a.findings.every((f) => !!f && str(f.field) && str(f.box) && str(f.quote) && str(f.reason) && (SEVERITIES as readonly string[]).includes(f.severity))
    && a.unreadable.every((u) => !!u && str(u.box) && str(u.why));
}

const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
/** AG-11-70: why an AI finding cannot be used, in plain words, or null when the rules pass. */
export function findingRule(sheet: ReviewSheet, f: AiFinding): string | null {
  const rows = sheet.fields.filter((r) => r.fact === f.field);
  if (!rows.length) return `It names "${plain(f.field, 80)}", which is not a fact filled on this form, so it is not used.`;
  const q = norm(f.quote);
  if (q.length < 2) return "It quotes nothing from the form, so it is not used.";
  if (!rows.some((r) => norm(r.value).includes(q))) return `Its quote is not in what the form says for ${rows[0].caption}, so it is not used (never made up, AG-11-70).`;
  if (!plain(f.reason, 600)) return "It gives no reason, so it is not used.";
  return null;
}

/** A finding the two rounds and the rules give for one fact. */
export type ReviewedFinding = { field: string; box: string; caption: string; severity: Severity; quote: string; agreement: "high" | "low"; reasons: string[] };
export type Reviewed = { findings: ReviewedFinding[]; dropped: { field: string; why: string }[]; unreadable: { box: string; why: string; round: string }[] };
const RANK: Record<Severity, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2, INFO: 3 };
export const ROUND_WORDS = { draft: "Round 1", check: "Round 2 (blind checker)" } as const;

/** P-121 on the two rounds of one form: one finding per fact (a round's first finding on a fact counts; any later one on
 *  the same fact is listed as dropped). High when both rounds raise the fact with the same severity and the rules pass for
 *  both; Low otherwise, at the more serious of the two severities. Every finding carries both rounds' reasons (challenge
 *  M7): what each round said, that it raised nothing on the fact, or that its finding failed the rules and why. Low first
 *  (BIC-06: what needs a person's look comes first), then by severity. */
export function findingsFromRounds(sheet: ReviewSheet, draft: ReviewAnswer, check: ReviewAnswer): Reviewed {
  const dropped: Reviewed["dropped"] = [];
  type Tagged = AiFinding & { round: "draft" | "check" };
  const once = (a: ReviewAnswer, round: "draft" | "check"): RoundAnswer<Tagged>[] => {
    const seen = new Set<string>(), out: RoundAnswer<Tagged>[] = [];
    for (const f of a.findings) {
      const field = plain(f.field, SHEET_LIMITS.fact);
      if (seen.has(field)) { dropped.push({ field, why: `${ROUND_WORDS[round]} raised this fact twice: its first finding is kept.` }); continue; }
      seen.add(field);
      out.push({ key: field, reading: f.severity, item: { ...f, field, box: plain(f.box, SHEET_LIMITS.box), quote: plain(f.quote, SHEET_LIMITS.value), reason: plain(f.reason, 600), round } });
    }
    return out;
  };
  const failed = new Map<string, string>();
  const cmp = compareRounds(once(draft, "draft"), once(check, "check"), (a) => { const why = findingRule(sheet, a.item); if (why) failed.set(`${a.key}|${a.item.round}`, why); return why; });
  for (const [k, why] of failed) { const [field, round] = k.split("|"); dropped.push({ field, why: `${ROUND_WORDS[round as "draft" | "check"]}: ${why}` }); }
  const rowOf = (f: AiFinding) => sheet.fields.find((r) => r.fact === f.field && norm(r.value).includes(norm(f.quote))) ?? sheet.fields.find((r) => r.fact === f.field)!;
  const said = (x: AiFinding | null, round: "draft" | "check", field: string) => x ? `${ROUND_WORDS[round]}: ${x.severity} · ${x.reason}`
    : failed.has(`${field}|${round}`) ? `${ROUND_WORDS[round]}: its finding on this fact failed the rules (${failed.get(`${field}|${round}`)!.replace(/\.$/, "")}).`
    : `${ROUND_WORDS[round]}: raised nothing on this fact.`;
  const out: ReviewedFinding[] = [];
  for (const a of cmp.agreed) {
    const other = check.findings.find((x) => plain(x.field, SHEET_LIMITS.fact) === a.key) ?? null;
    const r = rowOf(a.item);
    out.push({ field: a.item.field, box: r.box, caption: r.caption, severity: a.item.severity, quote: a.item.quote, agreement: "high", reasons: [said(a.item, "draft", a.key), said(other && { ...other, reason: plain(other.reason, 600) }, "check", a.key)] });
  }
  for (const d of cmp.decide) {
    const first = (d.draft ?? d.check)!, r = rowOf(first);
    const sev = [d.draft, d.check].filter((x): x is Tagged => !!x).map((x) => x.severity).sort((x, y) => RANK[x] - RANK[y])[0];
    out.push({ field: first.field, box: r.box, caption: r.caption, severity: sev, quote: first.quote, agreement: "low", reasons: [said(d.draft, "draft", d.key), said(d.check, "check", d.key)] });
  }
  out.sort((a, b) => Number(a.agreement === "high") - Number(b.agreement === "high") || RANK[a.severity] - RANK[b.severity] || (a.box < b.box ? -1 : a.box > b.box ? 1 : 0));
  const unreadable = ([["draft", draft], ["check", check]] as const).flatMap(([round, a]) => a.unreadable.map((u) => ({ box: plain(u.box, SHEET_LIMITS.box), why: plain(u.why, 300), round: ROUND_WORDS[round] })));
  return { findings: out, dropped, unreadable };
}

/** How one AI finding is known again on a later run: the person, the form, the fact and the words it quotes. */
export const aiFingerprint = (subject: string, form: string, field: string, quote: string) =>
  createHash("sha256").update(`ai|${subject}|${form}|${field}|${norm(quote)}`).digest("hex");
/** Whether an AI finding still holds on the sheet of today: its quoted words are still in its fact's value. */
export const stillQuoted = (sheet: ReviewSheet, field: string | null, quote: string) =>
  !!field && sheet.fields.some((r) => r.fact === field && norm(r.value).includes(norm(quote)));
