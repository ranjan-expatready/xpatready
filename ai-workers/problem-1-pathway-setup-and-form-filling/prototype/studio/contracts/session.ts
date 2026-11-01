// C11.10 (P-115): a person's own view choices, kept on the server (PATCH /session/preferences; GET /session returns them).
import { z } from "zod";

export const PROGRAMS_VIEWS = ["cards", "list"] as const;
export type ProgramsView = (typeof PROGRAMS_VIEWS)[number];
export type Preferences = { programsView?: ProgramsView };

/** Only known choices; an unknown key or value is refused in words. */
export const PreferencesBody = z.object({
  programsView: z.enum(PROGRAMS_VIEWS, { message: "Choose Cards or List." }).optional(),
}).strict().refine((b) => Object.keys(b).length > 0, { message: "Say which view to keep: Cards or List." });
