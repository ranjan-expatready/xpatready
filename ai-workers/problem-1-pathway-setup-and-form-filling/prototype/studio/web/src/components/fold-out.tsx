// BK-2 (P-447 (2), Bake plan row 2): the one fold-out of the app. Every section that opens to show more carries the same
// arrow, pointing right when closed and down when open, so a person sees there is more inside. Native <details>/<summary>:
// the browser makes it reachable by Tab and toggled by Enter or Space, and screen readers announce it expanded or
// collapsed, without script. A fold-out opened by a button of its own (a section header that also holds other controls,
// a tree row) keeps its button and aria-expanded and shows <FoldArrow open={…} />. The arrow takes the text colour of its
// summary (the team's tokens: text-link, text-muted). tests/check_bk2_fold_outs.ts fails on a fold-out without it.
import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** The arrow alone: right when closed, down when open. Inside a FoldOut it turns with the <details> (styles/index.css). */
export function FoldArrow({ open, className }: { open?: boolean; className?: string }) {
  return <ChevronRight aria-hidden data-fold-arrow className={cn("inline-block size-[1.1em] shrink-0 align-[-0.2em] transition-[rotate] duration-150 motion-reduce:transition-none", open && "rotate-90", className)} />;
}

type FoldOutProps = Omit<React.DetailsHTMLAttributes<HTMLDetailsElement>, "title"> & {
  /** What the closed fold-out says (the <summary>). */
  summary: React.ReactNode;
  summaryClassName?: string;
};

/** A fold-out section: closed unless `open`, the arrow before its summary. */
export function FoldOut({ summary, summaryClassName, className, children, ...rest }: FoldOutProps) {
  return (
    <details data-fold className={className} {...rest}>
      <summary className={cn("cursor-pointer", summaryClassName)}><FoldArrow className="mr-1" />{summary}</summary>
      {children}
    </details>
  );
}
