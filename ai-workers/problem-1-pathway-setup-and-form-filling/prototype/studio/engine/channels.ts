// Filing channels (P-61 §2, F1 challenge point 4): each form line says how it is filed; the combination's filing method
// and each line's signature method are worked out from the lines, never stored, so they cannot contradict them. The
// validator rules for channels and option maps (P-62 §5.3, no AI) run on the snapshot, with everything else in
// engine/validate.ts, at review and release. W1-02 (P-102, P-107 as amended by P-114): Online stays a choice per line, filled by the browser
// extension in a later wave; portals, online versions and screen maps are parked with it.
import { CHANNEL_WORDS, accountSubject, throughAccount, SIGNATURE_FITS, SIGNATURE_WORDS, signatureFits, signatureMisfitWords, type Channel, type Signature } from "../contracts/forms.ts";
import { hasCodes, optionMapProblems, type OptionMap } from "./options.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";
import { compareEditions, pdfMapInUse } from "./programs.ts";
import type { PrismaClient } from "@prisma/client";

type Line = { form_number: string; channel?: string; signature?: string; signed_by?: string; status?: string; condition_plain?: string | null; who?: string; title?: string; form_kind?: string | null; online_only?: boolean };
/** The parts of the snapshot (engine/snapshot.ts) these rules read. */
type MapEntry = { data_path: string; caption?: string | null; outcome: string; fact?: string | null; transform?: string | null; option_map?: OptionMap | null; row?: number | null; list_purpose?: { kind: string; overflow: string } | null };
type FieldMap = { form_number: string; form_edition: string; channel?: string; entries: MapEntry[] };
type FieldDef = { id: string; answer_list?: { key: string; values: { key: string; label: string }[] } };
const mapsOf = (s: Snapshot) => s.field_maps as FieldMap[];

/** C-8 (W1-10 slice 1, P-143): a snapshot line's channel and signature. A release made before the slice says
 *  "SIGNED_PDF_UPLOAD"; it reads as PDF upload, signed by hand and scanned. A missing channel is PDF upload; a missing
 *  signature is the channel's default (Paper: pen; otherwise none). */
