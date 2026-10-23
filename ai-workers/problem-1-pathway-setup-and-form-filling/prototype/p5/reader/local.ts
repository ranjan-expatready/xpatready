// Local reader: Tesseract 5.5.0 OCR (English data) or a PDF's own text layer, plus deterministic rules. No network,
// no AI. Output follows the same contract as the AI reader (prompts/reader-output.v1.schema.json), so one scorer
// and one case engine read both. Every value is a proposal; staff confirm (D182).
//   Passport: the TD3 machine-readable zone is read in its own pass (MRZ alphabet only), at small rotations, and
//   accepted only when every check digit passes (mrz.ts); printed (visual-zone) values are read by their labels
//   and compared with the zone: a disagreement is reported, never settled by the reader.
//   Letters and certificates: values are read by label from a per-type label list (rules, not templates per file).
// Reads only the synthetic documents it is given (AIW-D270); never the answer key.
//   node p5/reader/local.ts <document file> <claimed kind>
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findTd3, type Td3 } from "./mrz.ts";

const TESSERACT = "/opt/homebrew/bin/tesseract", SIPS = "/usr/bin/sips", PDFTOTEXT = "/opt/homebrew/bin/pdftotext", PDFTOPPM = "/opt/homebrew/bin/pdftoppm";
const MRZ_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
export const LOCAL_READER = { name: "local OCR/MRZ + rules", tesseract: "5.5.0 (eng)", version: "local-reader/v1" };

type Word = { text: string; conf: number; left: number; top: number; width: number; height: number; line: string };
type Line = { text: string; conf: number; box: [number, number, number, number] };
export type Field = { fact: string; about: string; status: "proposed" | "unresolved"; value: string | null; as_printed: string | null; page: number; where: string; confidence: "high" | "medium" | "low"; reason: string | null; box?: [number, number, number, number] | null; method?: string };
export type ReaderOutput = { document: { kind_seen: string; matches_claimed_kind: boolean; readable: "yes" | "partly" | "no"; issues: string[]; issued_or_written_on?: string | null }; people_seen: { role: string; name_as_printed: string }[]; fields: Field[]; internal_conflicts: { fact: string; values: string[]; where: string }[] };

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

/** Tesseract TSV: words with confidence and boxes, grouped into lines. */
function ocrLines(image: string, extra: string[] = []): Line[] {
  const tsv = run(TESSERACT, [image, "stdout", ...extra, "tsv"]);
  const words: Word[] = [];
  for (const row of tsv.split("\n").slice(1)) {
    const c = row.split("\t");
    if (c.length < 12 || !c[11]?.trim()) continue;
    words.push({ text: c[11].trim(), conf: Number(c[10]), left: +c[6], top: +c[7], width: +c[8], height: +c[9], line: `${c[2]}.${c[3]}.${c[4]}` });
  }
  const by = new Map<string, Word[]>();
  for (const w of words) by.set(w.line, [...(by.get(w.line) ?? []), w]);
  return [...by.values()].map((ws) => ({
    text: ws.map((w) => w.text).join(" "),
    conf: Math.round(ws.reduce((a, w) => a + w.conf, 0) / ws.length),
    box: [Math.min(...ws.map((w) => w.left)), Math.min(...ws.map((w) => w.top)), Math.max(...ws.map((w) => w.left + w.width)), Math.max(...ws.map((w) => w.top + w.height))] as [number, number, number, number],
  })).sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]);
}

