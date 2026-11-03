/** QA-39, QA-71: a field's name in words from its key ("person.family_name" → "Family name"); the key itself stays under
 *  Details (UX-A part 4). One copy for the library pages and the condition editor. */
const ABBREVIATIONS = new Set(["dli", "eta", "id", "ircc", "lmia", "noc", "pgwp", "pr", "sin", "uci"]);
export const fieldName = (key: string) => { const w = (key.split(".").pop() ?? key).split("_").map((x) => ABBREVIATIONS.has(x) ? x.toUpperCase() : x).join(" "); return w.charAt(0).toUpperCase() + w.slice(1); };
