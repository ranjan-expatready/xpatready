// C9.5 pack helper (acceptance/C9.5.test.ts): a later Sample release of Visitor visa made through the author's own routes
// (Library › field, Form fields › decision, Documents › remove, then Submit, the second person's sign-off and Approve), so
// the pack has a document line removed, a field's answer type changed and a form whose form fields are filled
// differently, none of which the checkpoint's release 2 holds (challenge M7). Every value is Sample (AGENTS.md rule 4).
import { APPROVER, AUTHOR, REVIEWER, call, sql } from "./m3.ts";

export type SampleRelease = { version: number | null; steps: { step: string; status: number; detail?: string }[] };
const said = (r: { status: number; body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely, as in the other packs

/** `map`: a form whose first form field decided "not a fact" is decided "filled by hand" instead; `removeLine`: a document
 *  line's lineage removed; `typeOf`: a shared field whose answer type changes. Returns the new release's version. */
export async function sampleRelease(vv: string, o: { map?: string; removeLine?: string; typeOf?: { field: string; to: string } }): Promise<SampleRelease> {
  const steps: SampleRelease["steps"] = [];
  const step = (s: string, r: { status: number; body: any }) => { steps.push({ step: s, status: r.status, ...(r.status >= 300 ? { detail: said(r).slice(0, 300) } : {}) }); return r; }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const before = Number(sql(`select coalesce(max(version), 0) from config_release where combination_id='${vv}'`) ?? 0);
  if (o.typeOf) step(`type ${o.typeOf.field} → ${o.typeOf.to}`, await call("PATCH", `/library/fields/${o.typeOf.field}`, { valueType: o.typeOf.to }, AUTHOR));
  if (o.map) {
    const snap = (await call("GET", `/combinations/${vv}/config?mode=draft`, undefined, AUTHOR)).body?.snapshot;
    const label: string | undefined = (snap?.field_maps ?? []).find((m: { form_number: string; channel?: string }) => m.form_number === o.map && m.channel !== "ONLINE")?.form_edition;
    const ed = label ? sql(`select id from form_edition where edition_label='${label.replace(/'/g, "''")}' and channel='PDF' limit 1`) : null;
    const fields = ed ? ((await call("GET", `/editions/${ed}/form-fields`, undefined, AUTHOR)).body?.fields ?? []) as { dataPath: string; outcome: string }[] : [];
    // One form field's decision flips (not a fact → filled by hand, else filled by hand → not a fact): the form's field map
    // changes, its channel and signing do not. A field the form's own rules refuse to flip (a background question) is
    // skipped for the next one.
    let done: { status: number; body: any } = { status: 0, body: { detail: `${o.map} has no form field decided "not a fact" or "filled by hand"` } }; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const f of [...fields.filter((x) => x.outcome === "not_a_fact"), ...fields.filter((x) => x.outcome === "by_hand")]) {
      done = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: f.dataPath, decision: f.outcome === "not_a_fact" ? "by_hand" : "not_a_fact", reason: "Sample: decided differently from this release on (C9.5 pack)" }, AUTHOR);
      if (done.status < 300) break;
    }
    step(`map ${o.map}: one form field decided differently`, done);
  }
  if (o.removeLine) step(`remove ${o.removeLine}`, await call("PATCH", `/combinations/${vv}/requirements/${encodeURIComponent(o.removeLine)}`, { retire: true, attachMode: "COMBINATION_MANDATORY" }, AUTHOR));
  for (const ch of (sql(`select id from library_change where status='WAITING' order by proposed_at`) ?? "").split("\n").filter(Boolean))
    step("library change approved", await call("POST", `/library/changes/${ch}/approve`, { note: "Approved by the C9.5 pack as the second person (Sample)." }, APPROVER));
  const sub = step("submit", await call("POST", `/combinations/${vv}/submit`, { note: "C9.5 pack: a later Sample release" }, AUTHOR));
  if (sub.status >= 300) return { version: null, steps };
  const changes = ((await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission?.changeSummary ?? []) as { kind: string; key: string }[];
  for (const c of changes) await call("POST", `/combinations/${vv}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER);
  step("approve", await call("POST", `/combinations/${vv}/approve`, {}, APPROVER));
  const after = Number(sql(`select coalesce(max(version), 0) from config_release where combination_id='${vv}'`) ?? 0);
  return { version: after > before ? after : null, steps };
}
