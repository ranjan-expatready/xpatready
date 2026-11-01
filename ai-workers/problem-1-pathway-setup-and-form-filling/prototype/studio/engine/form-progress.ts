// F2 C2.12 slice 2 (forms lane; the agreed F3 plan §5 and BR-3–BR-5, PDF only since P-102): one form's guided path on one
// combination, worked out from facts the API reads (pure: no I/O). Steps 2–5 come from the To review items of this form
// (QueueItem.forms, #179), so the path and To review name the same next step for the same person (plan D3); step 6 from the
// validator's Forms problems for this form. Nothing is stored (plan D5).
import { STEP_KEYS, STEP_LABEL, type FormProgress, type ProgressStep, type StepKey } from "../contracts/form-progress.ts";
import type { QueueItem } from "../contracts/review-queue.ts";

export type ProgressFacts = {
  form: string; combinationId: string;
  /** The combination's line for this form, as the draft has it now: a line; only its PDF attached (before its setup, as the
   *  Forms tab's "Not set up yet" rows); or neither. */
  line: "present" | "attached" | "none";
  /** The library's current approved edition of the form (a usable PDF), or null. */
  edition: string | null;
  /** The form fields of that edition with a stored field map (any outcome), and those still with no decision. */
  mapped: number; unresolved: number;
  /** The newest field-map draft of this file: none, queued or running, finished, or stopped (failed, blocked, cancelled). */
  draft: "none" | "running" | "done" | "stopped";
  /** To review items of this form for the asking person (QueueItem.forms includes it). Only those about this combination,
   *  or library-wide (no combination), are this path's (concept K1; slice 3 review Major 2). */
  items: QueueItem[];
  /** The same file being mapped in another combination (one draft per file, F3 D4): there, its link and why; else null.
   *  Absent counts as null. */
  elsewhere?: { combination: string; href: string; why: string } | null;
  /** The validator's Forms problems for this form (item = the form number). */
  problems: { level: "error" | "warning"; message: string }[];
  /** The asking person holds the author duty (adds forms, starts drafts); steps 1–2 are theirs. */
  canAuthor: boolean;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const KINDS: Record<"review" | "fields" | "second_person", QueueItem["kind"][]> = {
  review: ["ai_proposals", "proposals", "form_fields"],
  fields: ["library_change", "merge"],
  second_person: ["held_file", "new_edition"],
};

/** A step read from To review items: one the person can take now, one waiting on someone else, or nothing open. */
function fromItems(items: QueueItem[], kinds: QueueItem["kind"][]): { state: "needs_you" | "waiting_others" | "running" | null; count: number; next: ProgressStep["next"]; who: string | null; words: string | null } {
  // Review (514f0d8d) m1: in To review's own order (needs first, then oldest first), so both lead with the same item.
  const ORDER: Record<QueueItem["state"], number> = { needs: 0, waiting: 1, running: 2 };
  const open = items.filter((i) => kinds.includes(i.kind)).sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.at.localeCompare(b.at));
  const mine = open.find((i) => i.state === "needs" && i.next?.href);
  if (mine) return { state: "needs_you", count: open.length, next: { label: mine.next!.label, href: mine.next!.href! }, who: null, words: mine.what };
  const waiting = open.find((i) => i.state === "waiting");
  if (waiting) return { state: "waiting_others", count: open.length, next: null, who: waiting.waiting_on, words: waiting.what };
  const running = open.find((i) => i.state === "running");
  if (running) return { state: "running", count: open.length, next: null, who: null, words: running.what };
  return { state: null, count: 0, next: null, who: null, words: null };
}

