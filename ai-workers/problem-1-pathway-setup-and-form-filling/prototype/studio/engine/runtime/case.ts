// The case engine (runtime lane, R1): pure functions from a pinned release snapshot, the people on a case and their
// current answers, to what each person is asked, how each answer checks, whether it is confirmed (P-72) and which form
// boxes it fills. The questionnaire itself comes from the common renderer (engine/render.ts), so a case asks exactly
// what the release preview shows. No I/O; every output says why.
import { evalCondition, kkey, render, type Known, type Person, type Role } from "../render.ts";
import { subjectKindOf, type Snapshot } from "../snapshot.ts";
import { Address, CONFIRM_WORDS, MINOR, Phone, type QuestionnaireView, type ViewCheck } from "../../contracts/runtime.ts";

export type Participant = { subjectId: string; role: Role | "case"; label: string; applies: boolean };
export type Answer = { id: string; subjectId: string; field: string; rowKey: string | null; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string; origin?: { channel: string; actor: string; at: string } | null };
export type Row = { rowKey: string; subjectId: string; group: string; order: number };
export type Confirmation = { confirmed: boolean; why: string };

/** Fields the client answers (P-72 "the client's fields"): placed in the questionnaire or the client's profile, and
 *  about a person, a relationship or the application (never the representative's own facts). */
const CLIENT_SOURCES = new Set(["client_questionnaire", "profile_record"]);
const CLIENT_KINDS = new Set(["PERSON", "RELATIONSHIP", "CASE"]);

/** The parts of a released placement and field this engine reads (the snapshot keeps them as loose JSON). */
type Placement = { fact: string; section_id: string; order?: number; repeats: string; collected_from: string; condition?: unknown; condition_effect?: string | null };
type FieldDef = { id: string; value_type?: string; item_version?: number; answer_list?: { key: string; values: { key: string; label: string }[] } };
const placementOf = (s: Snapshot, field: string): Placement | undefined => (s.placements as Placement[]).find((p) => p.fact === field);
const fieldOf = (s: Snapshot, field: string): FieldDef | undefined => (s.canonical_fields as FieldDef[]).find((f) => f.id === field);
export const isClientField = (s: Snapshot, field: string) => CLIENT_SOURCES.has(placementOf(s, field)?.collected_from ?? "") && CLIENT_KINDS.has(subjectKindOf(field));

const realDate = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d && y >= 1900 && y <= 2100; };

/** Age in whole years on a day, from an ISO date; null when the date is not a real date or is after that day
 *  (PR 7 review D2: an impossible or future birth date never gives an age). */
export function ageOn(birth: unknown, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birth ?? ""));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!realDate(y, mo, d) || Date.UTC(y, mo - 1, d) > Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age--;
  return age;
}

/** P-72 and P-78: VERIFIED is confirmed; the client's (principal's) typed answer on a client field counts as confirmed
 *  for the principal, the application and a minor child; for an adult it is "answered by the principal" until that
 *  adult or the officer confirms; everything else waits for "Confirm section". */
export function confirmation(s: Snapshot, a: Answer, who: Participant | undefined, birthDate: unknown, today: Date): Confirmation {
  if (a.status === "VERIFIED") return { confirmed: true, why: CONFIRM_WORDS.officer };
  if (a.channel !== "questionnaire") return { confirmed: false, why: `${CONFIRM_WORDS.waits} (entered in the agent view)` };
  if (!isClientField(s, a.field)) return { confirmed: false, why: `${CONFIRM_WORDS.waits} (a fact the officer confirms from a document or record)` };
  if (who?.role === "principal" || who?.role === "case") return { confirmed: true, why: CONFIRM_WORDS.client_own };
  if (who?.role === "child") {
    const age = ageOn(birthDate, today);
    if (age !== null && age < MINOR.underAge) return { confirmed: true, why: `${CONFIRM_WORDS.client_own} (for a child under ${MINOR.underAge})` };
    return { confirmed: false, why: age === null ? `${CONFIRM_WORDS.waits} (the child's date of birth is not answered yet, or is not a real past date)` : `${CONFIRM_WORDS.by_principal} (the child is ${age})` };
  }
  return { confirmed: false, why: CONFIRM_WORDS.by_principal };
}

