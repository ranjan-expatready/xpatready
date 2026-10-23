// Reader guard (AIW-D271): which documents a reader call may send, the reader's isolation, and the strings no
// maker-written request part may contain. The JSON Schema checks shape only; these functions enforce.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { PolicyRefusal } from "../../p2/guard.ts";
import { DOCS_DIR, DOCS_MANIFEST, FORBIDDEN, KEY_FILE, LEDGER_DIR, PROTOTYPE, READ_ENTRY, READER, READER_RUNS, SCREEN_SOURCES } from "./policy.ts";

export { PolicyRefusal };
const refuse = (m: string): never => { throw new PolicyRefusal(m); };
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const inside = (p: string, d: string) => p === d || p.startsWith(d + sep);

export type AdmittedDoc = { file: string; sha256: string; media_type: string; bytes: Buffer };

/** Admits one document: a regular file in p5/reader/docs, listed in the synthetic manifest with the same SHA-256,
 *  marked synthetic. Anything else (a real document, a changed file, a link, a file elsewhere) is refused. */
export function admitDoc(file: string, expectedSha: string): AdmittedDoc {
  const abs = resolve(DOCS_DIR, file);
  if (dirname(abs) !== DOCS_DIR) refuse(`reader input outside the synthetic-document folder: ${file}`);
  for (const f of FORBIDDEN) if (inside(abs, f)) refuse(`forbidden reader input: ${file}`);
  let st;
  try { st = lstatSync(abs); } catch { return refuse(`reader input not found: ${file}`); }
  if (!st.isFile() || st.isSymbolicLink() || realpathSync(abs) !== abs) refuse(`reader input is not a plain file: ${file}`);
  const m = JSON.parse(readFileSync(DOCS_MANIFEST, "utf8"));
  const item = (m.items ?? []).find((i: any) => i.file === file);
  if (!item) refuse(`not on the synthetic-document allowlist (manifest): ${file}`);
  if (item.synthetic !== true || !/SYNTHETIC SPECIMEN/.test(item.marking ?? "")) refuse(`not marked as a made-up synthetic document: ${file}`);
  const bytes = readFileSync(abs);
  const h = sha(bytes);
  if (h !== item.sha256 || h !== expectedSha) refuse(`hash of ${file} differs from the allowlist or the job`);
  if (!["image/png", "image/jpeg", "application/pdf"].includes(item.media_type)) refuse(`unsupported media type ${item.media_type}`);
  return { file, sha256: h, media_type: item.media_type, bytes };
}

/** Pixel size from the file header (PNG IHDR or JPEG SOFn), read in-process: the isolated reader cannot start tools. */
export function imageSize(b: Buffer): { w: number; h: number } | null {
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1], len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

/** Input tokens a document can bill at most. Images: ⌈w/28⌉×⌈h/28⌉ visual tokens, never more than 4,784 on the
 *  high-resolution tier (Anthropic vision docs, read 21 Oct 2026); an unreadable header counts 4,784. PDFs: one token
 *  per byte of the file (text and page images together never exceed it for these files; conservative). */
export function docTokenBound(d: AdmittedDoc): number {
  if (d.media_type === "application/pdf") return d.bytes.length;
  const s = imageSize(d.bytes);
  return s ? Math.min(4784, Math.ceil(s.w / 28) * Math.ceil(s.h / 28)) : 4784;
}

/** The strings no maker-written request part may contain (template, output schema, document-type profiles, the
 *  finished request's text). Read only by the launcher; the reader process gets salted hashes (p2/screen.ts). */
export function readerCanary(): { key_values: string[]; family_values: string[]; sources: { file: string; sha256: string }[] } {
  const key = new Set<string>(), fam = new Set<string>(), sources: { file: string; sha256: string }[] = [];
  const strings = (v: unknown): string[] => typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
  const keep = (s: string) => s.length >= 4 && !/^[0-9-]+$/.test(s);
  for (const src of SCREEN_SOURCES) {
    const abs = join(PROTOTYPE, src);
    const files = statSync(abs).isDirectory() ? readdirSync(abs).filter((f) => f.endsWith(".json")).sort().map((f) => join(abs, f)) : [abs];
    for (const f of files) {
      const b = readFileSync(f);
      sources.push({ file: `prototype/${relative(PROTOTYPE, f)}`, sha256: sha(b) });
      const d = JSON.parse(b.toString("utf8"));
      if (relative(PROTOTYPE, f) === "expected/reader-c1.json") {
        for (const doc of d.documents ?? []) for (const s of strings([doc.fields, doc.distractors])) if (keep(s)) key.add(s);
      } else if (relative(PROTOTYPE, f).startsWith("expected/")) {
        // Case scenarios: the answer VALUES only (never the fact ids beside them). Other keys: their scenario section.
        const vals = d.answers ? [...d.answers, ...(d.staff_facts ?? []), ...(d.profile_facts ?? [])].map((x: any) => x.value) : (d.scenario ?? []);
        // Identifying values only: names in capitals, e-mail addresses, anything with a digit, or a multi-word value with a
        // capital ("Example Road", "Software engineer"). Generic single words ("married", "child") are not family data.
        for (const s of strings(vals)) if (keep(s) && (/[A-Z]{4,}|@|\d/.test(s) || /^[A-Z][a-z]+(\s+\S+)+$/.test(s))) fam.add(s);
      } else for (const s of strings(d.values ?? d.forms)) if (keep(s)) fam.add(s);
    }
  }
  if (!key.size) refuse("the reader key has no values; refusing to screen against nothing");
  return { key_values: [...key].sort(), family_values: [...fam].sort(), sources };
}

/** Plain-text screen in the launcher. Words printed on the official forms do not exempt anything here: the reader's
 *  maker text has no reason to name a value. */
export function screenText(items: { name: string; text: string }[], c = readerCanary()): void {
  for (const it of items) for (const s of [...c.key_values, ...c.family_values]) if (it.text.includes(s)) refuse(`${it.name} contains "${s}" from the reader key, the case scenario or the family values`);
}

/** Node permission-model arguments: read the reader code and synthetic documents, the P2 modules it imports, the SDK
 *  and the key file; write only the experiment ledger. Never the answer keys, family values or the case store. */
export function readerNodeArgs(): string[] {
  const nm = realpathSync(join(PROTOTYPE, "node_modules"));
  const reads = [join(READER, "launch.ts"), join(READER, "read.ts"), join(READER, "policy.ts"), join(READER, "guard.ts"), join(READER, "request.ts"), join(READER, "pathcode.ts"), join(READER, "isolation.ts"),
    DOCS_DIR, join(READER, "prompts"), join(READER, "jobs"), join(READER, "doc-types.json"), join(READER, "stubs"), join(READER, "screening"), join(READER, "stub-pass"),
    join(PROTOTYPE, "p2"), join(PROTOTYPE, "package.json"), join(PROTOTYPE, "node_modules"), nm, dirname(KEY_FILE), LEDGER_DIR];
  return ["--permission", ...reads.map((r) => `--allow-fs-read=${r}`), `--allow-fs-write=${LEDGER_DIR}`];
}

export { READ_ENTRY, READER_RUNS };
