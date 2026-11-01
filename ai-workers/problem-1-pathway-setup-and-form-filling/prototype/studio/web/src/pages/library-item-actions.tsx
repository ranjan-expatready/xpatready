// C11.9 (P-116 amended, Screen 04 BR-8 to BR-10): Delete, Retire, Restore and Withdraw on the Fields and Document types
// rows, with where used first. The row's one written action comes from its state (GET /library/fields, …/document-types);
// opening it reads every use (GET …/:key/uses, the one guard's decision): a refused action shows why and every use with a
// link; an allowed one is confirmed in the right panel (ImpactPanel), then the Undo toast (Undo withdraws the request).
import * as React from "react";
import type { UsesView } from "../../../contracts/structure";
import { RETURNED_LABEL, SAY, TIP, WAITING_LABEL, WHY, type LifecycleWord } from "../../../contracts/lifecycle";
import { api, queryClient, useActorId, useApi } from "@/lib/api";
import { Button } from "@/components/ui/controls";
import { BlockedLine, ImpactPanel, RowAction, WherePanel, useUndoToast } from "@/components/lifecycle";

export type ItemList = "fields" | "document-types";
/** The lifecycle part of a list row (api/src/library-items.ts itemState). */
export type ItemRow = { key: string; name: string; row_action: LifecycleWord; retired: boolean; change: { id: string; action: string; status: string; by: string | null } | null };
const domId = (key: string) => `why-${key.replace(/\W+/g, "-")}`;

