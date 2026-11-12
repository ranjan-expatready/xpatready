// BK-4b (concept BK-4 rev 2 §5, P-484): where work changes hands in the Studio, the step says what was done, who is
// next, and one button hands the work to them. The button only changes who asks (setActor, the one current person of
// lib/api.ts; the frame owns the notice, BK-4a) and moves to where they work; every right stays on the server (BR-5).
// The person comes from data (the session's people and their duties), never a literal id (BR-3), and a hand-off shows
// only when the next step is someone else's (BR-2). It is a button, not a link: one person per browser (BR-7).
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setActor } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Tip, TipProvider } from "@/components/status";

export type Person = { id: string; name: string; duties: readonly string[] };

/** BR-3: the first person who holds the duty and is none of `not` (the proposer, the submitter, the one asking now). */
export function holderOf(people: readonly Person[] | undefined, duty: string, not: (string | null | undefined)[] = []): Person | null {
  return (people ?? []).find((p) => p.duties.includes(duty) && !not.includes(p.id)) ?? null;
}
/** "the Content reviewer": the Studio's people are roles, so they read with "the". */
export const theName = (p: Pick<Person, "name">) => `the ${p.name}`;

/** One line under the step's own action: ✓ what was done · Next: who does what · [Hand to <who> →].
 *  `to` null: no one holds the duty, so the line says so instead of offering a button. */
export function HandOff({ id, done, next, to, path, label, act, noOne }: {
  /** data-handoff value, for checks. */ id: string;
  done?: React.ReactNode; next: React.ReactNode; to: Person | null;
  /** Where the next person works; omitted: this page. */ path?: string;
  /** The button's words; default "Hand to the <name> →". */ label?: string;
  /** Changes the person; default setActor(to.id). The open-case hand-off uses the case area's own helper. */ act?: () => void;
  /** Said when no one holds the duty. */ noOne?: string;
}) {
  const nav = useNavigate(); const loc = useLocation();
  if (!to) return noOne ? <div data-handoff={id} data-handoff-none><Notice tone="warn" title={noOne} /></div> : null;
  const go = () => {
    if (act) act(); else setActor(to.id);
    if (path && path !== `${loc.pathname}${loc.search}`) nav(path);
  };
  return (
    <div data-handoff={id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm">
      <p className="min-w-0">{done ? <><span className="font-semibold text-text-ok" aria-hidden>✓ </span>{done} · </> : null}Next: {next}</p>
      <TipProvider><Tip tip={`You act as ${theName(to)} (simulated) in this tab. Use the person picker to come back.`}>
        <Button type="button" size="sm" variant="secondary" data-handoff-to={to.id} onClick={go}>{label ?? `Hand to ${theName(to)} →`}</Button>
      </Tip></TipProvider>
    </div>
  );
}
