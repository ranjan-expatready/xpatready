// BK-3 (P-447 (2), Bake plan row 3, PR 1 of 4): one frame around every screen. The set-up screens (Product Studio), the
// case screens (Cases), the client's own pages and the demo inbox share one header, one "where am I" line and one toast
// stack. The line names the place from the address; a page that knows more (a case's reference, a combination's levels)
// names it with useWhere. Every screen but an area's first page carries Back, one level up; staff also get the other
// area on the line at every width (qa baseline 11 Nov, dead ends 2 and 3: the Studio reached the cases only through the
// Demo menu, and the case area's way back to the Studio was hidden below 768 px).
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, X } from "lucide-react";
import { setActor, useToast } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Which part of the product a screen belongs to: it decides the header's words, the line's start and the other area. */
export type Area = "studio" | "cases" | "client" | "outside";
export type Crumb = { label: string; to?: string; place?: string; title?: string; className?: string };
/** back: where Back goes; undefined = the nearest crumb above this page that links somewhere; null = no Back (an area's first page). */
export type Where = { crumbs: Crumb[]; back?: { to: string; label: string } | null };

const WhereCtx = React.createContext<React.Dispatch<React.SetStateAction<Where | null>> | null>(null);

/** A page names its place more exactly than its address can. null (still loading) keeps the frame's own line. */
export function useWhere(crumbs: Crumb[] | null, back?: { to: string; label: string } | null) {
  const set = React.useContext(WhereCtx);
  const key = crumbs ? JSON.stringify({ crumbs, back }) : "";
  React.useLayoutEffect(() => {
    if (!set || !key) return;
    set(JSON.parse(key) as Where);
    return () => set(null);
  }, [set, key]);
}

const HOME = { to: "/", label: "Immigration programs" };
const LIBRARY: Record<string, string> = { fields: "Fields", sections: "Sections", documents: "Document types", forms: "Forms", checks: "Checks", rules: "Rules" };
const REVIEW_ITEM: Record<string, string> = { proposals: "Proposals", change: "Library change", batch: "Library items from one decision", merge: "Merge", held: "Held file", edition: "New edition", "form-fields": "Form fields" };
const CASE_PAGE: Record<string, string> = { questionnaire: "Client questionnaire", eligibility: "Eligibility", review: "Review", "representative-review": "Representative's review", sheet: "Answer sheet" };

/** The line from the address alone: every route of App.tsx and runtime/cases.tsx has its words here. */
export function whereFromAddress(area: Area, path: string): Where {
  const s = path.split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (area === "outside") return s[0] === "inbox" ? { crumbs: [{ label: "Demo inbox" }], back: { to: "/cases", label: "Cases" } } : { crumbs: [{ label: "Your questions" }], back: null };
  if (area === "client") {
    const mine = s[1] ? { to: `/cases/${s[1]}/questionnaire`, label: "Your questions" } : null;
    return s[2] === "questionnaire" || !mine ? { crumbs: [{ label: s[1] ? "Your questions" : "Your application" }], back: null } : { crumbs: [{ label: "Your questions", to: mine.to }, { label: CASE_PAGE[s[2]] ?? "Page" }], back: mine };
  }
  if (area === "cases") {
    if (!s[1]) return { crumbs: [{ label: "Cases" }], back: null };
    const c = { label: "Case", to: `/cases/${s[1]}` };
    if (!s[2]) return { crumbs: [{ label: "Cases", to: "/cases" }, { label: "Case" }] };
    return { crumbs: [{ label: "Cases", to: "/cases" }, c, { label: CASE_PAGE[s[2]] ?? "Page not found" }] };
  }
  const top = (label: string, group?: string): Where => ({ crumbs: [...(group ? [{ label: group }] : []), { label }], back: HOME });
  switch (s[0]) {
    case undefined: return { crumbs: [{ label: "Immigration programs" }], back: null };
    case "structure": return top("Program structure");
    case "release": return top("Review and release");
    case "releases": return top("Releases", "History");
    case "activity": return top("Activity", "History");
    case "review": return s[1] ? { crumbs: [{ label: "To review", to: "/review" }, { label: REVIEW_ITEM[s[1]] ?? "Page not found" }] } : top("To review");
    case "ai": return s[1] ? { crumbs: [{ label: "History" }, { label: "AI work", to: "/ai" }, { label: "AI run" }] } : top("AI work", "History");
    case "library":
      if (s[1] === "fields" && s[2]) return { crumbs: [{ label: "Shared library" }, { label: "Fields", to: "/library/fields" }, { label: s[2] }] };
      return LIBRARY[s[1]] ? top(LIBRARY[s[1]], "Shared library") : top("Page not found");
    case "c":
      if (s[2] === "jobs") return { crumbs: [{ label: "Immigration programs", to: "/" }, { label: "Combination", to: `/c/${s[1]}` }, { label: "AI work" }] };
      return { crumbs: [{ label: "Immigration programs", to: "/" }, { label: "Combination" }] };
    default: return top("Page not found");
  }
}

