// PF-18h (concept screens/pf-18h-home r3, approved by the tech lead at r2; R1.74, QA-471 part 2): the staff Home, the first
// page after sign-in. One section for now, "Needs you": my unread deadline reminders (BR-1), one per deadline (BR-2), mine
// only (BR-3, the server's), newest first, at most 20 with the total in words (BR-5, BR-8), times in my zone (BR-7).
// Opening an item marks it read FIRST (PF-18n's POST …/:id/read), then goes to its case (BR-4, challenge m1): a failed mark
// keeps the page with a notice and "Open the case anyway". "Hide until next reminder" marks it read without opening (M4);
// focus moves to the next row, or to the heading when none is left (m2). Each block is its own <section>, so PF-29f's
// "Due today or overdue" can sit beside it. Hooks for J-74's walk (Lead C): data-needs-you-item / -open / -hide / -count.
// Known gap (Q2, labelled scaffolding): /cases/* acts as the Studio's simulated person, not the signed-in staff member.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Notice } from "@/components/ui/controls";
import { Loading } from "@/modules/front-office/sales/loading";
import { PlatformFrame } from "../frame";
import { ReleaseOneMenu } from "./release-one-menu";
import { staffApi } from "../session";
import { cameIn, COPY, countWords, itemWords, NeedsYou, type NeedsYouItem, whatOf, zoneName } from "./contract";

const KEY = ["pf", "home", "needs-you"] as const;
// `seen`: the time this list showed, so a reminder that came back after it stays unread (PF-18n part 1).
const markRead = (i: NeedsYouItem) => staffApi<{ readAt: string | null }>(`/platform/me/notifications/${encodeURIComponent(i.id)}/read?seen=${encodeURIComponent(i.createdAt)}`, { method: "POST" });

/** "A government step on case C-2026-00042", the number kept on one line (break m2). */
function Words({ item }: { item: NeedsYouItem }) {
  return <>{whatOf(item.kind)} on {item.caseNumber ? <>case <span className="whitespace-nowrap tabular-nums">{item.caseNumber}</span></> : "a case you can no longer open"}</>;
}

function Row({ item, zone, onOpen, onHide, onElsewhere, busy, locked }: { item: NeedsYouItem; zone: string; onOpen: (i: NeedsYouItem) => void; onHide: (i: NeedsYouItem) => void;
  /** Opened in a new tab or window (Ctrl/Cmd, Shift or middle click): marked read too (review minor), the browser opens it. */ onElsewhere: (i: NeedsYouItem) => void; busy: boolean;
  /** Another row is being marked: this row waits (break m4: shown, never a swallowed click). */ locked: boolean }) {
  const words = itemWords(item), when = cameIn(item.createdAt, zone);
  return (
    <li data-needs-you-item={item.id} className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {item.link
          ? <a href={item.link} data-needs-you-open onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) { onElsewhere(item); return; } e.preventDefault(); if (!locked) onOpen(item); }}
              onAuxClick={(e) => { if (e.button === 1) onElsewhere(item); }}
              aria-disabled={busy || locked || undefined} className="font-medium text-text-link underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"><Words item={item} /></a>
          : <span className="font-medium text-text" data-needs-you-unlinked><Words item={item} /></span>}
        <p className="text-sm text-text-muted">Reminder came in {when}</p>
      </div>
      <Button variant="outline" size="sm" className="self-start sm:self-center" busy={busy} disabled={locked} onClick={() => onHide(item)} data-needs-you-hide aria-label={`${COPY.hide}: ${words}`}>{COPY.hide}</Button>
    </li>
  );
}

