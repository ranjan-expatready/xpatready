// W1-03/04/05 (Structure, Immigration programs, New combination) contract, slice 1: the Structure endpoints and the
// lifecycle of structure names and combinations (concept §9, §10b; P-112, P-115, P-116; addendum A1–A5). Shared by the
// API and the web app; requests are parsed with these schemas on the server and errors are RFC 9457 Problem Details.
import { z } from "zod";
import { cleanLabel, labelProblem, PATHWAYS } from "./programs.ts";

/** The Pathway type is a fixed value, never a row (concept §3, Lead decision Option 1): the top tab of both pages.
 *  The stored values keep the team's client types; the words are P-104's. */
export const PATHWAY_TYPES = PATHWAYS;
export type PathwayType = (typeof PATHWAY_TYPES)[number];
export const PATHWAY_TYPE_LABEL: Record<PathwayType, string> = { INDIVIDUAL: "Retail", CORPORATE: "Corporate and employers" };

/** The four stored levels under the type, with the team's ProgramNodeKind (STREAM = Category, CATEGORY = Sub-category,
 *  PRODUCT §4). */
export const LEVELS = ["pathway", "program", "category", "subCategory"] as const;
export type Level = (typeof LEVELS)[number];
export const KIND_OF: Record<Level, "PATHWAY" | "PROGRAM" | "STREAM" | "CATEGORY"> = { pathway: "PATHWAY", program: "PROGRAM", category: "STREAM", subCategory: "CATEGORY" };
export const LEVEL_OF: Record<string, Level> = { PATHWAY: "pathway", PROGRAM: "program", STREAM: "category", CATEGORY: "subCategory" };
export const LEVEL_WORD: Record<Level, string> = { pathway: "Pathway", program: "Program", category: "Category", subCategory: "Sub-category" };
export const PARENT_LEVEL: Record<Level, Level | null> = { pathway: null, program: "pathway", category: "program", subCategory: "category" };

export const LOCATIONS = ["inside_canada", "outside_canada"] as const;
const locations = z.array(z.enum(LOCATIONS)).min(1, "Choose where a case for it may be opened: inside Canada, outside Canada, or both.").transform((l) => [...new Set(l)]);
const label = z.string().transform(cleanLabel).superRefine((s, ctx) => { const m = labelProblem(s); if (m) ctx.addIssue({ code: "custom", message: m }); });
/** Keys the server makes are the parent's key + "." + a slug of up to 60 characters, so four levels reach about 250 (break M2, 27 Oct). */
const key = z.string().trim().min(1).max(400);

/** GET /structure?pathwayType= */
export const StructureQuery = z.object({ pathwayType: z.enum(PATHWAY_TYPES).default("INDIVIDUAL"), retired: z.enum(["0", "1"]).default("1") });

/** POST /structure/name-check: the free "did you mean" check, as you type (BR-4, BR-5; US$0). */
export const NameCheckBody = z.object({ pathwayType: z.enum(PATHWAY_TYPES), level: z.enum(LEVELS), parentKey: key.nullable().default(null), label });

/** POST /structure/nodes: the one way a new name enters the Structure (BR-3). decision "new" is refused while close
 *  names exist (they are returned to show); "add_anyway" adds it and records that in Activity (BR-5: warn, never block). */
export const CreateStructureNodeBody = z.object({
  pathwayType: z.enum(PATHWAY_TYPES),
  level: z.enum(LEVELS, { message: "Choose the level: pathway, program, category or sub-category." }),
  parentKey: key.nullable().default(null),
  label,
  allowedLocations: locations.optional(),
  decision: z.enum(["new", "add_anyway"]).default("new"),
});
export type CreateStructureNodeBody = z.infer<typeof CreateStructureNodeBody>;

/** POST /structure/path (P-127, AD-1…7): the one "Add to Program structure" dialog. Each level is an existing name ({ key })
 *  or a new one ({ label }); the path may stop at any level (a Pathway or a Program alone); under a new name every level
 *  is new. One transaction writes only the new parts, all or nothing, and starts no setup (the leaf is listed as Not
 *  started). subCategory null = "None: the category is the combination". decision "new" is refused while close names
 *  exist; "add_anyway" adds them and records that in Activity (BR-5). */
