// Portal screens one at a time (F2a; plan §5 E-1…E-4; challenge B1, Lead decision Q2). Pure functions, no database.
//  - A screen's identity comes from the page itself (its normalised heading), never from the order it was captured in:
//    a capture made during real work sees only the screens of that client's path (a branch), in that order.
//  - An input is known by its screen and the page's own element id: the same element id on another screen (the
//    applicant's and the spouse's "familyName") is another input, so a mapping is never reused across screens.
//  - One screen's fingerprint and its difference from the approved screen, by element id.
//  - A capture adds to the current version (Q2): the screens it saw are compared and replace theirs; a screen it did not
//    see stays as approved ("not seen this time"); a new screen is added after the screen captured before it.
// The online version's own identity stays the whole record's fingerprint (contracts/portal-capture.ts), which the
// guarded drafting path admits; merging a capture of exactly the approved screens, unchanged, gives the same one.
import { canonical, sha256 } from "../../../contracts/rules.ts";
import { fingerprint, structure, type CaptureInput, type CaptureRecord, type CaptureScreen } from "../../../contracts/portal-capture.ts";
import { difference, type Difference } from "../capture.ts";
import { inputKey, rawId, screenIdentity, screenQualifier } from "../twin.ts";
import RULES from "../../contracts/portal-reader-rules.json" with { type: "json" };

export { inputKey, rawId, screenIdentity };

/** One screen's structure (the record fingerprint's normalisation for that screen) and its checksum. */
export function screenStructure(s: { title: string; inputs: CaptureInput[] }) {
  const one: CaptureRecord = { contract: "portal-capture/v1", portal: "", form: "", title: "", way: "", screens: [{ key: "s01", order: 1, title: s.title, source: { way: "", file: "", sha256: "0".repeat(64) }, inputs: s.inputs.map((i) => ({ ...i, id: rawId(i.id) })) }] };
  return (structure(one) as { screens: unknown[] }).screens[0];
}
export const screenFingerprint = (s: { title: string; inputs: CaptureInput[] }) => sha256(canonical(screenStructure(s) as Parameters<typeof canonical>[0]));

/** Input by input, by element id, between the approved screen and the screen open now. */
export function screenDifference(approved: { title: string; inputs: CaptureInput[] }, live: { title: string; inputs: CaptureInput[] }): Difference[] {
  const rec = (s: { title: string; inputs: CaptureInput[] }): CaptureRecord => ({ contract: "portal-capture/v1", portal: "", form: "", title: "", way: "", screens: [{ key: "s01", order: 1, title: s.title, source: { way: "", file: "", sha256: "0".repeat(64) }, inputs: s.inputs.map((i) => ({ ...i, id: rawId(i.id) })) }] });
  return difference(rec(approved), rec(live)).filter((d) => d.change !== "moved");
}

export type SeenScreen = { title: string; inputs: CaptureInput[]; source: CaptureScreen["source"] };
export type Merge = { record: CaptureRecord; compared: string[]; not_seen: string[]; added: string[]; unchanged: string[] };
/** Q2: the current version with the screens this capture saw. Each seen screen keeps the approved ids of its inputs
 *  (same element id on the same screen); a new input whose element id another screen already uses is qualified by its
 *  own screen ("familyName@your-spouse"), never by what was captured first. Keys and order are renumbered. */
