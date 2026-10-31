// C3.11 (runtime lane; P-62 §3, P-143): a form line filed as PDF upload, signed by hand and scanned, adds its signed-scan document line to the
// checklist of each person who signs it, shown on the Documents tab with why, and taken away when the line's channel
// changes. The lines are worked out from the form line (engine/sources.ts signedScanLines), never stored. A passing and a
// failing case per rule: through the API on an isolated copy with the suites' fixture, and on the engine for each "Signed
// by" value. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_c311 4432 start && tsx studio/tests/check_c3_11_signed_scan.ts 4432 xr_studio_runtime_c311
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checklist, signedScanLines } from "../engine/sources.ts";
import { channelProblems } from "../engine/channels.ts";

const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_c311";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const scans = (v: any) => v.roles.flatMap((r: any) => r.lines.filter((l: any) => l.automatic).map((l: any) => ({ role: r.role, ...l })));

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const draft = async () => (await call("GET", `/combinations/${wp}/config?mode=draft`)).body.snapshot;
  const list = async () => (await call("GET", `/combinations/${wp}/checklist`)).body;
  // A filed form (not a checklist) that each applicant gives: its signed scan goes to more than one person.
  const s0 = await draft();
  const form = s0.forms.find((f: any) => (f.form_kind ?? "data_form") === "data_form" && f.who === "each_applicant" && (f.channel ?? "PDF_UPLOAD") === "PDF_UPLOAD");
  if (!form) { console.error("STOP  no PDF upload form for each applicant in wp.family", s0.forms.map((f: any) => `${f.form_number}:${f.who}`)); process.exit(2); }
  const F = form.form_number;
  const line = sql(`select cf.lineage_key from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${wp}' and g.form_key='${F}' order by cf.version desc limit 1`);
  // C1.6 (forms, main): "signed by hand and scanned" is a signature on a PDF upload line, no longer a channel of its own.
  const lineBody = (c: string) => (c === "SIGNED" ? { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" } : { channel: c, signature: "NONE" });
  const setChannel = (to: string, from: string) => call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(line)}/channel`, { ...lineBody(to), from: lineBody(from).channel, fromSignature: lineBody(from).signature });
  const signedBy = (v: string | null) => call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(F)}`, { signedBy: v });

  // ---------------------------------------------------------------- rule 1: a PDF upload line signed by hand and scanned adds a scan per signer
  let V = await list();
  ok("C3.11 fail-guard: with every line filed as PDF upload, no signed-scan line is on any checklist", scans(V).length === 0, scans(V).map((x: any) => x.lineage));
  let r = await setChannel("SIGNED", "PDF_UPLOAD");
  ok(`C3.11 setup: ${F} is set to PDF upload, signed by hand and scanned, through the Forms tab's route`, r.status === 200, r.status >= 300 ? words(r) : r.status);
  V = await list();
  const roles = V.roles.map((x: any) => x.role).filter((x: string) => x !== "case" && x !== "representative");
  const mine = scans(V).filter((x: any) => x.automatic.form === F);
  ok(`C3.11 pass: ${F} filed as PDF upload, signed by hand and scanned, adds "${F} signed by hand and scanned" to each person it is about (not set = the person signs)`, mine.length >= 2 && mine.every((x: any) => x.document.name === `${F} signed by hand and scanned`) && [...new Set(mine.map((x: any) => x.role))].length === mine.length, mine.map((x: any) => x.role));
  ok("C3.11 pass: each line says why it is there (the form and its channel) and supplies no facts", mine.every((x: any) => x.automatic.reason.includes(`${F} is filed as PDF upload, signed by hand and scanned`) && !x.supplies.length && x.status === "AUTOMATIC"), mine[0]?.automatic);
  ok("C3.11 pass: the signed scans follow the person's other documents (last on the checklist)", V.roles.every((x: any) => { const i = x.lines.findIndex((y: any) => y.automatic); return i < 0 || x.lines.slice(i).every((y: any) => y.automatic); }));
  ok("C3.11 fail: a person the form is not about gets no signed scan of it (the representative)", !mine.some((x: any) => x.role === "representative"), mine.map((x: any) => x.role));
  ok("C3.11: nothing is stored for it (no document requirement row, no document type)", Number(sql(`select count(*) from document_requirement where combination_id='${wp}' and lineage_key like 'signed_scan:%'`)) === 0 && Number(sql(`select count(*) from document_type where document_type_key like 'signed_scan.%'`)) === 0);

  // ---------------------------------------------------------------- rule 2: it follows its form line (never moved or removed alone)
  const pr = V.roles.find((x: any) => x.role === mine[0].role);
  const scan = pr.lines.find((y: any) => y.automatic && y.automatic.form === F);
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: scan.lineage, role: pr.role, direction: "up" });
  ok("C3.11 fail: a signed scan cannot be moved on its own (409, in words naming the Forms tab)", r.status === 409 && /Forms tab/.test(words(r)), words(r));
  const lastOwn = pr.lines.filter((y: any) => !y.automatic).at(-1);
  r = await call("POST", `/combinations/${wp}/checklist/move`, { lineage: lastOwn.lineage, role: pr.role, direction: "down" });
  ok("C3.11 fail: the last own document cannot move below the signed scans (409)", r.status === 409 && /signed scans/.test(words(r)), words(r));
  r = await call("PATCH", `/combinations/${wp}/requirements/${encodeURIComponent(scan.lineage)}`, { retire: true });
  ok("C3.11 fail: a signed scan is not a requirement that can be removed alone (refused)", r.status >= 400 && (await list()).roles.some((x: any) => x.lines.some((y: any) => y.lineage === scan.lineage)), r.status);

  // ---------------------------------------------------------------- rule 3: who signs decides whose checklist
  r = await signedBy("principal_for_family");
  V = await list();
  let now = scans(V).filter((x: any) => x.automatic.form === F);
  ok("C3.11 pass: signed by the principal applicant for the family → only the principal's checklist has it, saying it is for the family", r.status === 200 && now.length === 1 && now[0].role === "principal" && /for the family members/.test(now[0].automatic.reason), now.map((x: any) => x.role));
  r = await signedBy("none");
  V = await list();
  now = scans(V).filter((x: any) => x.automatic.form === F);
  const errs = channelProblems(await draft()).filter((p) => p.level === "error" && p.item === F);
  ok("C3.11 fail: signed by No signature → no signed scan, and the release check says why (error)", now.length === 0 && errs.length === 1 && /No signature/.test(errs[0].message), errs.map((p) => p.message));
  r = await signedBy("person");
  ok("C3.11 pass: back to the person signing, the release error is gone", channelProblems(await draft()).filter((p) => p.level === "error" && p.item === F).length === 0 && scans(await list()).filter((x: any) => x.automatic.form === F).length === mine.length);

  // ---------------------------------------------------------------- rule 4: changing the channel takes it away at once
  r = await setChannel("PDF_UPLOAD", "SIGNED");
  V = await list();
  ok("C3.11 pass: filed as PDF upload again, every signed scan of the form is gone at once", r.status === 200 && scans(V).filter((x: any) => x.automatic.form === F).length === 0, scans(V).length);
  ok("C3.11 fail-guard: the release keeps its own checklist (no signed scan was ever released)", checklist((await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot).every((x) => x.lines.every((y) => !y.automatic)));
  await setChannel("SIGNED", "PDF_UPLOAD");
  ok("C3.11 pass: the release snapshot carries it with its form line (the next release's checklist has the signed scans, the same rule)", signedScanLines(await draft()).filter((x) => x.automatic!.form === F).length === mine.length);
  await setChannel("PDF_UPLOAD", "SIGNED");

  // ---------------------------------------------------------------- engine: each "Signed by" value (Sample)
  const base = await draft();
  const people = (by: string | undefined, who = "each_applicant") => {
    const s = structuredClone(base);
    s.forms = [{ form_number: "IMM TEST", title: "Test", form_kind: "data_form", who, status: "always", signature: "HAND_SCANNED", ...(by ? { signed_by: by } : {}) }];
    return signedScanLines(s).map((x) => x.role).sort();
  };
  const app = people(undefined);
  ok("C3.11 engine pass: not set = each person the form is about signs", app.includes("principal") && app.length >= 2, app);
  ok("C3.11 engine pass: the person and the representative → the representative too", people("person_and_representative").includes("representative") && people("person_and_representative").length === app.length + 1, people("person_and_representative"));
  const child = people("parent_for_minor", "each_dependent_child");
  ok("C3.11 engine pass: a parent, for a minor → a child's form is signed by the principal applicant", JSON.stringify(child) === JSON.stringify(["principal"]), child);
  ok("C3.11 engine fail: a parent, for a minor → an adult's form is still signed by the person", JSON.stringify(people("parent_for_minor", "principal_applicant")) === JSON.stringify(["principal"]) && people("parent_for_minor").includes("spouse_or_partner") === app.includes("spouse_or_partner"));
  ok("C3.11 engine fail: a checklist (form kind document) signed by hand and scanned adds nothing", (() => { const s = structuredClone(base); s.forms = [{ form_number: "IMM 5484", form_kind: "document", who: "each_applicant", status: "always", signature: "HAND_SCANNED" }]; return signedScanLines(s).length === 0; })());
  const cond = (() => { const s = structuredClone(base); s.forms = [{ form_number: "IMM TEST", form_kind: "data_form", who: "principal_applicant", status: "conditional", condition_plain: "Only if the applicant has a representative", signature: "HAND_SCANNED" }]; return signedScanLines(s)[0]; })();
  const oldSpelling = (() => { const s = structuredClone(base); s.forms = [{ form_number: "IMM TEST", form_kind: "data_form", who: "principal_applicant", status: "always", channel: "SIGNED_PDF_UPLOAD" }]; return signedScanLines(s).length; })();
  ok("C3.11 engine pass: a release made before C1.6 (channel spelled SIGNED_PDF_UPLOAD) still asks for the signed scan", oldSpelling === 1, oldSpelling);
  ok("C3.11 engine fail: a PDF upload with a typed name asks for no signed scan", (() => { const s = structuredClone(base); s.forms = [{ form_number: "IMM TEST", form_kind: "data_form", who: "each_applicant", status: "always", signature: "TYPED_NAME" }]; return signedScanLines(s).length === 0; })());
  ok("C3.11 engine pass: a conditional form's signed scan is conditional with the form's own words", !!cond && cond.base === false && /representative/.test(cond.when), cond?.when);

  const out = join(import.meta.dirname, "..", "evidence", "c3-11-signed-scan");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "result.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
