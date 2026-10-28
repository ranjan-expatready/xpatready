// S3 Start setup (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct): one action wherever a
// Not started combination shows (the Immigration programs card and List row, the Program structure Edit panel), greyed
// with the one guard's reason as visible text; and, on the workspace's "Sources and forms", the finder's run or the one
// offer to find the forms (live AI only on the click, the worst case shown first). The forms list under it is runtime's.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { START, type FinderOffer, type StartSetupResult } from "../../../contracts/start-setup";
import { api, useApi, useSessionView, useToast } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { RunCard } from "@/components/run-card";
import { BlockedLine } from "@/components/lifecycle";

/** Starts the setup of a last-level name and opens it on "Sources and forms". A double click leaves once (QA-50); the
 *  server returns the same combination for a second call. */
export function useStartSetup() {
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  const going = React.useRef(false);
  return async (nodeKey: string) => {
    if (going.current) return;
    going.current = true;
    try {
      const r = await api<StartSetupResult>("/combinations/start", { method: "POST", json: { nodeKey } });
      void qc.invalidateQueries();
      nav(`/c/${r.combination.id}/sources`);
    } catch (e) { going.current = false; toast.push({ tone: "danger", text: (e as Error).message }); }
  };
}

/** The Start setup button: its "i" says what it does, with an example (P-125 (3)); greyed, the reason is written under it. */
export function StartSetupButton({ nodeKey, label, why, className, size = "sm", variant = "default" }: { nodeKey: string; label: string; why?: string | null; className?: string; size?: "sm" | "default"; variant?: "default" | "outline" }) {
  const start = useStartSetup();
  const id = React.useId();
  return (
    <span className={className}>
      <Tip tip={START.tip(label)}>
        <span><Button size={size} variant={variant} aria-disabled={why ? true : undefined} aria-describedby={why ? id : undefined} aria-label={`${START.label}: ${label}`} data-start-setup
          className={why ? "cursor-not-allowed opacity-60" : undefined} onClick={(e) => { e.stopPropagation(); if (!why) void start(nodeKey); }}>{START.label}</Button></span>
      </Tip>
      {why ? <BlockedLine id={id} text={why} className="mt-1" /> : null}
    </span>
  );
}

/** Above "Sources and forms": the finder's newest run (the shared RunCard), or the one way to find the forms. */
export function FinderStart({ combinationId }: { combinationId: string }) {
  const qc = useQueryClient(); const toast = useToast(); const { canAuthor } = useSessionView();
  const q = useApi<FinderOffer>(["start-setup", combinationId], `/combinations/${combinationId}/start-setup`);
  const [busy, setBusy] = React.useState(false);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["start-setup", combinationId] }); void qc.invalidateQueries(); };
  const o = q.data;
  if (!o || (!o.run && !o.offer)) return null;
  const find = async () => {
    if (!o.offer || busy) return;
    setBusy(true);
    try { await api(`/combinations/${combinationId}/forms/find`, { method: "POST", json: { mode: o.offer.mode, planSha256: o.offer.planSha256, idempotencyKey: crypto.randomUUID() } }); refresh(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); refresh(); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3" data-finder-start>
      {o.run ? <RunCard runId={o.run} onEnded={refresh} /> : null}
      {o.offer && canAuthor ? (
        <Notice tone={o.offer.mode === "live" ? "ai" : "info"} title={o.ended ? START.againTitle : START.title}
          action={<Tip tip={o.offer.tip}><span><Button size="sm" busy={busy} onClick={() => void find()} data-find-forms={o.offer.mode}>{o.offer.mode === "live" ? <Sparkles className="size-3.5" aria-hidden /> : null}{o.offer.label}</Button></span></Tip>}>
          <p>{o.ended ? START.againBody : START.body}</p>
          {o.offer.why ? <p className="mt-1 text-text-muted" data-offer-why>{o.offer.why}</p> : null}
        </Notice>
      ) : null}
    </div>
  );
}
