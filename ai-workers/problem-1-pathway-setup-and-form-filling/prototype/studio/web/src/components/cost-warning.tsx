// P-179 (C11.8): the one cost warning every AI start shows before anything is spent, when its plan is over a limit:
// expected and worst case, spend so far against the cap, which limit and why, then Continue (recorded with the person's
// name, for this one run's worst case) or Cancel (nothing starts). Past the ceiling (the cap + 10%) there is no Continue.
// One call wires it on any start:  const cost = useCostGate();  …  cost.gate(() => planAgain(), start, (overrideId) => launch(overrideId))
// and render {cost.dialog}. Words and shape: contracts/cost-check.ts. The server checks everything again.
import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Dialog, Notice } from "@/components/ui/controls";
import { COST_WORDS, LIMIT_NAMES, type CostCheck, type OverrideReply, type OverrideStartBody } from "../../../contracts/cost-check";

type Plan = { cost_check: CostCheck; run_key: string };

export function CostWarning({ check, busy, error, onContinue, onCancel }: { check: CostCheck; busy?: boolean; error?: string | null; onContinue: () => void; onCancel: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()} title={check.can_continue ? COST_WORDS.title : COST_WORDS.titleCeiling} description={COST_WORDS.description}
      footer={<>
        <Button variant="ghost" onClick={onCancel} disabled={busy} data-cost-cancel>{COST_WORDS.cancel}</Button>
        {check.can_continue ? <Button onClick={onContinue} busy={busy} data-cost-continue aria-describedby="cost-continue-note">{COST_WORDS.continue}</Button> : null}
      </>}>
      <div className="space-y-3 text-sm" data-cost-warning>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border px-3 py-2"><dt className="text-[11px] text-text-muted">Expected</dt><dd className="font-semibold">{COST_WORDS.expected(check).replace(/^Expected /, "")}</dd></div>
          <div className="rounded-lg border border-border px-3 py-2"><dt className="text-[11px] text-text-muted">Worst case</dt><dd className="font-semibold">{COST_WORDS.worst(check).replace(/^At most /, "")}</dd></div>
          <div className="col-span-2 rounded-lg border border-border px-3 py-2" data-cost-spent><dt className="text-[11px] text-text-muted">AI spending cap</dt><dd>{COST_WORDS.spent(check)} · {COST_WORDS.wave(check)}</dd></div>
        </dl>
        <ul className="space-y-2" aria-label="Limits this start passes">
          {check.over.map((o) => (
            <li key={o.limit} className="flex gap-2 rounded-lg border border-[color:var(--warn,#b45309)]/40 px-3 py-2" data-cost-limit={o.limit}>
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--warn,#b45309)]" />
              <span><strong>{LIMIT_NAMES[o.limit]}.</strong> {o.words}</span>
            </li>
          ))}
        </ul>
        {check.can_continue ? <p id="cost-continue-note" className="text-xs text-text-muted">{COST_WORDS.continueNote(check)}</p> : <Notice tone="danger" title="No Continue">{check.words}</Notice>}
        {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}

/** The one call for a start: fits → launch now; over a limit → the warning; Continue records the override, then launches
 *  with its id; Cancel starts nothing. `launch` throws to show its own error where the caller shows errors. */
export function useCostGate() {
  const [pending, setPending] = React.useState<{ plan: Plan; start: OverrideStartBody; launch: (overrideId?: string) => Promise<unknown>; done: (v: unknown) => void } | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  // N6: between the click and the warning's own dialog layer being ready (the portal mounts its content a render later, and
  // the layer's Escape listener an effect after that), an Escape reached the panel underneath and closed it with the warning
  // still to come. From the click until the warning closes, Escape is caught here first (window, capture, before any dialog
  // layer's listener) and means what it means in the warning: Cancel, or nothing while Continue is busy.
  const busyRef = React.useRef(false); busyRef.current = busy;
  const escGuard = React.useRef<((e: KeyboardEvent) => void) | null>(null);
  const disarm = () => { if (escGuard.current) window.removeEventListener("keydown", escGuard.current, true); escGuard.current = null; };
  const cancelRef = React.useRef<() => void>(() => undefined);
  const clickRef = React.useRef({ cancelled: false });
  // N6 follow-up: `plan` may be a function that makes the plan again. Spend can arrive from another copy while the panel is
  // open, so a plan made when it opened (or after a refusal) can be stale: after a Cancel the next Start would show old
  // figures and even a Continue past the ceiling. The Escape guard is armed first, in the click, then the plan is made
  // again, then the warning opens with the fresh figures; an Escape while the plan is being made cancels the start.
  const gate = React.useCallback(async (plan: Plan | (() => Promise<Plan>), start: OverrideStartBody, launch: (overrideId?: string) => Promise<unknown>) => {
    if (typeof plan !== "function" && (!plan.cost_check || plan.cost_check.ok)) return launch();
    setError(null);
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    disarm();
    const click = { cancelled: false }; clickRef.current = click;
    escGuard.current = (e: KeyboardEvent) => { if (e.key !== "Escape") return; e.preventDefault(); e.stopImmediatePropagation(); if (!busyRef.current) { click.cancelled = true; cancelRef.current(); } };
    window.addEventListener("keydown", escGuard.current, true);
    let fresh: Plan;
    try { fresh = typeof plan === "function" ? await plan() : plan; } catch (e) { disarm(); throw e; }
    if (click.cancelled) return undefined;
    if (!fresh.cost_check || fresh.cost_check.ok) { disarm(); return launch(); }
    // Resolves with the launch's answer after Continue, or undefined after Cancel (nothing started).
    return new Promise<unknown>((done) => setPending({ plan: fresh, start, launch, done }));
  }, []);
  // Review Minor 4: the panel closed while its plan is being made: the start is cancelled, nothing launches.
  React.useEffect(() => () => { clickRef.current.cancelled = true; disarm(); }, []);
  // Review m3: the Start button that opened the warning is disabled while it waits, so focus fell to the page on Cancel or
  // Escape. Once the caller has enabled it again (a few frames), focus goes back to it, so the keyboard path goes on.
  // Review Minor 1: up to 5 s, not a frame count: an Escape while a slow plan is being made waits for Start to be enabled.
  const refocus = (el: HTMLElement | null, until = performance.now() + 5000) => {
    if (!el || !el.isConnected || performance.now() > until) return;
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") { requestAnimationFrame(() => refocus(el, until)); return; }
    el.focus();
  };
  const cancel = () => { disarm(); pending?.done(undefined); setPending(null); const el = opener.current; requestAnimationFrame(() => refocus(el)); };
  // The guard may fire before the render that holds `pending`: it resolves the waiting start through the setter instead.
  cancelRef.current = () => { disarm(); setPending((p) => { p?.done(undefined); return null; }); const el = opener.current; requestAnimationFrame(() => refocus(el)); };
  const proceed = async () => {
    if (!pending) return;
    setBusy(true); setError(null);
    try {
      const c = pending.plan.cost_check;
      const o = await api<OverrideReply>("/ai/overrides", { method: "POST", json: { run_key: pending.plan.run_key, worst_usd: c.worst_usd, limits: c.over.map((x) => x.limit), start: pending.start } });
      const r = await pending.launch(o.override_id);
      disarm(); pending.done(r); setPending(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const dialog = pending ? <CostWarning check={pending.plan.cost_check} busy={busy} error={error} onContinue={() => void proceed()} onCancel={cancel} /> : null;
  return { gate, dialog };
}
