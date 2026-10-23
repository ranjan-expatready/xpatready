// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/spinner.tsx (D276 reuse).
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.ComponentProps<'span'> {
  /** Screen-reader label; visually hidden. Defaults to "Loading". */
  label?: string;
}

/**
 * K2: `animate-spin` (Tailwind core) drives the rotation; `motion-reduce:
 * animate-none` freezes it under prefers-reduced-motion while the glyph
 * stays visible — a static Loader2 icon is still a legible "busy" cue.
 */
const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, label = 'Loading', ...props }, ref) => (
    <span
      ref={ref}
      data-slot="spinner"
      role="status"
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner };
