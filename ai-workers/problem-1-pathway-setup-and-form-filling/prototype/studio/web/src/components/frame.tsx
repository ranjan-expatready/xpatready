// BK-3 (P-447 (2), Bake plan row 3, PR 1 of 4): one frame around every screen. The set-up screens (Product Studio), the
// case screens (Cases), the client's own pages and the demo inbox share one header, one "where am I" line and one toast
// stack. The line names the place from the address (the words are in where.ts); a page that knows more (a case's
// reference, a combination's levels) names it with useWhere. Every screen but an area's first page carries Back, one
// level up; staff also get the other area on the line at every width (qa baseline 11 Nov, dead ends 2 and 3: the Studio
// reached the cases only through the Demo menu, and the case area's way back to the Studio was hidden below 768 px).
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { getActor, setActor, useActorId, useToast } from "@/lib/api";
import { CASE_OFFICER, GROUP_WORDS, homeOf, isFirmStaff, isStudioPerson, PEOPLE, personOf, STUDIO_AUTHOR, type Group } from "@/lib/simulated-people";
import { cn } from "@/lib/utils";
import { backOf, whereFromAddress, type Area, type Crumb, type Where } from "./where";

export type { Area, Crumb, Where } from "./where";

/** BK-3 PR 2: leaving the case area as the Studio person ("Product Studio →", a case's release pill). The case area acts
 *  as the case officer whenever its person is not one of the case people, so without this it switched straight back
 *  before the page changed and the Studio opened as the case officer ("This page is for the configuration people"). */
let leavingCases = false;
export function leaveCasesAsStudio(e?: React.MouseEvent) {
  if (e && !plainClick(e)) return; // a new tab or window: this page stays
  leavingCases = true; setActor(STUDIO_AUTHOR);
}
/** BK-4a: "Cases (as Case officer) →" from the Studio acts as the case officer (it names the person, so it is the
 *  picker's, P-484 (4)); firm staff stay who they are. A new tab or window changes nobody. */
export function enterCasesAsStaff(e?: React.MouseEvent) { if ((!e || plainClick(e)) && !isFirmStaff(getActor())) setActor(CASE_OFFICER); }
/** A click that follows the link in this tab (not a new tab or window): only then may a link switch the simulated person. */
export const plainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
/** The case area asks this before acting as the case officer; arriving there again clears it. */
export function casesLeaving(arrived = false) { if (arrived) leavingCases = false; return leavingCases; }

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

/** The one "where am I" line, a band across the top of the main column (frame chrome, so it does not follow each page's
 *  width): Back (one level up), the place, and for staff the other area. */
function WhereLine({ area, where, staff }: { area: Area; where: Where; staff: boolean }) {
  const { crumbs } = where;
  const back = backOf(where);
  // BK-4a (concept §5): the link names who it acts as when it changes the person (P-484 (4): it counts as the picker).
  const me = useActorId();
  const other = !staff ? null : area === "studio" ? { to: "/cases", label: isFirmStaff(me) ? "Cases" : `Cases (as ${personOf(CASE_OFFICER)!.name})`, title: "The firm's cases: open one on a released combination" }
    : area === "cases" ? { to: "/", label: isStudioPerson(me) ? "Product Studio" : `Product Studio (as ${personOf(STUDIO_AUTHOR)!.name})`, title: "Set up and release the combinations firms open cases on" } : null;
  return (
    <div className="-mx-4 -mt-5 mb-5 flex items-center gap-x-3 border-b border-border bg-surface-raised px-4 py-1.5 text-sm text-text-muted md:-mx-6 md:px-6" data-where={area}>
      {/* The name says where Back goes ("Back: To review"); the menu is hidden below 768 px, so Back is the way out there. */}
      {back ? <Link to={back.to} aria-label={`Back: ${back.label}`} title={`Back to ${back.label}`} data-where-back className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md pr-1 font-medium text-text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-primary/40"><ArrowLeft className="size-3.5" aria-hidden />Back</Link> : null}
      {back ? <span className="h-4 w-px shrink-0 bg-border" aria-hidden /> : null}
      <nav aria-label="Path" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          // Each link is at least 24 px high, so a trail wrapped at phone width keeps WCAG 2.2's target size (2.5.8).
          return (
            <React.Fragment key={`${i}${c.label}`}>
              {i ? <span aria-hidden className="shrink-0">›</span> : null}
              {c.to ? <Link to={c.to} title={c.title} data-place={c.place} className={cn("inline-flex min-h-6 items-center [overflow-wrap:anywhere] hover:underline", i === 0 && "font-medium text-text-link", c.className)}>{c.label}</Link>
                : <span data-place={c.place} aria-current={last ? "page" : undefined} className={cn("[overflow-wrap:anywhere]", last && "text-text", c.className)}>{c.label}</span>}
            </React.Fragment>
          );
        })}
      </nav>
      {other ? <Link to={other.to} title={other.title} data-where-area onClick={(e) => { if (area === "cases") leaveCasesAsStudio(e); else enterCasesAsStaff(e); }} className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap text-text-link hover:underline">{other.label}<ArrowRight className="size-3.5" aria-hidden /></Link> : null}
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

/** BK-4a (concept §5, P-484): the one person picker, the same in every area. A native select (keyboard-complete; the
 *  browser checks pick a person with selectOption) in the team's three sign-in groups; its last option opens the sign-in
 *  page. Choosing someone who works in another area goes to their first page. */
export function PersonPicker({ area }: { area: "studio" | "cases" | "client" }) {
  const id = useActorId();
  const nav = useNavigate();
  const me = personOf(id);
  const groups: Group[] = ["staff", "firm", "client"];
  const pick = (next: string) => {
    if (next === "sign-in") { nav("/sign-in"); return; }
    setActor(next);
    const studioNow = area === "studio", studioNext = isStudioPerson(next);
    if (studioNow !== studioNext) nav(homeOf(next));
  };
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1" title="Simulated people for the prototype: no passwords, not part of the product" data-person-picker>
      <span className="hidden whitespace-nowrap text-[11px] text-text-muted lg:inline">Acting as</span>
      <select className="min-w-0 max-w-[11rem] truncate bg-transparent text-xs font-medium sm:max-w-[22rem]" value={me ? id : ""} onChange={(e) => pick(e.target.value)} aria-label="Simulated person">
        {me ? null : <option value="" disabled>Choose who you are</option>}
        {groups.map((g) => (
          <optgroup key={g} label={GROUP_WORDS[g]}>
            {PEOPLE.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
          </optgroup>
        ))}
        <option value="sign-in">Sign-in page…</option>
      </select>
      <span className="hidden rounded-md border border-border px-1.5 text-[11px] font-medium text-text-muted sm:inline" title={me ? `${me.role}. Duties: ${me.duties.join(", ")}` : undefined}>Simulated</span>
    </label>
  );
}

/** BK-4a BR-1: every change of person, by any route (sign-in, picker, hand-off, a frame link), is said once. Mounted once
 *  in App, outside the routes, so a change that also moves to another area is not lost with the old page. */
export function PersonNotice() {
  const id = useActorId();
  const toast = useToast();
  const last = React.useRef(id);
  React.useEffect(() => {
    if (last.current === id) return;
    last.current = id;
    const p = personOf(id);
    if (p) toast.push({ tone: "info", text: `Now: ${p.name} (simulated). ${p.job}.` });
  }, [id, toast]);
  return null;
}
