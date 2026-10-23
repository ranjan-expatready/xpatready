// Copied unchanged from ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/tooltip.tsx (Screen 01 reuse).
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Tooltip primitive — Radix passthrough for Provider/Root/Trigger, house
 * styling on Content only.
 *
 * A11y contract, and the reason this is NOT an accessible-name mechanism:
 * Radix wires the trigger to the content with `aria-describedby`, so a
 * tooltip DESCRIBES its trigger — it never NAMES it. A control whose only
 * text lives in a tooltip is still nameless to assistive tech (and to axe's
 * `button-name`/`link-name` rules). Every icon-only consumer must therefore
 * keep its own `sr-only` label or `aria-label` and treat the tooltip as a
 * sighted-mouse-user affordance layered on top. `SidebarNavItem`'s collapsed
 * (icon-only) mode is the first such caller: it already ships an `sr-only`
 * label span and adds the tooltip purely for discoverability.
 *
 * `TooltipProvider` must wrap any subtree containing tooltips (it owns the
 * shared open/close delay timers). Mounted once per sidebar rather than
 * app-wide so a zone that never renders a tooltip pays nothing.
 *
 * Touch/keyboard note: Radix opens tooltips on hover AND on keyboard focus,
 * but never on touch (there is no hover on a touchscreen) — which is why the
 * collapsed rail is a pointer-device-only surface by design; the mobile
 * drawer always renders the expanded sidebar with visible text labels.
 */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
/**
 * True inside a `TooltipTrigger`. `Button` reads it so an icon button that a
 * caller already wrapped in its own Tooltip doesn't add a second one.
 */
const InsideTooltipTrigger = React.createContext(false);

function useIsInsideTooltipTrigger(): boolean {
  return React.useContext(InsideTooltipTrigger);
}

const TooltipTrigger = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentProps<typeof TooltipPrimitive.Trigger>
>((props, ref) => (
  <InsideTooltipTrigger.Provider value={true}>
    <TooltipPrimitive.Trigger ref={ref} {...props} />
  </InsideTooltipTrigger.Provider>
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentProps<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        'z-tooltip w-fit max-w-xs rounded-md border border-border bg-surface-raised px-2.5 py-1.5',
        'text-xs text-text shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useIsInsideTooltipTrigger };
