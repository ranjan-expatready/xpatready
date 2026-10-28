// Button follows the team's button.tsx variants (ERv2-frontend@5ccd9fa src/components/ui/button.tsx) without its
// tooltip wrapper; Dialog, Input, Select, Textarea and Field follow the team's class conventions on Radix primitives.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  ["inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium", "transition-all shrink-0", "disabled:pointer-events-none disabled:opacity-50",
    '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0', "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]", "cursor-pointer"],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive: "bg-danger text-danger-contrast hover:bg-danger/90 focus-visible:ring-danger/20 dark:bg-danger/30",
        outline: "border border-border-strong bg-gradient-to-b from-surface-raised to-surface-sunken shadow-sm hover:bg-text/5 hover:text-text dark:bg-none dark:bg-surface-raised dark:hover:bg-surface",
        secondary: "border border-border bg-surface-raised text-text shadow-sm hover:bg-text/5",
        ghost: "hover:bg-text/5 hover:text-text",
        link: "text-text-link underline-offset-4 hover:underline",
      },
      size: { default: "h-9 px-4 py-2 has-[>svg]:px-3", sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5", lg: "h-10 rounded-lg px-6 has-[>svg]:px-4", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> { asChild?: boolean; busy?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, busy, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  if (asChild) return <Slot ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>{children}</Slot>;
  return <Comp ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>{busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}{children}</Comp>;
});
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-9 w-full rounded-lg border border-border-strong bg-surface-raised px-3 text-sm text-text placeholder:text-text-muted outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-danger disabled:opacity-60", className)} {...props} />
));
Input.displayName = "Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-20 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-danger", className)} {...props} />
));
Textarea.displayName = "Textarea";
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-9 w-full rounded-lg border border-border-strong bg-surface-raised px-2 text-sm text-text outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]", className)} {...props} />
));
Select.displayName = "Select";

export function Field({ label, hint, error, children, className }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-text">{label}</label>
      {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, { id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? `${id}-note` : undefined }) : children}
      {error ? <p id={`${id}-note`} role="alert" className="text-xs text-text-danger">{error}</p> : hint ? <p id={`${id}-note`} className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

/** A dialog or panel opens on its first field, not on Close (QA-41: Enter on Close threw the form away). With no field
 *  it opens on itself, so a screen reader reads its title and Tab reaches its buttons. */
function openOnFirstField(e: Event) {
  const box = e.currentTarget as HTMLElement | null;
  e.preventDefault();
  const field = box?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
  (field ?? box)?.focus();
}

/** guard: once a field in the dialog was changed, closing it by Escape, the X or the overlay asks before discarding.
 *  initialFocus: the field to start in, asked when the content mounts (else the first field). */
export function Dialog({ open, onOpenChange, title, description, children, footer, wide, guard, initialFocus }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; guard?: boolean; initialFocus?: () => HTMLInputElement | null | undefined }) {
  const touched = React.useRef(false);
  const change = (o: boolean) => { if (!o && guard && touched.current && !window.confirm("Discard your unsaved changes?")) return; if (!o) touched.current = false; onOpenChange(o); };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content onOpenAutoFocus={(e) => { const el = initialFocus?.(); if (el && !el.disabled) { e.preventDefault(); el.focus(); } else openOnFirstField(e); }} className={cn("fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface-raised shadow-xl outline-none", wide ? "max-w-4xl" : "max-w-lg")}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-1 text-xs text-text-muted">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-text-muted hover:bg-text/5" aria-label="Close"><X className="size-4" /></DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto px-6 py-4" onChangeCapture={() => { touched.current = true; }} onInputCapture={() => { touched.current = true; }}>{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-border px-6 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The team's right-anchored panel (Dialog variant="panel" / Sheet, P-48): any pane that collects a value. Pinned
 *  header (title, optional badge), scrolling body, pinned footer (Close left, primary right). */
export function Panel({ open, onOpenChange, title, description, badge, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25" />
        <DialogPrimitive.Content onOpenAutoFocus={openOnFirstField} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-border bg-surface-raised shadow-xl outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>{badge}</div>
              {description ? <DialogPrimitive.Description className="mt-1 text-xs text-text-muted">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-text-muted hover:bg-text/5" aria-label="Close"><X className="size-4" /></DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer ? <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const TONE: Record<string, string> = {
  neutral: "border-border bg-surface text-text-muted", info: "border-transparent bg-primary/10 text-text-link", ok: "border-transparent bg-ok/12 text-text-ok",
  warn: "border-transparent bg-warn/15 text-text-warn", danger: "border-transparent bg-danger/12 text-text-danger", ai: "border-transparent bg-[#7c3aed]/12 text-[#6d28d9] dark:text-[#c4b5fd]", strong: "border-transparent bg-primary text-primary-foreground",
};
export function Pill({ tone = "neutral", children, className, title }: { tone?: keyof typeof TONE | string; children: React.ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cn("inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4", TONE[tone] ?? TONE.neutral, className)}>{children}</span>;
}

export function Notice({ tone = "info", title, children, action, className }: { tone?: "info" | "ok" | "warn" | "danger" | "ai"; title?: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const bar: Record<string, string> = { info: "border-l-primary", ok: "border-l-ok", warn: "border-l-warn", danger: "border-l-danger", ai: "border-l-[#7c3aed]" };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start justify-between gap-3 rounded-lg border border-border border-l-4 bg-surface-raised px-4 py-3", bar[tone], className)}>
      <div className="min-w-0 text-sm">{title ? <p className="font-semibold">{title}</p> : null}{children ? <div className="mt-0.5 text-text-muted">{children}</div> : null}</div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "ok" | "warn" | "danger" | "info" }) {
  const c = tone === "ok" ? "text-text-ok" : tone === "warn" ? "text-text-warn" : tone === "danger" ? "text-text-danger" : tone === "info" ? "text-text-link" : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold leading-tight", c)}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-muted">{sub}</p> : null}
    </div>
  );
}

export function Table({ head, children, className, dense, label, headClass }: { head: React.ReactNode[]; children: React.ReactNode; className?: string; dense?: boolean; /** The table's name when a heading is not plain text. */ label?: string; /** Extra classes per heading cell (a column hidden at some widths). */ headClass?: (string | undefined)[] }) {
  return (
    // Focusable, so a keyboard can scroll it sideways on a narrow screen (WCAG 2.1.1; review 24 Oct should 1).
    <div tabIndex={0} role="region" aria-label={label ?? `Table: ${head.filter((h) => typeof h === "string").join(", ")}`} className={cn("relative overflow-x-auto rounded-xl border border-border bg-surface-raised outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface text-xs text-text-muted"><tr>{head.map((h, i) => <th key={i} className={cn("border-b border-border px-3 font-medium", dense ? "py-1.5" : "py-2", headClass?.[i])}>{h}</th>)}</tr></thead>
        <tbody className="[&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-b-0 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}
