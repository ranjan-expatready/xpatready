// F2 C2.12 slice 1 (forms lane; the agreed F3 plan, D2 and BR-5): every To review item names the forms it belongs to
// (`forms: string[]`), and `?form=` lists one form's items with that form's counts and kinds. The rail of the guided
// path (later slices) reads its steps from these items, so the rail and To review name the same next step. Items keep
// their words, states and order (the earlier To review suites stay green). A pass and a fail per rule. US$0 (one saved AI
// answer replayed, no model call).
//   zsh studio/tools/isolated.sh forms_c212 4452 start && tsx studio/tests/check_forms_c212_queue_forms.ts 4452 xr_studio_forms_c212
import { execFileSync } from "node:child_process";
import { fillAllKinds } from "./fill_queue_kinds.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_c212";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
type Item = { id: string; kind: string; forms: string[]; state: string };
const queue = async (extra = "", actor = "user-A") => (await call("GET", `/review-queue?filter=all${extra}`, undefined, actor)).body as { items: Item[]; counts: Record<string, number>; kinds: Record<string, number> };
const intake = async (name: string, bytes: Buffer) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)]), name);
  return (await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { results?: unknown[] }).results?.[0];
};
function pdf(title: string, text: string) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  // ── AI proposals: a saved field-map answer replayed on the Super visa's IMM 5257 (US$0).
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = ((await call("GET", `/combinations/${sv}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /IMM 5257 \(/.test(a.edition ?? ""))!;
  const saved = (((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []) as { valid: boolean; file: string }[]).find((x) => x.valid)!;
  await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: saved.file });
  for (let i = 0; i < 150 && !(await queue()).items.some((x) => x.kind === "ai_proposals"); i++) await new Promise((r) => setTimeout(r, 400));
  // ── a held file whose number the rules cannot read, and a library change about one form.
  await intake("unreadable.pdf", pdf("A letter", "Nothing that names a form"));
  sql(`insert into gov_form_def select (jsonb_populate_record(null::gov_form_def, to_jsonb(d) || jsonb_build_object('id', gen_random_uuid(), 'form_key', 'IMM 0100', 'display_name', 'C2.12 check form', 'form_page_url', null, 'retired_at', null, 'retired_by', null))).* from gov_form_def d where form_key='IMM 5488'`);
  const del = await call("DELETE", `/library/forms/${encodeURIComponent("IMM 0100")}`, { reason: "Not used by any combination" });

  const all = await queue();
  const by = (kind: string) => all.items.filter((i) => i.kind === kind);
  ok("C2.12 D2 pass: every To review item carries a forms list", all.items.length >= 3 && all.items.every((i) => Array.isArray(i.forms)), all.items.map((i) => [i.kind, i.forms]));
  ok("C2.12 D2 pass: an AI-proposals item belongs to the form of the file AI read (IMM 5257)", by("ai_proposals").some((i) => i.forms.join() === "IMM 5257"), by("ai_proposals").map((i) => i.forms));
  ok("C2.12 D2 pass: a library change about one form belongs to that form", del.status < 300 && by("library_change").some((i) => i.id === `change:${del.body?.id}` && i.forms.join() === "IMM 0100"), by("library_change").map((i) => [i.id, i.forms]));
  ok("C2.12 D2 fail: a held file whose number could not be read belongs to no form (never guessed)", by("held_file").length > 0 && by("held_file").every((i) => i.forms.length === 0), by("held_file").map((i) => i.forms));

  // ── ?form=: one form's items, its own counts and kinds; the number in any spelling the library accepts.
  const one = await queue("&form=IMM%205257");
  ok("C2.12 BR-5 pass: ?form=IMM 5257 lists only its items, with counts and kinds of that set", one.items.length > 0 && one.items.every((i) => i.forms.includes("IMM 5257")) && one.counts.all === one.items.length && Object.values(one.kinds).reduce((a, b) => a + b, 0) === one.items.length && !one.items.some((i) => i.kind === "held_file"), { n: one.items.length, counts: one.counts, kinds: one.kinds });
  const spelled = await queue("&form=imm5257");
  ok("C2.12 BR-5 pass: the number is read as the library writes it (imm5257 = IMM 5257)", spelled.items.length === one.items.length);
  const none = await queue("&form=IMM%201295");
  ok("C2.12 BR-5 fail: a form with nothing waiting shows an empty list and zero counts, not everything", none.items.length === 0 && none.counts.all === 0 && Object.keys(none.kinds).length === 0, { n: none.items.length, counts: none.counts });
  ok("C2.12 BR-5 fail: without ?form= the list is unchanged (every item, all kinds)", all.counts.all === all.items.length && (all.kinds.held_file ?? 0) > 0);
  const bad = await call("GET", `/review-queue?filter=all&form=${"x".repeat(41)}`);
  ok("C2.12 fail: an over-long form number is refused in words (400)", bad.status === 400, bad.status);
  // The same per person: the approver sees the same items' forms (forms do not depend on who asks).
  const other = await queue("&form=IMM%205257", "user-B");
  ok("C2.12 D2 pass: forms do not depend on who asks (the approver sees the same items for IMM 5257)", other.items.map((i) => i.id).sort().join() === one.items.map((i) => i.id).sort().join());

  // ── Review (9f2132bd) Major: a pass and a fail per kind on a queue with every kind open (fillAllKinds, test input). Each
  // item's forms are compared with the records underneath (newest version per line or form field, as effective() reads
  // them); a form outside that set never lists the item.
  await fillAllKinds(PORT, DB);
  const q = await queue();
  const list = (x: string) => (x ? x.split("\n").filter(Boolean).sort() : []);
  const lineForms = (cid: string) => list(sql(`select distinct cf.lineage_key from combination_form cf where cf.combination_id = '${cid}' and cf.version = (select max(v.version) from combination_form v where v.combination_id = cf.combination_id and v.lineage_key = cf.lineage_key) and cf.status <> 'RETIRED'`));
  const fieldForms = (keys: string[]) => list(sql(`select distinct d.form_key from form_field_map m join form_edition e on e.id = m.form_edition_id join gov_form_def d on d.id = e.gov_form_def_id where m.version = (select max(v.version) from form_field_map v where v.form_edition_id = m.form_edition_id and v.data_path = m.data_path) and m.status <> 'RETIRED' and m.canonical_field_key in (${keys.map((k) => `'${k}'`).join(",")})`));
  const formOfLabel = (label: string) => list(sql(`select d.form_key from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where e.edition_label = '${label.replace(/'/g, "''")}'`));
  const rest = (i: Item) => i.id.slice(i.id.indexOf(":") + 1);
  const expected = (i: Item): string[] | null => {
    if (i.kind === "release") return lineForms(sql(`select combination_id from review_submission where id = '${rest(i)}'`));
    if (i.kind === "merge") return fieldForms(sql(`select keep_key || E'\n' || merge_key from field_merge where id = '${rest(i)}'`).split("\n"));
    if (i.kind === "form_fields") return list(sql(`select d.form_key from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where e.id = '${rest(i)}'`));
    if (i.kind === "new_edition" || i.kind === "held_file") return list(sql(`select coalesce(code, '') from intake_item where id = '${rest(i)}'`));
    if (i.kind === "running") return list(sql(`select distinct d.form_key from drafting_job j join source_attachment a on a.id = j.attachment_id join form_edition e on e.edition_label = a.edition and e.workspace_id = a.workspace_id join gov_form_def d on d.id = e.gov_form_def_id where j.batch_id = '${rest(i)}'`));
    if (i.kind === "ai_proposals") return list(sql(`select d.form_key from drafting_job j join source_attachment a on a.id = j.attachment_id join form_edition e on e.edition_label = a.edition and e.workspace_id = a.workspace_id join gov_form_def d on d.id = e.gov_form_def_id where j.id = '${rest(i)}'`));
    if (i.kind === "library_change" && i.id.startsWith("change-batch:")) return [...new Set(sql(`select kind || '|' || key || '|' || coalesce(combination_id::text, '') from library_change where batch_id = '${rest(i)}'`).split("\n").flatMap((r) => { const [k, key] = r.split("|"); return k === "field" || k === "placement_fills" ? fieldForms([key]) : k === "library_form" || k === "form_accepts" ? [key] : []; }))].sort();
    if (i.kind === "library_change") { const [k, key, cid] = sql(`select kind || '|' || key || '|' || coalesce(combination_id::text, '') from library_change where id = '${rest(i)}'`).split("|");
      return k === "field" || k === "placement_fills" ? fieldForms([key]) : k === "library_form" || k === "form_accepts" ? [key] : k === "combination" ? lineForms(cid || key) : []; }
    if (i.kind === "proposals") { const fe = sql(`select coalesce(form_edition, '') || '|' || coalesce(combination_id::text, '') from proposal_item where status = 'waiting' and (coalesce(form_edition, '') = '${i.title.replace(/'/g, "''")}' or combination_id is not null) order by (form_edition is null) limit 1`).split("|");
      return i.title === fe[0] ? formOfLabel(fe[0]) : null; }
    return null;
  };
  const kindsSeen = new Map<string, { right: number; wrong: string[]; nonEmpty: number }>();
  for (const i of q.items) {
    const key = i.kind === "library_change" ? `library_change:${i.id.startsWith("change-batch:") ? "batch" : sql(`select kind from library_change where id = '${rest(i)}'`)}` : i.kind;
    const k = kindsSeen.get(key) ?? { right: 0, wrong: [], nonEmpty: 0 }; kindsSeen.set(key, k);
    const want = expected(i); if (want === null) continue;
    if (want.join() === [...i.forms].sort().join()) k.right++; else k.wrong.push(`${i.id}: ${i.forms} ≠ ${want}`);
    if (i.forms.length) k.nonEmpty++;
  }
  for (const kind of ["release", "merge", "running", "form_fields", "new_edition", "ai_proposals", "proposals", "library_change:field", "library_change:placement_fills", "library_change:combination", "library_change:batch", "library_change:library_form", "library_change:form_accepts"]) {
    const k = kindsSeen.get(kind);
    ok(`C2.12 D2 pass (${kind}): each item's forms are the forms its records name`, !!k && k.right > 0 && !k.wrong.length && k.nonEmpty > 0, k ? { right: k.right, wrong: k.wrong.slice(0, 3), nonEmpty: k.nonEmpty } : "no item of this kind");
    // The fail half: a form outside the item's set never lists it.
    const sample = q.items.find((i) => (i.kind === "library_change" ? `library_change:${i.id.startsWith("change-batch:") ? "batch" : sql(`select kind from library_change where id = '${rest(i)}'`)}` : i.kind) === kind && i.forms.length);
    if (sample) { const outside = ["IMM 0008", "IMM 1294", "IMM 5532", "IMM 9999"].find((c) => !sample.forms.includes(c))!;
      ok(`C2.12 BR-5 fail (${kind}): ?form=${outside}, a form outside its set, does not list it; its own form does`, !(await queue(`&form=${encodeURIComponent(outside)}`)).items.some((x) => x.id === sample.id) && (await queue(`&form=${encodeURIComponent(sample.forms[0])}`)).items.some((x) => x.id === sample.id)); }
  }
  // Plan §7: a release belongs to every form of its combination; a form the combination does not use excludes it.
  const rel = q.items.find((i) => i.kind === "release");
  if (rel) { const lf = lineForms(sql(`select combination_id from review_submission where id = '${rest(rel)}'`));
    const lists = await Promise.all(lf.map((f) => queue(`&form=${encodeURIComponent(f)}`)));
    ok("C2.12 plan §7 pass: a release is listed under each of its combination's forms", lf.length >= 2 && lists.every((l) => l.items.some((x) => x.id === rel.id)), lf); }
  // Review (9f2132bd) m2: a form line taken off a combination (its newest version RETIRED) is no longer one of its forms:
  // the combination's change item stops listing it.
  const comboItem = q.items.find((i) => i.id.startsWith("change:") && sql(`select kind from library_change where id = '${rest(i)}'`) === "combination" && i.forms.length >= 2);
  if (comboItem) {
    const cid = sql(`select coalesce(combination_id::text, key) from library_change where id = '${rest(comboItem)}'`), gone = comboItem.forms[0];
    const ver = Number(sql(`select max(version) from combination_form where combination_id = '${cid}' and lineage_key = '${gone}'`));
    const rm = await call("DELETE", `/combinations/${cid}/forms/${encodeURIComponent(gone)}`, { version: ver });
    const after = (await queue()).items.find((i) => i.id === comboItem.id);
    ok("C2.12 D2 fail (review m2): a form line removed from a combination is no longer one of its forms (before: any version counted)", rm.status < 300 && !!after && !after.forms.includes(gone) && after.forms.length === comboItem.forms.length - 1, { rm: rm.status, gone, before: comboItem.forms, after: after?.forms });
  } else ok("C2.12 set-up: a combination change with two forms or more", false);
  // Review (9f2132bd) m3: a file whose edition label is not "<number> (…)" ("IMM 5881 E (05-2026)") belongs to its form as
  // the library knows it (IMM 5881), looked up through the edition, never parsed from the label. Test input: the form, its
  // edition, a file and a running step reading it.
  const runningBatch = q.items.find((i) => i.kind === "running");
  if (runningBatch) {
    const ws = sql("select id from workspace where key = 'demo'");
    sql(`insert into gov_form_def (id, workspace_id, form_key, display_name) values (gen_random_uuid(), '${ws}', 'IMM 5881', 'C2.12 check form') on conflict do nothing`);
    sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label) select gen_random_uuid(), '${ws}', id, 'IMM 5881 E (05-2026)' from gov_form_def where form_key = 'IMM 5881' and workspace_id = '${ws}' on conflict do nothing`);
    const att5881 = sql(`insert into source_attachment select (jsonb_populate_record(null::source_attachment, to_jsonb(a) || jsonb_build_object('id', gen_random_uuid(), 'edition', 'IMM 5881 E (05-2026)', 'sha256', repeat('5', 64)))).* from source_attachment a where a.edition is not null limit 1 returning id`).split("\n")[0];
    sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, batch_id) select gen_random_uuid(), workspace_id, combination_id, '${att5881}', 'read_form', 'STUB', 'QUEUED', 'user-A', '${rest(runningBatch)}' from source_attachment where id = '${att5881}'`);
    const r5881 = (await queue()).items.find((i) => i.id === runningBatch.id);
    ok("C2.12 D2 fail (review m3): a file labelled 'IMM 5881 E (05-2026)' belongs to IMM 5881, the library's form (before: 'IMM 5881 E', parsed from the label)", !!r5881 && r5881.forms.includes("IMM 5881") && !r5881.forms.includes("IMM 5881 E"), r5881?.forms);
  } else ok("C2.12 set-up: a running AI batch", false);
  const bad2 = await call("GET", "/review-queue?filter=all&form=");
  ok("C2.12 fail (review m4): an empty form number is refused in words, naming the field", bad2.status === 400 && /form number/.test(JSON.stringify(bad2.body)), bad2.body);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
