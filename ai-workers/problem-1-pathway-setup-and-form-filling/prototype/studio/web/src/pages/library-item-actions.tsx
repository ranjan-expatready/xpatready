// C11.9 (P-116 amended, Screen 04 BR-8 to BR-10): Delete, Retire, Restore and Withdraw on the Fields and Document types
// rows, with where used first. The row's one written action comes from its state (GET /library/fields, …/document-types);
// opening it reads every use (GET …/:key/uses, the one guard's decision): a refused action shows why and every use with a
// link; an allowed one is confirmed in the right panel (ImpactPanel), then the Undo toast (Undo withdraws the request).
import * as React from "react";
import type { FieldReadersView, FieldWithdrawn } from "../../../contracts/own-question";
import type { UsesView } from "../../../contracts/structure";
import { RETURNED_LABEL, SAY, TIP, WAITING_LABEL, WHY, type LifecycleWord } from "../../../contracts/lifecycle";
import { api, queryClient, useActorId, useApi } from "@/lib/api";
import { Button } from "@/components/ui/controls";
import { BlockedLine, ImpactPanel, RowAction, WherePanel, useUndoToast } from "@/components/lifecycle";

export type ItemList = "fields" | "document-types" | "sections";
/** The lifecycle part of a list row (api/src/library-items.ts itemState). */
export type ItemRow = { key: string; name: string; row_action: LifecycleWord; retired: boolean; change: { id: string; action: string; status: string; by: string | null; by_id?: string } | null };
/** Review minor: a shared field or document type comes back when it is approved (QA-64), not with the next release. */
const ITEM_RESTORE_BODY = "It comes back to pickers and AI suggestions when a second person approves it. Nothing that uses it today changes.";
const ITEM_RESTORE_TIP = "Brings it back to pickers and new setups when a second person approves it.";
const domId = (key: string) => `why-${key.replace(/\W+/g, "-")}`;

