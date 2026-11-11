// BK-4a (P-447 (2), P-456 (3), P-484; screens/BK-4-sign-in-hand-offs/concept.md §3): the nine simulated people, in the
// team's three sign-in groups (SA-07 §3.0: Expat Ready staff, firm users, clients). One list for the sign-in page, the
// header's person picker and the case area. It mirrors api/src/core.ts ACTORS + RUNTIME_ACTORS (tests/check_bk4_people.ts
// fails when they differ); the server still decides every right from x-actor. Scaffolding for the team's sign-in pages
// (P-33): no passwords, Simulated on every screen. No imports, so the code check reads it without a browser.

export type Group = "staff" | "firm" | "client";
export type Person = { id: string; name: string; role: string; duties: readonly string[]; group: Group; job: string };

export const GROUP_WORDS: Record<Group, string> = { staff: "Expat Ready staff", firm: "Firm", client: "Clients" };

export const PEOPLE: readonly Person[] = [
  { id: "user-A", name: "Configuration author", role: "Super Admin · content publisher", duties: ["author", "review"], group: "staff", job: "Sets up and submits pathways" },
  { id: "user-C", name: "Content reviewer", role: "Content publisher · Immigration SME duty", duties: ["review", "sme"], group: "staff", job: "Signs the immigration content" },
  { id: "user-B", name: "Approver", role: "Content publisher · second person", duties: ["review", "approve"], group: "staff", job: "Releases what others prepared" },
  { id: "user-O", name: "Case officer", role: "Firm staff · case officer", duties: ["case"], group: "firm", job: "Opens cases and prepares forms" },
  { id: "user-R", name: "Representative", role: "Firm staff · representative · firm admin", duties: ["case", "represent", "firm_admin"], group: "firm", job: "Reviews filings before they are filed" },
  { id: "user-T", name: "Second representative", role: "Firm staff · representative", duties: ["case", "represent"], group: "firm", job: "Reviews filings on the cases they represent" },
  { id: "user-S", name: "Solo representative", role: "Solo firm · representative · case officer · firm admin", duties: ["case", "represent", "firm_admin"], group: "firm", job: "Runs a one-person firm's cases end to end" },
  { id: "user-P", name: "Client A", role: "Client · principal applicant", duties: ["answer"], group: "client", job: "Answers the questions on their application" },
  { id: "user-Q", name: "Client B", role: "Client · principal applicant", duties: ["answer"], group: "client", job: "Answers the questions on their application" },
];

/** The four on the sign-in page: the first person of each stage of the journey (concept §5). */
export const FIRST_FOUR = ["user-A", "user-B", "user-O", "user-R"] as const;
/** Who arrives in the case area by "Cases (as Case officer) →" and BR-8's button. */
export const CASE_OFFICER = "user-O";
/** Who leaves the case area by "Product Studio (as Configuration author) →" and the release pill. */
export const STUDIO_AUTHOR = "user-A";

export const personOf = (id: string) => PEOPLE.find((p) => p.id === id);
export const isStudioPerson = (id: string) => personOf(id)?.group === "staff";
export const isCasePerson = (id: string) => { const g = personOf(id)?.group; return g === "firm" || g === "client"; };
export const isFirmStaff = (id: string) => personOf(id)?.group === "firm";
export const isClientPerson = (id: string) => personOf(id)?.group === "client";
/** Where a person works first: the Studio's programs, or the case list (a client meets its notice there, concept Q3). */
export const homeOf = (id: string) => (isStudioPerson(id) ? "/" : "/cases");
