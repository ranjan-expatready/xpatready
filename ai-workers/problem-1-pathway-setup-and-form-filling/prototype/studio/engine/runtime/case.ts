// The case engine (runtime lane, R1): pure functions from a pinned release snapshot, the people on a case and their
// current answers, to what each person is asked, how each answer checks, whether it is confirmed (P-72) and which form
// boxes it fills. The questionnaire itself comes from the common renderer (engine/render.ts), so a case asks exactly
// what the release preview shows. No I/O; every output says why.
import { evalCondition, kkey, render, type Known, type Person, type Role } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { CONFIRM_WORDS, MINOR } from "../../contracts/runtime.ts";

export type Participant = { subjectId: string; role: Role | "case"; label: string; applies: boolean };
export type Answer = { id: string; subjectId: string; field: string; rowKey: string | null; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string };
export type Row = { rowKey: string; subjectId: string; group: string; order: number };
export type Confirmation = { confirmed: boolean; why: string };

/** Fields the client answers (P-72 "the client's fields"): placed in the questionnaire or the client's profile. */
const CLIENT_SOURCES = new Set(["client_questionnaire", "profile_record"]);

const placementOf = (s: Snapshot, field: string) => (s.placements as { fact: string }[]).find((p) => p.fact === field) as Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any -- snapshot rows are loosely typed (engine/snapshot.ts)
const fieldOf = (s: Snapshot, field: string) => (s.canonical_fields as { id: string }[]).find((f) => f.id === field) as Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any -- as above
export const isClientField = (s: Snapshot, field: string) => CLIENT_SOURCES.has(placementOf(s, field)?.collected_from);

/** Age in whole years on a day, from an ISO date; null when the date is not a real date. */
export function ageOn(birth: unknown, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birth ?? ""));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age--;
  return age;
}

/** P-72 with founder question 1 (recommended): VERIFIED is confirmed; a client's own typed answer on a client field
 *  counts as confirmed for the principal, the case and a minor child; everything else waits for "Confirm section". */
export function confirmation(s: Snapshot, a: Answer, who: Participant | undefined, birthDate: unknown, today: Date): Confirmation {
  if (a.status === "VERIFIED") return { confirmed: true, why: CONFIRM_WORDS.officer };
  if (a.channel !== "questionnaire") return { confirmed: false, why: `${CONFIRM_WORDS.waits} (entered in the agent view)` };
  if (!isClientField(s, a.field)) return { confirmed: false, why: `${CONFIRM_WORDS.waits} (a fact the officer confirms from a document or record)` };
  if (who?.role === "principal" || who?.role === "case") return { confirmed: true, why: CONFIRM_WORDS.client_own };
  if (who?.role === "child") {
    const age = ageOn(birthDate, today);
    if (age !== null && age < MINOR.underAge) return { confirmed: true, why: `${CONFIRM_WORDS.client_own} (for a child under ${MINOR.underAge})` };
    return { confirmed: false, why: `${CONFIRM_WORDS.waits} (${age === null ? "the child's date of birth is not answered yet" : `the child is ${age}, an adult`})` };
  }
  return { confirmed: false, why: `${CONFIRM_WORDS.waits} (answered for an adult family member)` };
}

/** How the forms that read a field write it (from the release's field maps): the precision and limits a value needs. */
export function shapeOf(s: Snapshot, field: string) {
  const ts = (s.field_maps as { entries: { fact?: string | null; transform?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field).map((e) => e.transform ?? ""));
  const maxes = ts.map((t) => /max (\d+) char/.exec(t)?.[1]).filter(Boolean).map(Number);
  const dayNeeded = ts.some((t) => /date(_part)?:DD|date:YYYY-MM-DD|^date$|date:DD/.test(t)) || !ts.some((t) => /date(_part)?:MM/.test(t));
  return { maxLength: maxes.length ? Math.min(...maxes) : 500, datePrecision: dayNeeded ? "day" as const : "month" as const, phone: ts.some((t) => /phone_part/.test(t)), money: ts.some((t) => /CAD/.test(t)) };
}

const realDate = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d && y >= 1900 && y <= 2100; };

