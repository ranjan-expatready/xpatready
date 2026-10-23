// P3 review and release core (W1 5.1 review workbench, 5.2 sign-off, 5.3 approve and publish; 4.1 report).
// Pure functions over a draft configuration and an append-only decision log, so every rule is testable
// without the screen. Demonstration-only storage (JSON files); the product uses its CountryPackDraft
// tables (implementation design §6.1). The people are simulated users, labelled on screen.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, canRelease } from "../contracts/rules.ts";

export const PROTOTYPE = join(import.meta.dirname, "..");
export const SOLUTION = join(PROTOTYPE, "..");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

export type Actor = { user_id: string; role: string; name: string; duties: string[] };
/** Simulated users (labelled "Simulated" on screen). Roles from the team's staff roles; the SME is a duty of
 *  a Content publisher, not a seventh role (D254). */
export const ACTORS: Actor[] = [
  { user_id: "user-A", role: "content_publisher", name: "Content publisher A (ran the AI drafting: the author)", duties: ["review"] },
  { user_id: "user-C", role: "content_publisher", name: "Content publisher C (Immigration SME duty)", duties: ["review", "sme"] },
  { user_id: "user-B", role: "content_publisher", name: "Content publisher B (second person: approver)", duties: ["review"] },
  { user_id: "user-PO", role: "platform_owner", name: "Platform Owner", duties: ["review"] },
];
export const AUTHOR = "user-A";
export const actor = (id: string) => ACTORS.find((a) => a.user_id === id);

export type Item = {
  id: string; kind: string; group: string; title: string; proposal: any;
  source: { file: string; sha256?: string; snippet: string; found: boolean; note?: string };
  flags: string[]; needs_sme: boolean; alternatives: { label: string; value: any; from_run: string }[];
};
export type Decision = {
  item_id: string; decision: "accepted" | "corrected" | "left_unresolved" | "returned" | "sme_signed";
  by: string; at: string; reason?: string; instruction?: string; chosen?: number;
};

const read = (rel: string) => readFileSync(join(SOLUTION, rel), "utf8");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
function snippet(text: string, quote: string): { snippet: string; found: boolean } {
  const t = norm(text), q = norm(quote);
  const i = t.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return { snippet: q, found: false };
  return { snippet: `${i > 160 ? "…" : ""}${t.slice(Math.max(0, i - 160), i)}[[${t.slice(i, i + q.length)}]]${t.slice(i + q.length, i + q.length + 160)}${i + q.length + 160 < t.length ? "…" : ""}`, found: true };
}

/** Other live trials' proposals for the same box, where they differ from the draft's (5.1: choose among proposals). */
function trialProposals(job: string, exceptRun: string) {
  const dir = join(PROTOTYPE, "p2", "runs");
  const names = readdirSync(dir).filter((f) => f.startsWith(`${job}-live-`) && f.endsWith(".json"));
  const pick = names.filter((f) => !f.endsWith(".reconverted.json")).map((f) => (names.includes(f.replace(/\.json$/, ".reconverted.json")) ? f.replace(/\.json$/, ".reconverted.json") : f));
  return pick.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8"))).filter((e) => e.contract_valid && e.drafting_run.run_id !== exceptRun)
    .map((e) => ({ run: e.drafting_run.run_id as string, entries: new Map<string, any>((e.drafting_run.entries ?? []).map((x: any) => [`${x.data_path}|${x.row ?? 0}`, x])),
      fields: new Map<string, any>((JSON.parse(e.raw_output).canonical_fields ?? []).map((f: any) => [f.id, f])) }));
}
// What counts as a disagreement between trials: outcome, person, row and the kind of transform. Each trial
// names its own canonical fields and transforms, so names alone are not a disagreement.
const tclass = (t: unknown) => { const s = String(t ?? "").toLowerCase(); return !s ? "" : /code|yes_no/.test(s) ? "code" : /date|yyyy/.test(s) ? "date" : /deriv|\bcount\b|count_|exists|no_children|has_/.test(s) ? "derived" : "text"; };
const sig = (e: any) => JSON.stringify([e.outcome, e.person ?? null, e.row ?? 0, tclass(e.transform)]);

