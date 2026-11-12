// The fill plan for one open portal screen of a case (F2c; plan §5 E-5, BR-7…BR-10; Lead decisions Q2, Q3; challenge
// M2, M5, M6, M7). Pure: the API gives the case's pinned release (never the library's newest version: released means
// frozen, STANDARDS §3), the case's people and answers, the online version's twin, and the screen the extension read.
//  1. Which screen: by its heading (the screen identity); a screen the twin does not have is "not captured".
//  2. Compare before fill: any difference from the approved screen fills nothing and returns the differences (input
//     ids, kinds of change, option codes and the approved labels: never the live page's text, M5).
//  3. Until every input of the screen is decided in the screen map (mapped, not a fact, or "You answer this on
//     screen", Q3), nothing on that screen is filled.
//  4. Each input: a confirmed fact only (P-72), in the portal's own format (date parts, option codes; no code: not
//     filled, BR-10). Only an input to fill carries a value; every other carries null and why.
// The same shared renderer as the case's PDF copies decides which confirmed fact each form field reads, run on the
// online version's map, so a box filled online reads exactly what the release preview shows.
import type { CaptureInput, CaptureRecord } from "../capture.ts";
import { codeForValue, type OptionMap } from "../options.ts";
import { render, type BoxRow, type Person, type Role } from "../render.ts";
import { knownOf, type Answer, type Participant, type Row } from "../runtime/case.ts";
import type { Snapshot } from "../snapshot.ts";
import { rawId, screenDifference, screenIdentity } from "./screens.ts";

/** The outcome a screen-map row gets when the immigration expert marks an input the representative answers on the
 *  portal themself: a declaration, a background question (Q3, BR-9). Approved by a second person with the map. */
export const ANSWER_ON_SCREEN = "person_answers_on_screen";
const DECIDED = new Set(["mapped", "not_a_fact", "never_filled", ANSWER_ON_SCREEN]);

export type PlanStatus = "fill" | "not_confirmed" | "no_answer" | "you_answer" | "no_code" | "not_a_fact" | "map_incomplete";
export type PlanInput = { id: string; type: string; label: string; value: string | null; status: PlanStatus; why: string; source: string | null };
export type Difference = { input: string; change: string; approved_label: string | null; codes?: unknown };
export type FillPlan =
  | { match: true; screen: string; screen_page: string; person: string; inputs: PlanInput[]; counts: Record<PlanStatus, number> }
  | { match: false; reason: "changed"; screen: string; screen_page: string; differences: Difference[] }
  | { match: false; reason: "not_captured"; screen_page: string };

type Entry = { data_path: string; outcome: string; fact?: string | null; transform?: string | null; screen?: string; option_map?: OptionMap | null; caption?: string | null };
type OnlineMap = { form_number: string; channel?: string; entries: Entry[] };

/** One fact value written the way the portal input takes it, or null when it cannot be (BR-10: never a guess). */
export function portalValue(value: unknown, transform: string | null | undefined, input: CaptureInput, optionMap: OptionMap | null | undefined, listValues: { key: string; label: string }[]): string | null {
  if (value === null || value === undefined || value === "") return null;
  const t = transform ?? "as_is";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  if (t.startsWith("date:")) {
    if (!date) return null;
    const [y, m, d] = date.split("-");
    return t === "date:YYYY" ? y : t === "date:MM" ? m : t === "date:DD" ? d : t === "date:YYYY-MM-DD" ? date : null;
  }
  if (t.startsWith("yes_no_code")) return typeof value === "boolean" ? String(value) : value === "yes" ? "true" : value === "no" ? "false" : null;
  const codes = (input.options ?? []).map((o) => o.code);
  if (t === "option_map") { const code = optionMap ? codeForValue(value, optionMap, listValues) : null; return code !== null && codes.includes(code) ? code : null; }
  if (t.startsWith("code_list")) { const v = String(value); const o = (input.options ?? []).find((x) => x.code === v || x.label.toLowerCase() === v.toLowerCase()); return o ? o.code : null; }
  const s = String(value);
  if (input.max_length && [...s].length > input.max_length) return null;
  return s;
}

/** The online version a release files the form with: the newest one it holds (as the release validator reads it). */
export function onlineMapOf<T extends { form_number: string; channel?: string }>(s: Snapshot, form: string): (T & OnlineMap) | undefined {
  return (s.field_maps as (T & OnlineMap)[]).filter((m) => m.form_number === form && m.channel === "ONLINE").at(-1);
}