/** The page's lifecycle: `action(row)` for each row, `node` (the panel and the toast) once on the page. */
export function useItemLifecycle(list: ItemList, refetch: () => Promise<unknown>, canAuthor: boolean) {
  const [open, setOpen] = React.useState<ItemRow | null>(null);
  const [uses, setUses] = React.useState<{ data?: UsesView; loading: boolean; error: string | null }>({ loading: false, error: null });
  const [acting, setActing] = React.useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const undo = useUndoToast();
  const path = (key: string) => `/library/${list}/${encodeURIComponent(key)}`;
  const load = React.useCallback(async (r: ItemRow) => {
    setUses({ loading: true, error: null });
    try { setUses({ data: await api<UsesView>(`${path(r.key)}/uses`), loading: false, error: null }); } catch (e) { setUses({ loading: false, error: (e as Error).message }); }
  }, [list]);
  const start = (r: ItemRow) => { undo.clear(); setActing({ busy: false, error: null }); setOpen(r); void load(r); };
  const close = () => { const key = open?.key; setOpen(null); setTimeout(() => document.querySelector<HTMLElement>(`tr[data-item="${CSS.escape(key ?? "")}"] [data-action]`)?.focus(), 0); };
  const after = async () => { await refetch(); void queryClient.invalidateQueries({ queryKey: [list === "fields" ? "fields" : "doc-types"] }); };
  const send = async (r: ItemRow, reason: string) => {
    setActing({ busy: true, error: null });
    try {
      if (r.row_action === "WITHDRAW") { await api(`/library/changes/${r.change!.id}/withdraw`, { method: "POST", json: { note: reason } }); undo.show(SAY.withdrawn(r.name)); }
      else {
        const kind = r.row_action as Exclude<LifecycleWord, "WITHDRAW">;
        const c = await api<{ id: string }>(kind === "DELETE" ? path(r.key) : `${path(r.key)}/${kind.toLowerCase()}`, { method: kind === "DELETE" ? "DELETE" : "POST", json: { reason } });
        undo.show(SAY.sent(kind, r.name), async () => { await api(`/library/changes/${c.id}/withdraw`, { method: "POST", json: { note: SAY.undone } }); await after(); });
      }
      setActing({ busy: false, error: null }); setOpen(null); await after();
    } catch (e) { setActing({ busy: false, error: (e as Error).message }); }
  };

  /** Edit (or View) and the row's one written action. */
  const action = (r: ItemRow, onEdit: () => void) => (
    <RowAction kind={r.row_action} why={canAuthor ? null : WHY.author} tip={r.row_action === "DELETE" ? TIP.DELETE(0, false) : r.row_action === "RETIRE" ? TIP.RETIRE(false) : r.row_action === "RESTORE" ? TIP.RESTORE : TIP.WITHDRAW(r.name)}
      canEdit={canAuthor} name={r.name} reasonId={domId(r.key)} onEdit={onEdit} onAction={() => start(r)} editTip={canAuthor ? "Open it: rename, where it is used, its history." : "See it, where it is used and its history."} />
  );
  const kind = open?.row_action;
  // A use that stops a delete but not a retire (a library form's field reads it) is kept, not stopping, for Retire.
  const shown: UsesView | undefined = uses.data && kind === "RETIRE" ? { ...uses.data, uses: uses.data.uses.map((u) => (u.retireOk ? { ...u, blocks: false } : u)) } : uses.data;
  const refusal = open && uses.data && kind !== "WITHDRAW" ? uses.data.can[(kind ?? "DELETE").toLowerCase() as "delete" | "retire" | "restore"] : null;
  const node = <>
    {open ? (
      <div className="xl:fixed xl:right-6 xl:top-20 xl:z-40 xl:w-[440px]" data-item-panel={open.key}>
        {uses.loading || uses.error || refusal ? (
          <aside aria-label={`Where "${open.name}" is used`} className="fixed bottom-4 right-0 top-14 z-40 flex w-full max-w-[440px] flex-col border-l border-border bg-surface-raised shadow-xl xl:static xl:max-h-[calc(100vh-6rem)] xl:max-w-none xl:rounded-xl xl:border xl:shadow-sm">
            <div className="border-b border-border px-5 py-3"><h2 className="break-words text-lg font-semibold">{SAY.confirmTitle(kind!, open.name, 0)}</h2></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              {refusal ? <BlockedLine id={domId(open.key)} text={refusal} /> : null}
              <WherePanel uses={shown} loading={uses.loading} error={uses.error} onRetry={() => void load(open)} />
            </div>
            <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="ghost" autoFocus onClick={close}>Close</Button></div>
          </aside>
        ) : (
          <ImpactPanel key={`impact-${open.key}`} kind={kind!} name={open.name} kept={kind === "RETIRE" ? shown?.uses.filter((u) => !u.blocks && u.kind !== "draft_change").map((u) => u.label) : undefined}
            takesEffect={kind === "RETIRE" || kind === "RESTORE" ? SAY.takesEffect("DELETE") : undefined} busy={acting.busy} error={acting.error} onCancel={close} onSend={(reason) => void send(open, reason)} />
        )}
      </div>
    ) : null}
    {undo.node}
  </>;
  return { action, node, start };
}

/** Whether the person acting holds the author duty (the row action is greyed with the reason otherwise). */
export function useCanAuthor() {
  const actorId = useActorId();
  const session = useApi<{ actor?: { duties?: string[] } }>(["session", actorId], "/session");
  return (session.data?.actor?.duties ?? []).includes("author");
}

/** The state a waiting or returned change puts on its row, or "Retired" (shown only under the Retired filter, BR-10). */
export function ItemStatusNote({ r }: { r: Pick<ItemRow, "change" | "retired"> }) {
  if (r.change) return <p data-item-change className="mt-1 text-[11px] text-text-warn">{r.change.status === "RETURNED" ? RETURNED_LABEL[r.change.action as "DELETE"] : WAITING_LABEL[r.change.action as "DELETE"]}{r.change.by ? ` · asked by ${r.change.by}` : ""}</p>;
  return r.retired ? <p data-item-retired className="mt-1 text-[11px] text-text-muted">Retired: hidden from pickers and AI; earlier releases and open cases keep it</p> : null;
}