function NeedsYouSection() {
  const qc = useQueryClient(), navigate = useNavigate();
  const q = useQuery({ queryKey: KEY, queryFn: async () => NeedsYou.parse(await staffApi("/platform/me/needs-you")), refetchOnWindowFocus: true });
  const [busy, setBusy] = React.useState<string | null>(null);
  // A failed mark (with what was asked: open or hide), or a hide the server kept because a newer reminder came (break m3).
  const [failed, setFailed] = React.useState<{ item: NeedsYouItem; open: boolean } | null>(null);
  const [cameBack, setCameBack] = React.useState(false);
  const heading = React.useRef<HTMLHeadingElement>(null), list = React.useRef<HTMLUListElement>(null);
  // The row (and which of its controls) to focus once the list is fresh; null: the heading.
  const focusAfter = React.useRef<{ id: string; control: "a" | "button" } | null | undefined>(undefined);

  React.useEffect(() => {
    if (focusAfter.current === undefined || q.isFetching) return;
    const to = focusAfter.current; focusAfter.current = undefined;
    const row = to ? list.current?.querySelector<HTMLElement>(`[data-needs-you-item="${CSS.escape(to.id)}"] ${to.control}`) ?? list.current?.querySelector<HTMLElement>(`[data-needs-you-item="${CSS.escape(to.id)}"] button`) : null;
    (row ?? heading.current)?.focus();
  }, [q.isFetching, q.data]);

  const act = async (item: NeedsYouItem, open: boolean) => {
    if (busy) return;
    setBusy(item.id); setFailed(null); setCameBack(false);
    let r: { readAt: string | null };
    try { r = await markRead(item); }
    catch {
      setFailed({ item, open }); setBusy(null);
      // The busy button was disabled, so focus fell to the page: put it back on what was pressed (review S2).
      requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-needs-you-item="${CSS.escape(item.id)}"] ${open ? "a" : "button"}`)?.focus());
      return;
    }
    setBusy(null);
    if (open && item.link) { void qc.invalidateQueries({ queryKey: KEY }); navigate(item.link); return; }
    const items = q.data?.items ?? [], at = items.findIndex((i) => i.id === item.id);
    // Kept unread (a newer reminder after this list loaded): say so and keep focus on that row; else focus moves on.
    if (!r?.readAt) { setCameBack(true); focusAfter.current = { id: item.id, control: "button" }; }   // back on the Hide pressed (re-review R3)
    else { const next = (items[at + 1] ?? items[at - 1])?.id; focusAfter.current = next ? { id: next, control: "a" } : null; }
    await qc.invalidateQueries({ queryKey: KEY });
  };

  const d = q.data;
  return (
    <section aria-labelledby="needs-you-h" className="rounded-xl border border-border bg-surface-raised p-4" data-needs-you>
      <h2 id="needs-you-h" ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">Needs you</h2>
      {q.isPending ? <div className="mt-3"><Loading label={COPY.loading} /></div>
        : q.isError ? <Notice tone="danger" title={COPY.loadFailed} className="mt-3" action={<Button variant="link" size="sm" onClick={() => void q.refetch()}>Try again</Button>} />
          : !d!.items.length ? <div className="mt-2" data-needs-you-empty><p className="text-sm text-text">{COPY.empty}</p><p className="text-sm text-text-muted">{COPY.emptyHint}</p></div>
            : <>
              <p className="mt-0.5 text-sm text-text-muted" data-needs-you-count>{countWords(d!.total)}</p>
              {failed ? <Notice tone="danger" title={failed.open ? COPY.openFailed : COPY.hideFailed} className="mt-3"
                action={failed.open && failed.item.link ? <a className="whitespace-nowrap text-text-link underline" href={failed.item.link} onClick={(e) => { e.preventDefault(); navigate(failed.item.link!); }}>{COPY.openAnyway}</a> : undefined} /> : null}
              {cameBack ? <Notice tone="info" title={COPY.cameBack} className="mt-3" /> : null}
              <ul ref={list} className="mt-2" aria-label="What needs you">
                {d!.items.map((i) => <Row key={i.id} item={i} zone={d!.zone} busy={busy === i.id} locked={busy !== null && busy !== i.id} onOpen={(x) => void act(x, true)} onHide={(x) => void act(x, false)}
                  onElsewhere={(x) => void markRead(x).then(() => qc.invalidateQueries({ queryKey: KEY })).catch(() => undefined)} />)}
              </ul>
              <p className="mt-2 text-xs text-text-muted">{d!.total > d!.items.length ? `${COPY.more(d!.items.length, d!.total)} ` : ""}Times in {zoneName(d!.zone)}.</p>
            </>}
    </section>
  );
}

export function HomePage() {
  return (
    <PlatformFrame crumbs={[{ label: "Home" }]} intro={<ReleaseOneMenu />}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6" data-home>
        <h1 className="text-2xl font-semibold text-text">Home</h1>
        <NeedsYouSection />
      </div>
    </PlatformFrame>
  );
}
