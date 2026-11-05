// B83 (QA-234, P-322; screens/B83-own-question-screen/concept.md): a form's Yes/No form field the field map works out from
// other answers is asked as its own question, in the form's words, by a person: on the Form fields page and an applied
// draft's page, with one line on the Smart questionnaire tab that leads there. Rules only: no AI, US$0. The author only.
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useApi, useSessionView } from "@/lib/api";
import { Button, Field, Input, Select } from "@/components/ui/controls";
import { Tip, TipProvider } from "@/components/status";
import { useUndoToast } from "@/components/lifecycle";
import type { OwnQuestionRow, OwnQuestionUndone, OwnQuestionsToAsk, OwnQuestionsView } from "../../../contracts/own-question";

type Choice = OwnQuestionsView["yes_no_fields"][number];
const wordsIn = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
/** Library Yes/No fields about the same subject, the closest words first (M4: none is chosen for the person). */
const closest = (all: Choice[], row: OwnQuestionRow) => {
  const q = wordsIn(row.question ?? "");
  const score = (f: Choice) => [...wordsIn(`${f.name} ${f.meaning ?? ""}`)].filter((w) => q.has(w)).length;
  return all.filter((f) => f.key.split(".")[0] === row.group).map((f) => ({ f, s: score(f) })).sort((a, b) => b.s - a.s || a.f.name.localeCompare(b.f.name)).map((x) => x.f);
};
const same = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The Form fields page's section. Left out when the edition has no such form field. */
export function OwnQuestions({ editionId }: { editionId: string }) {
  const cache = ["own-questions", editionId];
  const q = useApi<OwnQuestionsView>(cache, `/editions/${editionId}/form-fields/own-questions`);
  const { canAuthor, known, failed } = useSessionView();
  const qc = useQueryClient();
  const undoToast = useUndoToast();
  const [open, setOpen] = React.useState<string | null>(null);
  // BR-6: "Why" starts empty; after a save the next form field starts with what this person just typed.
  const [lastWhy, setLastWhy] = React.useState("");
  const [moveOn, setMoveOn] = React.useState(false);
  // Review F2, F5, F7: what an undo or a refused save came to, on its row: the toast's own text goes when it closes.
  const [said, setSaid] = React.useState<{ dataPath: string; text: string; bad: boolean } | null>(null);
  const [backTo, setBackTo] = React.useState<string | null>(null);
  const box = React.useRef<HTMLElement>(null);
  const refresh = () => qc.invalidateQueries();
  // After a save the keyboard lands on the next form field to ask, or on the section when none is left.
  React.useEffect(() => { if (!moveOn || q.isFetching) return; setMoveOn(false); const next = box.current?.querySelector<HTMLElement>("[data-own-ask]"); (next ?? box.current)?.focus(); }, [moveOn, q.isFetching, q.data]);
  // After an undo it lands on that row's own button (the new Ask, or its Undo when someone else changed it), or on the section.
  React.useEffect(() => {
    if (!backTo || q.isFetching) return;
    setBackTo(null);
    const row = [...(box.current?.querySelectorAll<HTMLElement>("[data-own-row]") ?? [])].find((r) => r.dataset.ownRow === backTo);
    (row?.querySelector<HTMLElement>("[data-own-ask], [data-own-undo]") ?? box.current)?.focus();
  }, [backTo, q.isFetching, q.data]);
  // The Smart questionnaire's line leads here: the section can sit below a long list of undecided form fields.
  const { hash } = useLocation();
  const hasFields = !!q.data?.fields.length;
  React.useEffect(() => { if (hash === "#own-questions" && hasFields) { box.current?.scrollIntoView({ block: "start" }); box.current?.focus({ preventScroll: true }); } }, [hash, hasFields]);
  const fields = q.data?.fields ?? [];
  if (!fields.length) return null;
  // Never rejects: both Undo buttons end here, and the answer or the refusal is said on the row (the shared toast's run clears itself).
  const undo = async (row: OwnQuestionRow) => {
    setSaid(null);
    try {
      const r = await api<OwnQuestionUndone>(`/editions/${editionId}/form-fields/own-question/undo`, { method: "POST", json: { dataPath: row.dataPath } });
      setSaid({ dataPath: row.dataPath, bad: false, text: ["Taken back: worked out from other answers again.", r.withdrew ? "Its new field was withdrawn." : null, r.kept, r.still_asked].filter(Boolean).join(" ") });
    } catch (e) { setSaid({ dataPath: row.dataPath, bad: true, text: (e as Error).message }); }
    await refresh();
    setBackTo(row.dataPath);
  };
  return (
    <TipProvider>
    <section ref={box} tabIndex={-1} aria-labelledby="own-q" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4 outline-none" data-own-questions>
      <div><Tip focusable tip="Yes/No form fields the field map fills from other answers. Asking one here puts the form's own question to the client."><h2 id="own-q" className="inline font-semibold">Yes/No form fields worked out from other answers ({fields.length})</h2></Tip>
        <p className="text-sm text-text-muted">The form asks these itself, but its field map works the answer out from other answers, so nobody is asked and conditions cannot rest on them. Ask one as its own question: the form's words stay its source. A form field not asked holds nothing. Once one is asked, press "Ask them in their forms' sections" on the Smart questionnaire tab, or release is held; a new field also holds release until a second person approves it.</p>
        {known && !failed && !canAuthor ? <p className="mt-1 text-sm text-text-muted" data-own-read-only>A configuration author asks these.</p> : null}</div>
      <ul className="divide-y divide-border text-sm">{fields.map((row) => (
        <li key={row.dataPath} className="py-2" data-own-row={row.dataPath}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="min-w-0 flex-1"><b className="font-medium">{row.page ? <span className="text-text-muted">p. {row.page} · </span> : null}{row.question ?? "This form field"}</b>
              {!row.asked && row.worked_out_from_names.length ? <span className="block text-xs text-text-muted">Worked out from: {row.worked_out_from_names.join(", ")}</span> : null}
              {row.why_not ? <span className="block text-xs text-text-muted" data-own-why-not>{row.why_not}</span> : null}
              {row.asked_as ? <span className="mt-0.5 flex items-center gap-1 text-text" data-own-asked><CheckCheck className="size-4 shrink-0" aria-hidden /> <span>Asked as "{row.asked_as.name}"{row.asked_as.waiting ? <span className="text-text-muted"> · a second person approves it on To review; release is held until then</span> : null}</span></span> : null}</span>
            {canAuthor && row.can_ask ? <Button size="sm" variant="secondary" data-own-ask aria-expanded={open === row.dataPath} onClick={() => { setSaid(null); setOpen(open === row.dataPath ? null : row.dataPath); }}>Ask as its own question</Button> : null}
            {canAuthor && row.asked_as ? <UndoButton onUndo={() => undo(row)} /> : null}
          </div>
          {said?.dataPath === row.dataPath && !(open === row.dataPath && row.can_ask) ? <p role={said.bad ? "alert" : "status"} className={`mt-1 text-sm ${said.bad ? "text-text-danger" : "text-text"}`} data-own-said>{said.text}</p> : null}
          {open === row.dataPath && row.can_ask ? <AskForm editionId={editionId} row={row} choices={closest(q.data?.yes_no_fields ?? [], row)} startWhy={lastWhy} onDone={async (r, why) => {
            setLastWhy(why); setOpen(null); setSaid(null); await refresh(); setMoveOn(true);
            undoToast.show(`Asked as "${r.name}". Next: Smart questionnaire › Ask them in their forms' sections, or release is held.`, () => undo(row));
          }} onRefused={(text) => { setSaid({ dataPath: row.dataPath, bad: true, text }); void refresh(); }} /> : null}
        </li>))}</ul>
      {undoToast.node}
    </section>
    </TipProvider>
  );
}

