// Records the canada.ca copies the form finder replays in tests, CI and Load sample (S4 slice 1, challenge M2/M4; P-123
// recorded download, US$0: public canada.ca pages only, no AI). Re-runnable. For the 5 Wave-1 sample combinations of
// product/screens/W1-form-library/forms-for-5-combinations.md it reads, through LiveCanada (official hosts only, one
// request at a time, 1 s apart): the forms-and-guides index; each combination's guide and package/apply pages; every
// form page named in Part A, found through the index (never built from a pattern), and the English PDF its own page
// links. Where things go:
//   * pages → official-sources/ircc/canada/pages/<slug>.html (canada.ca's per-request analytics script removed, as for
//     the 27 Oct guide pages); a guide already saved under instructions/ for the same address is reused, not duplicated;
//   * a PDF whose checksum is already on the manifest is not saved again (the index points at that file); a new one goes
//     to forms/ or checklists/ (file name as on canada.ca, lower case) with a manifest row;
//   * the index page and each combination's guide and apply pages get a manifest row (if not already listed) and a text
//     inventory made by prototype/p1/source_text.py (html_text), so the guarded AI route admits them (p2/guard.ts);
//   * official-sources/ircc/canada/index.json maps every address read to its file and checksum (FixtureCanada).
// Existing manifest rows and official files are never edited or deleted. Which forms a combination needs stays Sample
// until the immigration expert confirms.
//   cd prototype/studio && npx tsx tools/record_canada_fixtures.ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CanadaError, LiveCanada, OFFICIAL_ROOT, type Fetched, type FixtureIndex, type FixtureItem } from "../api/src/canada.ts";
import { parseFormPage, parseFormsIndex, textFingerprint, type IndexRow } from "../engine/canada.ts";

