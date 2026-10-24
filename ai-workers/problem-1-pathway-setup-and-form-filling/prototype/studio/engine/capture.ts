// Portal capture records and portal twins (P-66, F1 slice 1). Pure functions, no database:
//  - the capture record (contracts/portal-capture.v1.schema.json) built from the screens a reader returned;
//  - its fingerprint: the checksum of the normalised structure (titles, inputs, labels, types, rules, choices, order),
//    never of the files, because the same blank screen saved twice differs byte for byte (session tokens, times);
//  - the field-by-field difference between two versions (P-66 §2.3: added, removed, reworded, rule or choice changes);
//  - the readable review document for the immigration expert (HTML; the API prints it to PDF).
// A record can never carry an answer: the contract has no place for one and noAnswers() refuses any that slipped in.
// The record's identity (fingerprint) and its "no answer" check live in prototype/contracts/portal-capture.ts, shared
// with the guarded drafting path, which admits an approved screen inventory only with this fingerprint (F1 slice 2).
import { captureSchemaErrors, fingerprint, noAnswers, structure, type CaptureInput, type CaptureRecord } from "../../contracts/portal-capture.ts";
import { CAPTURE_CONTRACT, CHANNEL_WORDS, portalLabel } from "../contracts/forms.ts";

export { fingerprint, noAnswers, structure };
export type { CaptureInput, CaptureOption, CaptureRecord, CaptureScreen } from "../../contracts/portal-capture.ts";

