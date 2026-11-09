// C6.17 A multi-stage case (B139; concept screens/B139/concept.md BR-1..BR-9; challenge B3, M1, M2, M3; founder P-412
// F13). Pure rules, no database: a route (an ordered list of existing combinations kept as data, no new tree level), the
// stage rows a case is opened with, the key details a stage keeps on its own record (typed by their library field), the
// next stage, what a person's answers carry and what is asked again, and the deadline worked out on read (Sample, never a
// reminder). Identical with AI off; no model call (US$0). Every immigration value here comes from the route's data and
// is Sample until cited from canada.ca with page, quote and date.

/** A key detail a stage records (SA-1B-66 rule 2: library fields). `same_every_stage`: the same fact at every stage
 *  (Sample: the UCI), so it is also written as the person's answer (P-412 F13 (c)). */
export type KeyDetailDef = { field: string; label: string; type: "STRING" | "DATE"; same_every_stage?: boolean };
/** The deadline a stage shows (P-412 F13 (b)): `field` of the stage `from_stage`'s record, plus `add_days`. Sample. */
export type DeadlineRule = { label: string; from_stage: string; field: string; add_days: number };
/** Two document types the route says are the same document for one person (Sample), so an upload made for the earlier
 *  stage shows "On file from …: check it" on the later stage's line (BR-6). */
export type SameDocument = { from: string; to: string };
export type RouteStage = { key: string; staff_name: string; client_name: string; combination_key: string; key_details: KeyDetailDef[]; next: string | null; deadline?: DeadlineRule | null; same_documents?: SameDocument[] };
export type RouteDef = { key: string; label: string; basis: "SAMPLE" | "CITED"; stages: RouteStage[] };

const KEY = /^[a-z][a-z0-9_]{0,40}$/, FIELD = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

/** BR-2: what stops a route loading. 2+ stages; keys unique; every combination present (in `known`) and used once (no
 *  repeats, challenge M3); each stage's next inside the route and after it (one sequence, no loop); every key detail a
 *  library-shaped field of a known type; a deadline reads an earlier stage's key detail. Empty: the route loads. */
export function routeProblems(r: RouteDef, known: ReadonlySet<string>): string[] {
  const out: string[] = [];
  if (!KEY.test(r.key ?? "")) out.push(`route key "${r.key}" is not a key`);
  if (!r.label?.trim()) out.push(`route ${r.key}: no label`);
  const stages = Array.isArray(r.stages) ? r.stages : [];
  if (stages.length < 2) out.push(`route ${r.key}: a route has at least 2 stages (found ${stages.length})`);
  const keys = stages.map((s) => s.key), combos = stages.map((s) => s.combination_key);
  stages.forEach((s, i) => {
    if (!KEY.test(s.key ?? "")) out.push(`route ${r.key}: stage ${i + 1} key "${s.key}" is not a key`);
    if (keys.indexOf(s.key) !== i) out.push(`route ${r.key}: stage key "${s.key}" is used twice`);
    if (!s.staff_name?.trim() || !s.client_name?.trim()) out.push(`route ${r.key}: stage ${s.key} needs a staff and a client name`);
    if (!known.has(s.combination_key)) out.push(`route ${r.key}: stage ${s.key}'s combination "${s.combination_key}" is not in the workspace`);
    if (combos.indexOf(s.combination_key) !== i) out.push(`route ${r.key}: combination "${s.combination_key}" is used twice (repeatable stages are not built)`);
    const want = stages[i + 1]?.key ?? null;
    if ((s.next ?? null) !== want) out.push(`route ${r.key}: stage ${s.key}'s next must be ${want ?? "none (the last stage)"}, not ${s.next ?? "none"}`);
    for (const d of s.key_details ?? []) {
      if (!FIELD.test(d.field ?? "") || !d.label?.trim() || !["STRING", "DATE"].includes(d.type)) out.push(`route ${r.key}: stage ${s.key} key detail "${d.field}" needs a field, a label and a type (STRING or DATE)`);
      if (d.same_every_stage && !d.field.startsWith("person.")) out.push(`route ${r.key}: "${d.field}" is the same at every stage only if it is a person's fact`);
    }
    if (s.deadline) {
      const from = stages.findIndex((x) => x.key === s.deadline!.from_stage);
      if (from < 0 || from >= i) out.push(`route ${r.key}: stage ${s.key}'s deadline reads a stage before it, not "${s.deadline.from_stage}"`);
      else if (!(stages[from].key_details ?? []).some((d) => d.field === s.deadline!.field && d.type === "DATE")) out.push(`route ${r.key}: stage ${s.key}'s deadline reads "${s.deadline.field}", which is not a date key detail of ${s.deadline.from_stage}`);
      if (!Number.isInteger(s.deadline.add_days) || Math.abs(s.deadline.add_days) > 3650) out.push(`route ${r.key}: stage ${s.key}'s deadline adds whole days (at most 3650)`);
    }
  });
  return out;
}

