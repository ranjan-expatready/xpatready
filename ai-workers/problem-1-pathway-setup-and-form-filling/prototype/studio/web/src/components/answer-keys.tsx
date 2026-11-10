// G4 (forms lane, C5.7; concept screens/G4-answer-keys/concept.md §4–§5): the combination's Tests tab, slice 1. Each
// testable item (a form's field map, the eligibility rules) with each family's key: state (Draft · Signed), the last
// run (Passed · Failed n of m · Not run, and why), Run, and the expert's Sign; a key opens its lines, failures first.
// Slice 2 (answer-key-editors.tsx): the Families section, "Write expected values" per item and "Change" per key (the
// Expected editor, challenge M5 b). US$0: no AI here.
import * as React from "react";
import type { AnswerKeysView, FamilyView, KeyView, RunState, TestItem } from "../../../contracts/answer-keys";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { FamiliesSection, Gated, KeyEditor, OUTCOME_WORDS, useDuties, WHY, WriteKey } from "@/components/answer-key-editors";
import { FoldArrow } from "@/components/fold-out";

const RUN_WORDS: Record<RunState, { label: string; tone: string }> = { PASSED: { label: "Passed", tone: "ok" }, FAILED: { label: "Failed", tone: "danger" }, NOT_RUN: { label: "Not run", tone: "neutral" } };

const RULE_WORDS: Record<string, string> = { ...OUTCOME_WORDS, met: "Met", not_met: "Not met", not_answered: "Not answered" };
/** Review minor 3: a rule-set line's outcome or gate state in words (a map's value is shown exactly as written). */
const said = (kind: string, x: string) => (x === "" ? "(blank)" : kind === "rule_set" ? RULE_WORDS[x] ?? x : x);

/** BR-4: one key's lines, failures first (the API orders them), with the filler's reason when a value differs. */
function KeyLines({ id }: { id: string }) {
  const k = useApi<KeyView>(["answer-key", id], `/answer-keys/${id}`);
  const author = useDuties().family;
  if (k.isLoading) return <p className="text-sm text-text-muted">Loading the lines…</p>;
  if (k.isError || !k.data) return <Notice tone="danger" title="The lines could not be loaded">Try again in a moment.</Notice>;
  const lines = k.data.run.last?.lines ?? [];
  if (!lines.length) return <p className="text-sm text-text-muted">Not run yet: press Run to compare this family's expected values with what the {k.data.item_kind === "rule_set" ? "rules give" : "map writes"}.</p>;
  return (
    <Table dense label={`Lines of ${k.data.family.label} for ${k.data.item_ref}`} head={["Result", k.data.item_kind === "rule_set" ? "Rule" : "Form field", "Person", "Expected", "Got", "Why"]}>
      {lines.map((l, i) => (
        <tr key={`${l.person}|${l.target}|${i}`} data-line={l.pass ? "pass" : "fail"}>
          <td className="py-1 pr-3"><Pill tone={l.pass ? "ok" : "danger"}>{l.pass ? "Pass" : "Fail"}</Pill></td>
          {/* P-63: the printed caption with its meaning; the data path only as an author's tooltip */}
          <td className="py-1 pr-3" title={author && /\[\d+\]/.test(l.target) ? l.target : undefined}>{l.label}</td>
          <td className="py-1 pr-3">{l.person_label}</td>
          <td className="py-1 pr-3 font-mono text-xs">{said(k.data!.item_kind, l.expected)}</td>
          <td className="py-1 pr-3 font-mono text-xs">{said(k.data!.item_kind, l.got)}</td>
          <td className="py-1 text-xs text-text-muted">{l.says ? <span className="block text-text">{l.says}</span> : null}{l.why ?? ""}</td>
        </tr>
      ))}
    </Table>
  );
}

