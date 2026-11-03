// C11.7 part 1 (P-297 (2)): the form intake reads a form's edition from the file (printed next to the code, else the form
// template's own Version variable), or takes the official source list's recorded edition only when the file's SHA-256 is
// that entry's, and records which way; a file whose code is on the list under a different checksum is refused. Through
// the reader, the pure rule and the API on an isolated copy, a passing and a failing case each. NO model call (US$0).
//   zsh studio/tools/isolated.sh c117 4452 start && tsx studio/tests/check_c117_intake_edition.ts 4452 xr_studio_c117
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editionFromManifest } from "../api/src/intake.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_c117";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const IRCC = join(STUDIO, "..", "..", "official-sources", "ircc");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const read = (file: string) => JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const manifest = JSON.parse(readFileSync(join(IRCC, "manifest.json"), "utf8")).items as { file: string; edition: string; sha256: string }[];

/** A one-page PDF whose title names a form code and which prints no edition anywhere (made here, never an official file). */
const dir = mkdtempSync(join(tmpdir(), "c117-"));
const made = (name: string, title: string) => {
  const out = join(dir, name);
  execFileSync(PY, ["-I", "-c", "import sys\nfrom pypdf import PdfWriter\nw=PdfWriter(); w.add_blank_page(612,792); w.add_metadata({'/Title': sys.argv[2]}); w.write(sys.argv[1])", out, title]);
  return out;
};
/** A hand-built PDF with an XFA template (as tests/check_forms_pdf_hardening.ts builds them; Sample, never official). */
const xfaPdf = (name: string, title: string, xfa: string) => {
  const objs = ["<< /Type /Catalog /Pages 2 0 R /AcroForm 7 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>", "<< /Length 0 >>\nstream\n\nendstream", "<< >>", `<< /Title (${title}) >>`, "<< /Fields [] /XFA [(template) 8 0 R] >>", `<< /Length ${Buffer.byteLength(xfa, "latin1")} >>\nstream\n${xfa}\nendstream`];
  let out = "%PDF-1.7\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  const path = join(dir, name); writeFileSync(path, Buffer.from(out, "latin1")); return path;
};
const template = (versions: string[]) => `<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="form1"><draw><value><text>IMM 9996 Sample form</text></value></draw></subform><variables>${versions.map((v) => `<text name="Version">${v}</text>`).join("")}</variables></template>`;
const upload = async (path: string, name: string) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(path))]), name);
  const r = await fetch(`http://127.0.0.1:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  const j = await r.json(); if (!j.results?.[0]) throw new Error(`intake gave no result: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j.results[0] as { outcome: string; message: string; code: string | null; edition: string | null; editionFrom?: string };
};
const n = (q: string) => Number(sql(q) || 0);

