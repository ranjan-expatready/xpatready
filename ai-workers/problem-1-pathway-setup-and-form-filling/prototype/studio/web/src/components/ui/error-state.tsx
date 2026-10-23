// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/error-state.tsx (D276 reuse).
import * as React from 'react';
import { cn } from '@/lib/utils';

const HEADING_TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

export interface ErrorStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Typically a "Retry" button — rendered as-is, caller owns the retry handler. */
  action?: React.ReactNode;
}

/**
 * Same combination shape as EmptyState, but role="alert" (this represents a
 * failure, not an absence of data — screen readers should hear about it
 * without the user having to go looking) and destructive-toned chrome.
 */
const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, icon, title, description, titleLevel = 3, action, ...props }, ref) => {
    const Heading = HEADING_TAGS[titleLevel];
    return (
      <div
        ref={ref}
        data-slot="error-state"
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-danger/30 p-10 text-center',
          className,
        )}
        {...props}
      >
        {icon && (
          // aria-hidden — text-destructive here is fine (non-text glyph, no
          // color-contrast check applies) unlike the title/description below,
          // which axe caught failing 4.5:1 when the container itself was also
          // tinted (bg-destructive/5) — see w1-task-4-report.md.
          <div data-slot="error-state-icon" aria-hidden="true" className="text-text-danger">
            {icon}
          </div>
        )}
        <Heading data-slot="error-state-title" className="text-lg font-semibold">
          {title}
        </Heading>
        {description && (
          <p data-slot="error-state-description" className="text-sm text-text-muted">
            {description}
          </p>
        )}
        {action && (
          <div data-slot="error-state-action" className="mt-2">
            {action}
          </div>
        )}
      </div>
    );
  },
);
ErrorState.displayName = 'ErrorState';

export { ErrorState };
