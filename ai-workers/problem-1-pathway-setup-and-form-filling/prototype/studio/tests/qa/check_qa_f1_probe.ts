// qa lane, /qa after-merge (F1 slice 1): independent API probes of C2.5 portal capture, C3.5 aliases and merges and
// C3.8 channel validation — inputs the builders' suite does not use (French text, a lower-case form code, answers hidden
// in new places, a wrong role, two approvals at once, alias case variants, a merge proposed and approved by one person).
// Its own isolated copy; no browser, no model call. Pages written here are Sample test inputs, never IRCC screens.
//   tsx studio/tests/qa/check_qa_f1_probe.ts [port=4472]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4472), NAME = "qa_f1probe", DB = `xr_studio_${NAME}`;
const STUDIO = join(import.meta.dirname, "..", "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal"), PAGES = join(STUDIO, "var", "qa-pages"); mkdirSync(PAGES, { recursive: true });
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const upload = async (id: string, files: [string, string | Buffer][], actor = "user-A") => {
  const fd = new FormData(); for (const [n, c] of files) fd.append("files", new Blob([typeof c === "string" ? c : new Uint8Array(c)]), n);
  const r = await fetch(`http://localhost:${PORT}/api/captures/${id}/screens`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() };
};
const page = (title: string, body: string) => `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><form id="app">${body}</form></main></body></html>`;
const outcome = (r: any) => r.body?.results?.map((x: any) => `${x.outcome}: ${x.message}`).join(" | ") ?? r.body?.detail;