(async () => {
  // ── The reader (tools/read_form_identity.py) ──
  const dep = read(join(IRCC, "forms", "imm0008depe.pdf"));
  ok("C11.7 pass (P-297 (2)): IMM 0008 DEP's edition is read as printed (\"IMM 0008DEP (10-2024) E\"), its code with the DEP suffix", dep.ok && dep.edition_label === "IMM 0008 DEP (10-2024)" && dep.edition_from === "printed", dep);
  const main = read(join(IRCC, "forms", "imm0008e.pdf"));
  ok("C11.7 fail: plain IMM 0008 never takes the DEP form's code or edition", main.ok && main.edition_label === "IMM 0008 (05-2026)", main);
  const s5669 = read(join(IRCC, "forms", "imm5669e.pdf"));
  ok("C11.7 pass (P-297 (2)): IMM 5669 prints no edition; it is read from the form template's own Version variable, and said so", s5669.ok && s5669.edition_label === "IMM 5669 (05-2021)" && s5669.edition_from === "form_template", s5669);
  const r5476 = read(join(IRCC, "forms", "imm5476e.pdf"));
  ok("C11.7: a printed edition wins over the template's (the reader says \"printed\" when both are there)", r5476.ok && r5476.edition_label === "IMM 5476 (11-2025)" && r5476.edition_from === "printed", r5476);
  const bare = made("imm5669e.pdf", "IMM 5669 E : Schedule A - Background / Declaration");
  const rb = read(bare);
  ok("C11.7 fail: a file that prints no edition and has no template Version is not given one by the reader", !rb.ok && rb.code === "IMM 5669" && /no edition date/.test(rb.error), rb);

  const one = read(xfaPdf("one.pdf", "IMM 9996 E: Sample form", template(["03-2024"])));
  ok("C11.7 pass: a form template with one Version and nothing printed gives that edition, said as \"form_template\"", one.ok && one.edition_label === "IMM 9996 (03-2024)" && one.edition_from === "form_template", one);
  const two = read(xfaPdf("two.pdf", "IMM 9996 E: Sample form", template(["03-2024", "11-2025"])));
  ok("C11.7 fail: a form template with two different Versions gives no edition (never a guess between them)", !two.ok && two.code === "IMM 9996" && /no edition date/.test(two.error), two);

  // ── The rule (editionFromManifest): the checksum path, alone ──
  const unread = { ok: false, code: "IMM 5669", kind: "form", error: "found IMM 5669 but no edition date such as (09-2023) printed next to it" };
  const listed = { file: "imm5669e.pdf", edition: "IMM 5669 (05-2021)", sha256: "a".repeat(64) };
  const use = editionFromManifest(unread, "a".repeat(64), [listed]);
  ok("C11.7 pass (checksum path): no edition in the file and the file's SHA-256 is the entry's → the entry's edition, recorded as \"manifest\"", !!use && "use" in use && use.use.ok && use.use.edition_label === "IMM 5669 (05-2021)" && use.use.edition_from === "manifest", use);
  const other = editionFromManifest(unread, "b".repeat(64), [listed]);
  ok("C11.7 fail (mismatch): the same code under a different checksum is a mismatch, never the entry's edition", !!other && "mismatch" in other && other.mismatch.file === "imm5669e.pdf", other);
  ok("C11.7 fail: an entry whose recorded edition is not a plain \"CODE (MM-YYYY)\" gives nothing (a person decides)", editionFromManifest({ ...unread, code: "IMM 5905" }, "c".repeat(64), [{ file: "IMM5905E.pdf", edition: "IMM 5905 E (03-2026), New Delhi work permit visa office instructions (edition read from the file)", sha256: "c".repeat(64) }]) === null);
  ok("C11.7 fail: an entry with this checksum but another code gives nothing", editionFromManifest(unread, "a".repeat(64), [{ ...listed, edition: "IMM 5406 (05-2026)" }]) === null);
  ok("C11.7 fail: a code on no entry is neither taken nor refused (held, as before)", editionFromManifest({ ...unread, code: "IMM 9999" }, "d".repeat(64), manifest) === null);
  // The file wins: IMM 5475's file prints 05-2021 while the list records 12-2022; a read edition is never replaced.
  const r5475 = read(join(IRCC, "forms", "imm5475e.pdf"));
  ok("C11.7 fail: an edition read from the file is never replaced by the list's (IMM 5475: file 05-2021, list 12-2022)", r5475.edition_label === "IMM 5475 (05-2021)" && editionFromManifest(r5475, sha(readFileSync(join(IRCC, "forms", "imm5475e.pdf"))), manifest) === null, r5475.edition_label);

  // ── Through the API (the one intake door) ──
  const a = await upload(join(IRCC, "forms", "imm0008depe.pdf"), "imm0008depe.pdf");
  ok("C11.7 pass: the intake adds IMM 0008 DEP (10-2024) to the library, edition read as printed", a.outcome === "added" && a.edition === "IMM 0008 DEP (10-2024)" && a.editionFrom === "printed", a);
  const b = await upload(join(IRCC, "forms", "imm5669e.pdf"), "imm5669e.pdf");
  ok("C11.7 pass: the intake adds IMM 5669 (05-2021), edition from the form template, and says so", b.outcome === "added" && b.edition === "IMM 5669 (05-2021)" && b.editionFrom === "form_template" && /template/.test(b.message), b);
  ok("C11.7 (P-297 (2) record which way): the library audit line keeps edition_from for each", sql(`select string_agg(detail->>'edition_from', ',' order by entity_key) from audit_event where action = 'created' and entity = 'form' and entity_key in ('IMM 0008 DEP', 'IMM 5669')`) === "printed,form_template");
  const before = n(`select count(*) from form_edition`);
  const m = await upload(bare, "imm5669e.pdf");
  ok("C11.7 fail (mismatch): a file coded IMM 5669 with no edition and another checksum is refused in words, nothing added or held", m.outcome === "refused" && /not the official imm5669e\.pdf/.test(m.message) && n(`select count(*) from form_edition`) === before && n(`select count(*) from intake_item where status = 'HELD' and code = 'IMM 5669'`) === 0, m);
  const unlisted = await upload(made("imm9999e.pdf", "IMM 9999 E : Sample form"), "imm9999e.pdf");
  ok("C11.7 fail: a code on no list entry is still held for a person (could not read the edition), not refused", unlisted.outcome === "held" && /could not read the edition of IMM 9999/.test(unlisted.message), unlisted);

  // The Form library's Upload PDF card says what the intake does (review m1): the read step names the mismatch, the
  // compare step knows the form number, the last step says refused.
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(bare))], { type: "application/pdf" }), "imm5669e.pdf");
  const runId = ((await (await fetch(`http://127.0.0.1:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json()) as { runId?: string }).runId;
  let run: { status?: string; steps?: { kind: string; status: string; message: string | null }[] } = {};
  for (let i = 0; runId && i < 240; i++) { run = (await call("GET", `/runs/${runId}`)).body; if (!["queued", "running", "stopping"].includes(run?.status ?? "")) break; await new Promise((res) => setTimeout(res, 250)); }
  const step = (k: string) => run.steps?.find((x) => x.kind === k);
  ok("C11.7 fail (mismatch, Upload PDF card): the read step says it is not the official file and will be refused; the compare step knows IMM 5669; the last step says refused", /not the official imm5669e\.pdf/.test(step("upload_identity")?.message ?? "") && !/waits for a person/.test(step("upload_identity")?.message ?? "") && !/form number is not known/.test(step("upload_compare")?.message ?? "") && /^Refused/.test(step("upload_add")?.message ?? ""), run.steps?.map((x) => `${x.kind}: ${x.status}: ${(x.message ?? "").slice(0, 120)}`));

  // ── Reset to the six accepts both (P-226) ──
  const six = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  const missing = (six.body?.missing ?? []) as { code?: string }[];
  ok("C11.7 pass (P-226): Reset to the six takes IMM 5669 and IMM 0008 DEP in through the intake: neither is listed as missing or held", six.status < 300 && !missing.some((x) => /imm5669e|imm0008depe/.test(x.code ?? "")) && n(`select count(*) from intake_item where status = 'HELD' and file_name in ('imm5669e.pdf', 'imm0008depe.pdf')`) === 0 && n(`select count(*) from form_edition where edition_label in ('IMM 5669 (05-2021)', 'IMM 0008 DEP (10-2024)')`) === 2, { status: six.status, missing });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
