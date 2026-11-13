// qa after-merge 1 Nov, third round (main 63168762), explore evidence: C-9 / P-144, the validated copy read back.
// What check_runtime_r1d.ts does not probe: the upload limits a person hits (a file over 20 MB, two files at once), a
// validated copy where ONE value was changed after Validate, two uploads of the same validated file at once, and the
// configuration author (not the case officer) sending one. Each refusal must be in plain words and record nothing.
// Runs on the copy check_runtime_r1d.ts leaves behind (it needs an up-to-date generated IMM 5257 copy, not locked).
// Sample data, no model call (US$0).
//   zsh studio/tools/isolated.sh qa_r1d 4476 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4476 xr_studio_qa_r1d
//   tsx studio/tests/runtime/check_runtime_r1d.ts 4476 xr_studio_qa_r1d
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa_am_1101c_validated.ts 4476 xr_studio_qa_r1d
import { adobeValidated } from "../runtime/validated.ts";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const PORT = Number(process.argv[2] ?? 4476), DB = process.argv[3] ?? "xr_studio_qa_r1d", OFFICER = "user-O";
const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "..", "..", "..");
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/bin/psql"].find(existsSync)!;
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${JSON.stringify(d).slice(0, 300)}`}`); };
const get = async (u: string, actor = OFFICER) => { const r = await fetch(`http://127.0.0.1:${PORT}/api${u}`, { headers: { "x-actor": actor } }); return { status: r.status, body: await r.json().catch(() => null) as any }; };
const send = async (copy: string, files: Buffer[], actor = OFFICER) => {
  const fd = new FormData(); files.forEach((f, i) => fd.append("file", new Blob([new Uint8Array(f)]), `validated-${i}.pdf`));
  const r = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copy}/validated`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json().catch(() => null) as any };
};
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const plain = (s: string) => s.length > 20 && !/^(File too large|Too many files|Unexpected field|Internal server error|Bad Request|Payload Too Large)$/i.test(s.trim());

(async () => {
  // A fresh generated IMM 5257 copy on the r1d case whose release files it by PDF upload (not the Online fixture case).
  const [caseId, subject] = sql(`select case_id, subject_id from form_instance where form_number='IMM 5257' group by 1, 2 order by count(*) desc limit 1`).split("|");
  const gen = await fetch(`http://127.0.0.1:${PORT}/api/runtime/cases/${caseId}/forms/IMM%205257/${subject}/generate`, { method: "POST", headers: { "x-actor": OFFICER, "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: `qa-c9-${Date.now()}` }) });
  const copy = String(((await gen.json().catch(() => null)) as any)?.id ?? "");
  for (let i = 0; i < 120 && copy && (await get(`/runtime/form-copies/${copy}`)).body?.status !== "GENERATED"; i++) await new Promise((z) => setTimeout(z, 1000));
  const ids = [copy];
  ok("setup: an up-to-date generated IMM 5257 copy, not validated yet", !!copy, ids.length);
  const n = () => sql(`select count(*) from validated_copy where form_instance_id='${copy}'`);
  const file = readFileSync(join(ROOT, sql(`select path from form_instance where id='${copy}'`)));
  const validated = adobeValidated(file); // QA-165: the form's own Validate result, not bytes appended

  // The limits a person hits: the interceptor's own limits must still answer in the product's words.
  let r = await send(copy, [Buffer.concat([validated, Buffer.alloc(21 * 1024 * 1024, 32)])]);
  ok("C-9 fail: a file over 20 MB is refused (413) in words that name this upload's limit (20 MB), nothing recorded", r.status === 413 && plain(words(r)) && /20 MB/.test(words(r)) && n() === "0", { status: r.status, words: words(r) });
  r = await send(copy, [validated, validated]);
  ok("C-9 fail: two files at once are refused (400 or 413; the words matter, QA-126 closed at 73396df2) in the product's words, nothing recorded", (r.status === 400 || r.status === 413) && plain(words(r)) && /one/i.test(words(r)) && n() === "0", { status: r.status, words: words(r) });
  r = await send(copy, [validated], "user-A");
  ok("C-9 fail: the configuration author cannot send a validated copy (403, in words)", r.status === 403 && plain(words(r)) && n() === "0", { status: r.status, words: words(r) });

  // One value changed after Validate (the person edited a field in Adobe): the read back must name it and refuse.
  const dir = mkdtempSync(join(tmpdir(), "qa-c9-")), src = join(dir, "in.pdf"), out = join(dir, "out.pdf");
  writeFileSync(src, file);
  // IMM 5257 is an XFA form: its values live in the datasets stream. Change the first written name there (as if typed in Adobe).
  const py = `import sys,re,pypdf\nw=pypdf.PdfWriter(clone_from=pypdf.PdfReader(sys.argv[1]))\nx=w._root_object['/AcroForm']['/XFA']\no=x[[x[i] for i in range(0,len(x),2)].index('datasets')*2+1].get_object()\nd=o.get_data().decode('utf8')\nm=re.search(r'<(FamilyName)>([^<]+)</FamilyName>',d)\no.set_data(d.replace(m.group(0),'<FamilyName>QA'+m.group(2)+'</FamilyName>',1).encode('utf8'))\nw.write(sys.argv[2]);print(m.group(1))`;
  let field = "";
  try { field = execFileSync("python3", ["-I", "-c", py, src, out], { encoding: "utf8" }).trim(); } catch (e) { field = ""; }
  if (field) {
    r = await send(copy, [readFileSync(out)]);
    ok("C-9 fail: a validated copy with one value changed after Validate is refused (422), nothing recorded", r.status === 422 && /Not read back/.test(words(r)) && n() === "0", { status: r.status, words: words(r), field });
    ok("C-9 (UX): the refusal says which value differs, in the form's words, so the person knows what to put back", /family name|surname/i.test(words(r)) && !/[a-z]+\[\d\]\.|#subform|\.[A-Z][A-Za-z]+\[0\]/.test(words(r)), words(r));
  } else ok("setup: pypdf changes one value of the copy", false);

  // Two uploads of the same validated file at once (double click on Send): one validated copy kept, or two equal rows.
  const both = await Promise.all([send(copy, [validated]), send(copy, [validated])]);
  const kept = Number(n());
  ok("C-9 double click: two uploads at once both answer in words (201 or 409), no 500", both.every((x) => x.status === 201 || x.status === 409), both.map((x) => x.status));
  ok("C-9 double click: one validated copy is recorded, not two of the same file", kept === 1, { kept, statuses: both.map((x) => x.status) });
  const c = (await get(`/runtime/form-copies/${copy}`)).body;
  ok("C-9 pass: the copy then says \"Validated copy read back\", every written value equal", c?.validated?.current === true && c.validated.read_back.equal === c.validated.read_back.written && c.validated.read_back.written > 0, c?.validated);
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
