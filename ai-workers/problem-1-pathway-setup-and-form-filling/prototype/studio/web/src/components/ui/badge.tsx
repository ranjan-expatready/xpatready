// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/badge.tsx (D276 reuse).
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// warn/ok variants intentionally omitted: --color-warn/--color-ok (tokens.css) are documented
// as fill-only tokens whose paired text colors (--color-text-warn/--color-text-ok) are verified
// by the WCAG contrast gate only against the neutral --color-surface* family, not against a
// warn/ok fill — a solid or tinted warn/ok badge combo isn't covered by that gate. NEEDS_CONTEXT
// before adding one; see w1-task-4-report.md.
const badgeVariants = cva(
	[
		"inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5",
		"text-xs font-medium transition-colors outline-none",
		"focus-visible:ring-ring/50 focus-visible:ring-[3px]",
		"[&_svg]:pointer-events-none [&_svg]:size-3",
	],
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-border bg-surface-raised text-text",
				destructive: "border-transparent bg-danger text-danger-contrast",
				outline: "border-border text-text",
				at: "border-transparent bg-warn/15 text-text-warn",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export interface BadgeProps
	extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="badge"
			className={cn(badgeVariants({ variant, className }))}
			{...props}
		/>
	),
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
