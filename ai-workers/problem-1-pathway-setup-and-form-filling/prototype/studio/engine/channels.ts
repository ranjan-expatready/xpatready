// Filing channels (P-61 §2, F1 challenge point 4): each form line says how it is filed; the combination's filing method
// and each line's signature method are worked out from the lines, never stored, so they cannot contradict them. The
// validator rules for channels and option maps (P-62 §5.3, no AI) run on the snapshot, with everything else in
// engine/validate.ts, at review and release.
import { CHANNEL_WORDS, SIGNATURE_WORDS, portalLabel, type Channel } from "../contracts/forms.ts";
import { hasCodes, optionMapProblems, type OptionMap } from "./options.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";

type Line = { form_number: string; channel?: Channel; status?: string; condition_plain?: string | null; who?: string; title?: string; online_versions?: number; online_only?: boolean };
/** The parts of the snapshot (engine/snapshot.ts) these rules read. */
type MapEntry = { data_path: string; caption?: string | null; outcome: string; fact?: string | null; transform?: string | null; option_map?: OptionMap | null };
type FieldMap = { form_number: string; form_edition: string; channel?: string; recheck_by?: string | null; entries: MapEntry[] };
type FieldDef = { id: string; answer_list?: { key: string; values: { key: string; label: string }[] } };
const mapsOf = (s: Snapshot) => s.field_maps as FieldMap[];
const chOf = (l: Line): Channel => l.channel ?? "PDF_UPLOAD";
export const signatureOf = (c: Channel) => SIGNATURE_WORDS[c];

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
  const more = [...new Map(extra.map((l) => [chOf(l), l])).values()].map((l) => `plus ${CHANNEL_WORDS[chOf(l)].toLowerCase()} when ${l.condition_plain ?? "its condition holds"}`);
  return [head, ...more].join("; ");
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Channel and option-map problems of one combination's snapshot. today: the date the re-check dates are measured on. */
export function channelProblems(s: Snapshot, today = new Date()): Problem[] {
  const out: Problem[] = [];
  const portal = (s.combination as { portal?: string | null }).portal ?? null;
  const lists = new Map<string, string[]>((s.canonical_fields as FieldDef[]).flatMap((f) => (f.answer_list ? [[f.id, f.answer_list.values.map((v) => v.key)] as [string, string[]]] : [])));
  for (const f of s.forms as Line[]) {
    const ch = chOf(f);
    // Each line's channel needs a version to file (challenge point 4, review 9): a PDF line needs the form's PDF.
    if (ch !== "ONLINE") { if (f.online_only) out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} is filed as a ${CHANNEL_WORDS[ch].toLowerCase()}, but the library has only its online version: file it Online, or add its PDF edition to the library.` }); continue; }
    if (!portal) { out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} is filed Online, but this combination has no portal yet: choose the portal it is filed through.` }); continue; }
    const online = mapsOf(s).filter((m) => m.form_number === f.form_number && m.channel === "ONLINE");
    if (!online.length) { out.push({ level: "error", where: "Forms", item: f.form_number, message: f.online_versions ? `${f.form_number} is filed Online and has an approved online version from the ${portalLabel(portal)}, but no screen map yet: draft and accept it (no AI).` : `${f.form_number} is filed Online, but the library has no approved online version captured from the ${portalLabel(portal)}: capture its screens, or file it as a PDF upload.` }); continue; }
    const v = online[online.length - 1];
    if (v.recheck_by && v.recheck_by < day(today)) out.push({ level: "error", where: "Forms", item: f.form_number, message: `The online version ${v.form_edition} passed its re-check date (${v.recheck_by}): capture the screens again, or confirm they are unchanged.` });
    const open = v.entries.filter((e) => !["mapped", "not_a_fact", "never_filled"].includes(e.outcome));
    if (open.length) out.push({ level: "error", where: `Field map ${v.form_edition}`, item: f.form_number, message: `${open.length} online input${open.length > 1 ? "s are" : " is"} neither mapped to a shared field nor marked "not a fact" (for example ${open[0].caption ?? open[0].data_path}).` });
    const loose = v.entries.filter((e) => e.outcome === "mapped" && e.fact && /^code_list:portal_choices$/.test(e.transform ?? "")).length;
    if (loose) out.push({ level: "warning", where: `Field map ${v.form_edition}`, item: f.form_number, message: `${loose} choice input${loose > 1 ? "s are" : " is"} not on an answer list yet: filled by matching labels, so a changed label could go unnoticed.` });
  }
  for (const m of mapsOf(s)) for (const e of m.entries) {
    const values = e.outcome === "mapped" && e.fact ? lists.get(e.fact) : undefined;
    // Only a form field with codes of its own needs an option map; a derived or text field writes the value itself.
    if (!values || (!e.option_map && !hasCodes(e.transform))) continue;
    for (const p of optionMapProblems(values, e.option_map)) out.push({ level: "error", where: `Field map ${m.form_edition}`, item: e.data_path, message: `${e.caption ?? e.data_path} (${e.fact}): ${p}.` });
  }
  return out;
}

/** The channels view of one combination: every line, its channel, signature, and the derived filing method. */
export function channelsView(s: Snapshot) {
  const portal = (s.combination as { portal?: string | null }).portal ?? null;
  const lines = (s.forms as Line[]).map((f) => {
    const ch = chOf(f);
    const versions = mapsOf(s).filter((m) => m.form_number === f.form_number && (ch === "ONLINE" ? m.channel === "ONLINE" : m.channel !== "ONLINE"));
    return { form: f.form_number, title: f.title, who: f.who, status: f.status, channel: ch, channel_words: CHANNEL_WORDS[ch], signature: signatureOf(ch), version: versions.at(-1)?.form_edition ?? null };
  });
  return { portal, portal_label: portal ? portalLabel(portal) : null, filing_method: filingMethod(s.forms as Line[]), lines };
}