export type StageState = "DONE_BEFORE" | "NOT_RECORDED" | "CURRENT" | "ENDED_NEXT_STARTED" | "NOT_STARTED";
/** A key detail as stored on the stage record: its value, who entered it and when (never in an audit line). */
export type StoredDetail = { value: string; by: string; at: string };
export type EarlierInput = { stage: string; done_before: boolean; key_details?: Record<string, string | null | undefined> };
export type StageRowPlan = { ord: number; stage: RouteStage; state: StageState; key_details: Record<string, StoredDetail> };

/** BR-3: the stage rows a case opens with, from its route and the stage it opens on. Earlier stages: ticked "Done before
 *  we started" (with their key details), else not recorded; the opening stage CURRENT; later ones NOT_STARTED. A case on
 *  no route has one stage (null route). Errors name the field (400, nothing created). */
export function openingStages(route: RouteDef | null, openOn: string, earlier: EarlierInput[], by: string, at: string): { rows: StageRowPlan[] } | { field: string; message: string } {
  if (!route) {
    if (earlier.length) return { field: "earlier", message: "This combination is on no route, so it has no earlier stages." };
    return { rows: [] };
  }
  const at0 = route.stages.findIndex((s) => s.combination_key === openOn);
  if (at0 < 0) return { field: "combinationId", message: "This combination is not a stage of the route." };
  const before = route.stages.slice(0, at0);
  for (const [i, e] of earlier.entries()) {
    if (!before.some((s) => s.key === e.stage)) return { field: `earlier.${i}.stage`, message: `"${e.stage}" is not a stage before ${route.stages[at0].staff_name} on this route.` };
    if (earlier.findIndex((x) => x.stage === e.stage) !== i) return { field: `earlier.${i}.stage`, message: "Each earlier stage is listed once." };
  }
  const rows: StageRowPlan[] = [];
  for (const [i, s] of route.stages.entries()) {
    if (i < at0) {
      const e = earlier.find((x) => x.stage === s.key);
      const done = !!e?.done_before;
      const checked = checkKeyDetails(s.key_details, done ? e?.key_details ?? {} : {}, `earlier.${earlier.indexOf(e!)}.key_details`);
      if (!done && e?.key_details && Object.values(e.key_details).some((v) => v !== null && v !== undefined && String(v).trim())) return { field: `earlier.${earlier.indexOf(e)}.done_before`, message: `Tick "Done before we started" for ${s.staff_name} to keep its details, or clear them.` };
      if ("field" in checked) return checked;
      rows.push({ ord: i + 1, stage: s, state: done ? "DONE_BEFORE" : "NOT_RECORDED", key_details: stamp(checked.values, by, at) });
    } else rows.push({ ord: i + 1, stage: s, state: i === at0 ? "CURRENT" : "NOT_STARTED", key_details: {} });
  }
  return { rows };
}

const stamp = (values: Record<string, string>, by: string, at: string): Record<string, StoredDetail> => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, by, at }]));

/** A real calendar date written YYYY-MM-DD (no 31 February). */
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
/** Breaker m5: a stage's date is between 1950 and 2100 (a year like 0001 or 9999 is a typing slip, never a permit's date). */
export const inRange = (v: string) => v >= "1950-01-01" && v <= "2100-12-31";

/** BR-3: key details typed by their field: a date is a real date; text is 1-80 characters; a field the stage does not
 *  record is refused; blank means not given (optional). Values trimmed. */