/** How the forms that read a field write it (from the release's field maps): the precision and limits a value needs. */
export function shapeOf(s: Snapshot, field: string) {
  const ts = (s.field_maps as { entries: { fact?: string | null; transform?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field).map((e) => e.transform ?? ""));
  const maxes = ts.map((t) => /max (\d+) char/.exec(t)?.[1]).filter(Boolean).map(Number);
  const dayNeeded = ts.some((t) => /date(_part)?:DD|date:YYYY-MM-DD|^date$|date:DD/.test(t)) || !ts.some((t) => /date(_part)?:MM/.test(t));
  // A short code list written in the map itself, "code_list:imm5257.visa_type (VisitorVisa, Transit)": the values a
  // choice field without an answer list may take (labels before any "=code").
  const listed = ts.map((t) => /^code_list:\S+ \(([^)]*)\)/.exec(t)?.[1]).find(Boolean);
  const choices = listed ? listed.split(",").map((x) => x.split("=")[0].trim()).filter(Boolean) : null;
  return { maxLength: maxes.length ? Math.min(...maxes) : 500, datePrecision: dayNeeded ? "day" as const : "month" as const, phone: ts.some((t) => /phone_part/.test(t)), money: ts.some((t) => /CAD/.test(t)), choices };
}


/** "VisitorVisa" → "Visitor visa": a PDF export value written as joined words, read as a person writes it. */
const words = (x: string) => /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(x) ? x.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ ([A-Z])/g, (_, c: string) => ` ${c.toLowerCase()}`) : x;

/** The labels a field's answers carry on its forms (the first form that labels them): from a field map's
 *  "code_list:… (Label=code, …)" through its option map (answer key → code). A list without "=code" names its codes
 *  by their labels ("Female", "VisitorVisa"). Where no map labels an answer, the answer list's own label stays. */
export function optionsOf(s: Snapshot, field: string): { key: string; label: string }[] | null {
  const entries = (s.field_maps as { entries: { fact?: string | null; transform?: string | null; option_map?: { map?: Record<string, string> } | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field));
  const labelOf = (key: string) => {
    for (const e of entries) {
      const list = /^code_list:\S+ \(([^)]*)\)/.exec(e.transform ?? "")?.[1];
      if (!list) continue;
      const pairs = list.split(";")[0].split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [l, c] = x.split("="); return { label: l.trim(), code: (c ?? l).trim() }; });
      const code = e.option_map?.map?.[key] ?? key;
      const hit = pairs.find((p) => p.code === code);
      if (hit && !/^\d+$/.test(hit.label)) return words(hit.label);
    }
    return null;
  };
  const listed = fieldOf(s, field)?.answer_list?.values;
  if (listed) return listed.map((v) => ({ key: v.key, label: labelOf(v.key) ?? v.label }));
  const choices = shapeOf(s, field).choices;
  return choices ? choices.map((c) => ({ key: c, label: labelOf(c) ?? words(c) })) : null;
}

/** Characters as a person counts them (an emoji is one), not UTF-16 units. */
const chars = (x: string) => [...x].length;

