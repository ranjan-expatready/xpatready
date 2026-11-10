// Pack 4 synthetic documents, made in the test (no real person, no real document): a passport data page as a PDF with
// a text layer holding a TD3 machine-readable zone (check digits by p5/reader/mrz.ts, ICAO Doc 9303 Part 3 §4.9), so
// the rules reader (P-133, P-134 D2) can read it with no OCR and no AI. r5c §8b: until printed-text OCR passes the
// STANDARDS §1 gate, the reader is production grade on PDFs with a text layer only. Every page says SYNTHETIC SPECIMEN.
import { checkDigit } from "../../../p5/reader/mrz.ts";

const pad = (s: string, n: number) => (s + "<".repeat(n)).slice(0, n);
const yymmdd = (iso: string) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
export type Passport = { surname: string; given: string; number: string; nationality: string; dob: string; sex: "M" | "F" | "X"; expiry: string; issuer?: string };
/** Two TD3 lines of 44 characters. `breakDigit` makes the document-number check digit wrong (an unreadable read). */
export function mrz(p: Passport, breakDigit = false): [string, string] {
  const l1 = pad(`P<${p.issuer ?? p.nationality}${p.surname}<<${p.given.replace(/ /g, "<")}`, 44);
  const num = pad(p.number, 9), dob = yymmdd(p.dob), exp = yymmdd(p.expiry), personal = pad("", 14);
  const cdNum = breakDigit ? (checkDigit(num) + 1) % 10 : checkDigit(num);
  const part = `${num}${cdNum}${p.nationality}${dob}${checkDigit(dob)}${p.sex}${exp}${checkDigit(exp)}${personal}${checkDigit(personal)}`;
  const composite = checkDigit(`${num}${cdNum}${dob}${checkDigit(dob)}${exp}${checkDigit(exp)}${personal}${checkDigit(personal)}`);
  return [l1, `${part}${composite}`];
}

/** A one-page PDF 1.4 with Courier text lines (a real text layer), offsets computed so any PDF reader opens it. */
export function textPdf(lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = ["BT", "/F1 10 Tf", "40 760 Td", "12 TL", ...lines.map((l) => `(${esc(l)}) '`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

export function passportPdf(p: Passport, breakDigit = false): Buffer {
  const [a, b] = mrz(p, breakDigit);
  return textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", "PASSPORT / PASSEPORT (Sample)", `Surname: ${p.surname}`, `Given names: ${p.given}`, "", a, b]);
}

/** A synthetic letter of invitation (fixed bytes: a saved AI read replays by its checksum, US$0). */
export const letterPdf = () => textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", "Letter of invitation (Sample)", "I, SAMPLE HOST B, of 1 Sample Road, Sample City, Ontario,", "invite SAMPLED CLIENT A and family to visit me", "from 1 March to 15 April. I will host them at my home.", "Relationship: sibling. Signed: SAMPLE HOST B"]);

/** QA-352: a synthetic proof of financial support (a printed statement with a table; fixed bytes: its saved AI read
 *  replays by its checksum, US$0). `variant` makes other bytes with no saved read (the no-saved-read step). */
export const fundsPdf = (variant = "") => textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", `Proof of financial support (Sample)${variant}`, "SAMPLE BANK (Sample, not a real bank)", "Account statement for SAMPLED CLIENT A",
  "Date        Description        Balance CAD", "2026-10-01  Opening balance    12,500.00", "2026-10-31  Closing balance    14,200.00", "Funds available: CAD 14,200.00"]);
/** QA-352: a synthetic marriage certificate (fixed bytes, as fundsPdf). */
export const marriagePdf = (variant = "") => textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", `MARRIAGE CERTIFICATE (Sample)${variant}`, "This certifies that SAMPLED CLIENT A and SAMPLES SPOUSE A", "were married on 14 June 2019 at Sample City."]);

/** POST a file as multipart to an API path, as the officer's browser would. */
export async function upload(port: number, path: string, file: Buffer, name: string, actor: string, fields: Record<string, string> = {}) {
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(file)]), name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const res = await fetch(`http://127.0.0.1:${port}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd }).catch(() => null);
  return { status: res?.status ?? 0, body: await res?.json().catch(() => null) };
}
