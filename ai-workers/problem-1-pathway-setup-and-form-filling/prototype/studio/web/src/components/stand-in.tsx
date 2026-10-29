// P-165 (backlog B49): the one "Stand-in" chip. It marks a place where our build stands in for a module the team owns;
// its tip says in plain words what the place does today and which module replaces it. Each chip names its row in
// product/STAND-INS.md (`data-stand-in="SI-n"`); tests/check_stand_ins.ts fails when a chip and a row do not match.
import { Tip, TipProvider } from "@/components/status";

export function StandIn({ id, today, later }: { id: `SI-${number}`; today: string; later: string }) {
  return (
    <TipProvider><Tip focusable tip={<>Today: {today}<br />Later: {later}<br /><span className="text-text-muted">Row {id} of the stand-ins register</span></>}>
      <span data-stand-in={id} className="inline-flex h-5 items-center rounded-full border border-dashed border-border-strong px-2 text-[11px] font-medium text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Stand-in</span>
    </Tip></TipProvider>
  );
}