/** The one "where am I" line, a band across the top of the main column (frame chrome, so it does not follow each page's
 *  width): Back (one level up), the place, and for staff the other area. */
function WhereLine({ area, where, staff }: { area: Area; where: Where; staff: boolean }) {
  const { crumbs } = where;
  const above = [...crumbs.slice(0, -1)].reverse().find((c) => c.to);
  const back = where.back === null ? null : where.back ?? (above ? { to: above.to!, label: above.label } : null);
  const other = !staff ? null : area === "studio" ? { to: "/cases", label: "Cases", title: "The firm's cases: open one on a released combination" }
    : area === "cases" ? { to: "/", label: "Product Studio", title: "Set up and release the combinations firms open cases on" } : null;
  return (
    <div className="-mx-4 -mt-5 mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface-raised px-4 py-1.5 text-[13px] text-text-muted md:-mx-6 md:px-6" data-where={area}>
      {back ? <Link to={back.to} title={`Back to ${back.label}`} data-where-back className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md pr-1 font-medium text-text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-primary/40"><ArrowLeft className="size-3.5" aria-hidden />Back</Link> : null}
      {back ? <span className="h-4 w-px shrink-0 bg-border" aria-hidden /> : null}
      <nav aria-label="Path" className="flex min-w-0 flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${i}${c.label}`}>
              {i ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
              {c.to ? <Link to={c.to} title={c.title} data-place={c.place} className={cn("[overflow-wrap:anywhere] hover:underline", i === 0 && "font-medium text-text-link", c.className)}>{c.label}</Link>
                : <span data-place={c.place} aria-current={last ? "page" : undefined} className={cn("[overflow-wrap:anywhere]", last && "text-text", c.className)}>{c.label}</span>}
            </React.Fragment>
          );
        })}
      </nav>
      {other ? <Link to={other.to} title={other.title} data-where-area onClick={() => { if (area === "cases") setActor("user-A"); }} className="ml-auto inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap text-text-link hover:underline">{other.label}<ArrowRight className="size-3.5" aria-hidden /></Link> : null}
    </div>
  );
}

/** The frame: header (brand, the area's name, the area's controls), an optional band under it, an optional menu column,
 *  and the main column that starts with the "where am I" line. */
export function Frame({ area, title, subtitle, home, badge, controls, band, menu, staff = false, children }: {
  area: Area; title: string; subtitle?: string; home?: string; badge?: React.ReactNode; controls?: React.ReactNode; band?: React.ReactNode; menu?: React.ReactNode; staff?: boolean; children: React.ReactNode;
}) {
  const loc = useLocation();
  const [own, setOwn] = React.useState<Where | null>(null);
  const where = own ?? whereFromAddress(area, loc.pathname);
  const brand = <><img src="/brand/expat-ready-notagline-dark.svg" alt="Expat Ready" className="h-6 dark:hidden" /><img src="/brand/expat-ready-notagline.svg" alt="Expat Ready" className="hidden h-6 dark:block" /></>;
  return (
    <div className="flex min-h-full flex-col" data-frame={area}>
      <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-3 border-b border-border bg-surface-raised px-4">
        {/* Team BrandLogo convention: the "-dark" artwork is brand blue for light surfaces; the plain one is white. */}
        {home ? <Link to={home} className="flex shrink-0 items-center gap-3" aria-label={`${title} home`}>{brand}</Link> : <span className="flex shrink-0 items-center">{brand}</span>}
        <span className="hidden h-6 w-px bg-border sm:block" />
        <div className="hidden min-w-0 shrink-0 leading-tight sm:block"><p className="truncate text-sm font-semibold">{title}</p>{subtitle ? <p className="text-[11px] text-text-muted">{subtitle}</p> : null}</div>
        {badge}
        <div className="ml-auto flex min-w-0 items-center gap-2">{controls}</div>
      </header>
      {band}
      <div className="flex flex-1">
        {menu}
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
          <WhereCtx.Provider value={setOwn}>
            <WhereLine area={area} where={where} staff={staff} />
            {children}
          </WhereCtx.Provider>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

/** One toast stack for every screen (was one in each shell). */
function Toaster() {
  const t = useToast();
  return (
    <div data-toaster className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:left-auto sm:w-96" aria-live="polite">
      {t.list.map((x) => (
        <div key={x.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface-raised px-4 py-3 text-sm shadow-lg", x.tone === "ok" ? "border-l-ok" : x.tone === "danger" ? "border-l-danger" : "border-l-primary")}>
          <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{x.text}</p><button className="shrink-0 text-text-muted" aria-label="Dismiss" onClick={() => t.drop(x.id)}><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}