export function buildItems(config: any): Item[] {
  const items: Item[] = [];
  const flagged = new Map<string, string[]>();
  for (const u of config.unresolved ?? []) flagged.set(u.item, [...(flagged.get(u.item) ?? []), u.reason]);

  const library = new Set<string>((config.canonical_fields ?? []).map((f: any) => f.id));
  // Field maps: every entry is new in the first combination (5.1 r1, r2).
  for (const m of config.field_maps ?? []) {
    const job = (m.drafting_run_id as string).replace(/-live-.*$/, "");
    const inv = JSON.parse(read(`prototype/p1/inventory/${job.replace("c1-fieldmap-", "").replace("imm5257-1", "imm5257_1")}e.inventory.json`));
    const box = new Map<string, any>((inv.fields ?? []).filter((f: any) => f.data_path).map((f: any) => [f.data_path, f]));
    const others = trialProposals(job, m.drafting_run_id);
    for (const e of m.entries) {
      const f = box.get(e.data_path) ?? {};
      // A looked-up list or a radio group holds [label, value] pairs; a choice list holds [labels, values] (found in P4).
      const pairs = f.options_resolved ?? (f.ui === "exclGroup" ? f.options : null);
      const opts = (pairs ? pairs.map((o: any) => o?.[0]) : ((f.options ?? [])[0] ?? [])).filter((o: unknown) => String(o ?? "").trim());
      const alts = new Map<string, { label: string; value: any; from_run: string }>();
      for (const o of others) {
        const x = o.entries.get(`${e.data_path}|${e.row ?? 0}`);
        if (x && sig(x) !== sig(e) && !alts.has(sig(x))) {
          // The correction keeps this library's field: the other trial's fact is used only if this library has it.
          const fact = x.outcome === "mapped" ? (library.has(x.fact) ? x.fact : e.fact ?? x.fact) : undefined;
          // A field this library lacks comes with its definition from that trial's library (added on release).
          const newField = x.outcome === "mapped" && !library.has(fact) ? o.fields.get(fact) : undefined;
          const value = { ...e, outcome: x.outcome, confidence: x.confidence, ...(newField ? { new_field: { ...newField, proposed_by: [o.run] } } : {}), ...(x.outcome === "mapped" ? { person: x.person, fact, transform: x.transform, evidence: x.evidence ?? e.evidence } : { person: undefined, fact: undefined, transform: undefined, evidence: undefined, unresolved_reason: x.unresolved_reason }), row: x.row };
          for (const k of Object.keys(value)) if ((value as any)[k] === undefined) delete (value as any)[k];
          alts.set(sig(x), { label: `${x.outcome}${x.person ? ` · ${x.person}` : ""}${fact ? ` · ${fact}` : ""}${x.transform ? ` · ${x.transform}` : ""}${x.unresolved_reason ? ` · "${String(x.unresolved_reason).slice(0, 90)}"` : ""}`, value, from_run: o.run });
        }
      }
      const flags = [...(e.outcome === "unresolved" ? ["unresolved"] : []), ...(e.confidence === "low" ? ["low confidence"] : []), ...(alts.size ? ["trials disagree"] : []),
        ...(flagged.get(e.data_path) ?? []).filter((r) => /quote not found/.test(r)).map(() => "quote not found")];
      items.push({
        id: `map:${m.form_edition}:${e.data_path}:${e.row ?? 0}`, kind: "mapping", group: `Field map · ${m.form_edition}`,
        title: `${f.caption || "(no caption)"}${f.heading ? ` — under "${String(f.heading).slice(0, 60)}"` : ""}`,
        proposal: e, needs_sme: false, alternatives: [...alts.values()],
        source: { file: inv.summary.file, sha256: inv.summary.sha256, snippet: [`box ${e.data_path}`, f.caption && `caption: ${f.caption}`, f.heading && `heading: ${f.heading}`, opts.length ? `options: ${opts.join(" | ")}` : "", f.presence && `presence: ${f.presence}`, f.max_chars ? `limit: ${f.max_chars} characters` : ""].filter(Boolean).join("\n"), found: true },
        flags,
      });
    }
  }
  // Canonical fields (3.1): one library meaning each; 'decide' items cannot publish undecided (5.1 r7).
  const used = new Map<string, string[]>();
  for (const m of config.field_maps ?? []) for (const e of m.entries) if (e.fact) used.set(e.fact, [...(used.get(e.fact) ?? []), `${m.form_edition} ${String(e.data_path).split(".").slice(-2).join(".")}`]);
  for (const f of config.canonical_fields ?? []) items.push({
    id: `field:${f.id}`, kind: "canonical field", group: "Canonical fields", title: f.id, proposal: f, needs_sme: false, alternatives: [],
    source: { file: "used by", snippet: (used.get(f.id) ?? ["(no form box; proposed by a rule or check)"]).slice(0, 6).join("\n"), found: true },
    flags: f.decide ? ["decide"] : [],
  });
  // Forms, documents, rules, checks: cited official passages; rules, document conditions and values need the SME (5.2).
  const textOf = (file: string) => { try { const j = JSON.parse(read(file)); return typeof j.text === "string" ? j.text : (j.fields ?? []).map((x: any) => `${x.caption ?? ""} ${x.heading ?? ""}`).join("\n"); } catch { return ""; } };
  const cited = (file: string, quote: string) => {
    if (String(file).startsWith("prototype/p2/runs/")) return { file, snippet: quote, found: false, note: "cites an earlier AI draft, not an official file (D21)" };
    const s = snippet(textOf(file), quote);
    return { file, ...s };
  };
  (config.forms ?? []).forEach((x: any, i: number) => items.push({ id: `form:${i}:${x.form_number}`, kind: "form", group: "Forms", title: `${x.form_number} — ${x.title} (${x.status}, ${x.who})`, proposal: x, needs_sme: x.status !== "always", alternatives: [], source: cited(x.source_file, x.source_quote), flags: [] }));
  (config.document_requirements ?? []).forEach((x: any, i: number) => items.push({ id: `doc:${i}`, kind: "document", group: "Document requirements", title: `${x.document_type} (${x.base_or_conditional}, ${x.who})`, proposal: x, needs_sme: x.base_or_conditional === "conditional", alternatives: [], source: cited(x.source_file, x.source_quote), flags: [] }));
  (config.rules ?? []).forEach((x: any, i: number) => items.push({ id: `rule:${i}`, kind: x.kind === "rule" ? "rule" : x.kind, group: "Conditional rules", title: `${x.kind}: ${x.when_plain ?? ""} → ${x.then}`, proposal: x, needs_sme: true, alternatives: [], source: cited(x.source_file, x.source_quote), flags: x.kind === "uncertain" ? ["uncertain: two readings"] : [] }));
  (config.derived_fields ?? []).forEach((x: any) => items.push({ id: `derived:${x.id}:${x.calculation}`, kind: "calculation", group: "Calculations", title: `${x.id} = ${x.calculation}(${x.inputs.join(", ")}) at ${x.reference}`, proposal: x, needs_sme: false, alternatives: [], source: { file: "AIW-D264", snippet: x.plain, found: true }, flags: x.executable ? [] : ["no tested helper: recorded dependency, not executable"] }));
  (config.sections ?? []).forEach((x: any) => items.push({ id: `section:${x.id}`, kind: "section", group: "Sections", title: x.title, proposal: x, needs_sme: false, alternatives: [], source: { file: "section meaning", snippet: x.meaning, found: true }, flags: [] }));
  (config.placements ?? []).forEach((x: any) => items.push({ id: `place:${x.fact}`, kind: "placement", group: "Placements and collected-from", title: `${x.fact} → ${x.section_id} · ${x.collected_from} · ${x.tier}`, proposal: x, needs_sme: false, alternatives: [], source: { file: "reason", snippet: x.reason, found: true }, flags: x.confidence === "low" ? ["low confidence"] : [] }));
  (config.checks ?? []).filter((x: any) => x.made_by === "ai_draft").forEach((x: any) => {
    const s = cited(x.source_file, x.source_quote);
    items.push({ id: `check:${x.id}`, kind: "check", group: "Checks", title: `${x.id} (${x.group}, ${x.severity})`, proposal: x, needs_sme: x.severity === "sme_pending" || x.group === "official_rule", alternatives: [], source: s,
      flags: [...(s.found ? [] : [s.note ?? "quote not found"]), ...(x.expressible === false ? ["named gap: not expressible"] : []), ...(x.severity === "sme_pending" ? ["value pending the SME"] : [])] });
  });
  for (const it of items) if (it.kind !== "mapping" && !it.source.found && !it.flags.length) it.flags.push(it.source.note ?? "quote not found");
  // Drafts can repeat an entry (the same derived field or check id twice): every item gets its own id, and a
  // repeat is flagged so a person decides whether it is a duplicate (found when the first release test ran).
  const seen = new Map<string, number>();
  for (const it of items) {
    const n = (seen.get(it.id) ?? 0) + 1; seen.set(it.id, n);
    if (n > 1) { it.id = `${it.id}#${n}`; it.flags.push("repeats an earlier item: duplicate?"); }
  }
  return items;
}