export function checkKeyDetails(defs: KeyDetailDef[], given: Record<string, string | null | undefined>, at: string): { values: Record<string, string> } | { field: string; message: string } {
  const values: Record<string, string> = {};
  for (const [k, raw] of Object.entries(given ?? {})) {
    const d = defs.find((x) => x.field === k);
    if (!d) return { field: `${at}.${k}`, message: `"${k}" is not a key detail of this stage.` };
    if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim())) continue;
    if (typeof raw !== "string") return { field: `${at}.${k}`, message: `${d.label}: write it as text.` };
    const v = raw.trim();
    if (d.type === "DATE" && !isDate(v)) return { field: `${at}.${k}`, message: `${d.label}: write a date as YYYY-MM-DD, for example 2027-02-03.` };
    if (d.type === "DATE" && !inRange(v)) return { field: `${at}.${k}`, message: `${d.label}: give a date between 1950 and 2100.` };
    if (d.type === "STRING" && (v.length > 80 || /[\u0000-\u001f]/.test(v))) return { field: `${at}.${k}`, message: `${d.label}: at most 80 characters, on one line.` };
    values[k] = v;
  }
  return { values };
}

export type DeadlineView = { label: string; due: string | null; why: string; sample: true };
/** BR-8 (P-412 F13 (b)): the deadline worked out on read from the rule and the earlier stage's key detail; Sample
 *  everywhere; missing detail: "Can't set: … is missing". No filing item, no reminder, no Needs you. */
export function deadlineOf(rule: DeadlineRule | null | undefined, stages: { stage_key: string; staff_name: string; key_details: Record<string, StoredDetail>; defs: KeyDetailDef[] }[]): DeadlineView | null {
  if (!rule) return null;
  const from = stages.find((s) => s.stage_key === rule.from_stage);
  const label = from?.defs.find((d) => d.field === rule.field)?.label ?? rule.field;
  const v = from?.key_details[rule.field]?.value;
  if (!v || !isDate(v)) return { label: rule.label, due: null, why: `Can't set: ${label} is missing (Sample rule).`, sample: true };
  const due = new Date(Date.parse(`${v}T00:00:00Z`) + rule.add_days * 86_400_000).toISOString().slice(0, 10);
  return { label: rule.label, due, why: `${rule.add_days === 0 ? "The day" : `${Math.abs(rule.add_days)} days ${rule.add_days < 0 ? "before" : "after"} the day`} ${label.replace(/^./, (c) => c.toLowerCase())} (${v}). Sample: not cited from canada.ca.`, sample: true };
}

export type StageRow = { id: string; ord: number; state: StageState };
/** BR-4: the stage "Start next stage" begins: the one right after the current stage, if it is NOT_STARTED. */
export function nextOf<T extends StageRow>(rows: T[]): { current: T | null; next: T | null } {
  const current = rows.find((r) => r.state === "CURRENT") ?? null;
  const next = current ? rows.find((r) => r.ord === current.ord + 1 && r.state === "NOT_STARTED") ?? null : null;
  return { current, next };
}

/** BR-5 (challenge B3): what a person's answers carry. Facts about a person (`person.*`) are read where they are, never
 *  copied; facts about the application (`case.*`) belong to the stage's own application subject and are asked again.
 *  `asked`: the facts the next release asks (field ids); `answered`: the person facts already answered. */
export function carryCounts(asked: Iterable<string>, answered: ReadonlySet<string>): { used: number; asked_again: number; fresh: number } {
  let used = 0, again = 0, fresh = 0;
  for (const f of new Set(asked)) {
    if (f.startsWith("case.")) again++;
    else if (answered.has(f)) used++;
    else fresh++;
  }
  return { used, asked_again: again, fresh };
}

/** BR-6: a document already on file for this person, of the same type or of a type the route pairs with it (Sample),
 *  uploaded before this stage started: shown "On file from <stage>, uploaded <date>: check it for this application". */
export function onFileFrom(lineType: string, pairs: SameDocument[], uploads: { documentType: string; uploadedAt: Date }[], startedAt: Date | null): { documentType: string; uploadedAt: Date } | null {
  const types = new Set([lineType, ...pairs.filter((p) => p.to === lineType).map((p) => p.from)]);
  const hit = uploads.filter((u) => types.has(u.documentType) && (!startedAt || u.uploadedAt <= startedAt)).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  return hit ?? null;
}

/** The words the strip shows for a state (GOV.UK task-list statuses; "Not recorded" for an earlier stage left unticked). */
export const STAGE_WORDS: Record<StageState, string> = { DONE_BEFORE: "Done before we started", NOT_RECORDED: "Not recorded", CURRENT: "Current", ENDED_NEXT_STARTED: "Ended — next stage started", NOT_STARTED: "Not started" };
export const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