const pick = z.union([z.object({ key }).strict(), z.object({ label }).strict()]);
export const StructurePathBody = z.object({
  pathwayType: z.enum(PATHWAY_TYPES, { message: "Choose the Pathway type: Retail or Corporate and employers." }),
  pathway: pick,
  program: pick.optional(),
  category: pick.optional(),
  subCategory: pick.nullable().optional(),
  allowedLocations: locations.optional(),
  decision: z.enum(["new", "add_anyway"]).default("new"),
});
export type StructurePathBody = z.infer<typeof StructurePathBody>;
export type StructurePathResult = { created: { level: Level; key: string; label: string }[]; leaf: { level: Level; key: string }; trail: string[]; combination: "Not started" | null };

/** PATCH /structure/nodes/:key: rename and/or where cases may be opened, against the version the person saw. */
export const PatchStructureNodeBody = z.object({
  label: label.optional(),
  allowedLocations: locations.optional(),
  version: z.number().int().min(1, "Send the version you edited."),
  decision: z.enum(["new", "add_anyway"]).default("new"),
}).refine((b) => b.label !== undefined || b.allowedLocations !== undefined, { message: "Change the name or where cases may be opened.", path: ["label"] });

/** POST /structure/reorder: the new order of one parent's children (P-116; applies at once with an audit line, Lead
 *  decision 26 Oct: display order is not release content). For the top level, parentKey is null and pathwayType says
 *  which tab. */
export const ReorderBody = z.object({ pathwayType: z.enum(PATHWAY_TYPES), parentKey: key.nullable().default(null), keys: z.array(key).min(1).max(200) });

/** POST …/retire, …/restore, DELETE …: a draft change a different person approves (P-52 L4). */
export const LifecycleBody = z.object({ reason: z.string().trim().min(3, "Say why, so the second person can check it (3 to 300 characters).").max(300, "Keep the reason under 300 characters.") });

export type LifecycleAction = "DELETE" | "RETIRE" | "RESTORE";
/** One use of a name or a combination, with where to see it (P-52 L3: each use with a link). */
export type Use = { kind: "combination" | "release" | "case" | "child" | "draft_change" | "form_field" | "placement"; label: string; href: string | null; blocks: boolean; why: string;
  /** S4 round 5: this use blocks Delete but not Retire (a combination reads the form's file as a source; it keeps it). */ retireOk?: boolean };
/** GET …/uses: everything that uses it, and what may be done now with the reason when it may not. */
export type UsesView = {
  key: string; label: string; trail: string[]; retired: boolean; released: boolean;
  uses: Use[];
  can: { delete: string | null; retire: string | null; restore: string | null };
  /** A combination row: its own combination is retired or restored with the name, in one approval (P-128, Lead 28 Oct). */
  withCombination?: boolean;
  /** C11.9: the author's own never-released, unused draft: a delete takes effect at once, with Undo (P-116 amended). */
  immediate?: boolean;
  pending: { id: string; action: LifecycleAction; by: string | null } | null;
  /** Its Activity lines, newest first (added, renamed, reordered, proposed, removed …). */
  history: { at: string; by: string | null; what: string }[];
};

/** GET /structure node. */
export type StructureNode = {
  key: string; level: Level; parentKey: string | null; label: string; pathwayType: PathwayType;
  allowedLocations: string[]; order: number; combinations: number; live: number; hasSetup: boolean;
  /** Combinations below it that need work ("Needs work", P-49): the "need you" count on a Pathway card. */
  needs: number;
  meaningChecked: boolean; version: number; retired: boolean;
  /** An open change to it (QA-59): waiting, returned (with who and why) or approved and not yet released. */
  pending: { id: string; action: LifecycleAction; status: "WAITING" | "RETURNED" | "APPROVED"; by: string | null; note: string | null;
    /** The person asking proposed it: only they withdraw it or send it again (DV-bb-9, N7 break B1). */
    mine: boolean; proposer: string } | null;
  /** A last-level name is a combination (BR-2): its state, Not started when it has no setup yet (id null). */
  combination: { id: string | null; status: "IN_SETUP" | "NOT_READY" | "READY"; statusText: string; retired: boolean;
    /** Not started: why Start setup cannot run here (S3 M3), null when it can. */
    startWhy?: string | null;
    /** "Used by" on its line (P-127 (1)): releases that hold it and cases open on it. */
    releases: number; openCases: number } | null;
  /** The row's one lifecycle action (P-128 R3-2), decided by the server: why it cannot (null = it can), the names that go
   *  with a Delete (R3-4), and whether a combination row's own combination goes with a Retire or Restore. */
  action: RowAction;
};
export type RowAction = { kind: LifecycleAction | "WITHDRAW"; why: string | null; below: string[]; withCombination: boolean;
  /** The author's own never-approved draft: deleted at once, with Undo (P-116 amended 28 Oct). */
  immediate: boolean };