export function formProgress(given: ProgressFacts): FormProgress {
  // Slice 3 review (28b3bba3) Major 2, concept K1: another combination's work on the same form is never this path's step.
  const f = { ...given, items: given.items.filter((i) => i.combination == null || i.combination === given.combinationId) };
  const forms = `/c/${f.combinationId}/forms`;
  // Steps 1–2 are the configuration author's: anyone else is told who acts (BR-4, never a step they cannot take).
  const author = (s: Omit<ProgressStep, "n" | "key" | "label">): Omit<ProgressStep, "n" | "key" | "label"> => (s.state === "needs_you" || (s.state === "not_started" && s.next)) && !f.canAuthor ? { ...s, state: s.state === "needs_you" ? "waiting_others" : s.state, next: null, who: "The configuration author does this." } : s;
  const step = (key: StepKey, s: Omit<ProgressStep, "n" | "key" | "label">): ProgressStep => ({ n: STEP_KEYS.indexOf(key) + 1, key, label: STEP_LABEL[key], ...s });
  const steps: ProgressStep[] = [];

  // 1. Read and added: the combination has the form (a line, or its PDF attached) and the library a usable PDF of it.
  const held = f.items.some((i) => (i.kind === "held_file" || i.kind === "new_edition") && i.state !== "running");
  steps.push(step("attach", author(
    f.line !== "none" && f.edition ? { state: "done", words: `${f.edition} is in the library and on this combination.`, next: null, who: null, count: 0 }
    : f.line !== "none" && held ? { state: "waiting_others", words: `${f.form} is on this combination, but its PDF waits for a person before it joins the library.`, next: null, who: "A second person checks the held PDF on To review.", count: 1 }
    : f.line !== "none" ? { state: "needs_you", words: `${f.form} is on this combination, but the library has no usable PDF of it yet.`, next: { label: "Find again or upload its PDF", href: forms }, who: null, count: 1 }
    // Review (cd8a023d) Minor A: a form with no usable PDF yet cannot be added (the library says "No file yet"): its PDF first.
    : f.edition ? { state: "not_started", words: `${f.form} is not on this combination.`, next: { label: "Add it from the library", href: forms }, who: null, count: 1 }
    : { state: "not_started", words: `${f.form} is not on this combination, and the library has no PDF of it yet.`, next: { label: "Upload its PDF in the Form library", href: "/library/forms" }, who: null, count: 1 })));
  const attached = steps[0].state === "done";

  // 2. Field map drafted: a stored field map, or a finished AI draft of this file.
  steps.push(step("map", author(
    // Attached only, with the library's field map: not this combination's yet: Add from library joins it (no AI, US$0).
    f.line === "attached" && f.mapped > 0 && f.draft !== "done" ? { state: "needs_you", words: `Its form fields are already matched in the library: Add from library joins it to this combination (no AI, US$0).`, next: { label: "Add from library", href: forms }, who: null, count: 1 }
    : f.mapped > 0 || f.draft === "done" ? { state: "done", words: f.mapped > 0 ? `${plural(f.mapped, "form field")} of ${f.edition ?? f.form} ${f.mapped === 1 ? "has" : "have"} a field map.` : "The AI draft of the field map has finished.", next: null, who: null, count: 0 }
    : f.draft === "running" ? { state: "running", words: "The AI draft of the field map is running; this page follows it.", next: null, who: null, count: 1 }
    // Slice 3 review Major 2 (BR-7, F3 D4: one draft per file): the same file is being mapped in another combination: its
    // decisions are reused here once added there, so this step waits there (its link, never a Draft that would be refused).
    : f.elsewhere ? { state: "waiting_others", words: f.elsewhere.why, next: { label: `Open it in ${f.elsewhere.combination}`, href: f.elsewhere.href }, who: "The people working on it there finish it; nothing to do here until then.", count: 1 }
    : { state: attached ? "needs_you" : "not_started", words: !f.canAuthor ? (f.draft === "stopped" ? "The last AI draft stopped before it finished." : "No field map yet.") : f.draft === "stopped" ? "The last AI draft stopped before it finished: draft again, or add the field map from the library." : "No field map yet: draft it with AI, or add it from the library (no AI, US$0).", next: attached ? { label: "Draft with AI or add from the library", href: forms } : null, who: null, count: 1 })));
  const mapped = steps[1].state === "done";
  // Review (514f0d8d) M2b, plan §7 / BR-14: until the form is on the combination with a usable PDF, nothing after step 1
  // has started (a library field map of a form this combination does not have is not its progress).
  if (!attached) {
    for (const key of ["map", "review", "fields", "second_person", "complete"] as const) {
      const at = STEP_KEYS.indexOf(key);
      steps[at] = step(key, { state: "not_started", words: "Comes after the form is on this combination with a usable PDF.", next: null, who: null, count: 0 });
    }
    return finish(f, steps);
  }

  // 3–5. From To review: the same items, the same next step (plan D3).
  for (const key of ["review", "fields", "second_person"] as const) {
    const r = fromItems(f.items, KINDS[key]);
    // Step 3 also counts form fields of the edition still with no decision (an item exists for them; the count is said).
    const extra = key === "review" && !r.state && f.unresolved > 0 ? f.unresolved : 0;
    if (r.state) steps.push(step(key, { state: r.state, words: r.words ?? "", next: r.next, who: r.who, count: r.count }));
    else if (extra) steps.push(step(key, { state: "needs_you", words: `${plural(extra, "form field")} with no decision yet.`, next: { label: "Decide the form fields", href: forms }, who: null, count: extra }));
    else steps.push(step(key, mapped || key === "second_person" ? { state: "done", words: "Nothing waits here.", next: null, who: null, count: 0 } : { state: "not_started", words: "Comes after the field map is drafted.", next: null, who: null, count: 0 }));
  }

  // 6. Complete: drafted, nothing open above, and the validator raises nothing for this form on this combination.
  // Review m3: only errors keep the field map from being complete (warnings do not stop a release, BR-10); they are said.
  const open = f.problems.filter((p) => p.level === "error");
  const warns = f.problems.filter((p) => p.level === "warning");
  const before = steps.slice(0, 5).every((s) => s.state === "done");
  steps.push(before && !open.length
    ? step("complete", { state: "done", words: `The field map is complete for this combination: it goes out with the next release.${warns.length ? ` To note: ${warns.map((p) => p.message).slice(0, 2).join(" ")}` : ""}`, next: null, who: null, count: 0 })
    : step("complete", { state: before ? "needs_you" : "not_started", words: open.length ? open.map((p) => p.message).slice(0, 2).join(" ") : "Comes after the steps above.", next: before && open.length ? { label: "See what is left on Review and release", href: `/c/${f.combinationId}/review` } : null, who: null, count: open.length || (before ? 0 : 1) }));

  return finish(f, steps);
}

function finish(f: ProgressFacts, steps: ProgressStep[]): FormProgress {
  const notDone = steps.filter((s) => s.state !== "done");
  const current = notDone[0]?.key ?? null;
  // BR-4: the person's first step that can go ahead now; when the current one waits for someone else, a later one of theirs.
  // A step not started that the person can start (Add it from the library) counts too.
  const mine = notDone.find((s) => (s.state === "needs_you" || s.state === "not_started") && s.next);
  return {
    form: f.form, combination: f.combinationId, steps, current,
    next_for_you: mine ? { step: mine.key, label: mine.next!.label, href: mine.next!.href } : null,
    // BR-5: each line links where it is done. Slice 3 review Minor 1: only what is open (a step someone can take or is
    // waiting on, or one running), never the blocked steps after it, which the step list already shows.
    whats_left: notDone.filter((s) => s.state !== "not_started" || s.next).map((s) => ({ step: s.key, what: s.label, count: s.count, who: s.who, href: s.next?.href ?? null })),
  };
}
