// C6.15 (row B137; SA-1B-19, SA-1B-20): a document type's substitute sets, inside the Documents tab drawer. It shows the
// sets from the library (Any one of: the standard first, then the alternatives with "when acceptable"; All of: every
// member needed), the set this line uses, and for the author: pick another set for this line (on the draft) and propose
// the type's sets (a second person approves on To review; it goes out with the next release). No AI (US$0).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi } from "@/lib/api";
import { Button, Input, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { MAX_MEMBERS, MAX_SETS, MODE_WORDS, STANDARD, type SetMode } from "../../../contracts/document-sets";

type Member = { key: string; name: string; standard: boolean; when_client: string | null; when_staff: string | null };
type View = { key: string; name: string; uses: number; sets: { name: string; mode: SetMode; mode_words: string; members: Member[] }[];
  open: { id: string; status: "WAITING" | "RETURNED" | "APPROVED"; by: string; reason: string; note: string | null } | null; types: { key: string; name: string }[] };
type EditMember = { key: string; whenClient: string };
type EditSet = { name: string; mode: SetMode; members: EditMember[] };
const OPEN_WORDS = { WAITING: "waits for a second person on To review", RETURNED: "was returned", APPROVED: "is approved and goes out with the next release" } as const;

export function SetsSection({ typeKey, typeName, combinationId, lineage, setName, canAuthor }: { typeKey: string; typeName: string; combinationId: string; lineage: string; setName: string | null; canAuthor: boolean }) {
  const qc = useQueryClient();
  const q = useApi<View>(["document-sets", typeKey], `/library/document-types/${encodeURIComponent(typeKey)}/sets`);
  const [pick, setPick] = React.useState(setName ?? STANDARD);
  const [edit, setEdit] = React.useState<EditSet[] | null>(null);
  const [reason, setReason] = React.useState("");
  const [msg, setMsg] = React.useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setPick(setName ?? STANDARD), [setName]);
  const v = q.data;
  const uses = setName ?? STANDARD;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["document-sets", typeKey] }), qc.invalidateQueries()]);
  const run = async (f: () => Promise<string>) => {
    setBusy(true); setMsg(null);
    try { setMsg({ tone: "ok", text: await f() }); await refresh(); } catch (e) { setMsg({ tone: "danger", text: e instanceof ApiError ? e.message : "Something went wrong; nothing was saved." }); } finally { setBusy(false); }
  };
  const savePick = () => run(async () => {
    await api(`/combinations/${combinationId}/requirements/${encodeURIComponent(lineage)}/set`, { method: "PUT", json: { setName: pick } });
    return `This line now uses the set "${pick}" in the draft; it goes out with the next release.`;
  });
  const startEdit = () => {
    const now = v?.sets.map((s) => ({ name: s.name, mode: s.mode, members: s.members.map((m) => ({ key: m.key, whenClient: m.when_client ?? "" })) })) ?? [];
    setEdit(now.length ? now : [{ name: STANDARD, mode: "any_one", members: [{ key: typeKey, whenClient: "" }] }]); setReason(""); setMsg(null);
  };
  const send = () => run(async () => {
    const sets = (edit ?? []).map((s) => ({ name: s.name, mode: s.mode, members: s.members.map((m, i) => ({ key: m.key, ...(s.mode === "any_one" && i > 0 && m.whenClient.trim() ? { whenClient: m.whenClient } : {}) })) }));
    await api(`/library/document-types/${encodeURIComponent(typeKey)}/sets`, { method: "POST", json: { sets, reason } });
    setEdit(null);
    return "Sent: a second person approves it on To review; nothing changes before that.";
  });
  const put = (i: number, s: Partial<EditSet>) => setEdit((e) => e!.map((x, j) => (j === i ? { ...x, ...s } : x)));
  const putMember = (i: number, k: number, m: Partial<EditMember>) => setEdit((e) => e!.map((x, j) => (j === i ? { ...x, members: x.members.map((y, n) => (n === k ? { ...y, ...m } : y)) } : x)));

  return (
    <section aria-labelledby="dd-sets" className="space-y-2" data-drawer-sets>
      <h3 id="dd-sets" className="font-semibold">Substitute sets · from the library document type</h3>
      {q.isLoading ? <p className="text-text-muted">Loading the sets…</p> : q.isError || !v ? <p className="text-danger">The sets could not be read: {q.error instanceof Error ? q.error.message : "try again"}.</p> : <>
        {v.sets.length ? (
          <ul className="space-y-2" data-sets-list>
            {v.sets.map((s) => (
              <li key={s.name} className="rounded border border-border p-2" data-set={s.name}>
                <p><span className="font-medium">{s.name}</span> · {s.mode_words}{s.name.toLowerCase() === uses.toLowerCase() ? <Pill tone="ok" className="ml-2">This line uses it</Pill> : null}</p>
                <ol className="ml-5 list-decimal">
                  {s.members.map((m) => <li key={m.key} data-set-member={m.key}>{m.name}{m.standard ? <span className="text-text-muted"> (the standard)</span> : null}{m.when_client ? <span className="block text-xs text-text-muted">When acceptable: {m.when_client}</span> : null}</li>)}
                </ol>
              </li>))}
          </ul>
        ) : <p className="text-text-muted" data-sets-list>None: {typeName} is its own only member.</p>}
        {v.open ? <p className="text-xs" data-sets-open>A change of these sets by {v.open.by} {OPEN_WORDS[v.open.status]}{v.open.note ? `: ${v.open.note}` : ""}. <Link className="text-text-link underline" to="/review">To review</Link></p> : null}
        <p className="text-xs text-text-muted">Any one of: one of the members meets the line; All of: every member is needed. Set on the library document type for every combination (used by {v.uses}); a line only picks its set. Sample until the immigration expert confirms.</p>
        {canAuthor && v.sets.length ? (
          <div className="flex flex-wrap items-end gap-2" data-set-pick>
            <label className="text-xs">The set this line uses
              <Select aria-label="The set this line uses" value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1 block">{v.sets.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.mode_words}</option>)}</Select>
            </label>
            <Button size="sm" variant="secondary" disabled={busy || pick.toLowerCase() === uses.toLowerCase()} onClick={savePick} data-set-pick-save>Use this set</Button>
          </div>) : null}
        {canAuthor && !edit ? <Button size="sm" variant="secondary" disabled={!!v.open && v.open.status !== "RETURNED"} onClick={startEdit} data-sets-edit>{v.sets.length ? "Change the substitute sets…" : "Add substitute sets…"}</Button> : null}
        {canAuthor && edit ? (
          <div className="space-y-3 rounded border border-border p-3" data-sets-editor>
            {edit.map((s, i) => (
              <fieldset key={i} className="space-y-2 rounded border border-border p-2" data-sets-editor-set={i}>
                <legend className="px-1 text-xs text-text-muted">Set {i + 1}{i === 0 ? " (used when a line picks none)" : ""}</legend>
                <div className="flex flex-wrap gap-2">
                  <Input aria-label={`Set ${i + 1} name`} value={s.name} disabled={i === 0} onChange={(e) => put(i, { name: e.target.value })} className="w-48" />
                  <Select aria-label={`Set ${i + 1}: any one of or all of`} value={s.mode} onChange={(e) => put(i, { mode: e.target.value as SetMode })}>{(Object.keys(MODE_WORDS) as SetMode[]).map((m) => <option key={m} value={m}>{MODE_WORDS[m]}</option>)}</Select>
                  {i > 0 ? <Button size="sm" variant="ghost" onClick={() => setEdit((e) => e!.filter((_, j) => j !== i))}>Remove set</Button> : null}
                </div>
                {s.members.map((m, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-2" data-sets-editor-member>
                    <span className="w-6 text-right text-xs text-text-muted">{k + 1}.</span>
                    <Select aria-label={`Set ${i + 1}, member ${k + 1}`} value={m.key} onChange={(e) => putMember(i, k, { key: e.target.value })}>
                      <option value="">Choose a document type…</option>
                      {v.types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                    </Select>
                    {s.mode === "any_one" && k === 0 ? <span className="text-xs text-text-muted">the standard</span> : null}
                    {s.mode === "any_one" && k > 0 ? <Input aria-label={`When ${v.types.find((t) => t.key === m.key)?.name ?? "this member"} is acceptable, in the client's words`} placeholder="When acceptable, in the client's words" value={m.whenClient} onChange={(e) => putMember(i, k, { whenClient: e.target.value })} className="min-w-64 flex-1" /> : null}
                    {s.members.length > 1 ? <Button size="sm" variant="ghost" aria-label={`Remove member ${k + 1}`} onClick={() => put(i, { members: s.members.filter((_, n) => n !== k) })}>Remove</Button> : null}
                  </div>))}
                {s.members.length < MAX_MEMBERS ? <Button size="sm" variant="ghost" onClick={() => put(i, { members: [...s.members, { key: "", whenClient: "" }] })}>Add a member</Button> : null}
              </fieldset>))}
            {edit.length < MAX_SETS ? <Button size="sm" variant="ghost" onClick={() => setEdit((e) => [...e!, { name: "", mode: "all_together", members: [{ key: "", whenClient: "" }] }])} data-sets-add>Add another set</Button> : null}
            <label className="block text-xs">Why it changes, for every combination
              <Textarea aria-label="Why the sets change" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1" />
            </label>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={send} data-sets-send>Send for a second person</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEdit(null); setMsg(null); }}>Cancel</Button>
            </div>
          </div>) : null}
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      </>}
    </section>
  );
}