/** The page's lifecycle: `action(row)` for each row, `node` (the panel and the toast) once on the page. */
export function useItemLifecycle(list: ItemList, refetch: () => Promise<unknown>, canAuthor: boolean) {
  // Round 4 Major 1: the author's own new item (its ADD by them) offers Delete, which deletes it at once with its ADD.
  const me = useActorId();
  const [open, setOpen] = React.useState<ItemRow | null>(null);
  // Review Ma1: "view" opens where it is used and its history (Edit on a list with no page of its own), never the action.
  const [viewing, setViewing] = React.useState(false);
  const [uses, setUses] = React.useState<{ data?: UsesView; loading: boolean; error: string | null }>({ loading: false, error: null });
  const [acting, setActing] = React.useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const undo = useUndoToast();
  const path = (key: string) => `/library/${list}/${encodeURIComponent(key)}`;
  const load = React.useCallback(async (r: ItemRow) => {
    setUses({ loading: true, error: null });
    try { setUses({ data: await api<UsesView>(`${path(r.key)}/uses`), loading: false, error: null }); } catch (e) { setUses({ loading: false, error: (e as Error).message }); }
  }, [list]);
  const start = (r: ItemRow) => { undo.clear(); setActing({ busy: false, error: null }); setViewing(false); setOpen(r); void load(r); };
  const view = (r: ItemRow) => { start(r); setViewing(true); };
  const close = () => { const key = open?.key; setOpen(null); setViewing(false); setTimeout(() => document.querySelector<HTMLElement>(`tr[data-item="${CSS.escape(key ?? "")}"] [data-action]`)?.focus(), 0); };
  // Minor (review and break): Escape closes the panel, as Close does.
  React.useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const after = async () => { await refetch(); void queryClient.invalidateQueries({ queryKey: [list === "fields" ? "fields" : list === "sections" ? "sections" : "doc-types"] }); };
  const send = async (r: ItemRow, reason: string) => {
    setActing({ busy: true, error: null });
    try {
      if (r.row_action === "WITHDRAW") { const w = await api<FieldWithdrawn>(`/library/changes/${r.change!.id}/withdraw`, { method: "POST", json: { note: reason } }); undo.show(`${SAY.withdrawn(r.name)}${w.readers?.length ? ` Still reading it: ${w.readers.slice(0, 3).join("; ")}${w.readers.length > 3 ? `; and ${w.readers.length - 3} more` : ""}. In a combination's draft, each holds its Submit until changed.` : ""}`); }
      else {
        const kind = r.row_action as Exclude<LifecycleWord, "WITHDRAW">;
        const c = await api<{ id: string; immediate?: boolean }>(kind === "DELETE" ? path(r.key) : `${path(r.key)}/${kind.toLowerCase()}`, { method: kind === "DELETE" ? "DELETE" : "POST", json: { reason: reason || SAY.ownDraft } });
        // Break minor: an Undo after the approver has acted says why in words (the toast closes first, then this shows).
        // C11.9 (P-116 amended): an own draft is deleted at once; its Undo puts it back.
        undo.show(c.immediate ? SAY.deletedNow(r.name, 0) : SAY.sent(kind, r.name), async () => {
          let failed: string | null = null;
          try { await api(c.immediate ? `/library/changes/${c.id}/undo` : `/library/changes/${c.id}/withdraw`, { method: "POST", json: c.immediate ? {} : { note: SAY.undone } }); } catch (e) { failed = (e as Error).message; }
          await after();
          // Shown after the toast closes itself (its finally), so the words stay (review round 2 minor).
          if (failed) setTimeout(() => undo.show(`Not undone: ${failed}`), 0);
        });
      }
      setActing({ busy: false, error: null }); close(); await after(); // focus back on the row's action (review round 2 minor)
    } catch (e) { setActing({ busy: false, error: (e as Error).message }); }
  };

  /** Edit (or View) and the row's one written action. */
  const action = (r: ItemRow, onEdit: () => void) => (
    <RowAction kind={r.row_action} why={!canAuthor ? WHY.author : r.change?.action === "ADD" && r.row_action !== "WITHDRAW" && r.change.by_id !== me ? "Its addition waits on To review: decide it there first." : null} tip={r.row_action === "DELETE" ? TIP.DELETE(0, false) : r.row_action === "RETIRE" ? TIP.RETIRE(false) : r.row_action === "RESTORE" ? ITEM_RESTORE_TIP : TIP.WITHDRAW(r.name)}
      canEdit={canAuthor && list !== "document-types"} name={r.name} reasonId={domId(r.key)} onEdit={onEdit} onAction={() => start(r)} editTip={canAuthor && list !== "document-types" ? (list === "sections" ? "Rename it." : "Open it: rename, where it is used, its history.") : "See where it is used and its history."} />
  );
  const kind = open?.row_action;
  // B83 (review N2, BR-11): the Fields row is a door to the same withdrawal, so it names what still reads the field too.
  const readers = useApi<FieldReadersView>(["change-readers", open?.change?.id], kind === "WITHDRAW" && open?.change ? `/library/changes/${open.change.id}/readers` : null).data?.readers ?? [];
  // A use that stops a delete but not a retire (a library form's field reads it) is kept, not stopping, for Retire.
  const shown: UsesView | undefined = uses.data && kind === "RETIRE" ? { ...uses.data, uses: uses.data.uses.map((u) => (u.retireOk ? { ...u, blocks: false } : u)) } : uses.data;
  const refusal = open && uses.data && kind !== "WITHDRAW" ? uses.data.can[(kind ?? "DELETE").toLowerCase() as "delete" | "retire" | "restore"] : null;
  const node = <>
    {open ? (
      <div className="xl:fixed xl:right-6 xl:top-20 xl:z-40 xl:w-[440px]" data-item-panel={open.key}>
        {viewing ? (
          <aside aria-label={`Where "${open.name}" is used and its history`} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:static xl:max-h-[calc(100vh-6rem)] xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm" data-item-view>
            <div className="border-b border-border px-5 py-3"><h2 className="break-words text-lg font-semibold">{open.name}</h2><p className="text-xs text-text-muted">Where it is used, and its history</p></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              <WherePanel uses={uses.data} loading={uses.loading} error={uses.error} onRetry={() => void load(open)} />
              {uses.data?.history?.length ? <div><h3 className="text-sm font-semibold">History</h3><ul className="mt-1 space-y-1 text-xs">{uses.data.history.map((h, i) => <li key={i}><span className="text-text-muted">{new Date(h.at).toLocaleString()} · {h.by}: </span>{h.what}</li>)}</ul></div> : uses.data ? <p className="text-xs text-text-muted">No history yet.</p> : null}
            </div>
            <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="ghost" autoFocus onClick={close}>Close</Button></div>
          </aside>
        ) : uses.loading || uses.error || refusal ? (
          <aside aria-label={`Where "${open.name}" is used`} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:static xl:max-h-[calc(100vh-6rem)] xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm">
            <div className="border-b border-border px-5 py-3"><h2 className="break-words text-lg font-semibold">{SAY.confirmTitle(kind!, open.name, 0)}</h2></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              {refusal ? <BlockedLine id={domId(open.key)} text={refusal} /> : null}
              <WherePanel uses={shown} loading={uses.loading} error={uses.error} onRetry={() => void load(open)} />
            </div>
            <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="ghost" autoFocus onClick={close}>Close</Button></div>
          </aside>
        ) : (
          <ImpactPanel key={`impact-${open.key}`} kind={kind!} name={open.name} immediate={kind === "DELETE" && !!uses.data?.immediate} goes={kind === "DELETE" ? shown?.uses.filter((u) => u.kind === "placement").map((u) => ({ label: u.label })) : undefined} kept={kind === "RETIRE" ? shown?.uses.filter((u) => !u.blocks && u.kind !== "draft_change").map((u) => u.label) : undefined}
            takesEffect={kind === "RETIRE" || kind === "RESTORE" ? SAY.takesEffect("DELETE") : undefined} body={kind === "RESTORE" ? ITEM_RESTORE_BODY : kind === "WITHDRAW" && readers.length ? `${SAY.withdrawBody} It leaves ${readers.join("; ")} reading a field that is gone: whichever of these is in a combination's draft holds its Submit until it is changed.` : undefined} busy={acting.busy} error={acting.error} onCancel={close} onSend={(reason) => void send(open, reason)} />
        )}
      </div>
    ) : null}
    {undo.node}
  </>;
  return { action, node, start, view };
}

/** Whether the person acting holds the author duty (the row action is greyed with the reason otherwise). */
export function useCanAuthor() {
  const actorId = useActorId();
  const session = useApi<{ actor?: { duties?: string[] } }>(["session", actorId], "/session");
  return (session.data?.actor?.duties ?? []).includes("author");
}

/** The state a waiting or returned change puts on its row, or "Retired" (shown only under the Retired filter, BR-10). */
export function ItemStatusNote({ r }: { r: Pick<ItemRow, "change" | "retired"> }) {
  if (r.change?.action === "ADD") return <p data-item-change className="mt-1 text-[11px] text-text-warn">New: waiting for a second person{r.change.by ? ` · asked by ${r.change.by}` : ""}</p>;
  if (r.change) return <p data-item-change className="mt-1 text-[11px] text-text-warn">{r.change.status === "RETURNED" ? RETURNED_LABEL[r.change.action as "DELETE"] : WAITING_LABEL[r.change.action as "DELETE"]}{r.change.by ? ` · asked by ${r.change.by}` : ""}</p>;
  return r.retired ? <p data-item-retired className="mt-1 text-[11px] text-text-muted">Retired: hidden from pickers and AI; earlier releases and open cases keep it</p> : null;
}