export function lineOf(l: { channel?: string | null; signature?: string | null }): { channel: Channel; signature: Signature } {
  if (l.channel === "SIGNED_PDF_UPLOAD") return { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" };
  const channel = (l.channel ?? "PDF_UPLOAD") as Channel;
  return { channel, signature: (l.signature as Signature | undefined) ?? SIGNATURE_FITS[channel][0] };
}
const chOf = (l: Line): Channel => lineOf(l).channel;
/** C-8: what the fingerprint and the release comparison read for a line, so a combination released before the slice
 *  does not show "changed since release": PDF upload signed by hand and scanned keeps the old spelling there. Only the
 *  fingerprint's copy; the snapshot itself says channel and signature. */
export function fingerprintLine<T extends { channel?: string; signature?: string }>(l: T): T {
  const { channel, signature } = lineOf(l);
  if (channel !== "PDF_UPLOAD" || signature !== "HAND_SCANNED") return l;
  const { signature: _s, ...rest } = l; void _s;
  return { ...rest, channel: "SIGNED_PDF_UPLOAD" } as T;
}
export const signatureOf = (s: Signature) => SIGNATURE_WORDS[s];

/** What IRCC accepts for one form edition through one IRCC account (ANY: every account), with its basis and IRCC's line. */
export type AcceptRecord = { account: string; channels: Channel[]; basis: string; quote: string | null; source_url?: string | null };
/** What the Form library records IRCC accepts, per form (its current PDF edition), per account. It is the library's,
 *  not the combination's, so it is read beside the snapshot and never changes its fingerprint. */
export type Accepts = Map<string, AcceptRecord[]>;
/** C-3: the record for the combination's account, else the one for every account; another account's never applies. */
export function acceptedFor(records: AcceptRecord[] | undefined, account: string | null | undefined): AcceptRecord | null {
  return (account ? records?.find((r) => r.account === account) : undefined) ?? records?.find((r) => r.account === "ANY") ?? null;
}
const OFFERED_WITHOUT_RECORD: Channel[] = ["ONLINE", "PDF_UPLOAD", "PAPER"];
/** The basis of the paper-filing rule's record (no IRCC account: paper only), never stored. */
const PAPER_RULE = "PAPER_FILING";
/** The channels a line may take (C-3, C-4): those the record says, Not needed only from the account's own record; no
 *  record: Online, PDF upload and Paper, as Sample. */
export function allowedChannels(records: AcceptRecord[] | undefined, account: string | null | undefined): { channels: Channel[]; record: AcceptRecord | null } {
  const r = acceptedFor(records, account);
  // Break M6: with no account (paper filing) every line is filed on paper; nothing goes Online, as a PDF upload or Not needed.
  if (account === "PAPER") return { channels: (r ? r.channels : OFFERED_WITHOUT_RECORD).filter((c) => c === "PAPER"), record: { account: "PAPER", channels: ["PAPER"], basis: PAPER_RULE, quote: null } };
  if (!r) return { channels: OFFERED_WITHOUT_RECORD, record: null };
  return { channels: r.channels.filter((c) => c !== "NOT_NEEDED" || (r.account !== "ANY" && r.account === account)), record: r };
}
export async function acceptsOf(db: Pick<PrismaClient, "formEdition">, workspaceId: string): Promise<Accepts> {
  const eds = await db.formEdition.findMany({ where: { workspaceId, channel: { not: "ONLINE" } }, select: { editionLabel: true, accepts: true, form: { select: { formKey: true } } } });
  const newest = new Map<string, (typeof eds)[number]>();
  for (const e of eds) { const n = newest.get(e.form.formKey); if (!n || compareEditions(n, e) < 0) newest.set(e.form.formKey, e); }
  return new Map([...newest].filter(([, e]) => e.accepts.length).map(([k, e]) => [k, e.accepts.map((a) => ({ account: a.account, channels: a.channels as Channel[], basis: a.basis, quote: a.quote, source_url: a.sourceUrl }))]));
}
const AS: Record<Channel, string> = { ONLINE: "Online", PDF_UPLOAD: "a PDF upload", PAPER: "on paper", NOT_NEEDED: "Not needed" };
const said = (cs: Channel[]) => cs.map((c) => AS[c]).join(" or ");
/** The words for a line filed in a way IRCC does not accept for its edition and account (on save and at release). */
export const notAcceptedWords = (form: string, channel: Channel, r: AcceptRecord) => r.basis === PAPER_RULE
  ? `${form} is filed as ${CHANNEL_WORDS[channel]}, but this combination has no IRCC account (paper filing): every form is filed on paper. Choose Paper, or set the IRCC account it files through.`
  : `${form} is filed as ${CHANNEL_WORDS[channel]}, but the Form library records that IRCC accepts it ${r.account === "ANY" ? "" : `${throughAccount(r.account)} `}only as ${said(r.channels.filter((c) => c !== "NOT_NEEDED")) || "Not needed"}${r.channels.includes("NOT_NEEDED") ? " (the account asks it itself)" : ""}. Choose a way IRCC accepts.`;
/** C-4: Not needed without the account's own record saying so. */
export const notNeededWords = (form: string, account: string | null | undefined) =>
  `${form} is marked Not needed, but no record says ${account ? accountSubject(account) : "this combination's IRCC account"} asks it itself. Record that in the Form library first (What IRCC accepts, for that account), or choose how it is filed.`;

/** C-7: "Online only", "PDF only", "Paper only", "Online + PDF uploads", …; Not needed lines are left out; a channel
 *  that only conditional lines add is said with its condition ("; plus PDF upload when …"). */
export function filingMethod(lines: Line[]): string {
  const filed = lines.filter((l) => chOf(l) !== "NOT_NEEDED");
  if (!filed.length) return lines.length ? "Nothing to file: the IRCC account asks every form itself" : "No forms yet";
  const always = filed.filter((l) => (l.status ?? "always") === "always");
  const say = (set: Set<Channel>) => {
    if (!set.size) return "";
    const parts = [set.has("ONLINE") ? "Online" : "", set.has("PDF_UPLOAD") ? "PDF uploads" : "", set.has("PAPER") ? "paper forms" : ""].filter(Boolean);
    if (parts.length === 1) return set.has("ONLINE") ? "Online only" : set.has("PDF_UPLOAD") ? "PDF only" : "Paper only";
    return parts.join(" + ").replace(/^paper/, "Paper");
  };
  const base = new Set(always.map(chOf));
  const extra = filed.filter((l) => !base.has(chOf(l)));
  const head = say(base) || "Only conditional forms";
  // "plus PDF upload when the applicant has a representative": the channel's own words, the condition as a clause.
  const clause = (c: string | null | undefined) => { const t = (c ?? "its condition holds").trim().replace(/[.;]+$/, ""); return t.charAt(0).toLowerCase() + t.slice(1); };
  const more = [...new Map(extra.map((l) => [chOf(l), l])).values()].map((l) => `plus ${LOWER[chOf(l)]} when ${clause(l.condition_plain)}`);
  return [head, ...more].join("; ");
}
const LOWER: Record<Channel, string> = { PDF_UPLOAD: "PDF upload", ONLINE: "online", PAPER: "paper", NOT_NEEDED: "nothing" };

/** The filing method in one of C1.6's words, for the Programs row and the page: "PDF only", "Online only", "Paper only"
 *  or "Mixed: …"; checklists and Not needed lines are not filed. The line-by-line detail is filingMethod. */
export function filingKind(lines: (Line & { form_kind?: string | null })[]): string {
  const filed = lines.filter((l) => (l.form_kind ?? "data_form") === "data_form" && chOf(l) !== "NOT_NEEDED");
  if (!filed.length) return lines.length ? "Checklists only" : "No forms yet";
  const n = (c: Channel) => filed.filter((l) => chOf(l) === c).length;
  if (n("ONLINE") === filed.length) return "Online only";
  if (n("PAPER") === filed.length) return "Paper only";
  if (n("PDF_UPLOAD") === filed.length) return "PDF only";
  // Review S1: every channel present is named, Paper included.
  return n("ONLINE") ? (n("PAPER") && n("PDF_UPLOAD") ? "Mixed: online, PDF and paper" : n("PAPER") ? "Mixed: online and paper" : "Mixed: online and PDF") : "Mixed: PDF and paper";
}

/** Channel and option-map problems of one combination's snapshot. */
export function channelProblems(s: Snapshot, accepts?: Accepts): Problem[] {
  const out: Problem[] = [];
  const lists = new Map<string, string[]>((s.canonical_fields as FieldDef[]).flatMap((f) => (f.answer_list ? [[f.id, f.answer_list.values.map((v) => v.key)] as [string, string[]]] : [])));
  // P-107: a line filed Online is allowed (what IRCC accepts is the library's, W1-06); the product cannot fill it until
  // the browser extension returns, so it is said once as a warning, never an error that blocks a release.
  for (const f of s.forms as Line[]) {
    // W1-02 (break M1): every form is read and filled from its PDF (P-102). A form the library holds only as an online
    // version (parked with the extension, on an older database) has nothing to read or fill: release is refused.
    if ((f.form_kind ?? "data_form") === "data_form" && f.online_only) out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} has no PDF edition in the library: forms come in only as their official PDF. Add ${f.form_number}'s PDF from IRCC (Add form), or remove the form from this combination.` });
    if ((f.form_kind ?? "data_form") === "data_form") {
      const { channel, signature } = lineOf(f), account = s.combination.portal ?? null;
      const { channels, record } = allowedChannels(accepts?.get(f.form_number), account);
      if (channel === "NOT_NEEDED" && !channels.includes("NOT_NEEDED")) out.push({ level: "error", where: "Forms", item: f.form_number, message: notNeededWords(f.form_number, account) });
      else if (record && !channels.includes(channel)) out.push({ level: "error", where: "Forms", item: f.form_number, message: notAcceptedWords(f.form_number, channel, record) });
      if (!signatureFits(channel, signature)) out.push({ level: "error", where: "Forms", item: f.form_number, message: signatureMisfitWords(f.form_number, channel, signature) });
      // C3.11: a line signed by hand and scanned needs someone who signs it, or its signed scan is asked of nobody.
      else if (channel === "PDF_UPLOAD" && signature === "HAND_SCANNED" && f.signed_by === "none") out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} is filed as PDF upload, signed by hand and scanned, but "Signed by" says No signature, so nobody is asked for its signed scan. Choose who signs it, or choose another signature.` });
    }
    if (chOf(f) === "ONLINE") out.push({ level: "warning", where: "Forms", item: f.form_number, message: `${f.form_number} is filed Online: it needs the browser extension (later wave), so the product does not fill it yet. File it as a PDF upload to fill its PDF.` });
  }
  const pdfMaps = mapsOf(s).filter((m) => m.channel !== "ONLINE"); // W1-02: an older release's online maps are parked
  for (const m of pdfMaps) for (const e of m.entries) {
    const values = e.outcome === "mapped" && e.fact ? lists.get(e.fact) : undefined;
    // Only a form field with codes of its own needs an option map; a derived or text field writes the value itself.
    if (!values || (!e.option_map && !hasCodes(e.transform))) continue;
    for (const p of optionMapProblems(values, e.option_map)) out.push({ level: "error", where: `Field map ${m.form_edition}`, item: e.data_path, message: `${e.caption ?? e.data_path} (${e.fact}): ${p}.` });
  }
  // B81: a value a person marked not on this form is said once per form: it passes, and a case with that answer is refused.
  const labels = new Map((s.canonical_fields as FieldDef[]).flatMap((f) => (f.answer_list?.values ?? []).map((v) => [`${f.id}|${v.key}`, v.label] as const)));
  for (const m of pdfMaps) {
    const marked = new Map<string, number>();
    for (const e of m.entries) for (const v of e.outcome === "mapped" && e.fact && lists.has(e.fact) ? e.option_map?.notOnForm ?? [] : []) { const k = `${e.fact}|${v}`; marked.set(k, (marked.get(k) ?? 0) + 1); }
    for (const [k, n] of marked) out.push({ level: "warning", where: `Field map ${m.form_edition}`, item: m.form_number, message: `${m.form_number}: "${labels.get(k) ?? k.split("|")[1]}" is marked not on this form on ${n} form field${n === 1 ? "" : "s"}: a case with that answer is refused at filling, in words, and a person decides.` });
  }
  // F1-P (Screen 02 Q3): a list's rows say what the list holds and where extra rows go; until then it is a warning,
  // never an error, so configurations released before F1-P stay releasable.
  for (const m of pdfMaps) {
    const unset = m.entries.filter((e) => e.outcome === "mapped" && e.row != null && !e.list_purpose);
    if (unset.length) out.push({ level: "warning", where: `Field map ${m.form_edition}`, item: m.form_number, message: listRowsWords(m.form_number, unset.length, (unset.find((e) => e.caption?.trim())?.caption ?? "").trim()) }); // the form's own words, never a technical path
  }
  return out;
}

/** S5 early-look fix 2: the list-row warning in business words, saying what it means, what happens meanwhile and where it
 *  is set; the example is left out when the form field has no caption (it was an empty "(for example )" before). */
export function listRowsWords(form: string, n: number, example: string): string {
  const rows = n === 1 ? "1 row of its lists" : `${n} rows of its lists`;
  const short = example.length > 60 ? `${example.slice(0, 57).replace(/\s+\S*$/, "")}…` : example;
  return `${form}: ${rows}${short ? ` (for example "${short}")` : ""} ${n === 1 ? "does" : "do"} not say yet what the list holds or where entries go when the form runs out of rows. It does not stop a release; it is set in the form's field map in the Form library.`;
}

/** The channels view of one combination: every line, its channel, signature, and the derived filing method. */
export function channelsView(s: Snapshot) {
  const lines = (s.forms as Line[]).map((f) => {
    const { channel, signature } = lineOf(f);
    return { form: f.form_number, title: f.title, who: f.who, status: f.status, channel, channel_words: CHANNEL_WORDS[channel], signature_kind: signature, signature: signatureOf(signature), version: pdfMapInUse(mapsOf(s), f.form_number)?.form_edition ?? null }; // P-32: the edition in use
  });
  return { filing_method: filingMethod(s.forms as Line[]), account: s.combination.portal ?? null, lines };
}