function UndoButton({ onUndo }: { onUndo: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);
  return <Button size="sm" variant="secondary" busy={busy} data-own-undo onClick={() => { setBusy(true); void onUndo().finally(() => setBusy(false)); }}>Undo</Button>;
}

function AskForm({ editionId, row, choices, startWhy, onDone, onRefused }: { editionId: string; row: OwnQuestionRow; choices: Choice[]; startWhy: string; onDone: (r: { name: string }, why: string) => Promise<void>; onRefused: (words: string) => void }) {
  const [mode, setMode] = React.useState<"library" | "new">(choices.length ? "library" : "new");
  const [field, setField] = React.useState(""), [label, setLabel] = React.useState(""), [meaning, setMeaning] = React.useState(`Whether: ${row.question ?? ""}`), [why, setWhy] = React.useState(startWhy), [near, setNear] = React.useState(""), [needNear, setNeedNear] = React.useState(false);
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  const alert = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => { if (err) alert.current?.focus(); }, [err]);
  const twin = mode === "new" && label.trim() ? choices.find((c) => same(c.name, label)) : undefined;
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ name: string }>(`/editions/${editionId}/form-fields/own-question`, { method: "POST", json: { dataPath: row.dataPath, reason: why, ...(mode === "library" ? (field ? { field } : {}) : { label, meaning, ...(needNear && near.trim() ? { nearReason: near } : {}) }) } });
      await onDone(r, why);
    } catch (e) {
      const m = (e as Error).message;
      if (/is close to the library/.test(m)) setNeedNear(true);
      setErr(m);
      onRefused(m); // Review F5: any refused save shows the list as it is now; if the row can no longer be asked, the words stay on it
    } finally { setBusy(false); }
  };
  const idBase = React.useId();
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border p-3" data-own-form>
      <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="sr-only">Which field asks it</legend>
        <label className="flex items-center gap-1.5"><input type="radio" name={`${idBase}-m`} checked={mode === "library"} disabled={!choices.length} onChange={() => setMode("library")} /> Use a library field</label>
        <label className="flex items-center gap-1.5"><input type="radio" name={`${idBase}-m`} checked={mode === "new"} onChange={() => setMode("new")} /> Name a new one</label>
      </fieldset>
      {mode === "library"
        ? <Field label="Library field"><Select value={field} onChange={(e) => setField(e.target.value)}><option value="">Choose…</option>{choices.map((c) => <option key={c.key} value={c.key}>{c.name}{c.meaning && c.meaning !== c.name ? ` · ${c.meaning}` : ""}</option>)}</Select></Field>
        : <div className="grid gap-2 md:grid-cols-[1fr_2fr]">
            <Field label="Name"><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} /></Field>
            <Field label="What it means"><Input value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={500} /></Field>
          </div>}
      {twin ? <p className="text-sm" data-own-twin>"{twin.name}" is already in the library. <Button size="sm" variant="secondary" onClick={() => { setMode("library"); setField(twin.key); }}>Use it</Button></p> : null}
      {needNear && mode === "new" ? <Field label="Why it is not the same"><Input value={near} onChange={(e) => setNear(e.target.value)} maxLength={300} /></Field> : null}
      <Field label="Why"><Input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} placeholder="For example: the form asks this itself before its details" /></Field>
      {err ? <p ref={alert} tabIndex={-1} role="alert" className="text-sm text-text-danger outline-none" data-own-error>{err}</p> : null}
      <div className="flex justify-end"><Button size="sm" busy={busy} onClick={() => void save()}>Ask it · US$0</Button></div>
    </div>
  );
}

/** The Smart questionnaire tab's line: To review only links to the Form fields page while an edition has undecided form
 *  fields, so this leads there. The form number and the count come from the data. The author only. */
export function OwnQuestionsLine({ combinationId }: { combinationId: string }) {
  const { canAuthor } = useSessionView();
  const q = useApi<OwnQuestionsToAsk>(["own-questions-to-ask", combinationId], canAuthor ? `/combinations/${combinationId}/own-questions` : null);
  const eds = q.data?.editions ?? [];
  if (!canAuthor || !eds.length) return null;
  return <div className="mt-2 space-y-1 text-sm" data-own-line>{eds.map((e) => <p key={e.id}>{e.form} works out {e.to_ask} Yes/No answer{e.to_ask === 1 ? "" : "s"} from other answers. <Link className="underline" to={`/review/form-fields/${e.id}#own-questions`}>Ask {e.to_ask === 1 ? "it as its own question" : "them as their own questions"}</Link>.</p>)}</div>;
}
