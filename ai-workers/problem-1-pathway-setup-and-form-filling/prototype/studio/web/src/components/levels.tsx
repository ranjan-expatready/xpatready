// The visual system's shared parts (W1-visual-system, founder 27 Oct; VS-1…VS-9): level marks, the Trail and the
// Pathway accent stripe, used by Program structure and Immigration programs (and S3–S7 from the start). Level colours
// come from styles/levels.css; status keeps its own chips (components/status.tsx).
import { Tip } from "@/components/status";
import { cn } from "@/lib/utils";

export type LevelName = "type" | "pathway" | "program" | "category" | "subCategory";
export const LEVEL_TEXT: Record<LevelName, string> = { type: "text-lv0", pathway: "text-lv1", program: "text-lv2", category: "text-lv3", subCategory: "text-lv3" };
export const LEVEL_TIP: Record<LevelName, string> = {
  type: "Pathway type: who applies, a person and their family (Retail) or an employer.",
  pathway: "Pathway: the outcome the application leads to, such as temporary or permanent residence.",
  program: "Program: a group of related applications, such as Work permits.",
  category: "Category: one kind of application; it is the combination when it has no sub-categories.",
  subCategory: "Sub-category: a variant of the category that IRCC files as its own application; it is the combination.",
};
const WORD: Record<LevelName, string> = { type: "Pathway type", pathway: "Pathway", program: "Program", category: "Category", subCategory: "Sub-category" };

/** ■ Pathway · ● Program · ◆ Category · ◇ Sub-category (VS-1): the shape and its word carry the meaning. */
export function LevelMark({ level, tip = true, className }: { level: LevelName; tip?: boolean; className?: string }) {
  const shape = (
    <svg viewBox="0 0 10 10" className={cn("inline-block size-2.5 shrink-0", LEVEL_TEXT[level], className)} aria-hidden data-level-mark={level}>
      {level === "pathway" ? <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
        : level === "program" ? <circle cx="5" cy="5" r="4" fill="currentColor" />
        : level === "category" ? <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill="currentColor" />
        : level === "subCategory" ? <path d="M5 1.2 8.8 5 5 8.8 1.2 5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        : <rect x="1" y="3.5" width="8" height="3" rx="1" fill="currentColor" />}
    </svg>
  );
  if (!tip) return shape;
  return <Tip tip={LEVEL_TIP[level]}><span className="inline-flex items-center" role="img" aria-label={WORD[level]}>{shape}</span></Tip>;
}

/** The Pathway accent stripe (VS-9): one of four Sample accents by the Pathway's place in its tab. */
export const pathwayAccent = (index: number) => `var(--pw-accent-${(Math.max(0, index) % 4) + 1})`;

/** One Trail wherever a combination is named (VS-3): the context in level colours, the identity (Category ›
 *  Sub-category) navy and kept together, wrapping whole onto a second line, never cut. parts: Pathway type ›
 *  Pathway › Program › Category › Sub-category ("No sub-category" shown muted). */
export function Trail({ parts, from = 0, identityClass, className, sep = "›" }: { parts: string[]; from?: number; identityClass?: string; className?: string; sep?: string }) {
  const levels: LevelName[] = ["type", "pathway", "program", "category", "subCategory"];
  const shown = parts.map((p, i) => ({ p, level: levels[i] })).slice(from);
  const context = shown.filter((x) => x.level !== "category" && x.level !== "subCategory");
  const identity = shown.filter((x) => x.level === "category" || x.level === "subCategory");
  const S = () => <span className="text-text-muted" aria-hidden> {sep} </span>;
  return (
    <span className={cn("[overflow-wrap:anywhere]", className)} data-trail-parts={shown.length}>
      {context.map((x, i) => <span key={i}>{i ? <S /> : null}<span className={LEVEL_TEXT[x.level]}>{x.p}</span></span>)}
      {identity.length ? <>{context.length ? <S /> : null}<span className={cn("inline-block max-w-full", identityClass)} data-trail-identity>
        {identity.map((x, i) => <span key={i}>{i ? <S /> : null}<span className={x.p === "No sub-category" ? "font-normal text-text-muted" : cn(LEVEL_TEXT[x.level], x.level === "category" ? "font-semibold" : "font-medium")}>{x.p}</span></span>)}
      </span></> : null}
    </span>
  );
}
