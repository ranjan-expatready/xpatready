// Copied unchanged from the team's read-only capture ERv2-frontend@5ccd9fa-2026-10-20 src/components/ui/tabs.tsx (D276 reuse).
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

// Root is an unstyled Radix passthrough — arrow-key navigation between
// triggers is Radix's own, untouched.
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.List>,
	React.ComponentProps<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	// The list is an unstyled strip: no bg-muted, no pill. Active/inactive is
	// carried by the trigger's primary underline and its weight step (see
	// TabsTrigger), never by colour alone.
	//
	// Inactive triggers still must NOT dim to text-muted-foreground. Back when
	// the list was bg-muted, axe measured that pairing at 4.34:1 — failing
	// 4.5:1 by a hair in this project's shadcn placeholder token pair (see
	// w1-task-4-report.md). The background has changed since, so that exact
	// figure no longer applies, but the token pair it indicted has not been
	// re-measured either; inactive dims via opacity instead.
	<TabsPrimitive.List
		ref={ref}
		data-slot="tabs-list"
		className={cn(
			"inline-flex h-10 items-center justify-start gap-2 ",
			className,
		)}
		{...props}
	/>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Trigger>,
	React.ComponentProps<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		data-slot="tabs-trigger"
		className={cn(
			"inline-flex items-center justify-center whitespace-nowrap px-1.5 py-1 text-sm font-normal opacity-90",
			"outline-none transition-all",
			"cursor-pointer",
			"focus-visible:ring-ring/50 focus-visible:ring-[3px]",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:opacity-100 data-[state=active]:text-text data-[state=active]:font-medium",
			"data-[state=active]:border-b-2 data-[state=active]:border-primary",
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Content>,
	React.ComponentProps<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		data-slot="tabs-content"
		className={cn(
			"mt-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
			className,
		)}
		{...props}
	/>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
