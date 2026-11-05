// B81 (C10.1 row 9, C3.8; concept screens/b81-not-on-form/concept.md): on a form's panel, how each answer on a shared list
// becomes the choice this form prints. An answer the form prints nothing for is marked "Not on this form", so a case with
// it is refused at filling in words, never given the nearest choice. Every choice comes from the form (STANDARDS §3.2
// pick, don't type); the server decides what may be saved and says why. Saved on the edition. US$0, no AI.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { OptionMapGroup, OptionMapsView } from "../../../contracts/forms";
import { api, ApiError, useToast } from "@/lib/api";
import { Gated, useDuties } from "@/components/answer-key-editors";
import { Button, Dialog, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { PERSON } from "@/pages/job";

const NOT_ON_FORM = "__not_on_form";
const WHY_AUTHOR = "Only the configuration author sets a form's choices.";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const whom = (g: OptionMapGroup) => [...new Set(g.form_fields.map((f) => (f.person ? PERSON[f.person] ?? f.person.replace(/_/g, " ") : "this form")))].join(", ");
const stillOpen = (g: OptionMapGroup) => g.values.filter((v) => !v.code && !v.not_on_form);

/** The section on the form's panel: what is on the form, what is open, and the way in. Nothing shows for a form with no
 *  form field on an answer list. `start`: arrived from a release problem, so the dialog opens at once. */
export function FormChoices({ combinationId, editionId, start = false }: { combinationId: string; editionId: string; start?: boolean }) {
  const key = ["option-maps", editionId];
  const q = useQuery<OptionMapsView>({ queryKey: key, queryFn: () => api(`/editions/${editionId}/option-maps`) });
  const [open, setOpen] = React.useState(start);
  if (q.isLoading) return null;
  if (q.isError) return <section aria-labelledby="choices-h" className="space-y-1 border-t border-border pt-4" data-form-choices="error"><h3 id="choices-h" className="text-xs font-medium">Choices this form prints</h3><p role="alert" className="text-sm text-text-danger">Its choices could not be read: {(q.error as Error).message} <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>Try again</Button></p></section>;
  const v = q.data!;
  if (!v.groups.length) return null;
  const fields = v.groups.reduce((t, g) => t + g.form_fields.length, 0), blocks = v.groups.filter((g) => g.problems.length).length;
  const marks = new Set(v.groups.flatMap((g) => g.values.filter((x) => x.not_on_form).map((x) => x.key))).size, gaps = new Set(v.groups.flatMap((g) => stillOpen(g).map((x) => x.key))).size;
  return (
    <section aria-labelledby="choices-h" className="space-y-2 border-t border-border pt-4" data-form-choices>
      <h3 id="choices-h" className="text-xs font-medium">Choices this form prints {blocks ? <Pill tone="danger">Blocks release</Pill> : null}</h3>
      <p className="text-sm">{plural(fields, "form field")} read an answer list. {gaps ? `${plural(gaps, "answer has", "answers have")} no choice set. ` : ""}{marks ? `${plural(marks, "answer is", "answers are")} marked not on this form.` : ""}</p>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-set-choices>Set choices</Button>
      {open ? <ChoicesDialog view={v} combinationId={combinationId} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}

function ChoicesDialog({ view, combinationId, onClose }: { view: OptionMapsView; combinationId: string; onClose: () => void }) {
  const n = view.combinations.length;
  return (
    <Dialog open wide guard onOpenChange={(o) => { if (!o) onClose(); }} title={`Choices: ${view.edition}`}
      description={`How each answer becomes the choice this form prints. Saved on ${view.edition}: ${n ? `${plural(n, "combination files", "combinations file")} it (${view.combinations.join(", ")})` : "no combination files it yet"}; a case gets it only through a release.`}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-5" data-choices-dialog>
        <p className="text-xs text-text-muted">Not on this form: the form prints no such choice, so a case with this answer is refused at filling, in words, and never given the nearest choice. <Pill tone="warn" title="Sample until the immigration expert confirms.">Sample</Pill> Whether IRCC accepts the box left blank: Unconfirmed: expert.</p>
        {view.groups.map((g) => <ChoiceGroup key={`${g.list}|${g.form_fields[0].data_path}`} group={g} editionId={view.edition_id} combinationId={combinationId} />)}
      </div>
    </Dialog>
  );
}

function ChoiceGroup({ group: g, editionId, combinationId }: { group: OptionMapGroup; editionId: string; combinationId: string }) {
  const qc = useQueryClient(); const toast = useToast(); const can = useDuties().family;
  const initial = React.useCallback(() => Object.fromEntries(g.values.map((v) => [v.key, v.not_on_form ? NOT_ON_FORM : v.code ?? ""])), [g.revision]); // eslint-disable-line react-hooks/exhaustive-deps -- a save or someone else's change starts it again
  const [picked, setPicked] = React.useState<Record<string, string>>(initial);
  React.useEffect(() => setPicked(initial()), [initial]);
  const [busy, setBusy] = React.useState(false), [refused, setRefused] = React.useState<string | null>(null), [stale, setStale] = React.useState(false);
  const refresh = () => { for (const k of [["option-maps", editionId], ["combination", combinationId], ["combination-summary", combinationId], ["config", combinationId]]) void qc.invalidateQueries({ queryKey: k }); };
  const dirty = !g.saved || g.values.some((v) => picked[v.key] !== (v.not_on_form ? NOT_ON_FORM : v.code ?? ""));
  const takenBy = (code: string, key: string) => g.values.find((v) => v.key !== key && picked[v.key] === code);
  const usedCodes = new Set(Object.values(picked));
  const save = async () => {
    setBusy(true); setRefused(null); setStale(false);
    const map = Object.fromEntries(Object.entries(picked).filter(([, c]) => c && c !== NOT_ON_FORM));
    const notOnForm = Object.entries(picked).filter(([, c]) => c === NOT_ON_FORM).map(([k]) => k);
    try {
      await api(`/editions/${editionId}/option-maps/group`, { method: "PATCH", json: { dataPaths: g.form_fields.map((f) => f.data_path), map, notOnForm, baseRevision: g.revision } });
      toast.push({ tone: "ok", text: `Choices saved on ${plural(g.form_fields.length, "form field")}` }); refresh();
    } catch (e) { const err = e as ApiError; setRefused(err.message); if (err.status === 409) setStale(true); } finally { setBusy(false); }
  };
  return (
    <section className="space-y-2 rounded-lg border border-border p-3" data-choice-group={g.list} aria-label={`${g.list_label ?? g.list}, ${whom(g)}`}>
      <div>
        <p className="text-sm font-medium">{g.list_label ?? g.list} <span className="font-normal text-text-muted">· {plural(g.form_fields.length, "form field")}: {whom(g)}</span> {g.problems.length ? <Pill tone="danger">Blocks release</Pill> : null}</p>
        {g.saved ? null : <p className="text-xs text-text-muted" data-not-saved>Nothing saved yet: the choices shown are suggested from the form's own words. Check them and save.</p>}
      </div>
      {refused ? <Notice tone="danger" title="Not saved" action={stale ? <Button size="sm" variant="secondary" onClick={refresh}>Look again</Button> : undefined}>{refused}</Notice> : null}
      <Table dense head={["Answer on the list", "This form prints"]}>
        {g.values.map((v) => (
          <tr key={v.key} data-choice-value={v.key}>
            <td className="text-sm">{v.label}</td>
            <td className="text-sm">
              {v.asks_more ? <p data-asks-more>This form prints {v.printed.map((p) => `"${p}"`).join(" and ")}: the immigration expert decides. Until then this form field is filled by hand.</p>
                : <Select aria-label={`${v.label}: what this form prints`} value={picked[v.key] ?? ""} disabled={!can} title={can ? undefined : WHY_AUTHOR} onChange={(e) => setPicked((p) => ({ ...p, [v.key]: e.target.value }))}>
                  <option value="">Not set</option>
                  {g.choices.map((c) => { const other = takenBy(c.code, v.key); return <option key={c.code} value={c.code} disabled={!!other}>{c.label}{other ? ` (used by ${other.label})` : ""}</option>; })}
                  <option value={NOT_ON_FORM} disabled={v.printed.length > 0}>{v.printed.length ? `Not on this form (it prints ${v.printed.join(", ")})` : "Not on this form"}</option>
                </Select>}
              {!g.saved && v.code && picked[v.key] === v.code ? <span className="mt-0.5 block text-xs text-text-muted">Suggested from the form's words</span> : null}
            </td>
          </tr>
        ))}
      </Table>
      {g.choices.some((c) => !usedCodes.has(c.code)) ? <p className="text-xs text-text-muted" data-printed-unused>Printed, no answer uses it: {g.choices.filter((c) => !usedCodes.has(c.code)).map((c) => c.label).join(", ")}.</p> : null}
      <Gated size="sm" allowed={can} why={WHY_AUTHOR} busy={busy} disabled={can && !dirty} onClick={() => void save()} data-save-choices>Save {plural(g.form_fields.length, "form field")}</Gated>
    </section>
  );
}