const MON: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  JANUARY: "01", FEBRUARY: "02", MARCH: "03", APRIL: "04", JUNE: "06", JULY: "07", AUGUST: "08", SEPTEMBER: "09", OCTOBER: "10", NOVEMBER: "11", DECEMBER: "12" };
/** A printed date to YYYY-MM-DD: "12 APR 1990", "January 4, 2027", "2027-01-04". Anything else is not a date. */
export function isoFromPrinted(s: string): string | null {
  const t = s.toUpperCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
  let m = /^(\d{1,2}) ([A-Z]+) (\d{4})$/.exec(t);
  if (m && MON[m[2]]) return `${m[3]}-${MON[m[2]]}-${m[1].padStart(2, "0")}`;
  m = /^([A-Z]+) (\d{1,2}) (\d{4})$/.exec(t);
  if (m && MON[m[1]]) return `${m[3]}-${MON[m[1]]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  return m ? t : null;
}

const field = (fact: string, about: string, value: string | null, o: Partial<Field> = {}): Field => ({
  fact, about, status: value ? "proposed" : "unresolved", value, as_printed: o.as_printed ?? value, page: 1, where: o.where ?? "", confidence: o.confidence ?? (value ? "medium" : "low"), reason: value ? null : (o.reason ?? "not found by the label rules"), box: o.box ?? null, method: o.method,
});

/** The value printed under or after a label: the next line below the label's box, in the label's column. */
function underLabel(lines: Line[], label: RegExp): { text: string; line: Line } | null {
  const i = lines.findIndex((l) => label.test(l.text));
  if (i < 0) return null;
  const lab = lines[i];
  // Same line, after the label ("Position  Software engineer"; a table row read as one line).
  const after = lab.text.replace(label, "").trim();
  if (after.length >= 1 && !/^[A-Z ()./]+$/.test(after.replace(/[^A-Z ()./]/g, "")) === false && after.length > 1) return { text: after, line: lab };
  const below = lines.filter((l, j) => j !== i && l.box[1] > lab.box[1] && l.box[1] - lab.box[3] < 3 * (lab.box[3] - lab.box[1] + 4) && l.box[0] < lab.box[2] && l.box[2] > lab.box[0]);
  return below.length ? { text: below[0].text, line: below[0] } : null;
}

// ---------------------------------------------------------------- passport
function readPassport(image: string): ReaderOutput {
  const issues: string[] = [];
  const lines = ocrLines(image, ["--psm", "3"]);
  // MRZ pass at small rotations (a phone photo is rarely square); accepted only when every check digit passes.
  let mrz: { l1: string; l2: string; parsed: Td3; rotation: number } | null = null;
  const tmp = mkdtempSync(join(tmpdir(), "reader-"));
  try {
    for (const rot of [0, 357, 3, 355, 5]) {
      let img = image;
      if (rot) { img = join(tmp, `r${rot}.png`); run(SIPS, ["-s", "format", "png", "-r", String(rot), image, "--out", img]); }
      const out = run(TESSERACT, [img, "stdout", "--psm", "6", "-c", `tessedit_char_whitelist=${MRZ_ALPHABET}`, "-c", "load_system_dawg=0", "-c", "load_freq_dawg=0"]);
      const found = findTd3(out.split("\n"));
      if (found && found.parsed.all_checks_pass) { mrz = { ...found, rotation: rot ? rot - 360 * Number(rot > 180) : 0 }; break; }
      if (found && !mrz) issues.push(`machine-readable zone read at rotation ${rot > 180 ? rot - 360 : rot}° but its check digits fail`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const text = lines.map((l) => l.text).join("\n");
  const isPassport = /PASSPORT/i.test(text) || !!mrz;
  if (!lines.length || (!mrz && lines.reduce((a, l) => a + l.text.length, 0) < 40)) {
    return { document: { kind_seen: "cannot_tell", matches_claimed_kind: false, readable: "no", issues: ["no legible text found"] }, people_seen: [], fields: [], internal_conflicts: [] };
  }
  const viz = (re: RegExp) => underLabel(lines, re);
  const vDob = viz(/DATE OF BIRTH/i), vIssue = viz(/DATE OF ISSUE/i), vExp = viz(/DATE OF EXPIRY/i), vPob = viz(/PLACE OF BIRTH/i), vNum = viz(/PASSPORT NO/i), vSur = viz(/SURNAME/i), vGiv = viz(/GIVEN NAME/i), vSex = viz(/^SEX\b/i), vNat = viz(/NATIONALITY/i);
  const tok = (v: { text: string } | null, re: RegExp) => (v ? (re.exec(v.text.toUpperCase()) ?? [])[0] ?? null : null);
  const dateTok = (v: { text: string } | null) => { const t = tok(v, /\d{1,2} [A-Z]{3} \d{4}/); return t ? { iso: isoFromPrinted(t), t } : null; };
  const fields: Field[] = [], conflicts: ReaderOutput["internal_conflicts"] = [];
  const at = (v: { line: Line } | null) => (v ? { box: v.line.box, where: `page 1, printed zone, line at y=${v.line.box[1]}` } : {});
  const MRZW = "page 1, machine-readable zone (bottom two lines)";
  // Classic OCR confusions (Z/2, O/0, S/5, B/8, I/1, G/6): a printed reading that differs from a check-digit-valid zone
  // only by these is OCR noise on the printed zone, not a document that disagrees with itself (found on D1: "21234567").
  const CONF: Record<string, string> = { Z: "2", O: "0", S: "5", B: "8", I: "1", G: "6", D: "0", Q: "0" };
  const fold = (s: string) => s.toUpperCase().replace(/[A-Z]/g, (c) => CONF[c] ?? c);
  const both = (fact: string, mrzVal: string | null, vizVal: string | null, vizAt: { line: Line } | null, printed: string | null) => {
    if (mrzVal && vizVal && mrzVal !== vizVal && fold(mrzVal) === fold(vizVal)) vizVal = mrzVal;
    if (mrzVal && vizVal && mrzVal !== vizVal) {
      conflicts.push({ fact, values: [`printed: ${printed ?? vizVal}`, `machine-readable zone: ${mrzVal}`], where: "page 1" });
      fields.push(field(fact, "document holder", null, { reason: `the printed value (${printed ?? vizVal}) and the machine-readable zone (${mrzVal}) disagree; a person decides`, ...at(vizAt), method: "MRZ check digits + printed label" }));
    } else if (mrzVal) fields.push(field(fact, "document holder", mrzVal, { confidence: vizVal ? "high" : "medium", where: MRZW, as_printed: printed ?? mrzVal, method: vizVal ? "MRZ check digits, agrees with printed zone" : "MRZ check digits" }));
    else if (vizVal) fields.push(field(fact, "document holder", vizVal, { confidence: "low", as_printed: printed, ...at(vizAt), method: "printed label only (no valid machine-readable zone)" }));
    else fields.push(field(fact, "document holder", null, { reason: "not legible to the local reader" }));
  };
  const m = mrz?.parsed;
  const dob = dateTok(vDob), exp = dateTok(vExp), iss = dateTok(vIssue);
  both("person.family_name", m?.surname ?? null, tok(vSur, /[A-Z][A-Z' -]+/)?.trim() ?? null, vSur, tok(vSur, /[A-Z][A-Z' -]+/)?.trim() ?? null);
  both("person.given_names", m?.given ?? null, tok(vGiv, /[A-Z][A-Z' -]+$/)?.trim() ?? null, vGiv, null);
  both("person.sex", m?.sex ?? null, tok(vSex, /\b[FMX]\b/), vSex, null);
  both("person.date_of_birth", m?.dob ?? null, dob?.iso ?? null, vDob, dob?.t ?? null);
  both("person.passport_number", m?.number ?? null, tok(vNum, /[A-Z0-9]{6,9}/), vNum, null);
  both("person.passport_expiry_date", m?.expiry ?? null, exp?.iso ?? null, vExp, exp?.t ?? null);
  both("person.citizenship", m?.nationality ?? null, null, vNat, tok(vNat, /[A-Z]+/));
  both("person.passport_country_of_issue", m?.issuing_state ?? null, null, null, null);
  const pob = tok(vPob, /[A-Z][A-Z .'-]+/)?.trim() ?? null;
  fields.push(field("person.place_of_birth_city", "document holder", pob, { confidence: pob ? "medium" : "low", as_printed: pob, ...at(vPob), method: "printed label (no machine-readable equivalent)" }));
  fields.push(field("person.passport_issue_date", "document holder", iss?.iso ?? null, { confidence: iss ? "medium" : "low", as_printed: iss?.t ?? null, ...at(vIssue), method: "printed label (no machine-readable equivalent)" }));
  if (!mrz) issues.push("no machine-readable zone with valid check digits");
  const name = m ? `${m.given} ${m.surname}` : [tok(vGiv, /[A-Z][A-Z' -]+$/), tok(vSur, /[A-Z][A-Z' -]+/)].filter(Boolean).join(" ");
  return {
    document: { kind_seen: isPassport ? "passport" : "other", matches_claimed_kind: isPassport, readable: mrz ? "yes" : "partly", issues, issued_or_written_on: iss?.iso ?? null },
    people_seen: name ? [{ role: "document holder", name_as_printed: name }] : [], fields: isPassport ? fields : [], internal_conflicts: conflicts,
  };
}

// ---------------------------------------------------------------- letters and certificates (label rules)
const LABELS: Record<string, { fact: string; about: string; labels: RegExp[]; kind: "text" | "date" | "address" }[]> = {
  job_offer: [
    { fact: "person.intended_job_title", about: "employee the offer is addressed to", labels: [/^(Position|Job title|Title of position)\b/i], kind: "text" },
    { fact: "person.intended_job_duties", about: "employee the offer is addressed to", labels: [/^(Main duties|Duties|Responsibilities)\b/i], kind: "text" },
    { fact: "person.intended_work_location", about: "employee the offer is addressed to", labels: [/^(Work location|Location of work|Place of work)\b/i], kind: "address" },
    { fact: "person.intended_employment_start_date", about: "employee the offer is addressed to", labels: [/^(Start date|Commencement date)\b/i], kind: "date" },
    { fact: "person.intended_employment_end_date", about: "employee the offer is addressed to", labels: [/^(End date|Completion date)\b/i], kind: "date" },
    { fact: "person.lmia_or_offer_number", about: "employee the offer is addressed to", labels: [/^(LMIA number|Offer of employment number|Offer number)\b/i], kind: "text" },
  ],
  birth_certificate: [
    { fact: "person.date_of_birth", about: "the child whose birth is recorded", labels: [/^Date of birth\b/i], kind: "date" },
    { fact: "person.sex", about: "the child whose birth is recorded", labels: [/^Sex\b/i], kind: "text" },
    { fact: "mother.full_name", about: "mother", labels: [/^Name of mother\b/i], kind: "text" },
    { fact: "father.full_name", about: "father", labels: [/^Name of father\b/i], kind: "text" },
  ],
};

function textLines(file: string, claimed: string, forceOcr = false): { lines: Line[]; source: string } {
  if (file.endsWith(".pdf")) {
    const t = run(PDFTOTEXT, ["-layout", file, "-"]);
    if (!forceOcr && t.replace(/\s/g, "").length > 50) return { lines: t.split("\n").filter((l) => l.trim()).map((l, i) => ({ text: l.trim().replace(/\s{2,}/g, "  "), conf: 100, box: [0, i, 0, i] })), source: "PDF text layer" };
    const tmp = mkdtempSync(join(tmpdir(), "reader-"));
    run(PDFTOPPM, ["-r", "300", "-png", "-f", "1", "-l", "1", file, join(tmp, "p")]);
    const lines = ocrLines(join(tmp, "p-1.png"), ["--psm", "4"]);
    rmSync(tmp, { recursive: true, force: true });
    return { lines, source: "Tesseract on the rendered page" };
  }
  return { lines: ocrLines(file, ["--psm", claimed === "passport" ? "3" : "4"]), source: "Tesseract" };
}

function readByLabels(file: string, claimed: string): ReaderOutput {
  const first = readByLabelsFrom(file, claimed, false);
  // A PDF's text layer can interleave other text (a watermark) into the values (found on D3/D8): fields the text layer
  // leaves unresolved are read again from the rendered page by OCR, and say so.
  if (!file.endsWith(".pdf") || !first.fields.some((f) => f.status === "unresolved")) return first;
  const ocr = readByLabelsFrom(file, claimed, true);
  first.fields = first.fields.map((f) => { if (f.status !== "unresolved") return f; const o = ocr.fields.find((x) => x.fact === f.fact); return o && o.status === "proposed" ? { ...o, confidence: "medium", method: `${o.method} (text layer unreadable here)` } : f; });
  return first;
}

function readByLabelsFrom(file: string, claimed: string, forceOcr: boolean): ReaderOutput {
  const { lines, source } = textLines(file, claimed, forceOcr);
  const text = lines.map((l) => l.text).join("\n");
  const kind = /CERTIFICATE OF BIRTH|BIRTH CERTIFICATE/i.test(text) ? "birth_certificate" : /offer of employment|pleased to offer/i.test(text) ? "job_offer" : /PASSPORT/i.test(text) ? "passport" : text.trim() ? "other" : "cannot_tell";
  const out: ReaderOutput = { document: { kind_seen: kind, matches_claimed_kind: kind === claimed, readable: text.trim() ? "yes" : "no", issues: [] }, people_seen: [], fields: [], internal_conflicts: [] };
  if (claimed === "unknown" && LABELS[kind]) claimed = kind;
  out.document.matches_claimed_kind = kind === claimed;
  if (kind !== claimed) { out.document.issues.push(`looks like ${kind}, not ${claimed}`); return out; }
  const written = lines.map((l) => isoFromPrinted(l.text)).find(Boolean) ?? null;
  out.document.issued_or_written_on = kind === "job_offer" ? written : null;
  for (const spec of LABELS[claimed] ?? []) {
    let hit: { text: string; line: Line } | null = null;
    for (const l of lines) { const re = spec.labels.find((r) => r.test(l.text)); if (re) { const rest = l.text.replace(re, "").trim(); if (rest) { hit = { text: rest, line: l }; break; } } }
    if (!hit) for (const re of spec.labels) { hit = underLabel(lines, re); if (hit) break; }
    let v = hit?.text.replace(/\s{2,}.*$/, "").trim() ?? null;
    if (v && spec.kind === "date") v = isoFromPrinted(v);
    out.fields.push(field(spec.fact, spec.about, v || null, { confidence: v ? (source === "PDF text layer" ? "high" : "medium") : "low", as_printed: hit?.text ?? null, where: hit ? `page 1, ${source}, row "${hit.line.text.slice(0, 40)}"` : "", box: hit && source !== "PDF text layer" ? hit.line.box : null, method: `${source} + label rule` }));
  }
  if (claimed === "job_offer") {
    const head = lines[0]?.text.split(/\s{2,}/)[0] ?? null;
    const m = /position with (.+?)(,| subject)/i.exec(text.replace(/\n/g, " "));
    const org = (m?.[1] ?? head)?.trim() ?? null;
    out.fields.push(field("organisation.name", "employer making the offer", org, { confidence: m ? "medium" : "low", where: "page 1, letterhead / offer sentence", method: `${source} + offer sentence rule` }));
    const loc = out.fields.find((f) => f.fact === "person.intended_work_location")?.value ?? "";
    const prov = /,\s*(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/.exec(loc)?.[1] ?? null;
    out.fields.push(field("person.intended_work_province", "employee the offer is addressed to", prov, { confidence: prov ? "medium" : "low", where: "derived from the work location", method: "rule on the work location" }));
    const dateIdx = lines.findIndex((l) => isoFromPrinted(l.text) !== null);
    const nameLine = dateIdx >= 0 ? lines[dateIdx + 1]?.text ?? null : null;
    out.fields.push(field("person.full_name", "employee the offer is addressed to", nameLine, { confidence: nameLine ? "medium" : "low", where: "page 1, addressee block", method: `${source} + addressee rule` }));
    if (nameLine) out.people_seen.push({ role: "employee the offer is addressed to", name_as_printed: nameLine });
  }
  if (claimed === "birth_certificate") {
    const name = lines.map((l) => /^Name of child\s+(.+)$/i.exec(l.text)?.[1]).find(Boolean) ?? null;
    const parts = name?.trim().split(/\s+/) ?? [];
    out.fields.push(field("person.given_names", "the child whose birth is recorded", parts.length > 1 ? parts.slice(0, -1).join(" ") : null, { as_printed: name, method: "label rule; family name taken as the last word (an assumption)" }));
    out.fields.push(field("person.family_name", "the child whose birth is recorded", parts.length > 1 ? parts.at(-1)! : null, { as_printed: name, method: "label rule; family name taken as the last word (an assumption)" }));
    const pob = lines.map((l) => /^Place of birth\s+(.+)$/i.exec(l.text)?.[1]).find(Boolean) ?? "";
    const seg = pob.split(",").map((s) => s.trim()).filter(Boolean);
    out.fields.push(field("person.place_of_birth_city", "the child whose birth is recorded", seg.length >= 2 ? seg.at(-2)! : null, { as_printed: pob || null, method: "label rule; city = second-last part" }));
    out.fields.push(field("person.country_of_birth", "the child whose birth is recorded", seg.length >= 2 ? seg.at(-1)! : null, { as_printed: pob || null, method: "label rule; country = last part" }));
    const sex = out.fields.find((f) => f.fact === "person.sex");
    if (sex?.value) sex.value = /^F/i.test(sex.value) ? "F" : /^M/i.test(sex.value) ? "M" : sex.value;
  }
  return out;
}

export function readLocal(file: string, claimed: string): ReaderOutput & { reader: typeof LOCAL_READER; ms: number } {
  const t0 = Date.now();
  let out: ReaderOutput;
  if ((claimed === "passport" || claimed === "unknown") && !file.endsWith(".pdf")) {
    out = readPassport(file);
    if (claimed === "unknown" && out.document.kind_seen !== "passport") out = readByLabels(file, "unknown");
  }
  else if (claimed === "passport") { out = readByLabels(file, claimed); }
  else out = readByLabels(file, claimed);
  return { ...out, reader: LOCAL_READER, ms: Date.now() - t0 };
}

if (import.meta.main) {
  const [file, kind] = process.argv.slice(2);
  console.log(JSON.stringify(readLocal(file, kind), null, 1));
}