/** Contract errors in plain words ("screen 2, input 3: …"); empty when the record is valid. */
export function contractProblems(r: unknown): string[] {
  const errors = captureSchemaErrors(r);
  if (!errors.length) {
    // The element id is each input's identity in the capture (review 5): it appears once.
    const ids = (r as CaptureRecord).screens.flatMap((s) => s.inputs.map((i) => i.id));
    const dup = [...new Set(ids.filter((id, n) => ids.indexOf(id) !== n))];
    return dup.length ? [`the element id ${dup.slice(0, 3).join(", ")} appears more than once (each input has its own id)`] : [];
  }
  return errors.slice(0, 8).map((e) => {
    const at = e.instancePath.replace(/^\/screens\/(\d+)/, (_m, n) => `screen ${Number(n) + 1}`).replace(/\/inputs\/(\d+)/, (_m, n) => `, input ${Number(n) + 1}`).replace(/^\//, "");
    return `${at || "record"}: ${e.keyword === "additionalProperties" ? `"${(e.params as { additionalProperty?: string }).additionalProperty}" is not part of a capture (a capture holds structure only)` : e.message}`;
  });
}

/** Screens in the order they were added; each keeps its source file's checksum (the file itself is not kept). */
export function buildRecord(meta: { portal: string; form: string; title: string; applicationType?: string | null; way: string }, screens: { title: string; inputs: CaptureInput[]; file: string; sha256: string; way: string }[]): CaptureRecord {
  return {
    contract: CAPTURE_CONTRACT, portal: meta.portal, form: meta.form, title: meta.title, application_type: meta.applicationType ?? null, way: meta.way,
    screens: screens.map((s, i) => ({ key: `s${String(i + 1).padStart(2, "0")}`, order: i + 1, title: s.title, source: { way: s.way, file: s.file, sha256: s.sha256 }, inputs: s.inputs.map((x, j) => ({ ...x, order: j + 1 })) })),
  };
}

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export type Difference = { input: string; screen: string; change: "added" | "removed" | "reworded" | "moved" | "type" | "required" | "rules" | "options"; was?: unknown; now?: unknown };
/** Field-by-field difference between an approved version and a new capture, by the page's own input id. */
export function difference(before: CaptureRecord, after: CaptureRecord): Difference[] {
  const flat = (r: CaptureRecord) => new Map(r.screens.flatMap((s) => s.inputs.map((i) => [i.id, { ...i, screen: s.title }] as const)));
  const a = flat(before), b = flat(after), out: Difference[] = [];
  for (const [id, x] of b) {
    const y = a.get(id);
    if (!y) { out.push({ input: id, screen: x.screen, change: "added", now: x.label }); continue; }
    if (norm(y.label) !== norm(x.label) || norm(y.group) !== norm(x.group)) out.push({ input: id, screen: x.screen, change: "reworded", was: [y.group, y.label].filter(Boolean).join(" › "), now: [x.group, x.label].filter(Boolean).join(" › ") });
    if (y.screen !== x.screen) out.push({ input: id, screen: x.screen, change: "moved", was: y.screen, now: x.screen });
    if (y.type !== x.type) out.push({ input: id, screen: x.screen, change: "type", was: y.type, now: x.type });
    if (y.required !== x.required) out.push({ input: id, screen: x.screen, change: "required", was: y.required, now: x.required });
    if ((y.max_length ?? null) !== (x.max_length ?? null) || (y.min_length ?? null) !== (x.min_length ?? null) || (y.pattern ?? null) !== (x.pattern ?? null)) out.push({ input: id, screen: x.screen, change: "rules", was: { max_length: y.max_length ?? null, min_length: y.min_length ?? null, pattern: y.pattern ?? null }, now: { max_length: x.max_length ?? null, min_length: x.min_length ?? null, pattern: x.pattern ?? null } });
    const oa = new Map((y.options ?? []).map((o) => [o.code, norm(o.label)])), ob = new Map((x.options ?? []).map((o) => [o.code, norm(o.label)]));
    const added = [...ob.keys()].filter((c) => !oa.has(c)), removed = [...oa.keys()].filter((c) => !ob.has(c)), relabelled = [...ob.keys()].filter((c) => oa.has(c) && oa.get(c) !== ob.get(c));
    if (added.length || removed.length || relabelled.length) out.push({ input: id, screen: x.screen, change: "options", was: { removed, relabelled: relabelled.map((c) => [c, oa.get(c)]) }, now: { added: added.map((c) => [c, ob.get(c)]), relabelled: relabelled.map((c) => [c, ob.get(c)]) } });
  }
  for (const [id, y] of a) if (!b.has(id)) out.push({ input: id, screen: y.screen, change: "removed", was: y.label });
  return out;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** The readable review document (P-66 §0): every screen and question in portal order, with types, rules, choices and
 *  codes, the difference from the approved version, and what the reviewer approves. Plain HTML, printed to PDF. */
export function reviewHtml(c: { id: string; status: string; capturedBy: string; capturedOn: string; fingerprint: string; record: CaptureRecord; difference?: Difference[] | null; changes?: string | null; sample: boolean }) {
  const r = c.record, n = r.screens.reduce((a, s) => a + s.inputs.length, 0);
  const diff = c.difference?.length ? `<h2>What changed since ${esc(c.changes)}</h2><table><tr><th>Screen</th><th>Input</th><th>Change</th><th>Was</th><th>Now</th></tr>${c.difference.map((d) => `<tr><td>${esc(d.screen)}</td><td><code>${esc(d.input)}</code></td><td>${esc(d.change)}</td><td>${esc(typeof d.was === "string" ? d.was : JSON.stringify(d.was ?? ""))}</td><td>${esc(typeof d.now === "string" ? d.now : JSON.stringify(d.now ?? ""))}</td></tr>`).join("")}</table>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.form)} online · ${esc(portalLabel(r.portal))} · review</title>
<style>body{font:11pt/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2933;margin:28px}h1{font-size:17pt;margin:0 0 4px}h2{font-size:13pt;margin:22px 0 6px;border-bottom:1px solid #cbd2d9;padding-bottom:3px}
.meta{color:#52606d;font-size:10pt}.sample{background:#fff4e5;border:1px solid #f0b429;padding:6px 10px;margin:10px 0;font-size:10pt}table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:4px 0 10px}
th,td{border:1px solid #d9e2ec;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f0f4f8}code{font-size:9pt}.approve{border:1px solid #9fb3c8;padding:8px 10px;margin-top:18px;font-size:10pt}</style></head><body>
<h1>${esc(r.form)} · ${esc(r.title)}</h1>
<div class="meta">Online version captured from the ${esc(portalLabel(r.portal))} · ${esc(r.application_type ?? "")} · ${r.screens.length} screens, ${n} questions · captured ${esc(c.capturedOn)} by ${esc(c.capturedBy)} (${esc(r.way.replace("_", " "))}) · status ${esc(c.status)}<br>Fingerprint <code>${esc(c.fingerprint.slice(0, 16))}…</code> · capture ${esc(c.id)}</div>
${c.sample ? `<div class="sample"><b>Sample.</b> Made from prototype fixtures written to look like portal screens; not a real IRCC screen. No reuse rate is claimed from it.</div>` : ""}
<p class="meta">Structure only: labels, element ids, types, rules and choices. A screen holding a typed value, a tick, a chosen option, text in a text area, or text that looked like a client's details was refused and not kept. The reader cannot rule out every answer written into a label or help text: check that none appears. Channel of the lines that use it: ${esc(CHANNEL_WORDS.ONLINE)}.</p>
${diff}
${r.screens.map((s) => `<h2>Screen ${s.order} · ${esc(s.title)}</h2><table><tr><th>#</th><th>Question</th><th>Element id</th><th>Type</th><th>Required</th><th>Rules</th><th>Choices (code = label)</th><th>Help</th></tr>${s.inputs.map((i) => `<tr><td>${i.order}</td><td>${esc([i.group, i.label].filter(Boolean).join(" › "))}${i.part ? ` <i>(date part ${i.part})</i>` : ""}</td><td><code>${esc(i.id)}</code></td><td>${esc(i.type)}</td><td>${i.required ? "yes" : "no"}</td><td>${esc([i.min_length ? `min ${i.min_length}` : "", i.max_length ? `max ${i.max_length}` : "", i.pattern ? `pattern ${i.pattern}` : ""].filter(Boolean).join("; "))}</td><td>${(i.options ?? []).map((o) => `<code>${esc(o.code)}</code> = ${esc(o.label)}`).join("<br>")}</td><td>${esc(i.help ?? "")}</td></tr>`).join("")}</table><div class="meta">Source: ${esc(s.source.file)} (${esc(s.source.way.replace("_", " "))}, checksum ${esc(s.source.sha256.slice(0, 12))}…)</div>`).join("")}
<div class="approve"><b>The reviewer approves</b> that these screens, questions, choices and codes are what the portal shows for this application, and that no answer appears anywhere. Approval makes it an online version of ${esc(r.form)}; its shared fields are then found from the PDF twin and the library, a person accepts them, and a different person releases.</div>
</body></html>`;
}
