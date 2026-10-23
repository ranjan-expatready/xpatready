// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/empty-state.tsx (D276 reuse).
import * as React from 'react';
import { cn } from '@/lib/utils';

const HEADING_TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

export interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Heading level for `title` — defaults to h3 so it nests safely inside a Card/section. */
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, titleLevel = 3, action, ...props }, ref) => {
    const Heading = HEADING_TAGS[titleLevel];
    return (
      <div
        ref={ref}
        data-slot="empty-state"
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10',
          'text-center',
          className,
        )}
        {...props}
      >
        {icon && (
          <div data-slot="empty-state-icon" aria-hidden="true" className="text-text-muted">
            {icon}
          </div>
        )}
        <Heading data-slot="empty-state-title" className="text-lg font-semibold">
          {title}
        </Heading>
        {description && (
          <p data-slot="empty-state-description" className="text-sm text-text-muted">
            {description}
          </p>
        )}
        {action && (
          <div data-slot="empty-state-action" className="mt-2">
            {action}
          </div>
        )}
      </div>
    );
  },
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
