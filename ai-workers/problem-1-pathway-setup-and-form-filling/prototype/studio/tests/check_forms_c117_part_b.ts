// C11.7 part B (P-109 as amended by P-112, P-171 (3), P-108, P-319): after Demo › Reset to the six, the Provincial nominee
// › Express Entry stream combination is the IRCC permanent-residence application from its paper twins. Its lines come
// from the sample file (samples/wave1.json "lines"; no form number in code), added by the loader through the screens'
// own services as the author: each library form by hand (FormLibrary.attach), IMM 5669 and IMM 5406 set Online
// (Forms.setChannel), and the provincial nomination certificate named on the Documents tab, where a type the library does
// not hold waits as one library proposal for a second person (C3.6): accepted, the author adds the required line. A
// passing and a failing case per rule. Replay only, no AI call (US$0).
//   zsh studio/tools/isolated.sh forms_c117b 4462 start && tsx studio/tests/check_forms_c117_part_b.ts 4462 xr_studio_forms_c117b
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4462), DB = process.argv[3] ?? "xr_studio_forms_c117b";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const n = (q: string) => Number(sql(q) || 0);
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? r.body?.title ?? "");

type Lines = { forms: { code: string; who?: string; channel?: string }[]; documents: { name: string; who: string }[] };
/** The sample file's lines for the Provincial nominee (the test reads the same data the loader does, P-319). */
const six = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "wave1.json"), "utf8"));
const setup = six.programs.flatMap((p: any) => p.categories).map((c: any) => c.setup).find((s: any) => s?.lines);
const lines = setup.lines as Lines;

