// S3 Start setup (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct): the one way to begin a
// combination's setup, and what its landing offers for finding the forms. Every word a person reads about it is here.
import { z } from "zod";

/** POST /combinations/start: begin the setup of one last-level name (idempotent: a second call returns the same one). */
export const StartSetupBody = z.object({ nodeKey: z.string().trim().min(1, "Choose a category or sub-category to set up.") });
export type StartSetupResult = { created: boolean; combination: { id: string; label: string }; run: string | null; saved: boolean };

/** GET /combinations/:id/start-setup: the finder's newest run on this combination, and the one way to find its forms when
 *  there is none (M1, founder: wait for a click). Live needs the click; rules only is the fallback when AI cannot run. */
export type FinderOffer = {
  run: string | null;
  /** The newest run ended without attaching forms (no saved answer, stopped, failed): the offer shows again under it. */
  ended: boolean;
  offer: null | { mode: "live" | "rules"; planSha256: string; label: string; tip: string; why: string | null };
};

const usd = (n: number) => `US$${n.toFixed(2)}`;
export const START = {
  label: "Start setup",
  tip: (name: string) => `Creates the setup of "${name}" and opens it. Its forms and checklists come from canada.ca: a saved AI answer is loaded free; otherwise you choose to run AI, with its cost shown first. Once released and Live, new cases for ${name} use this setup. Where it sits is set on Program structure, not here.`,
  findLive: (about: number) => `Find forms with AI (about ${usd(about)})`,
  findLiveTip: (worst: number) => `AI reads the canada.ca application page and guide and lists the forms and checklists they ask for; a second AI round checks it. At most ${usd(worst)}. Nothing is spent until you click.`,
  rulesOnly: "Find form numbers by rules (free)",
  rulesTip: "Rules list every form number printed on the canada.ca pages, for you to attach by hand. Nothing is attached, because AI did not decide which apply.",
  overCap: (worst: number, left: number) => `AI can't run now: its worst case (${usd(worst)}) is above what is left of the AI spending cap (${usd(left)}). Rules only is free.`,
  title: "Find this combination's forms",
  body: "Its forms and checklists come from canada.ca into the Form library and attach here. Nothing was spent yet.",
  againTitle: "Find the forms again",
  againBody: "The last run attached no forms. Run it again, or attach forms from the Form library by hand.",
  saved: "A saved AI answer for this combination was loaded (US$0).",
} as const;