/** Field checks (P-47 tier 1): the value's type, list and limits. Returns plain messages; empty when the value is fine. */
export function checkValue(s: Snapshot, field: string, value: unknown, today = new Date()): string[] {
  const f = fieldOf(s, field);
  if (!f) return ["This question is not in the release the case works from."];
  const shape = shapeOf(s, field), type = String(f.value_type ?? "text");
  const str = typeof value === "string" ? value.trim() : null;
  const list = f.answer_list?.values ?? [];
  switch (type) {
    case "yes_no": return typeof value === "boolean" ? [] : ["Answer yes or no."];
    case "number": {
      if (typeof value !== "number" && !/^\d+(\.\d+)?$/.test(str ?? "")) return ["Enter a number of 0 or more, digits only."];
      const n = typeof value === "number" ? value : Number(str);
      if (!Number.isFinite(n) || n < 0 || n > 1e12) return ["Enter a number of 0 or more."];
      if (shape.money && !Number.isInteger(n)) return ["Enter whole dollars, without cents."];
      return String(n).length > 12 ? ["That number is too long for the form (12 characters at most)."] : [];
    }
    case "date": {
      if (shape.datePrecision === "month") { const m = /^(\d{4})-(\d{2})$/.exec(str ?? ""); return m && realDate(Number(m[1]), Number(m[2]), 1) ? [] : ["Enter a month and year, for example 2019-06."]; }
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str ?? "");
      if (!m || !realDate(Number(m[1]), Number(m[2]), Number(m[3]))) return ["Enter a real date as day, month and year."];
      return field === MINOR.birthDateField && str! > today.toISOString().slice(0, 10) ? ["A date of birth cannot be in the future."] : [];
    }
    case "code": case "country":
      if (str === null || !str) return ["Choose an answer."];
      if (list.length) return list.some((v) => v.key === str) ? [] : ["Choose one of the listed answers."];
      if (shape.choices) return shape.choices.some((c) => c.toLowerCase() === str.toLowerCase()) ? [] : [`Choose one of: ${shape.choices.join(", ")}.`];
      return chars(str) > 120 ? ["Keep the answer to 120 characters."] : [];
    case "address": {
      const parsed = Address.strict().safeParse(value);
      if (!parsed.success) return ["Enter the address in its parts (street, city, country), as text."];
      const a = parsed.data, out: string[] = [];
      for (const [k, w] of [["street_name", "street"], ["city", "city or town"], ["country", "country"]] as const) if (!String(a[k] ?? "").trim()) out.push(`Enter the ${w}.`);
      return out;
    }
    default: {
      if (shape.phone) {
        const parsed = Phone.strict().safeParse(value);
        if (!parsed.success) return ["Enter the country code and the number."];
        const p = parsed.data;
        const out: string[] = [];
        if (!/^\d{1,3}$/.test(String(p.country_code ?? ""))) out.push("Enter a country code of 1 to 3 digits, for example 91.");
        if (!/^\d{4,15}$/.test(String(p.number ?? "").replace(/[\s-]/g, ""))) out.push("Enter the number with digits only (4 to 15).");
        return out;
      }
      if (str === null) return ["Enter text."];
      if (!str) return ["Enter an answer."];
      if (type === "email" || /email/.test(field)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? [] : ["Enter an email address like name@example.com."];
      return chars(str) > shape.maxLength ? [`Keep it to ${shape.maxLength} characters (it is ${chars(str)}); the form has no room for more.`] : [];
    }
  }
}

/** The renderer's known facts from current answers: confirmed ones as "confirmed", the rest as "answered". Row answers
 *  take the row's place among the subject's live rows of that group; a box with no row reads the first row. */