const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), SOLUTION = join(PROTOTYPE, "..");
const OFFICIAL = OFFICIAL_ROOT, PAGES = join(OFFICIAL, "canada", "pages"), INDEX = join(OFFICIAL, "canada", "index.json");
const MANIFEST = join(OFFICIAL, "manifest.json"), INVENTORY = join(PROTOTYPE, "p1", "inventory"), SOURCE_TEXT = join(PROTOTYPE, "p1", "source_text.py");
const VENV_PY = join(SOLUTION, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const BASE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/";
const FORMS_INDEX = `${BASE}application/application-forms-guides.html`;
const APPROVAL = "P-123 recorded download";
const SAMPLE = "Sample — the immigration expert confirms";
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const nowUtc = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

type Page = { url: string; label: string };
type Combo = { label: string; pages: Page[]; forms: string[] };
const guide = (slug: string) => `${BASE}application/application-forms-guides/${slug}.html`;
/** The 5 Wave-1 sample combinations (forms-for-5-combinations.md Part A, every row Sample). */
const COMBOS: Combo[] = [
  { label: "Wave 1 combination 1: Visitor visa (outside Canada)", pages: [{ url: guide("guide-5256-applying-visitor-visa-temporary-resident-visa"), label: "Guide 5256 page" }, { url: `${BASE}visit-canada/apply-visitor-visa.html`, label: "Visitor visa: apply page (package)" }],
    forms: ["IMM 5257", "IMM 5645", "IMM 5707", "IMM 5257 SCH1", "IMM 5409", "IMM 5476", "IMM 5475", "IMM 5484", "IRM 0002", "IMM 5782"] },
  { label: "Wave 1 combination 2: Study permit › Outside Canada", pages: [{ url: guide("guide-5269-applying-study-permit-outside-canada"), label: "Guide 5269 page" }, { url: `${BASE}study-canada/study-permit/apply.html`, label: "Study permit: apply page (package)" }],
    forms: ["IMM 1294", "IMM 5707", "IMM 5483", "IMM 5646", "IMM 5409", "IMM 5476", "IMM 5475"] },
  { label: "Wave 1 combination 3: Work permit › With an LMIA – inside Canada", pages: [{ url: guide("guide-5553-applying-change-conditions-extend-your-stay-canada-worker"), label: "Guide 5553 page" }, { url: `${BASE}work-canada/permit-inside/forms-documents.html`, label: "Work permit inside Canada: forms and documents page (package)" }],
    forms: ["IMM 5710", "IMM 5707", "IMM 5409", "IMM 5476", "IMM 5475", "IMM 5556", "IMM 1295"] },
  { label: "Wave 1 combination 4: Provincial nominee › Express Entry", pages: [{ url: `${BASE}immigrate-canada/provincial-nominees/express-entry.html`, label: "Provincial nominees, Express Entry: overview page" }, { url: `${BASE}immigrate-canada/provincial-nominees/express-entry/apply-permanent-residence.html`, label: "Provincial nominees, Express Entry: apply for permanent residence page" }],
    forms: ["IMM 0008", "IMM 5669", "IMM 5406", "IMM 0008 DEP", "IMM 0008 SCH4", "IMM 5562", "IMM 5476", "IMM 5409", "IMM 5475"] },
  { label: "Wave 1 combination 5: Spouse or common-law partner", pages: [{ url: guide("guide-5289-sponsor-your-spouse-common-law-partner-conjugal-partner-dependent-child-complete-guide"), label: "Guide 5289 page" }, { url: `${BASE}immigrate-canada/family-sponsorship/spouse-partner-children/apply.html`, label: "Spouse or partner sponsorship: apply page (package)" }],
    forms: ["IMM 0008", "IMM 5669", "IMM 5406", "IMM 5562", "IMM 1344", "IMM 5532", "IMM 5409", "IMM 5604", "IMM 5476", "IMM 5475", "IMM 5533", "IMM 5589"] },
];

type Row = Record<string, unknown> & { file: string; url: string; path: string; sha256: string; edition: string; downloaded_utc?: string };
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { items: Row[]; updated_utc?: string } & Record<string, unknown>;
const prior: FixtureIndex | null = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : null;
const items = new Map<string, FixtureItem>((prior?.items ?? []).map((i) => [i.url, i]));
const newRows: Row[] = [], newPdfs: { path: string; bytes: number }[] = [], inventories: { file: string; sha256: string; url: string }[] = [];
const failures: { what: string; why: string }[] = [], notes: string[] = [], recorded: string[] = [];

const live = new LiveCanada();
let lastAt = 0;
/** One request at a time, at least 1 s after the previous one ended. */
async function get(url: string, want: "html" | "pdf"): Promise<Fetched> {
  const wait = lastAt + 1000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  try { const f = await live.get(url, want); recorded.push(url); return f; } finally { lastAt = Date.now(); }
}
/** canada.ca's page-analytics snippet (Akamai mPulse) carries per-request tokens and changes on every load; removed so a
 *  recorded page is stable. Bytes kept exactly otherwise (latin1 round trip). */
function withoutAnalytics(b: Buffer): { bytes: Buffer; removed: boolean } {
  const s = b.toString("latin1"), t = s.replace(/<script>[^<]*?go-mpulse\.net[\s\S]*?<\/script>/g, "");
  return { bytes: t === s ? b : Buffer.from(t, "latin1"), removed: t !== s };
}
/** A page's file name: the address after /services/, without the forms-and-guides folder, "/" → "-". */
function slugOf(url: string) {
  const u = new URL(url);
  let p = u.pathname.replace(/^\/en\/immigration-refugees-citizenship\/services\//, "").replace(/\.html?$/, "");
  if (p === "application/application-forms-guides") p = "application-forms-guides";
  p = p.replace(/^application\/application-forms-guides\//, "");
  return (u.hostname === "www.canada.ca" ? "" : `${u.hostname.split(".")[0]}-`) + p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}
const relOf = (abs: string) => abs.slice(OFFICIAL.length + 1).split("\\").join("/");
const byPath = (p: string) => manifest.items.find((i) => i.path === p) ?? newRows.find((i) => i.path === p);
const bySha = (h: string) => manifest.items.find((i) => i.sha256 === h) ?? newRows.find((i) => i.sha256 === h);
function setItem(url: string, f: Fetched, path: string, fileSha: string, note?: string) {
  const it: FixtureItem = { url, path, sha256: fileSha, content_type: f.contentType, status: f.status };
  if (f.finalUrl !== url) it.final_url = f.finalUrl;
  if (note) it.note = note;
  items.set(url, it);
}

/** Saves a page (or reuses an existing official copy) and returns its path relative to official-sources/ircc/. */
type Stored = { path: string; sha256: string; removed?: boolean };
function storePage(f: Fetched, url: string, opts: { reuseInstructions: boolean }): Stored {
  const { bytes, removed } = withoutAnalytics(f.bytes), h = sha(bytes);
  const known = opts.reuseInstructions ? manifest.items.find((i) => i.url === url && /^(instructions|web-pages)\//.test(i.path)) : undefined;
  if (known) {
    const old = readFileSync(join(OFFICIAL, known.path));
    const same = textFingerprint(old.toString("utf8")) === textFingerprint(bytes.toString("utf8"));
    const note = `Recorded copy is the official file saved ${String(known.downloaded_utc ?? "").split(" ")[0]} (${known.path}); today's page text is ${same ? "the same" : "different (canada.ca updated the page since; the saved copy is kept, never overwritten)"}.`;
    notes.push(`${url}: ${note}`); setItem(url, f, known.path, sha(old), note); return { path: known.path, sha256: sha(old) };
  }
  const same = bySha(h);
  if (same) { setItem(url, f, same.path, h); return { path: same.path, sha256: h }; }
  const abs = join(PAGES, `${slugOf(url)}.html`), rel = relOf(abs);
  if (existsSync(abs) && byPath(rel)) {
    // listed on the manifest by an earlier run: an official file is never overwritten
    const old = readFileSync(abs), sameText = textFingerprint(old.toString("utf8")) === textFingerprint(bytes.toString("utf8"));
    const note = `Kept the copy recorded earlier (${rel}); today's page text is ${sameText ? "the same" : "different: record a new copy deliberately if it matters"}.`;
    notes.push(`${url}: ${note}`); setItem(url, f, rel, sha(old), note); return { path: rel, sha256: sha(old) };
  }
  mkdirSync(PAGES, { recursive: true }); writeFileSync(abs, bytes);
  setItem(url, f, rel, h, removed ? "Saved without canada.ca's page-analytics script (per-request tokens); the rest is byte-identical to what was served." : undefined);
  return { path: rel, sha256: h, removed };
}

/** A manifest row for a page the finder reads (index, guide, package page), shaped like the 27 Oct guide rows. */
function pageRow(s: Stored, f: Fetched, edition: string, combination: string, applicability: string) {
  const { path, sha256: h } = s;
  if (byPath(path)) return;
  newRows.push({ file: basename(path), url: f.url, edition, combination, applicability, approval: APPROVAL, downloaded_utc: `${nowUtc()} (recorder tools/record_canada_fixtures.ts, plain HTTP request)`, status: "ok", bytes: readFileSync(join(OFFICIAL, path)).length, sha256: h, server_last_modified: f.lastModified ?? null, is_pdf: false, path,
    ...(s.removed ? { note: "Saved without canada.ca's page-analytics script (Akamai mPulse snippet with per-request tokens, which changes on every load); the rest is byte-identical to what was served." } : {}) });
}

/** The P1 text inventory of a manifest page, made by prototype/p1/source_text.py's own html_text (its main() reads a
 *  fixed list, so its function is called for this file), in the same shape, headed by the manifest checksum. */
function inventory(path: string) {
  const row = byPath(path)!; const dest = join(INVENTORY, `${basename(path).replace(/\.[^.]+$/, "").toLowerCase()}.text.inventory.json`);
  if (existsSync(dest)) { const s = JSON.parse(readFileSync(dest, "utf8")).summary ?? {}; if (s.sha256 === row.sha256 && s.file === `official-sources/ircc/${path}`) return; if (s.file !== `official-sources/ircc/${path}`) { failures.push({ what: `inventory ${basename(dest)}`, why: `an inventory of another file (${s.file}) already has this name; not overwritten` }); return; } }
  const py = existsSync(VENV_PY) ? VENV_PY : "python3";
  const code = [
    "import sys, json, hashlib", "from pathlib import Path", `sys.path.insert(0, ${JSON.stringify(dirname(SOURCE_TEXT))})`, "import source_text as S",
    "src, rel, edition, url, dest, want = sys.argv[1:7]", "b = Path(src).read_bytes()", "h = hashlib.sha256(b).hexdigest()",
    "assert h == want, rel + ': hash differs from the official manifest'", "text = S.html_text(Path(src))",
    "out = {'summary': {'file': 'official-sources/ircc/' + rel, 'sha256': h, 'edition': edition, 'url': url, 'kind': 'text', 'method': 'page text without scripts, styles, navigation, header, footer', 'derived_by': 'prototype/p1/source_text.py'}, 'text': text}",
    "Path(dest).write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\\n')", "print(len(text))",
  ].join("\n");
  execFileSync(py, ["-I", "-c", code, join(OFFICIAL, path), path, row.edition, row.url, dest, row.sha256], { encoding: "utf8" });
  inventories.push({ file: `prototype/p1/inventory/${basename(dest)}`, sha256: sha(readFileSync(dest)), url: row.url });
}

const MM = (ym: string | null) => ym ? `${ym.slice(5, 7)}-${ym.slice(0, 4)}` : null;
async function main() {
  // 1. the forms-and-guides index
  let rows: IndexRow[] = [];
  try {
    const f = await get(FORMS_INDEX, "html"), s = storePage(f, FORMS_INDEX, { reuseInstructions: false });
    rows = parseFormsIndex(f.bytes.toString("utf8")).rows;
    pageRow(s, f, `IRCC forms and guides index page (fetched ${nowUtc().slice(0, 10)})`, "All Wave 1 combinations (the form finder's lookup table)", `canada.ca table of form number, title and form page (${rows.length} rows); "Date modified" is the page's date, not the edition`);
    inventory(s.path);
  } catch (e) { failures.push({ what: FORMS_INDEX, why: e instanceof Error ? e.message : String(e) }); }
  // 2. each combination's guide and package pages
  for (const c of COMBOS) for (const p of c.pages) {
    try {
      const f = await get(p.url, "html"), s = storePage(f, p.url, { reuseInstructions: true });
      pageRow(s, f, p.label, c.label, `Package or guide page read by the form finder; which forms apply stays ${SAMPLE}`);
      inventory(s.path);
    } catch (e) { failures.push({ what: p.url, why: e instanceof Error ? e.message : String(e) }); }
  }
  // 3. every form named in Part A: its own page (from the index), then the English PDF that page links
  const codes = new Map<string, string[]>();
  for (const c of COMBOS) for (const code of c.forms) codes.set(code, [...(codes.get(code) ?? []), c.label]);
  for (const [code, combos] of codes) {
    const row = rows.find((r) => r.code === code);
    if (!row) { failures.push({ what: code, why: rows.length ? "not a row of canada.ca's forms-and-guides index" : "the index could not be read" }); continue; }
    let page: Fetched, parsed: ReturnType<typeof parseFormPage>;
    try { page = await get(row.pageUrl, "html"); storePage(page, row.pageUrl, { reuseInstructions: false }); parsed = parseFormPage(page.bytes.toString("utf8")); }
    catch (e) { failures.push({ what: `${code} form page ${row.pageUrl}`, why: e instanceof Error ? e.message : String(e) }); continue; }
    const folder = basename(new URL(row.pageUrl).pathname, ".html");
    const pdfUrl = parsed.pdfUrls.find((u) => new URL(u).pathname.includes(`/${folder}/`)) ?? parsed.pdfUrls[0];
    if (!pdfUrl) { failures.push({ what: `${code} (${row.pageUrl})`, why: "its form page links no English PDF (online-only or a different kind of page)" }); continue; }
    if (parsed.pdfUrls.length > 1) notes.push(`${code}: its page links ${parsed.pdfUrls.length} English PDFs; recorded ${pdfUrl}`);
    try {
      const f = await get(pdfUrl, "pdf");
      const known = bySha(f.sha256);
      if (known) { setItem(pdfUrl, f, known.path, f.sha256); continue; }
      const sameUrl = manifest.items.find((i) => i.url === pdfUrl);
      if (sameUrl) notes.push(`${code}: canada.ca now serves different bytes at the address of manifest row ${sameUrl.path} (same address, new file: M6 case); saved as a new file, the old row untouched`);
      const dir = join(OFFICIAL, row.kind === "checklist" ? "checklists" : "forms");
      let name = basename(new URL(pdfUrl).pathname).toLowerCase();
      if (existsSync(join(dir, name))) name = name.replace(/\.pdf$/, `-${nowUtc().slice(0, 10)}.pdf`);
      if (existsSync(join(dir, name))) { failures.push({ what: `${code} PDF ${pdfUrl}`, why: `a different file named ${name} already exists; not overwritten` }); continue; }
      writeFileSync(join(dir, name), f.bytes);
      const path = relOf(join(dir, name));
      newRows.push({ file: name, url: pdfUrl, edition: MM(parsed.lastUpdated) ? `${code} (${MM(parsed.lastUpdated)})` : `${code} (edition not shown on its page)`, combination: combos.join("; "), applicability: SAMPLE, approval: APPROVAL,
        downloaded_utc: nowUtc(), status: "ok", bytes: f.bytes.length, sha256: f.sha256, server_last_modified: f.lastModified ?? null, is_pdf: true, path });
      newPdfs.push({ path, bytes: f.bytes.length });
      setItem(pdfUrl, f, path, f.sha256);
    } catch (e) { failures.push({ what: `${code} PDF ${pdfUrl}`, why: e instanceof CanadaError ? `${e.code}: ${e.message}` : String(e) }); }
  }
  // 4. write the manifest (append only) and the fixture index
  if (newRows.length) { manifest.items.push(...newRows); manifest.updated_utc = nowUtc(); writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n"); }
  const index: FixtureIndex = { note: "Recorded canada.ca copies replayed by FixtureCanada (api/src/canada.ts) in tests, CI and Load sample; made by studio/tools/record_canada_fixtures.ts (P-123 recorded download, US$0). Each path is relative to official-sources/ircc/ and is checked by its SHA-256 on every read. Which forms a combination needs is Sample — the immigration expert confirms.",
    recorded_utc: nowUtc(), items: [...items.values()].sort((a, b) => a.url.localeCompare(b.url)) };
  mkdirSync(dirname(INDEX), { recursive: true }); writeFileSync(INDEX, JSON.stringify(index, null, 1) + "\n");
  console.log(JSON.stringify({ recorded: recorded.length, fixtureItems: index.items.length, newManifestRows: newRows.map((r) => ({ path: r.path, edition: r.edition, bytes: r.bytes, sha256: r.sha256 })), newPdfs, inventories, notes, failures }, null, 1));
}
await main();
