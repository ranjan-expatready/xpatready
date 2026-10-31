// F2 C2.12 slice 1 (forms lane; the agreed F3 plan, D2 and BR-5): every To review item names the forms it belongs to
// (`forms: string[]`), and `?form=` lists one form's items with that form's counts and kinds. The rail of the guided
// path (later slices) reads its steps from these items, so the rail and To review name the same next step. Items keep
// their words, states and order (the earlier To review suites stay green). A pass and a fail per rule. US$0 (one saved AI
// answer replayed, no model call).
//   zsh studio/tools/isolated.sh forms_c212 4452 start && tsx studio/tests/check_forms_c212_queue_forms.ts 4452 xr_studio_forms_c212
import { execFileSync } from "node:child_process";

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
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
