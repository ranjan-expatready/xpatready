// Status, marker and tooltip pieces of the Programs screen. Status is shown by shape and words, never colour alone
// (EXPERIENCE §1); every status, marker and number that needs context has a tooltip that also opens on keyboard focus.
import * as React from "react";
import { CircleCheck, CircleDashed, CircleAlert, Sparkles } from "lucide-react";
import type { Status } from "../../../contracts/programs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={250}>{children}</TooltipProvider>;
}

/** A tooltip on a focusable trigger. Content describes the trigger (aria-describedby); it never names it. `focusable`
 *  makes a plain element reachable by keyboard (a number sets its tabIndex, for rows of a treegrid). */
export function Tip({ tip, children, focusable }: { tip: React.ReactNode; children: React.ReactElement; focusable?: boolean | number }) {
  const child = focusable !== undefined && focusable !== false ? React.cloneElement(children as React.ReactElement<any>, { tabIndex: focusable === true ? 0 : focusable }) : children;
  return <Tooltip><TooltipTrigger asChild>{child}</TooltipTrigger><TooltipContent>{tip}</TooltipContent></Tooltip>;
}

export const STATUS_TIP: Record<Status, string> = {
  READY: "Live: firms can open cases on this combination. It is in the latest release and passes the startable check (every form has a current edition, every person role has questions, every rule resolves).",
  NOT_READY: "Released, but firms cannot use it yet. Open it to see each missing item.",
  IN_SETUP: "Not released yet. Firms cannot use it until it is set up and released.",
};
const STATUS_STYLE: Record<Status, string> = {
  READY: "bg-ok/12 text-text-ok",
  NOT_READY: "bg-danger/12 text-text-danger",
  IN_SETUP: "bg-text/8 text-text",
};
const STATUS_ICON: Record<Status, typeof CircleCheck> = { READY: CircleCheck, NOT_READY: CircleAlert, IN_SETUP: CircleDashed };

export function StatusChip({ status, text, extraTip, tabIndex = 0 }: { status: Status; text: string; extraTip?: string; tabIndex?: number }) {
  const Icon = STATUS_ICON[status];
  return (
    <Tip focusable={tabIndex} tip={<>{STATUS_TIP[status]}{extraTip ? <><br />{extraTip}</> : null}</>}>
      <span className={cn("inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", STATUS_STYLE[status])} data-status={status}>
        <Icon className="size-3.5" aria-hidden />{text}
      </span>
    </Tip>
  );
}

export const AI_TIP = "AI read the forms and suggested a shared field for each form field. Nothing changes until you accept.";
export function AiMarker({ n, tabIndex = 0 }: { n: number; tabIndex?: number }) {
  if (!n) return null;
  return (
    <Tip focusable={tabIndex} tip={AI_TIP}>
      <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-[#7c3aed]/12 px-2 py-0.5 text-xs font-semibold text-[#6d28d9] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:text-[#c4b5fd]">
        <Sparkles className="size-3.5" aria-hidden />AI proposals ({n})
      </span>
    </Tip>
  );
}

export const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", year: "numeric", timeZone: "UTC" });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const CHECKED_TIP = "When someone last compared this setup with IRCC's published forms and guides: the oldest date among its official files. Next review 12 months later; orange when overdue.";
