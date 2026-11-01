// The seeded Sample firms (C6.11, BR-20, stand-in SI-9): read once from samples/firms.json, an import file (STANDARDS §3.1).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { firmOf, type Firm } from "../../engine/runtime/team.ts";
import { STUDIO, type Actor } from "./core.ts";

export const FIRMS = (JSON.parse(readFileSync(join(STUDIO, "samples", "firms.json"), "utf8")) as { firms: Firm[] }).firms;
export const STAND_IN = { id: "SI-9", words: "Today: one Sample firm and one Sample solo firm, seeded. Later: the team's AG-01 firm setup and users, and AG-07's case team." } as const;
/** The firm a staff member works in (case people only; configuration people and clients have none). */
export const firmOfActor = (a: Actor) => firmOf(FIRMS, a.id);
export const firmByKey = (key: string) => FIRMS.find((f) => f.key === key) ?? null;
