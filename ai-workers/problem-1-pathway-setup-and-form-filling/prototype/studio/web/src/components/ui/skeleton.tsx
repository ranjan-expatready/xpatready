// Copied unchanged from ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/skeleton.tsx (Screen 01 reuse).
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * K2: `animate-pulse` is Tailwind core's shimmer utility; `motion-reduce:
 * animate-none` (also core, driven by the `prefers-reduced-motion: reduce`
 * media query) neutralizes it for users who've asked for less motion — the
 * block itself stays visible, it just stops pulsing.
 *
 * aria-hidden: decorative — the loading *container* is what should announce
 * "loading" (e.g. via a Spinner or an aria-live region), not each bone.
 */
const Skeleton = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse motion-reduce:animate-none rounded-md bg-text/10', className)}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
