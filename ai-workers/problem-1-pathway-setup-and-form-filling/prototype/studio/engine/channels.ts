// Filing channels (P-61 §2, F1 challenge point 4): each form line says how it is filed; the combination's filing method
// and each line's signature method are worked out from the lines, never stored, so they cannot contradict them. The
// validator rules for channels and option maps (P-62 §5.3, no AI) run on the snapshot, with everything else in
// engine/validate.ts, at review and release. W1-02 (P-102, P-107 as amended by P-114): Online stays a choice per line, filled by the browser
// extension in a later wave; portals, online versions and screen maps are parked with it.
import { CHANNEL_WORDS, SIGNATURE_WORDS, type Channel } from "../contracts/forms.ts";
import { hasCodes, optionMapProblems, type OptionMap } from "./options.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";
import { compareEditions } from "./programs.ts";
import type { PrismaClient } from "@prisma/client";

type Line = { form_number: string; channel?: Channel; signed_by?: string; status?: string; condition_plain?: string | null; who?: string; title?: string; form_kind?: string | null; online_only?: boolean };
/** The parts of the snapshot (engine/snapshot.ts) these rules read. */
type MapEntry = { data_path: string; caption?: string | null; outcome: string; fact?: string | null; transform?: string | null; option_map?: OptionMap | null; row?: number | null; list_purpose?: { kind: string; overflow: string } | null };
type FieldMap = { form_number: string; form_edition: string; channel?: string; entries: MapEntry[] };
type FieldDef = { id: string; answer_list?: { key: string; values: { key: string; label: string }[] } };
const mapsOf = (s: Snapshot) => s.field_maps as FieldMap[];
const chOf = (l: Line): Channel => l.channel ?? "PDF_UPLOAD";
export const signatureOf = (c: Channel) => SIGNATURE_WORDS[c];
/** Lead check L4: the ways a line may be filed, from what the Form library records IRCC accepts for the edition
 *  (PDF · ONLINE · PDF_OR_ONLINE); null when nothing is recorded (every way is offered, as Sample). */
export function acceptedChannels(accepts: string | null | undefined): Channel[] | null {
  if (accepts === "PDF") return ["PDF_UPLOAD", "SIGNED_PDF_UPLOAD"];
  if (accepts === "ONLINE") return ["ONLINE"];
  if (accepts === "PDF_OR_ONLINE") return ["PDF_UPLOAD", "ONLINE", "SIGNED_PDF_UPLOAD"];
  return null;
}
/** What the Form library records IRCC accepts, per form, for its current PDF edition (only forms with a record). It is
 *  the library's, not the combination's, so it is read beside the snapshot and never changes its fingerprint. */
export type Accepts = Map<string, string>;
export async function acceptsOf(db: Pick<PrismaClient, "formEdition">, workspaceId: string): Promise<Accepts> {
  const eds = await db.formEdition.findMany({ where: { workspaceId, channel: { not: "ONLINE" } }, select: { editionLabel: true, acceptedChannels: true, form: { select: { formKey: true } } } });
  const newest = new Map<string, (typeof eds)[number]>();
  for (const e of eds) { const n = newest.get(e.form.formKey); if (!n || compareEditions(n, e) < 0) newest.set(e.form.formKey, e); }
  return new Map([...newest].filter(([, e]) => acceptedChannels(e.acceptedChannels)).map(([k, e]) => [k, e.acceptedChannels!]));
}
const ACCEPTS_SAID: Record<string, string> = { PDF: "a PDF upload", ONLINE: "Online", PDF_OR_ONLINE: "a PDF upload or Online" };
/** The words for a line filed in a way IRCC does not accept for its edition (on save and at release). */
export const notAcceptedWords = (form: string, channel: Channel, accepts: string) => `${form} is filed as ${CHANNEL_WORDS[channel]}, but the Form library records that IRCC accepts it only as ${ACCEPTS_SAID[accepts] ?? accepts}. Choose a way IRCC accepts.`;

/** "Online only", "PDF only", "Online + signed PDF uploads", …; a channel that only conditional lines add is said with
 *  its condition ("; plus PDF upload when …"). */