(async () => {
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "start"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  ok("setup: sample inputs load", (await call("POST", "/demo/load")).status < 300);

  // ---------------------------------------------------------------- C2.5 capture: starting one
  let r = await call("POST", "/captures", { portal: "ircc_portal", form: "imm 5257", title: "Visitor visa" });
  ok("C2.5 a lower-case form code ('imm 5257') is taken as IMM 5257, as 'IMM-5257' is", r.status === 201 && r.body.form === "IMM 5257", { status: r.status, form: r.body?.form, detail: r.body?.detail });
  r = await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Demande de visa de visiteur — été" });
  ok("C2.5 a French title is kept exactly", r.status === 201 && r.body.title === "Demande de visa de visiteur — été", r.body?.title);
  const cap = r.body.id;
  r = await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Approver try" }, "user-B");
  ok("C2.5 wrong role: the approver cannot start a capture (403, plain words)", r.status === 403, r.body?.detail);
  r = await call("POST", `/captures/${cap}/finish`);
  ok("C2.5 finishing with no screen is refused with the next step", r.status === 400 && /Add at least one screen/.test(r.body?.detail), r.body?.detail);

  // ---------------------------------------------------------------- C2.5 capture: answers hidden in pages
  const fr = page("Renseignements personnels", `<label for="nom">Nom de famille</label><input id="nom" name="nom" type="text" required>
    <label for="ville">Ville de naissance (où êtes-vous né·e ?)</label><input id="ville" name="ville" type="text">
    <input type="hidden" name="csrf" value="a8f3c2d9e1">`);
  r = await upload(cap, [["fr-blank.html", fr]]);
  ok("C2.5 a blank French screen is read; a hidden form token is not an answer", /^added/.test(outcome(r)), outcome(r));
  const rec = JSON.stringify(sql(`select record from portal_capture where id='${cap}'`));
  ok("C2.5 the French labels are kept exactly, the hidden token is not kept", rec.includes("Ville de naissance (où êtes-vous né·e ?)") && !rec.includes("a8f3c2d9e1"));
  const hidden: [string, string][] = [
    ["value-attr.html", page("Valeur", `<label for="a">Family name</label><input id="a" type="text" value="Tremblay">`)],
    ["checked.html", page("Coche", `<input type="checkbox" id="b" checked><label for="b">I agree</label>`)],
    ["selected.html", page("Choix", `<label for="c">Country</label><select id="c"><option value="">Choose</option><option value="IN" selected>India</option></select>`)],
    ["date-value.html", page("Date", `<label for="d">Date of birth</label><input id="d" type="date" value="1980-02-03">`)],
    ["data-attr.html", page("Data", `<label for="e">Passport number</label><input id="e" type="text" data-value="AB1234567">`)],
    ["placeholder.html", page("Placeholder", `<label for="f">UCI</label><input id="f" type="text" placeholder="1234-5678">`)],
  ];
  for (const [n, html] of hidden) { r = await upload(cap, [[n, html]]); console.log(`      ${n}: ${outcome(r)?.slice(0, 200)}`); }
  const after = JSON.stringify(sql(`select record from portal_capture where id='${cap}'`));
  ok("C2.5 values in value=, checked, selected and a date value are refused, nothing kept", !/Tremblay|1980-02-03|"IN"/.test(after) && Number(sql(`select count(*) from audit_event where entity='portal screen' and action='refused'`)) >= 4, sql(`select count(*) from audit_event where entity='portal screen' and action='refused'`) + " refusals in the audit");
  ok("C2.5 a value held in a data- attribute (data-value=\"AB1234567\") is not kept", !after.includes("AB1234567"), after.includes("AB1234567") ? "kept" : "not kept");
  r = await upload(cap, [["not-a-page.pdf", readFileSync(join(STUDIO, "..", "..", "official-sources", "ircc", "forms", "imm5669e.pdf"))]]);
  ok("C2.5 a PDF given as a screen is refused in plain words", /refused|Not read/.test(outcome(r) ?? ""), outcome(r));

  // ---------------------------------------------------------------- C2.5 second person
  r = await call("POST", `/captures/${cap}/finish`);
  ok("C2.5 finish: held for a second person", r.status < 300 && /HELD|held/i.test(JSON.stringify(r.body).slice(0, 2000)), r.body?.status ?? r.body?.detail);
  r = await call("POST", `/captures/${cap}/approve`, undefined, "user-A");
  ok("C2.5 the person who captured cannot approve", r.status === 403 || r.status === 409, r.body?.detail);
  const [a1, a2] = await Promise.all([call("POST", `/captures/${cap}/approve`, undefined, "user-C"), call("POST", `/captures/${cap}/approve`, undefined, "user-B")]);
  ok("C2.5 two approvals at the same moment: one online version", Number(sql(`select count(*) from form_edition where channel='ONLINE'`)) === 1 && [a1.status, a2.status].filter((s) => s < 300).length >= 1, [a1.status, a2.status, a1.body?.detail ?? a1.body?.status, a2.body?.detail ?? a2.body?.status]);

  // ---------------------------------------------------------------- C3.5 aliases and merges
  const fields = (await call("GET", "/library/fields")).body as any[];
  const dob = fields.find((f) => f.key === "person.date_of_birth"), other = fields.find((f) => /^person\.(place_of_birth|country_of_birth)/.test(f.key));
  r = await call("POST", `/library/fields/${dob.key}/aliases`, { alias: "Date de naissance" });
  ok("C3.5 a French alias is added to a field", r.status < 300, r.body?.detail ?? r.body?.aliases);
  r = await call("POST", `/library/fields/${other.key}/aliases`, { alias: "DATE DE NAISSANCE" });
  ok("C3.5 the same alias in other capitals on another field is refused (one label, one field)", r.status >= 400, { status: r.status, detail: r.body?.detail });
  r = await call("POST", `/library/fields/${other.key}/aliases`, { alias: "Date-de-naissance" });
  ok("C3.5 the same alias with hyphens on another field is refused", r.status >= 400, { status: r.status, detail: r.body?.detail });
  r = await call("POST", `/library/fields/${dob.key}/aliases`, { alias: "x" }, "user-B");
  ok("C3.5 wrong role: the approver cannot add aliases", r.status === 403, r.body?.detail);
  const texts = fields.filter((f) => f.status === "PUBLISHED" && /^person\./.test(f.key) && f.value_type === "text");
  const pair = texts.slice(-2);
  r = await call("POST", "/library/merges", { keep: pair[0].key, merge: pair[0].key, reason: "the same field twice for a test" });
  ok("C3.5 a field cannot be merged into itself", r.status >= 400, r.body?.detail);
  r = await call("POST", "/library/merges", { keep: pair[0].key, merge: pair[1].key, reason: "qa probe: the two mean the same (test only)" });
  const m = r.body?.id;
  ok("C3.5 a merge is proposed, nothing moves yet", r.status === 201 && !!m, r.body?.detail ?? r.body?.status);
  r = await call("POST", `/library/merges/${m}/approve`, {}, "user-A");
  ok("C3.5 the person who proposed the merge cannot approve it", r.status >= 400, { status: r.status, detail: r.body?.detail });
  const releasedBefore = sql("select string_agg(sha256, ',' order by id) from config_release");
  r = await call("POST", `/library/merges/${m}/approve`, {}, "user-C");
  ok("C3.5 a different person approves: the merged field redirects", r.status < 300 && sql(`select merged_into_key from canonical_field where canonical_field_key='${pair[1].key}' order by version desc limit 1`) === pair[0].key, { status: r.status, detail: r.body?.detail });
  ok("C3.5 released configurations are untouched by the merge", sql("select string_agg(sha256, ',' order by id) from config_release") === releasedBefore);

  // ---------------------------------------------------------------- C3.8 channel validator
  const vv = sql("select id from combination where combination_key='wp.family'");
  const line = sql(`select lineage_key from combination_form where combination_id='${vv}' and status <> 'RETIRED' order by lineage_key limit 1`);
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "ONLINE" });
  ok("C3.8 an Online line is recorded as a draft edit", r.status < 300, r.body?.detail ?? r.body?.channel);
  const review = (await call("GET", `/combinations/${vv}/review`)).body;
  const probs = (review.draft?.problems ?? []).filter((p: any) => p.level === "error").map((p: any) => `${p.item}: ${p.message}`);
  ok("C3.8 an Online line with no portal and no approved online version is an error, in plain words", probs.some((p: string) => /portal|online version/i.test(p)), probs.slice(0, 3));
  r = await call("POST", `/combinations/${vv}/submit`, {});
  ok("C3.8 submission is refused while that error stands", r.status >= 400, r.body?.detail?.slice(0, 200));
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line)}/channel`, { channel: "FAX" });
  ok("C3.8 an unknown channel is refused with the choices", r.status === 400 && /Choose PDF upload, Online or Signed PDF upload/.test(JSON.stringify(r.body)), r.body?.detail);

  console.log(`\n${pass} pass, ${fail} fail`);
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "stop"]);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