function KeyRow({ k, combinationId, item, family }: { k: KeyView; combinationId: string; item: TestItem; family: FamilyView | undefined }) {
  const [open, setOpen] = React.useState(false), [editing, setEditing] = React.useState(false);
  const may = useDuties();
  const inv = [["combination", combinationId, "answer-keys"], ["answer-key", k.id]];
  const run = useAction(() => api(`/answer-keys/${k.id}/run`, { method: "POST" }), { success: (r: { result: string; passed: number; failed: number }) => (r.result === "PASSED" ? `${k.family.label}: passed, all ${r.passed} values` : `${k.family.label}: failed, ${r.failed} of ${r.passed + r.failed} values wrong`), invalidate: inv, onDone: () => setOpen(true) });
  const sign = useAction(() => api(`/answer-keys/${k.id}/sign`, { method: "POST", json: { version: k.version } }), { success: "Expected values signed", invalidate: inv });
  const last = k.run.last, words = RUN_WORDS[k.run.state];
  return (
    <li className="rounded-lg border border-border p-3" data-key={k.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{k.family.label}</span>
        {k.state === "SIGNED" ? <Pill tone="ok" title={`Signed by ${k.signed_by ?? "the expert"}${k.signed_at ? ` on ${k.signed_at.slice(0, 10)}` : ""}`}>Signed</Pill> : <Pill tone="warn" title={k.sample ?? undefined}>Draft · Sample</Pill>}
        <Pill tone={words.tone} title={k.run.why}>{words.label}{k.run.state === "FAILED" && last ? ` (${last.failed} of ${last.passed + last.failed})` : ""}</Pill>
        <span className="text-xs text-text-muted">{k.run.why}</span>
        <span className="ml-auto flex gap-2">
          <Gated size="sm" variant="ghost" allowed={may.key && !!family} why={!may.key ? WHY.key : "Loading the family…"} onClick={() => setEditing(true)}>Change</Gated>
          <Gated size="sm" variant="outline" allowed={may.run} why={WHY.run} busy={run.isPending} onClick={() => run.mutate(undefined)}>Run</Gated>
          {k.state === "DRAFT" ? <Gated size="sm" variant="secondary" allowed={may.sign} why={WHY.sign} busy={sign.isPending} onClick={() => sign.mutate(undefined)}>Sign</Gated> : null}
          <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((x) => !x)}><FoldArrow open={open} />{open ? "Hide lines" : "Lines"}</Button>
        </span>
      </div>
      {k.change_reason && k.state === "DRAFT" ? <p className="mt-1 text-xs text-text-muted">Back to Draft: {k.change_reason}</p> : null}
      {open ? <div className="mt-3 overflow-x-auto"><KeyLines id={k.id} /></div> : null}
      {editing && family ? <KeyEditor combinationId={combinationId} item={item} family={family} existing={k} close={() => setEditing(false)} /> : null}
    </li>
  );
}

/** The Tests tab: items × families (BR-2), each key's state and last run (BR-5), Run (BR-3, BR-4), Sign (BR-7). */
/** G2 (C5.5): the anchor Review and release's "Fix on Tests" opens (`#tests-<kind>-<ref>`). */
export const testAnchor = (kind: string, ref: string) => `tests-${kind}-${ref.replace(/[^A-Za-z0-9]+/g, "-")}`;

export function TestsTab({ id }: { id: string }) {
  const v = useApi<AnswerKeysView>(["combination", id, "answer-keys"], `/combinations/${id}/answer-keys`);
  // G2: arriving from "Fix on Tests", the item's section is scrolled to and takes focus (keyboard users land on it).
  React.useEffect(() => {
    const h = window.location.hash.slice(1);
    if (!h || !v.data) return;
    const el = document.getElementById(h);
    if (el) { el.scrollIntoView({ block: "start" }); el.focus(); }
  }, [v.data]);
  const fams = useApi<{ families: FamilyView[] }>(["answer-key-families"], "/answer-keys/families");
  const families = fams.data?.families ?? [], may = useDuties();
  if (v.isLoading) return <p className="text-sm text-text-muted">Loading the tests…</p>;
  if (v.isError || !v.data) return <Notice tone="danger" title="The tests could not be loaded">Try again in a moment.</Notice>;
  const d = v.data;
  return (
    <div className="space-y-4">
      <Notice tone="info" title="Answer-key tests">Made-up families, never a client. Expected values are Sample until the immigration expert signs them (P-240). A run fills the item for the family the way a case does and compares every value.</Notice>
      {may.readOnly ? <Notice tone="info" title="Read-only for you">You can read the families, the expected values and the last runs. Writing families is for the configuration author; writing expected values and running tests, for the author or the immigration expert; signing, for the immigration expert.</Notice> : null}
      <FamiliesSection combinationId={id} keys={d.keys} />
      {!d.items.length ? <Notice tone="warn" title="Nothing to test yet">This combination has no form field map and no eligibility rules yet.</Notice> : null}
      {d.items.map((it) => {
        // G2 (Devin on #568): a field-map key shows under the edition it was written for (with one edition, every key).
        const sameForm = d.items.filter((x) => x.item_kind === it.item_kind && x.item_ref === it.item_ref).length > 1;
        const keys = d.keys.filter((k) => k.item_kind === it.item_kind && k.item_ref === it.item_ref && (!sameForm || (k.expected as { edition?: string } | null)?.edition === it.edition));
        return (
          <section key={`${it.item_kind}|${it.item_ref}|${it.edition ?? ""}`} id={testAnchor(it.item_kind, it.item_ref)} tabIndex={-1} aria-label={it.label} className="space-y-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <h3 className="text-sm font-semibold">{it.label}{it.edition ? <span className="ml-2 font-normal text-text-muted">{it.edition}</span> : null}</h3>
            {keys.length ? <ul className="space-y-2">{keys.map((k) => <KeyRow key={k.id} k={k} combinationId={id} item={it} family={families.find((f) => f.id === k.family.id)} />)}</ul>
              : <p className="text-sm text-text-muted">No test family has expected values for this item yet. Without a passing signed test it cannot be released.</p>}
            <WriteKey combinationId={id} item={it} families={families} keys={keys} />
          </section>
        );
      })}
      <p className="text-xs text-text-muted">{d.scoring}</p>
    </div>
  );
}