export function filingMethod(lines: Line[]): string {
  if (!lines.length) return "No forms yet";
  const always = lines.filter((l) => (l.status ?? "always") === "always");
  const say = (set: Set<Channel>) => {
    if (!set.size) return "";
    const online = set.has("ONLINE"), pdf = set.has("PDF_UPLOAD"), signed = set.has("SIGNED_PDF_UPLOAD");
    if (online && !pdf && !signed) return "Online only";
    if (!online) return pdf && signed ? "PDF only (some signed by hand)" : signed ? "Signed PDF uploads only" : "PDF only";
    return `Online + ${[pdf ? "PDF uploads" : "", signed ? "signed PDF uploads" : ""].filter(Boolean).join(" and ")}`;
  };
  const base = new Set(always.map(chOf));
  const extra = lines.filter((l) => !base.has(chOf(l)));
  const head = say(base) || "Only conditional forms";
  // "plus PDF upload when the applicant has a representative": the channel's own words, the condition as a clause.
  const clause = (c: string | null | undefined) => { const t = (c ?? "its condition holds").trim().replace(/[.;]+$/, ""); return t.charAt(0).toLowerCase() + t.slice(1); };
  const more = [...new Map(extra.map((l) => [chOf(l), l])).values()].map((l) => `plus ${LOWER[chOf(l)]} when ${clause(l.condition_plain)}`);
  return [head, ...more].join("; ");
}
const LOWER: Record<Channel, string> = { PDF_UPLOAD: "PDF upload", ONLINE: "online", SIGNED_PDF_UPLOAD: "signed PDF upload" };

/** The filing method in one of C1.6's words, for the Programs row and the page: "PDF only" (PDF and signed PDF
 *  uploads), "Online only" or "Mixed: online and PDF"; checklists are not filed. The line-by-line detail is filingMethod. */
export function filingKind(lines: (Line & { form_kind?: string | null })[]): string {
  const filed = lines.filter((l) => (l.form_kind ?? "data_form") === "data_form");
  if (!filed.length) return lines.length ? "Checklists only" : "No forms yet";
  const online = filed.filter((l) => chOf(l) === "ONLINE").length;
  return !online ? "PDF only" : online === filed.length ? "Online only" : "Mixed: online and PDF";
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
    const said = accepts?.get(f.form_number), ok = (f.form_kind ?? "data_form") === "data_form" ? acceptedChannels(said) : null;
    if (ok && !ok.includes(chOf(f))) out.push({ level: "error", where: "Forms", item: f.form_number, message: notAcceptedWords(f.form_number, chOf(f), said!) });
    // C3.11: a signed upload needs someone who signs it, or its signed scan is asked of nobody.
    if (chOf(f) === "SIGNED_PDF_UPLOAD" && (f.form_kind ?? "data_form") === "data_form" && f.signed_by === "none") out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} is filed as Signed PDF upload but "Signed by" says No signature, so nobody is asked for its signed scan. Choose who signs it, or file it as a PDF upload.` });
    if (chOf(f) === "ONLINE") out.push({ level: "warning", where: "Forms", item: f.form_number, message: `${f.form_number} is filed Online: it needs the browser extension (later wave), so the product does not fill it yet. File it as a PDF upload to fill its PDF.` });
  }
  const pdfMaps = mapsOf(s).filter((m) => m.channel !== "ONLINE"); // W1-02: an older release's online maps are parked
  for (const m of pdfMaps) for (const e of m.entries) {
    const values = e.outcome === "mapped" && e.fact ? lists.get(e.fact) : undefined;
    // Only a form field with codes of its own needs an option map; a derived or text field writes the value itself.
    if (!values || (!e.option_map && !hasCodes(e.transform))) continue;
    for (const p of optionMapProblems(values, e.option_map)) out.push({ level: "error", where: `Field map ${m.form_edition}`, item: e.data_path, message: `${e.caption ?? e.data_path} (${e.fact}): ${p}.` });
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
    const ch = chOf(f);
    const versions = mapsOf(s).filter((m) => m.form_number === f.form_number && m.channel !== "ONLINE");
    return { form: f.form_number, title: f.title, who: f.who, status: f.status, channel: ch, channel_words: CHANNEL_WORDS[ch], signature: signatureOf(ch), version: versions.at(-1)?.form_edition ?? null };
  });
  return { filing_method: filingMethod(s.forms as Line[]), lines };
}