(async () => {
  const r6 = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  ok("C11.7 part B: Demo › Reset to the six answers 2xx at US$0, and reports the lines it added by hand", r6.status < 300 && r6.body?.cost_usd === 0 && Array.isArray(r6.body?.lines_by_hand) && r6.body.lines_by_hand.length === 1, { status: r6.status, message: words(r6), lines: r6.body?.lines_by_hand });
  const pnp = sql(`select id from combination where combination_key = '${setup.key}'`);
  const formsOn = () => sql(`select string_agg(g.form_key || '|' || f.who || '|' || f.channel || '|' || f.origin || '|' || f.status || '|' || f.updated_by, ',' order by g.form_key) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp}'`).split(",").filter(Boolean);
  const on = formsOn();
  const codes = on.map((l) => l.split("|")[0]);

  // Rule 1 (P-109): the five paper twins, from the library, as the sample file names them; nothing else is put on.
  ok("C11.7 part B pass (P-109): the Provincial nominee has exactly the sample file's library forms as lines (IMM 0008, 5669, 5406, 0008 DEP, 5476)", codes.length === lines.forms.length && lines.forms.every((f) => codes.includes(f.code)), on);
  ok("C11.7 part B fail (P-109): no Ontario nomination form and no form outside the sample's lines (IMM 5562, 5409, 5475 stay in the library, not on the combination)", !codes.some((c) => !lines.forms.some((f) => f.code === c)) && n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp}' and (g.form_key !~ '^IMM' or g.display_name ~* 'ontario|OINP')`) === 0, codes);
  ok("C11.7 part B (P-108, P-33): each line is a person's draft (added by hand by the author, user-A), never released by the load", on.every((l) => /\|HUMAN\|DRAFT\|user-A$/.test(l)) && n(`select count(*) from config_release`) === 0, on);
  ok("C11.7 part B (Sample): whose form each line is follows the sample file", lines.forms.every((f) => on.some((l) => l.startsWith(`${f.code}|${f.who}|`))), on);

  // Rule 2 (P-171 (3)): IMM 5669 and IMM 5406 are Online lines; the other three are PDF uploads.
  const online = on.filter((l) => l.split("|")[2] === "ONLINE").map((l) => l.split("|")[0]).sort();
  ok("C11.7 part B pass (P-171 (3), Sample): IMM 5669 and IMM 5406 are Online lines", JSON.stringify(online) === JSON.stringify(lines.forms.filter((f) => f.channel === "ONLINE").map((f) => f.code).sort()), online);
  ok("C11.7 part B fail (P-171 (3)): no other line is Online (IMM 0008, 0008 DEP and 5476 stay PDF uploads)", on.filter((l) => !lines.forms.some((f) => f.channel && l.startsWith(`${f.code}|`))).every((l) => l.split("|")[2] === "PDF_UPLOAD"), on);
  const ch = await call("GET", `/combinations/${pnp}/channels`);
  ok("C11.7 part B (P-107): the Forms tab's channel view shows no error for these lines (Online is a warning only)", ch.status === 200 && !(ch.body?.problems ?? []).some((p: any) => p.level === "error"), { status: ch.status, problems: ch.body?.problems });

  // Rule 3 (P-108, P-109, C3.6): the nomination certificate waits as one library proposal; the load writes no type itself.
  const doc = lines.documents[0];
  const prop = sql(`select id || '|' || basis || '|' || status from proposal_item where kind = 'document_type' and combination_id = '${pnp}' and payload->>'name' = '${doc.name.replace(/'/g, "''")}'`).split("\n").filter(Boolean);
  ok("C11.7 part B pass (P-109, P-108): the provincial nomination certificate waits as one library proposal (Sample) for a second person", prop.length === 1 && /\|SAMPLE\|waiting$/.test(prop[0]), prop);
  ok("C11.7 part B fail (P-108): the load wrote no document type and no document line itself", n(`select count(*) from document_type`) === 0 && n(`select count(*) from document_requirement`) === 0);
  const pid = prop[0]?.split("|")[0];
  const self = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, "user-O");
  ok("C11.7 part B fail: a case officer (no configuration duty) cannot accept it, and nothing lands", self.status === 403 && n(`select count(*) from document_type`) === 0, { status: self.status, message: words(self) });
  const acc = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, "user-B");
  const key = acc.body?.items?.[0]?.landedAs as string | undefined;
  ok("C11.7 part B: a second person (user-B) accepts it and the library holds the type", acc.status < 300 && !!key && n(`select count(*) from document_type where document_type_key = '${key}'`) >= 1, { status: acc.status, message: words(acc), key });
  const add = await call("POST", `/combinations/${pnp}/requirements`, { documentTypeKey: key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: doc.who, providedBy: "client" });
  ok("C11.7 part B pass (P-109): the author then adds it, and the provincial nomination certificate is a required document on the Provincial nominee", add.status < 300 && n(`select count(*) from document_requirement d left join document_type t on t.document_type_key = d.document_type_key and t.workspace_id = d.workspace_id where d.combination_id = '${pnp}' and d.is_required and (coalesce(t.name, d.document_type_key) ilike '%nominat%')`) >= 1, { status: add.status, message: words(add) });
  const twice = await call("POST", `/combinations/${pnp}/requirements`, { documentTypeName: doc.name, attachMode: "COMBINATION_MANDATORY", appliesToRoles: doc.who, providedBy: "client" });
  ok("C11.7 part B fail (C3.6): naming it again reuses the library's type, never a second proposal", n(`select count(*) from proposal_item where kind = 'document_type' and payload->>'name' = '${doc.name.replace(/'/g, "''")}'`) === 1, { status: twice.status, message: words(twice) });

  // The steps the load used refuse what a person would be refused.
  const notHeld = await call("POST", `/combinations/${pnp}/forms`, { formKey: "IMM 9999" });
  ok("C11.7 part B fail: adding a form the library does not hold is refused in words (the load stops on the same words)", notHeld.status === 404 && /not in the library/i.test(words(notHeld)), { status: notHeld.status, message: words(notHeld) });
  const again = await call("POST", `/combinations/${pnp}/forms`, { formKey: lines.forms[0].code });
  ok("C11.7 part B fail: adding a form already on the combination is refused (409), nothing doubled", again.status === 409 && formsOn().length === lines.forms.length, { status: again.status, message: words(again) });
  const client = await call("PATCH", `/combinations/${pnp}/forms/${encodeURIComponent(online[0] ?? "IMM 5669")}/channel`, { channel: "PDF_UPLOAD" }, "user-P");
  ok("C11.7 part B fail: a client cannot change a line's channel (403), it stays Online", client.status === 403 && formsOn().filter((l) => l.split("|")[2] === "ONLINE").length === online.length, { status: client.status });

  // Saved field maps still replay at US$0 (#787), and Reset to the six gives the same lines again.
  ok("C11.7 (P-227): every read form's saved field map replays (none waits for Draft with AI), US$0", Array.isArray(r6.body?.drafts?.waiting_for_draft_with_ai) && r6.body.drafts.waiting_for_draft_with_ai.length === 0 && r6.body.drafts.replayed > 0 && n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && Number(sql(`select coalesce(sum(cost_usd), 0) from drafting_job`)) === 0, r6.body?.drafts);
  const r6b = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  const pnp2 = sql(`select id from combination where combination_key = '${setup.key}'`);
  const on2 = sql(`select string_agg(g.form_key || '|' || f.who || '|' || f.channel, ',' order by g.form_key) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp2}'`);
  ok("C11.7 part B: Reset to the six again gives the same lines, and the certificate waits again (no type kept)", r6b.status < 300 && on2 === on.map((l) => l.split("|").slice(0, 3).join("|")).join(",") && n(`select count(*) from document_type`) === 0 && n(`select count(*) from proposal_item where kind = 'document_type' and status = 'waiting'`) === 1, { status: r6b.status, on2 });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