export function knownOf(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], today: Date): { known: Known; confirm: Map<string, Confirmation> } {
  const known: Known = new Map(), confirm = new Map<string, Confirmation>();
  const about = (subjectId: string) => (people.find((p) => p.subjectId === subjectId)?.role === "case" ? "case" : subjectId);
  const index = new Map<string, number>();
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(`${r.subjectId}|${r.group}`, [...(groups.get(`${r.subjectId}|${r.group}`) ?? []), r]);
  for (const list of groups.values()) [...list].sort(byOrder).forEach((r, i) => index.set(r.rowKey, i));
  const birth = (subjectId: string) => answers.find((a) => a.subjectId === subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value;
  for (const a of answers) {
    if (a.rowKey && !index.has(a.rowKey)) continue; // a removed row's answers stay stored and are never read
    const c = confirmation(s, a, people.find((p) => p.subjectId === a.subjectId), birth(a.subjectId), today);
    confirm.set(a.id, c);
    // A number answered as digits ("000", "0.0") is read as the number it is, so rules compare numbers (break report m9).
    const value = fieldOf(s, a.field)?.value_type === "number" && typeof a.value === "string" && /^\d+(\.\d+)?$/.test(a.value.trim()) ? Number(a.value) : a.value;
    const v = { value, status: c.confirmed ? "confirmed" as const : "answered" as const, source: `${a.channel} by ${a.actor}` };
    const row = a.rowKey ? index.get(a.rowKey)! : undefined;
    known.set(kkey(about(a.subjectId), a.field, row), v);
    if (row === 0 && !known.has(kkey(about(a.subjectId), a.field))) known.set(kkey(about(a.subjectId), a.field), v);
  }
  return { known, confirm };
}

/** Rows in their order; equal orders (never written by the API) fall back to the row id, so a form's first row is stable. */
const byOrder = (a: Row, b: Row) => a.order - b.order || a.rowKey.localeCompare(b.rowKey);

export type Mode = "sqr" | "agent";

/** The questionnaire view of a case: sections, each question once per person, with the current answer, its checks,
 *  its confirmation and the form boxes it fills. A case asks only what someone on it needs (P-62): a fact that fills a
 *  box of a form that applies, or decides whether a form, document or question applies. Questions the release places in
 *  a selected section but nothing of this case reads are not asked (counted in the summary). SQR mode shows the
 *  client's fields only; agent mode shows every needed fact. */
export function caseView(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], mode: Mode, today = new Date()): QuestionnaireView {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const caseSubject = people.find((p) => p.role === "case")!;
  const { known, confirm } = knownOf(s, people, answers, rows, today);
  const r = render(s, renderPeople, known);
  const subjectOf = (about: string) => (about === "case" ? caseSubject.subjectId : about.split("/")[0]);
  const fills = new Map<string, Map<string, { form: string; person: string; boxes: number }>>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about) {
    const k = `${b.about}|${b.fact}`, m = fills.get(k) ?? new Map(); const e = m.get(`${c.form}|${c.person}`) ?? { form: c.form, person: c.person_label, boxes: 0 }; e.boxes++; m.set(`${c.form}|${c.person}`, e); fills.set(k, m);
  }
  // Within one section for one person, questions follow the release's placement order (purpose before its "other"
  // details, "from" before "to"); the common renderer lists them by label.
  const first = new Map<string, number>();
  r.questions.forEach((q, i) => { if (!first.has(`${q.section}|${q.about}`)) first.set(`${q.section}|${q.about}`, i); });
  const placed = (fact: string) => placementOf(s, fact)?.order ?? Number.MAX_SAFE_INTEGER;
  const countries = (s.canonical_fields as FieldDef[]).find((f) => f.answer_list?.key === "country")?.answer_list?.values.map((v) => v.label) ?? null;
  const needed = r.questions.filter((q) => !q.about.includes("/") && (fills.has(`${q.about}|${q.fact}`) || q.decides.length > 0))
    .sort((a, b) => first.get(`${a.section}|${a.about}`)! - first.get(`${b.section}|${b.about}`)! || placed(a.fact) - placed(b.fact));
  const notAsked = r.questions.filter((q) => !q.about.includes("/")).length - needed.length;
  const questions = needed.filter((q) => mode === "agent" || isClientField(s, q.fact)).map((q) => {
    const subjectId = subjectOf(q.about), p = placementOf(s, q.fact);
    let required = q.required, hidden = q.status === "hidden by a condition";
    if (p?.condition && p.condition_effect === "REQUIRE") { const c = evalCondition(s, known, p.condition, q.about === "case" ? "case" : subjectId); required = c.applies === true; }
    if (!p?.condition && p?.condition_effect === "OPTIONAL") required = false; // optional for everyone (no condition)
    const group = p?.repeats === "per_row" ? q.section : null;
    const current = answers.filter((a) => a.subjectId === subjectId && a.field === q.fact);
    const live = group ? rows.filter((x) => x.subjectId === subjectId && x.group === group).sort(byOrder) : [];
    const one = (a: Answer | undefined) => a ? { id: a.id, value: a.value, status: a.status, channel: a.channel, by: a.actor, at: a.at, answered: a.origin ? { channel: a.origin.channel, by: a.origin.actor, at: a.origin.at } : null, problems: checkValue(s, q.fact, a.value, today), ...confirm.get(a.id)! } : null;
    const options = optionsOf(s, q.fact);
    return {
      subjectId, about_label: q.about_label, fact: q.fact, label: q.label, meaning: q.meaning, value_type: q.value_type, shape: shapeOf(s, q.fact), section: q.section, section_title: q.section_title,
      collected_from: q.collected_from, required, hidden, why: q.why, group, capacity: q.rows.length || null,
      answer: group ? null : one(current.find((a) => !a.rowKey)),
      rows: group ? live.map((x, i) => ({ row: x.rowKey, index: i, fits: q.rows.length ? i < q.rows.length : true, answer: one(current.find((a) => a.rowKey === x.rowKey)) })) : [],
      options,
      note: !options && (q.value_type === "code" || q.value_type === "country") ? "No answer list yet (forms slice 2): the officer checks this answer before confirming the section." : null,
      fills: [...(fills.get(`${q.about}|${q.fact}`)?.values() ?? [])],
      countries: !options && (q.value_type === "country" || q.value_type === "address") ? countries : null,
    };
  });
  const sections = [...new Map(questions.map((q) => [`${q.subjectId}|${q.section}`, { subjectId: q.subjectId, about_label: q.about_label, section: q.section, title: q.section_title }])).values()].map((sec) => {
    const qs = questions.filter((q) => q.subjectId === sec.subjectId && q.section === sec.section);
    const answered = qs.flatMap((q) => (q.group ? q.rows.map((x) => x.answer) : [q.answer])).filter((a): a is NonNullable<typeof a> => !!a);
    // A repeating group may have no rows (no previous country, no job); a started row needs all its required answers.
    const missing = qs.filter((q) => q.required && !q.hidden && (q.group ? q.rows.some((x) => !x.answer) : !q.answer)).map((q) => q.label);
    return { ...sec, questions: qs, answered: answered.length, confirmed: answered.filter((a) => a.confirmed).length, invalid: answered.filter((a) => a.problems.length).length, missing };
  });
  // Checks the answers trigger, on the question they concern; in the client's view only those on the client's parts.
  const shown = new Set(sections.map((x) => `${x.subjectId}|${x.section}`));
  const checks: ViewCheck[] = (r.checks as { id: string; severity: string; message: string; person: string; person_label: string; applies_to: string | null; illustrative: boolean }[]).map((c) => {
    const subjectId = c.person === "case" ? caseSubject.subjectId : c.person, fact = c.applies_to && placementOf(s, c.applies_to) ? c.applies_to : null;
    return { id: c.id, severity: c.severity, message: c.message, subjectId, about_label: c.person === "case" ? caseSubject.label : c.person_label, fact, section: fact ? placementOf(s, fact)!.section_id : null, illustrative: c.illustrative };
  }).filter((c) => mode === "agent" || (c.section !== null && shown.has(`${c.subjectId}|${c.section}`)));
  return { mode, sections, checks, forms: r.forms.map((f) => ({ form: f.form, person: f.person_label, applies: f.applies })), summary: { not_asked: notAsked, questions: questions.length, answered: sections.reduce((n, x) => n + x.answered, 0), confirmed: sections.reduce((n, x) => n + x.confirmed, 0), missing: sections.reduce((n, x) => n + x.missing.length, 0) } };
}
export type CaseView = ReturnType<typeof caseView>;
