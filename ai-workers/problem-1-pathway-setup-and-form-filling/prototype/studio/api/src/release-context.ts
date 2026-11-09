// C9.5 Adopt a published update on an open case (B145): the case side of the pure rules in engine/runtime/release-update.ts,
// shared by the release-update routes (api/src/release-update.ts) and the prepare view (api/src/case-prepare.ts), so the
// notice, the panel, the readiness warning and the after-move marks read one difference. Reads only; no route here.
import type { Snapshot } from "../../engine/snapshot.ts";
import { caseView, checkValue, knownOf, type Answer, type GroupAnswer, type Participant, type Row } from "../../engine/runtime/case.ts";
import { caseChecklist } from "../../engine/runtime/case-checklist.ts";
import { render, type Role } from "../../engine/render.ts";
import { releaseDiff, targetOf, type CaseInputs, type CaseSide, type ReleaseDiff, type SnapshotIn } from "../../engine/runtime/release-update.ts";
import { releaseLabel } from "../../contracts/runtime.ts";
import { demoRelease } from "./answer-key-gate.ts";
import type { Db } from "./core.ts";
import type { Reached } from "./runtime.ts";

export type CaseState = { people: Participant[]; answers: Answer[]; rows: Row[]; groups: GroupAnswer[] };

/** One release's reading of the case: per person, the forms that apply or may apply, the document lines (needed or
 *  waiting for an answer) and, when asked, the questions shown. Answers its own checks reject decide nothing (as the
 *  prepare view and the checklist). */
export function sideOf(s: Snapshot, combinationKey: string, st: CaseState, today: Date, questions: boolean): CaseSide {
  const clean = st.answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0);
  const { known } = knownOf(s, st.people, clean, st.rows, today);
  const people = st.people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const forms = new Map<string, Set<string>>();
  for (const f of render(s, people, known, { today }).forms as { form: string; person: string; applies: boolean | "cannot_tell"; form_kind?: string }[])
    if (f.applies !== false) forms.set(f.person, new Set([...(forms.get(f.person) ?? []), f.form]));
  const documents = new Map<string, Map<string, string>>();
  const list = caseChecklist(s, combinationKey, st.people, known, today);
  if (list.derived) for (const p of list.people) documents.set(p.subject, new Map([...p.lines, ...p.waiting].map((l) => [l.document.key, l.document.name ?? l.label])));
  const qs = new Map<string, Map<string, string>>();
  if (questions) for (const sec of caseView(s, st.people, st.answers, st.rows, "agent", today, st.groups).sections)
    for (const q of sec.questions) if (!q.hidden) qs.set(sec.subjectId, new Map([...(qs.get(sec.subjectId) ?? []), [q.fact, q.label]]));
  return { forms, documents, questions: qs };
}

/** Both releases' reading of the case, with the people's names and the answers given (for the type check). */
export function caseInputs(from: Snapshot, to: Snapshot, combinationKey: string, st: CaseState, today: Date, questions: boolean): CaseInputs {
  const caseSubject = st.people.find((p) => p.role === "case")?.subjectId;
  const to2 = sideOf(to, combinationKey, st, today, questions);
  return { people: st.people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, label: p.label })),
    from: sideOf(from, combinationKey, st, today, questions), to: to2,
    // An answer counts for a type change only where the new release still asks it of that person (a hidden answer is kept,
    // never read, so it never blocks a move); without the questions worked out, every answer counts. Devin on #1252: the
    // application's own answers (once per case) count too, so a changed type there refuses the move as well; they sort
    // after the people's, so the people's are named first.
    answered: st.answers.filter((a) => !a.rowKey && (!questions || !!to2.questions.get(a.subjectId)?.has(a.field)))
      .sort((p, q) => Number(p.subjectId === caseSubject) - Number(q.subjectId === caseSubject)).map((a) => ({ subject: a.subjectId, fact: a.field })) };
}

/** BR-2: the release this case may move to (the newest of its own combination with a higher version), or null. */
export async function targetRelease(db: Db, c: Reached) {
  const pin = c.pins[0];
  const rows = await db.configRelease.findMany({ where: { combinationId: c.combinationId, version: { gt: pin.release.version } }, orderBy: { version: "desc" }, take: 1,
    select: { id: true, version: true, sha256: true, releasedAt: true, packVersionId: true, packVersion: { select: { version: true } } } });
  const t = targetOf(rows, pin.release.version);
  if (!t) return null;
  const full = await db.configRelease.findUnique({ where: { id: t.id }, select: { snapshot: true } });
  const snapshot = full!.snapshot as unknown as Snapshot;
  return { ...t, label: releaseLabel(t), snapshot, demo: demoRelease(snapshot) };
}

/** The difference between two releases, computed once per pair for one read. */
export function diffCache() {
  const m = new Map<string, ReleaseDiff>();
  return (fromId: string, from: Snapshot, toId: string, to: Snapshot) => {
    const k = `${fromId}|${toId}`;
    if (!m.has(k)) m.set(k, releaseDiff(from as unknown as SnapshotIn, to as unknown as SnapshotIn));
    return m.get(k)!;
  };
}

/** The case's pins as releases (newest first), each with its label and snapshot: an earlier revision's release is where
 *  the copies made before a move were filled. */
export const pinReleases = (c: Reached) => c.pins.map((p) => ({ id: p.configReleaseId, revision: p.revision, version: p.release.version, label: releaseLabel(p.release), pinnedAt: p.pinnedAt, reason: p.reason, snapshot: p.release.snapshot as unknown as Snapshot }));