export function fillPlan(s: Snapshot, twin: CaptureRecord, form: string, subjectId: string, people: Participant[], answers: Answer[], rows: Row[], live: { title: string; inputs: CaptureInput[] }, today = new Date()): FillPlan {
  const page = screenIdentity(live.title);
  const screen = twin.screens.find((x) => screenIdentity(x.title) === page);
  if (!screen) return { match: false, reason: "not_captured", screen_page: page };
  const diff = screenDifference(screen, live);
  if (diff.length) {
    const approved = new Map(screen.inputs.map((i) => [rawId(i.id), i]));
    return { match: false, reason: "changed", screen: screen.title, screen_page: page,
      differences: diff.map((d) => ({ input: d.input, change: d.change, approved_label: approved.get(d.input)?.label ?? null, ...(d.change === "options" ? { codes: { removed: (d.was as { removed?: string[] })?.removed ?? [], added: ((d.now as { added?: [string, string][] })?.added ?? []).map(([c]) => c) } } : {}) })) };
  }
  const map = onlineMapOf(s, form);
  const entries = new Map((map?.entries ?? []).filter((e) => e.screen === screen.key).map((e) => [e.data_path, e]));
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const { known } = knownOf(s, people, answers, rows, today);
  const cov = map ? render({ ...s, field_maps: [map] } as Snapshot, renderPeople, known).coverage.find((c) => c.form === form && c.person === subjectId) : undefined;
  const boxes = new Map<string, BoxRow>((cov?.boxes ?? []).map((b) => [b.box, b]));
  const lists = new Map<string, { key: string; label: string }[]>((s.canonical_fields as { id: string; answer_list?: { values: { key: string; label: string }[] } }[]).flatMap((f) => (f.answer_list ? [[f.id, f.answer_list.values]] : [])));
  // The case's own words for a fact: the question as it was asked, else the field's meaning (never a field key).
  const askedAs = (fact: string) => (s.placements as { fact: string; question_text?: string | null }[]).find((x) => x.fact === fact)?.question_text ?? (s.canonical_fields as { id: string; meaning?: string | null }[]).find((x) => x.id === fact)?.meaning ?? "an answer";
  const sectionOf = (fact: string) => { const p = (s.placements as { fact: string; section_id: string }[]).find((x) => x.fact === fact); return (s.sections as { id: string; title: string }[]).find((x) => x.id === p?.section_id)?.title ?? "this section"; };
  const incomplete = screen.inputs.filter((i) => !DECIDED.has(entries.get(i.id)?.outcome ?? ""));
  const inputs = screen.inputs.map((i): PlanInput => {
    const base = { id: rawId(i.id), type: i.type, label: i.label, value: null, source: null };
    if (incomplete.length) return { ...base, status: "map_incomplete", why: `Nothing is filled on this screen until its map is complete (${incomplete.length} input${incomplete.length > 1 ? "s" : ""} not decided yet).` };
    const e = entries.get(i.id)!;
    if (e.outcome === ANSWER_ON_SCREEN) return { ...base, status: "you_answer", why: "You answer this on screen." };
    if (e.outcome !== "mapped" || !e.fact) return { ...base, status: "not_a_fact", why: "Not a fact the case holds; nothing to fill." };
    const b = boxes.get(i.id);
    if (!b || b.coverage === "unresolved" || (b.coverage !== "confirmed fact" && b.coverage !== "answered on screen")) return { ...base, status: "no_answer", why: "No answer yet." };
    if (b.coverage !== "confirmed fact") return { ...base, status: "not_confirmed", why: `Not filled: confirm ${sectionOf(e.fact)} in the case first.` };
    const v = portalValue(b.value, e.transform, i, e.option_map, lists.get(e.fact) ?? []);
    if (v === null) return { ...base, status: "no_code", why: "The case's answer has no matching choice or format on this screen: enter it yourself." };
    return { ...base, value: v, status: "fill", why: `From the case (${b.about_label}, confirmed): ${askedAs(e.fact)}`, source: b.fact };
  });
  const counts = Object.fromEntries((["fill", "not_confirmed", "no_answer", "you_answer", "no_code", "not_a_fact", "map_incomplete"] as PlanStatus[]).map((k) => [k, inputs.filter((x) => x.status === k).length])) as Record<PlanStatus, number>;
  return { match: true, screen: screen.title, screen_page: page, person: cov?.person_label ?? subjectId, inputs, counts };
}
