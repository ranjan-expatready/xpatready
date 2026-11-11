// BK-3 (P-447 (2)): the "where am I" line's words for every address, with no imports, so a code check
// (tests/check_bk3_frame.ts) can read every route of App.tsx and runtime/cases.tsx through it without a browser.

/** Which part of the product a screen belongs to: it decides the header's words, the line's start and the other area. */
export type Area = "studio" | "cases" | "client" | "outside";
export type Crumb = { label: string; to?: string; place?: string; title?: string; className?: string };
/** back: where Back goes; undefined = the nearest crumb above this page that links somewhere; null = no Back (an area's first page). */
export type Where = { crumbs: Crumb[]; back?: { to: string; label: string } | null };

const HOME = { to: "/", label: "Immigration programs" };
const LIBRARY: Record<string, string> = { fields: "Fields", sections: "Sections", documents: "Document types", forms: "Forms", checks: "Checks", rules: "Rules" };
const REVIEW_ITEM: Record<string, string> = { proposals: "Proposals", change: "Library change", batch: "Library items from one decision", merge: "Merge", held: "Held file", edition: "New edition", "form-fields": "Form fields" };
const CASE_PAGE: Record<string, string> = { questionnaire: "Client questionnaire", eligibility: "Eligibility", review: "Review", "representative-review": "Representative's review", sheet: "Answer sheet" };

/** The line from the address alone: every route of App.tsx and runtime/cases.tsx has its words here. */
export function whereFromAddress(area: Area, path: string): Where {
  const s = path.split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (area === "outside") return s[0] === "inbox" ? { crumbs: [{ label: "Demo inbox" }], back: { to: "/cases", label: "Cases" } } : { crumbs: [{ label: "Your questions" }], back: null };
  if (area === "client") {
    // The client's first page is their questionnaire (its heading says "Client questionnaire").
    const mine = s[1] ? { to: `/cases/${s[1]}/questionnaire`, label: "Client questionnaire" } : null;
    return s[2] === "questionnaire" || !mine ? { crumbs: [{ label: s[1] ? "Client questionnaire" : "Your application" }], back: null } : { crumbs: [{ label: mine.label, to: mine.to }, { label: s[2] ? CASE_PAGE[s[2]] ?? "No such page" : "Case" }], back: mine };
  }
  if (area === "cases") {
    if (!s[1]) return { crumbs: [{ label: "Cases" }], back: null };
    const c = { label: "Case", to: `/cases/${s[1]}` };
    if (!s[2]) return { crumbs: [{ label: "Cases", to: "/cases" }, { label: "Case" }] };
    return { crumbs: [{ label: "Cases", to: "/cases" }, c, { label: CASE_PAGE[s[2]] ?? "No such page" }] };
  }
  const top = (label: string, group?: string): Where => ({ crumbs: [...(group ? [{ label: group }] : []), { label }], back: HOME });
  switch (s[0]) {
    case undefined: return { crumbs: [{ label: "Immigration programs" }], back: null };
    case "structure": return top("Program structure");
    case "release": return top("Review and release");
    case "releases": return top("Releases", "History");
    case "activity": return top("Activity", "History");
    case "review": return s[1] ? { crumbs: [{ label: "To review", to: "/review" }, { label: REVIEW_ITEM[s[1]] ?? "No such page" }] } : top("To review");
    case "ai": return s[1] ? { crumbs: [{ label: "History" }, { label: "AI work", to: "/ai" }, { label: "AI run" }] } : top("AI work", "History");
    case "library":
      if (s[1] === "fields" && s[2]) return { crumbs: [{ label: "Shared library" }, { label: "Fields", to: "/library/fields" }, { label: "Field" }] }; // its name once the page has it (useWhere)
      return LIBRARY[s[1]] ? top(LIBRARY[s[1]], "Shared library") : top("No such page");
    case "c":
      if (s[2] === "jobs") return { crumbs: [{ label: "Immigration programs", to: "/" }, { label: "Combination", to: `/c/${s[1]}` }, { label: "AI work" }] };
      return { crumbs: [{ label: "Immigration programs", to: "/" }, { label: "Combination" }] };
    default: return top("No such page");
  }
}

/** Where Back goes: the page's own choice, else the nearest crumb above the page that links somewhere; null on an area's first page. */
export function backOf(w: Where): { to: string; label: string } | null {
  if (w.back !== undefined) return w.back;
  const above = [...w.crumbs.slice(0, -1)].reverse().find((c) => c.to);
  return above ? { to: above.to!, label: above.label } : null;
}