/** Field checks (P-47 tier 1): the value's type, list and limits. Returns plain messages; empty when the value is fine. */
export function checkValue(s: Snapshot, field: string, value: unknown): string[] {
  const f = fieldOf(s, field);
  if (!f) return ["This question is not in the release the case works from."];
  const shape = shapeOf(s, field), type = String(f.value_type ?? "text");
  const str = typeof value === "string" ? value.trim() : null;
  const list = (f.answer_list?.values ?? []) as { key: string; label: string }[];
  switch (type) {
    case "yes_no": return typeof value === "boolean" ? [] : ["Answer yes or no."];
    case "number": {
      const n = typeof value === "number" ? value : Number(str);
      if (!Number.isFinite(n) || n < 0) return ["Enter a number of 0 or more."];
      if (shape.money && !Number.isInteger(n)) return ["Enter whole dollars, without cents."];
      return String(n).length > 12 ? ["That number is too long for the form (12 characters at most)."] : [];
    }
    case "date": {
      if (shape.datePrecision === "month") { const m = /^(\d{4})-(\d{2})$/.exec(str ?? ""); return m && realDate(Number(m[1]), Number(m[2]), 1) ? [] : ["Enter a month and year, for example 2019-06."]; }
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str ?? "");
      return m && realDate(Number(m[1]), Number(m[2]), Number(m[3])) ? [] : ["Enter a real date as day, month and year."];
    }
    case "code": case "country":
      if (str === null || !str) return ["Choose an answer."];
      return list.length && !list.some((v) => v.key === str) ? ["Choose one of the listed answers."] : [];
    case "address": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return ["Enter the address in its parts."];
      const a = value as Record<string, unknown>, out: string[] = [];
      for (const [k, w] of [["street_name", "street"], ["city", "city or town"], ["country", "country"]] as const) if (!String(a[k] ?? "").trim()) out.push(`Enter the ${w}.`);
      return out;
    }
    default: {
      if (shape.phone) {
        if (!value || typeof value !== "object") return ["Enter the country code and the number."];
        const p = value as Record<string, unknown>;
        const out: string[] = [];
        if (!/^\d{1,3}$/.test(String(p.country_code ?? ""))) out.push("Enter a country code of 1 to 3 digits, for example 91.");
        if (!/^\d{4,15}$/.test(String(p.number ?? "").replace(/[\s-]/g, ""))) out.push("Enter the number with digits only (4 to 15).");
        return out;
      }
      if (str === null) return ["Enter text."];
      if (!str) return ["Enter an answer."];
      if (type === "email" || /email/.test(field)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? [] : ["Enter an email address like name@example.com."];
      return str.length > shape.maxLength ? [`Keep it to ${shape.maxLength} characters (it is ${str.length}); the form has no room for more.`] : [];
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
  for (const list of groups.values()) [...list].sort((a, b) => a.order - b.order).forEach((r, i) => index.set(r.rowKey, i));
  const birth = (subjectId: string) => answers.find((a) => a.subjectId === subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value;
  for (const a of answers) {
    if (a.rowKey && !index.has(a.rowKey)) continue; // a removed row's answers stay stored and are never read
    const c = confirmation(s, a, people.find((p) => p.subjectId === a.subjectId), birth(a.subjectId), today);
    confirm.set(a.id, c);
    const v = { value: a.value, status: c.confirmed ? "confirmed" as const : "answered" as const, source: `${a.channel} by ${a.actor}` };
    const row = a.rowKey ? index.get(a.rowKey)! : undefined;
    known.set(kkey(about(a.subjectId), a.field, row), v);
    if (row === 0 && !known.has(kkey(about(a.subjectId), a.field))) known.set(kkey(about(a.subjectId), a.field), v);
  }
  return { known, confirm };
}

export type Mode = "sqr" | "agent";

/** The questionnaire view of a case: sections, each question once per person, with the current answer, its checks,
 *  its confirmation and the form boxes it fills. SQR mode shows the client's fields only; agent mode shows every fact. */
export function caseView(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], mode: Mode, today = new Date()) {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const caseSubject = people.find((p) => p.role === "case")!;
  const { known, confirm } = knownOf(s, people, answers, rows, today);
  const r = render(s, renderPeople, known);
  const subjectOf = (about: string) => (about === "case" ? caseSubject.subjectId : about.split("/")[0]);
  const fills = new Map<string, Map<string, { form: string; person: string; boxes: number }>>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about) {
    const k = `${b.about}|${b.fact}`, m = fills.get(k) ?? new Map(); const e = m.get(`${c.form}|${c.person}`) ?? { form: c.form, person: c.person_label, boxes: 0 }; e.boxes++; m.set(`${c.form}|${c.person}`, e); fills.set(k, m);
  }
  const questions = r.questions.filter((q) => !q.about.includes("/")).filter((q) => mode === "agent" || CLIENT_SOURCES.has(q.collected_from)).map((q) => {
    const subjectId = subjectOf(q.about), p = placementOf(s, q.fact) ?? {};
    let required = q.required, hidden = q.status === "hidden by a condition";
    if (p.condition && p.condition_effect === "REQUIRE") { const c = evalCondition(s, known, p.condition, q.about === "case" ? "case" : subjectId); required = c.applies === true; }
    const group = p.repeats === "per_row" ? q.section : null;
    const current = answers.filter((a) => a.subjectId === subjectId && a.field === q.fact);
    const live = group ? rows.filter((x) => x.subjectId === subjectId && x.group === group).sort((a, b) => a.order - b.order) : [];
    const one = (a: Answer | undefined) => a ? { id: a.id, value: a.value, status: a.status, channel: a.channel, by: a.actor, at: a.at, problems: checkValue(s, q.fact, a.value), ...confirm.get(a.id)! } : null;
    return {
      subjectId, about_label: q.about_label, fact: q.fact, label: q.label, meaning: q.meaning, value_type: q.value_type, shape: shapeOf(s, q.fact), section: q.section, section_title: q.section_title,
      collected_from: q.collected_from, required, hidden, why: q.why, group, capacity: q.rows.length || null,
      answer: group ? null : one(current.find((a) => !a.rowKey)),
      rows: group ? live.map((x, i) => ({ row: x.rowKey, index: i, fits: q.rows.length ? i < q.rows.length : true, answer: one(current.find((a) => a.rowKey === x.rowKey)) })) : [],
      options: (fieldOf(s, q.fact)?.answer_list?.values ?? null) as { key: string; label: string }[] | null,
      fills: [...(fills.get(`${q.about}|${q.fact}`)?.values() ?? [])],
    };
  });
  const sections = [...new Map(questions.map((q) => [`${q.subjectId}|${q.section}`, { subjectId: q.subjectId, about_label: q.about_label, section: q.section, title: q.section_title }])).values()].map((sec) => {
    const qs = questions.filter((q) => q.subjectId === sec.subjectId && q.section === sec.section);
    const answered = qs.flatMap((q) => (q.group ? q.rows.map((x) => x.answer) : [q.answer])).filter((a): a is NonNullable<typeof a> => !!a);
    const missing = qs.filter((q) => q.required && !q.hidden && (q.group ? !q.rows.length : !q.answer)).map((q) => q.label);
    return { ...sec, questions: qs, answered: answered.length, confirmed: answered.filter((a) => a.confirmed).length, invalid: answered.filter((a) => a.problems.length).length, missing };
  });
  return { mode, sections, checks: r.checks, forms: r.forms.map((f) => ({ form: f.form, person: f.person_label, applies: f.applies })), summary: { questions: questions.length, answered: sections.reduce((n, x) => n + x.answered, 0), confirmed: sections.reduce((n, x) => n + x.confirmed, 0), missing: sections.reduce((n, x) => n + x.missing.length, 0) } };
}
export type CaseView = ReturnType<typeof caseView>;