/** 5.1 a1, 4.4 r2: an item identical to the same item in the previous release is reused with its approval
 *  (and its SME sign-off), not reviewed again. Comparison ignores the release bookkeeping fields. */
const strip = (v: any): any => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) if (k !== "item_version" && k !== "decision") o[k] = strip(x); return o; } return v; };
export const sameItem = (a: any, b: any) => canonical(strip(a)) === canonical(strip(b));
export function reusedDecisions(items: Item[], previous: { config: any; label: string } | null): Decision[] {
  if (!previous) return [];
  const prev = new Map(buildItems(previous.config).map((i) => [i.id, i]));
  const out: Decision[] = [];
  for (const i of items) {
    const p = prev.get(i.id);
    if (!p || !sameItem(i.proposal, p.proposal)) continue;
    // The previous release's own decision is kept: a box released on the hand route stays 'left_unresolved'
    // (found in P4: reusing it as 'accepted' relabelled v1's 53 hand-route boxes).
    const was = ["accepted", "corrected", "left_unresolved"].includes(p.proposal?.decision) ? p.proposal.decision : "accepted";
    out.push({ item_id: i.id, decision: was, by: `reused:${previous.label}`, at: "", reason: `approved unchanged in ${previous.label}` });
    if (i.needs_sme) out.push({ item_id: i.id, decision: "sme_signed", by: `reused:${previous.label}`, at: "" });
  }
  return out;
}

