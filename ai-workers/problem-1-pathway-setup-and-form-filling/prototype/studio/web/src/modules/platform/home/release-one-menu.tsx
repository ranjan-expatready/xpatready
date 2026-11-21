// DEMO-LINK (the founder could not reach the Release 1 screens from http://localhost:4400/): the staff Home's plain list
// of links to every Release 1 screen on main, plus the way back to the Product Studio and to Sign in. Shown whether or
// not someone is signed in (PlatformFrame's `intro`), so the list is the first thing a visitor sees here. Only addresses
// that exist (modules/*/routes.tsx and App.tsx's own routes; tests/check_demo_link.ts checks each against them). The
// public booking page names the Sample firm's key (samples/firms.json, Sample).
import { Link } from "react-router-dom";

export type MenuLink = { label: string; to: string; hint?: string };
export const RELEASE_ONE_MENU: { heading: string; links: MenuLink[] }[] = [
  { heading: "Front office", links: [
    { label: "Leads", to: "/front-office/leads" },
    { label: "Prospects (pipeline)", to: "/front-office/pipeline" },
    { label: "Bookings calendar", to: "/front-office/bookings" },
    { label: "Public booking page", to: "/book/sample-firm", hint: "what a visitor sees, for the Sample firm" },
  ] },
  { heading: "Clients and cases", links: [
    { label: "Clients", to: "/clients" },
    { label: "Cases", to: "/cases" },
  ] },
  { heading: "Firm settings", links: [
    { label: "Team", to: "/platform/team" },
    { label: "Licences", to: "/platform/licences" },
    { label: "Security", to: "/platform/security" },
    { label: "Terms", to: "/platform/terms" },
    { label: "Complaints", to: "/platform/complaints" },
    { label: "Web form", to: "/front-office/settings/web-form" },
  ] },
  { heading: "Your account", links: [
    { label: "Profile", to: "/account" },
    { label: "Availability", to: "/account/availability" },
  ] },
  { heading: "Elsewhere", links: [
    { label: "Product Studio", to: "/", hint: "programs, forms and rules" },
    { label: "Sign in", to: "/sign-in", hint: "pick a simulated person" },
    { label: "Pricing", to: "/pricing" },
  ] },
];

/** Every address the menu links to (the route check reads it). */
export const menuPaths = () => RELEASE_ONE_MENU.flatMap((g) => g.links.map((l) => l.to));

export function ReleaseOneMenu() {
  return (
    <nav aria-labelledby="release-one-h" className="mx-auto mb-6 max-w-3xl rounded-xl border border-border bg-surface-raised p-4" data-release-one-menu>
      <h2 id="release-one-h" className="text-base font-semibold">Release 1 screens</h2>
      <p className="mt-0.5 text-sm text-text-muted">Open any screen. Staff screens ask you to sign in to your firm first.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RELEASE_ONE_MENU.map((g) => (
          <div key={g.heading}>
            <h3 className="text-xs font-medium text-text-muted">{g.heading}</h3>
            <ul className="mt-1 flex flex-col gap-0.5">
              {g.links.map((l) => (
                <li key={l.to} className="text-sm">
                  <Link to={l.to} className="text-text-link underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{l.label}</Link>
                  {l.hint ? <span className="text-text-muted"> · {l.hint}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
