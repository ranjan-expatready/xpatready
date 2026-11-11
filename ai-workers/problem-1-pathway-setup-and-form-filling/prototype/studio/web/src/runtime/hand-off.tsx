// BK-4c (P-447 (2), P-456 (3), P-484; screens/BK-4-sign-in-hand-offs/concept.md §5 "4c", BR-1-BR-4, BR-7): a hand-off
// where case work changes hands. Under the step's own action, one line: what was done · "Next: <who> <does what>." · a
// secondary button "Hand to <who> →". The button is the only person change in the case area's hand-offs (BR-1): it
// changes the simulated person in this tab (BR-7: a button, not a link, since one browser keeps one person), then moves
// to where that person works next (BR-4). The target comes from data (the case's client, the hand-off's `from`, the
// case's representative of record), never a literal id; the server still decides every right (BR-5). A Ctrl, Cmd,
// Shift or Alt click changes nothing (build notes 4a: a modified click must not change this tab's person); a hand-off
// opens no other tab. The frame's notice says "Now: <name> (simulated)" on the change (BK-4a owns it).
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { setActor } from "@/lib/api";
import { personOf } from "@/lib/simulated-people";
import { plainClick } from "@/components/frame";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

/** The person's name as a hand-off says it: "Client A", "the Case officer" (a role name reads with "the"). */
export function handName(id: string) {
  const p = personOf(id);
  if (!p) return null;
  return p.group === "client" ? p.name : `the ${p.name}`;
}

/** One hand-off line. `to`: who takes over (unknown → nothing is shown); `go`: where they work next. */
export function HandOff({ to, go, done, next, label, className, data }: { to: string | null | undefined; go: string; done?: React.ReactNode; next: React.ReactNode; label?: string; className?: string; data?: string }) {
  const nav = useNavigate();
  const p = to ? personOf(to) : undefined;
  if (!p) return null;
  const who = handName(p.id)!;
  const words = label ?? `Hand to ${who} (simulated)`;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]", className)} data-handoff={data ?? ""} data-handoff-to={p.id}>
      {/* The words keep a readable width; on a narrow screen the button wraps under them (400 px check). */}
      <p className="min-w-[min(100%,16rem)] flex-1 [overflow-wrap:anywhere]">
        {done ? <span className="text-text-ok"><Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />{done}</span> : null}
        {done ? " · " : null}<span>Next: {next}</span>
      </p>
      <Button size="sm" variant="secondary" title={`You act as ${p.name} (simulated) in this tab. Use the person picker to come back.`}
        onClick={(e) => { if (!plainClick(e)) return; setActor(p.id); nav(go); }} data-handoff-button>
        {words} <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}
