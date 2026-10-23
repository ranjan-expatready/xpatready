// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/card.tsx (D276 reuse).
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Three INDEPENDENT axes — padding, inner gap, and overflow — because call
 * sites vary them independently (`gap-4 p-6`, `gap-4 p-4` and `gap-2 p-5` all
 * occur). Folding gap into padding would force a re-invention at the first
 * card that wants one without the other.
 *
 * ★ EVERY DEFAULT IS THE EMPTY STRING, so this is additive: a `<Card>` with
 * no variant props renders byte-for-byte what it rendered before these
 * variants existed, and no existing call site changes.
 */
const cardVariants = cva('rounded-xl border border-border bg-surface-raised text-text shadow-sm', {
  variants: {
    padding: { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' },
    gap: { none: '', sm: 'flex flex-col gap-2', md: 'flex flex-col gap-3', lg: 'flex flex-col gap-4' },
    /**
     * `clip` is the rounded-corner case — a child with its own background (a
     * table header, a filled row) would otherwise square off the card's
     * corners. `scrollX` is the table case: AGENTS.md lets a table scroll
     * sideways where the page itself may not.
     */
    overflow: { visible: '', clip: 'overflow-hidden', scrollX: 'overflow-x-auto' },
  },
  defaultVariants: { padding: 'none', gap: 'none', overflow: 'visible' },
});

export interface CardProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, gap, overflow, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ padding, gap, overflow }), className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-header" className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.ComponentProps<'h3'>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<'p'>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn('text-sm text-text-muted', className)}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-footer" className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