/** Latest decision per item and per type (a review decision and, separately, the SME sign-off). */
export function current(decisions: Decision[]) {
  const review = new Map<string, Decision>(), sme = new Map<string, Decision>();
  for (const d of decisions) (d.decision === "sme_signed" ? sme : review).set(d.item_id, d);
  return { review, sme };
}

/** Validates one decision before it is recorded (5.1 r3, r5; 5.2). Returns a refusal reason or null. */
export function refuseDecision(items: Map<string, Item>, d: Omit<Decision, "at">): string | null {
  const it = items.get(d.item_id), who = actor(d.by);
  if (!it) return `unknown item ${d.item_id}`;
  if (!who) return `unknown user ${d.by}`;
  if (d.decision === "sme_signed") return it.needs_sme ? (who.duties.includes("sme") ? null : "only a Content publisher with the Immigration SME duty signs off rules, conditions and values (5.2, D254)") : "this item needs no SME sign-off";
  if (d.decision === "corrected") return d.chosen !== undefined && it.alternatives[d.chosen] ? (d.reason ? null : "a correction needs a reason") : "a correction picks one of the other proposals; nobody types a mapping (5.1 r3)";
  if (d.decision === "returned") return d.instruction ? null : "returning an item needs an instruction for the re-draft";
  if (d.decision === "left_unresolved") return d.reason ? null : "keeping an item unresolved (hand route) needs a reason";
  if (d.decision === "accepted" && it.flags.length && !d.reason) return `this item is flagged (${it.flags.join("; ")}): accepting it needs a recorded reason`;
  if (d.decision === "accepted" && it.kind === "mapping" && it.proposal.outcome === "unresolved") return "an unresolved box cannot be accepted as mapped: keep it unresolved (hand route) or return it";
  return null;
}

export function readiness(items: Item[], decisions: Decision[]) {
  const { review, sme } = current(decisions);
  const undecided = items.filter((i) => !review.has(i.id));
  const returned = items.filter((i) => review.get(i.id)?.decision === "returned");
  const unsigned = items.filter((i) => i.needs_sme && review.get(i.id)?.decision !== "returned" && !sme.has(i.id));
  const decideOpen = items.filter((i) => i.flags.includes("decide") && !review.has(i.id));
  const blockers = [
    ...(undecided.length ? [`${undecided.length} items have no decision (5.1 ready)`] : []),
    ...(returned.length ? [`${returned.length} items returned for re-draft hold publishing (4.4, 5.1 a2)`] : []),
    ...(unsigned.length ? [`${unsigned.length} rules, conditions or values lack the SME sign-off (5.2 r2)`] : []),
    ...(decideOpen.length ? [`${decideOpen.length} 'decide' items undecided (5.1 r7)`] : []),
  ];
  return { ready: blockers.length === 0, blockers, counts: { items: items.length, decided: items.length - undecided.length, returned: returned.length, sme_needed: items.filter((i) => i.needs_sme).length, sme_signed: items.filter((i) => i.needs_sme && sme.has(i.id)).length } };
}

/** The configuration as released: decisions applied, every item versioned. Deterministic for one decision set. */
export function releasedConfig(config: any, items: Item[], decisions: Decision[], version: number, previous: any = null) {
  // 5.3 r3: every item carries its own version; an item unchanged since the previous release keeps it.
  const prevSet = new Set<string>();
  if (previous) for (const k of ["forms", "document_requirements", "rules", "sections", "placements", "canonical_fields", "derived_fields", "checks"]) for (const x of previous[k] ?? []) prevSet.add(canonical(strip(x)));
  if (previous) for (const m of previous.field_maps ?? []) for (const e of m.entries) prevSet.add(canonical(strip(e)));
  const keep = (x: any) => (previous && x.item_version !== undefined && prevSet.has(canonical(strip(x))) ? x.item_version : version);
  const { review } = current(decisions);
  const byId = new Map(items.map((i) => [i.id, i]));
  const out = structuredClone(config);
  out.status = "released"; out.configuration_version = `c1-v${version}`;
  out.field_maps = out.field_maps.map((m: any) => ({ ...m, entries: m.entries.map((e: any) => {
    const id = `map:${m.form_edition}:${e.data_path}:${e.row ?? 0}`, d = review.get(id);
    if (d?.by.startsWith("reused:")) return { ...e, item_version: keep(e), decision: d.decision }; // released before, unchanged: as it was
    if (d?.decision === "corrected") {
      const { new_field, ...v } = byId.get(id)!.alternatives[d.chosen!].value;
      if (new_field && !out.canonical_fields.some((f: any) => f.id === new_field.id)) out.canonical_fields.push(new_field);
      return { ...v, item_version: version, decision: "corrected" };
    }
    if (d?.decision === "left_unresolved") return { form_edition: e.form_edition, form_sha256: e.form_sha256, data_path: e.data_path, outcome: "unresolved", unresolved_reason: `hand route: ${d.reason}`, item_version: version, decision: "left_unresolved" };
    return { ...e, item_version: keep(e), decision: d?.decision ?? "undecided" };
  }) }));
  for (const k of ["forms", "document_requirements", "rules", "sections", "placements", "canonical_fields", "derived_fields"]) out[k] = (out[k] ?? []).map((x: any) => ({ ...x, item_version: keep(x) }));
  out.checks = out.checks.map((x: any) => ({ ...x, item_version: keep(x) }));
  out.review = { decisions: decisions.length };
  return out;
}

export const configHash = (released: any) => sha(canonical(released));

/** 5.3: approve and publish. The approver is a second person (never the author or the submitter, the Platform
 *  Owner included), never edits (has recorded no decision on this version), and approves exactly the hash
 *  that was submitted; a changed draft cannot reuse the approval. */
export function approve(args: { config: any; items: Item[]; decisions: Decision[]; submission: { hash: string; by: string; at: string } | null; approver: string; version: number; sourceFiles: { file: string; sha256: string }[]; previous?: { config: any; hash: string } | null }) {
  const r = readiness(args.items, args.decisions);
  if (!r.ready) return { ok: false as const, reason: `not ready: ${r.blockers.join("; ")}` };
  if (!args.submission) return { ok: false as const, reason: "not submitted for approval" };
  const released = releasedConfig(args.config, args.items, args.decisions, args.version, args.previous?.config ?? null);
  const hash = configHash(released);
  const A = actor(AUTHOR)!, S = actor(args.submission.by), P = actor(args.approver);
  if (!S || !P) return { ok: false as const, reason: "unknown submitter or approver" };
  const check = canRelease({ author: A, submitter: S, approver: P, configuration_sha256: hash }, args.submission.hash);
  if (!check.ok && check.reason.startsWith("self-approval")) return { ok: false as const, reason: check.reason }; // D254 first: author or submitter
  if (args.decisions.some((d) => d.by === args.approver && d.decision !== "sme_signed")) return { ok: false as const, reason: "the approver recorded review decisions on this version: an approver never edits (5.3)" };
  if (!check.ok) return { ok: false as const, reason: "the configuration changed after it was submitted: a stale approval cannot be reused (5.3 a2)" };
  const { review } = current(args.decisions);
  const record = {
    configuration_sha256: hash, revision: args.version, source_files: args.sourceFiles, drafting_run_ids: args.config.drafting_run_ids,
    author: { user_id: A.user_id, role: A.role }, submitter: { user_id: S.user_id, role: S.role }, approver: { user_id: P.user_id, role: P.role }, publisher: { user_id: P.user_id, role: P.role },
    decisions: [...review.values()].map((d) => ({ data_path: d.item_id, decision: d.decision === "returned" ? "rejected" : d.decision, ...(d.reason ? { reason: d.reason } : {}) })),
    ...(args.previous ? { supersedes: args.previous.hash } : {}),
    released_at: new Date().toISOString(),
  };
  return { ok: true as const, hash, released, record };
}

export function stateDir(name: string) { return join(PROTOTYPE, "p3", "state", name); }
export const exists = existsSync;
