// BK-4c (P-447 (2), P-456 (3), P-484; screens/BK-4-sign-in-hand-offs/concept.md §5 "4c", BR-1-BR-4, BR-7): a hand-off
// where case work changes hands. Under the step's own action, one line: what was done · "Next: <who> <does what>." · a
// secondary button "Hand to <who> →". The button is the only person change in the case area's hand-offs (BR-1): it
// changes the simulated person in this tab (BR-7: a button, not a link, since one browser keeps one person), then moves
// to where that person works next (BR-4). The target comes from data (the case's client, the hand-off's `from`, the
// case's representative of record), never a literal id; the server still decides every right (BR-5). A Ctrl, Cmd,
// Shift or Alt click changes nobody (build notes 4a: a modified click must not change this tab's person); a hand-off
// opens no other tab. The frame's notice says "Now: <name> (simulated)" on the change (BK-4a owns it). The tip shows on
// hover and on keyboard focus (concept §7; review m2).
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { setActor } from "@/lib/api";
import { personOf } from "@/lib/simulated-people";
import { plainClick } from "@/components/frame";
import { Button } from "@/components/ui/controls";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** The person's name as a hand-off says it: "Client A", "the Case officer" (a role name reads with "the"). */
export function handName(id: string) {
  const p = personOf(id);
  if (!p) return null;
  return p.group === "client" ? p.name : `the ${p.name}`;
}

/** Review m3, m4: who handed a case's questionnaire to its client in this tab. The client's "Hand back" goes only to that
 *  person (a hand-typed ?from= of someone else shows nothing), and the client's way back to their questionnaire after
 *  Back keeps it. Per tab (sessionStorage), as the person is chosen per tab's actions. */
const fromKey = (caseId: string) => `xr-handed-from:${caseId}`;
export function handedFrom(caseId: string): string | null { try { return sessionStorage.getItem(fromKey(caseId)); } catch { return null; } }
function rememberFrom(caseId: string, who: string) { try { sessionStorage.setItem(fromKey(caseId), who); } catch { /* private window: no hand back */ } }

/** One hand-off line. `to`: who takes over (unknown → nothing is shown); `go`: where they work next; `next`: "Next: …"
 *  when the next step is theirs (BR-2), else `line` says where things stand without a "Next" (break M1); `handsCase`: this
 *  hand-off gives a case's questionnaire to its client from `from` (remembered for the hand back). */
export function HandOff({ to, go, done, next, line, label, className, data, handsCase }: { to: string | null | undefined; go: string; done?: React.ReactNode; next?: React.ReactNode; line?: React.ReactNode; label?: string; className?: string; data?: string; handsCase?: { caseId: string; from: string } }) {
  const nav = useNavigate();
  const p = to ? personOf(to) : undefined;
  if (!p) return null;
  const who = handName(p.id)!;
  const words = label ?? `Hand to ${who} (simulated)`;
  const tip = `You act as ${p.name} (simulated) in this tab. Use the person picker to come back.`;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]", className)} data-handoff={data ?? ""} data-handoff-to={p.id}>
      {/* The words keep a readable width; on a narrow screen the button wraps under them (400 px check). */}
      <p className="min-w-[min(100%,16rem)] flex-1 [overflow-wrap:anywhere]">
        {done ? <span className="text-text-ok"><Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />{done}</span> : null}
        {done ? " · " : null}{next ? <span>Next: {next}</span> : <span className="text-text-muted">{line}</span>}
      </p>
      <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild>
        <Button size="sm" variant="secondary"
          onClick={(e) => {
            if (!plainClick(e)) return;
            if (handsCase) rememberFrom(handsCase.caseId, handsCase.from);
            // Break m3: the new person and the new page render together (one transition), so neither page shows for a frame
            // to the wrong person.
            React.startTransition(() => { setActor(p.id); nav(go); });
          }} data-handoff-button>
          {words} <ArrowRight aria-hidden />
        </Button>
      </TooltipTrigger><TooltipContent data-handoff-tip>{tip}</TooltipContent></Tooltip></TooltipProvider>
    </div>
  );
}