export function mergeCapture(current: CaptureRecord | null, seen: SeenScreen[], meta: { portal: string; form: string; title: string; applicationType?: string | null; way: string }): Merge {
  const base = current?.screens ?? [];
  const byId = new Map(base.map((s) => [screenIdentity(s.title), s]));
  const seenIds = seen.map((s) => screenIdentity(s.title));
  const out: { title: string; source: CaptureScreen["source"]; inputs: CaptureInput[] }[] = base.map((s) => ({ title: s.title, source: s.source, inputs: s.inputs }));
  const compared: string[] = [], added: string[] = [], unchanged: string[] = [];
  let after = -1; // the place of the screen captured just before, in the merged order
  for (const s of seen) {
    const ident = screenIdentity(s.title), old = byId.get(ident);
    const at = old ? out.findIndex((x) => screenIdentity(x.title) === ident) : -1;
    const approvedIds = new Map((old?.inputs ?? []).map((i) => [rawId(i.id), i.id]));
    const taken = () => new Set(out.filter((x) => screenIdentity(x.title) !== ident).flatMap((x) => x.inputs.map((i) => i.id)));
    const t = taken();
    const inputs = s.inputs.map((i, j) => ({ ...i, order: j + 1, id: approvedIds.get(rawId(i.id)) ?? (t.has(rawId(i.id)) ? `${rawId(i.id)}@${screenQualifier(s.title)}` : rawId(i.id)) }));
    if (old) {
      (screenFingerprint(old) === screenFingerprint({ title: s.title, inputs }) ? unchanged : compared).push(old.title);
      out[at] = { title: s.title, source: s.source, inputs }; after = at;
    } else {
      out.splice(after + 1, 0, { title: s.title, source: s.source, inputs }); after += 1; added.push(s.title);
    }
  }
  const record: CaptureRecord = { contract: "portal-capture/v1", portal: meta.portal, form: meta.form, title: meta.title, application_type: meta.applicationType ?? null, way: meta.way,
    screens: out.map((s, n) => ({ key: `s${String(n + 1).padStart(2, "0")}`, order: n + 1, title: s.title, source: s.source, inputs: s.inputs })) };
  return { record, compared, unchanged, added, not_seen: base.filter((s) => !seenIds.includes(screenIdentity(s.title))).map((s) => s.title) };
}

export { fingerprint };

// ─── BR-1 on the server: the extension's screen is checked again with the readers' own rules (never trusted)
const CLIENT = RULES.client_data.map((c) => [new RegExp(c.pattern), c.what] as const);
const LABEL_ANSWER = new RegExp(RULES.label_answer.pattern);
/** A text the readers' client-detail rules would refuse (an email address, a long number, a passport-like code). */
export const looksLikeClientDetail = (t: string) => CLIENT.some(([rx]) => rx.test(t));
/** Stricter, for a live page's element ids (break 26 Oct): a page may build an id from what was typed, so a long run of
 *  digits or a passport-like code anywhere in it (applicant_UCI12345678, dob-1990-05-17) counts, not only standing alone. */
export const idLooksLikeClientDetail = (id: string) => looksLikeClientDetail(id) || /[0-9]{6,}/.test(id.replace(/[\s._:-]/g, "")) || /[A-Z]{1,2}[0-9]{6,9}/.test(id);
/** Why a screen sent by the extension is refused as a whole (an empty list: it holds structure only). */
export function screenProblems(s: { title: string; inputs: CaptureInput[] }): string[] {
  const out: string[] = [];
  const look = (where: string, t: string | null | undefined) => { for (const [rx, what] of CLIENT) if (rx.test(t ?? "")) out.push(`${where} shows ${what}`); };
  look("the screen title", s.title);
  for (const i of s.inputs) {
    for (const t of [i.label, i.group, i.help, ...(i.options ?? []).map((o) => o.label)]) look(`"${i.label}"`, t);
    // Break m8: the element id and the input's format pattern are kept too, so they are checked like its texts.
    look(`the format of "${i.label}"`, (i as { pattern?: string }).pattern);
    if (idLooksLikeClientDetail(i.id)) out.push(`the element id of "${i.label}" looks like a client's detail`);
    if (!["radio", "checkbox", "select"].includes(i.type) && LABEL_ANSWER.test(i.label)) out.push(`"${i.label}": ${RULES.label_answer.what}`);
  }
  const ids = s.inputs.map((i) => i.id), dup = [...new Set(ids.filter((x, n) => ids.indexOf(x) !== n))];
  if (dup.length) out.push(`the element id ${dup.slice(0, 3).join(", ")} appears more than once on the screen`);
  return [...new Set(out)];
}
