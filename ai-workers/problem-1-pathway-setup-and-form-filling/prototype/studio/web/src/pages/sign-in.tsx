// BK-4a (P-447 (2), P-456 (3), P-484; screens/BK-4-sign-in-hand-offs/concept.md §5): sign in once by picking a role.
// Simulated people, no passwords (scaffolding for the team's three sign-in pages, SA-07 §3.0; P-33). Four cards, the
// first person of each stage of the journey; the rest under "More people", in the team's three groups. A page, not a
// gate (P-484 (3)): it is where a walk starts; a stored person this workspace does not know is sent here (BR-6).
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { personChosen, setActor, useActorId, useApi } from "@/lib/api";
import { FIRST_FOUR, GROUP_WORDS, homeOf, PEOPLE, personOf, type Group, type Person } from "@/lib/simulated-people";
import { Frame } from "@/components/frame";
import { FoldOut } from "@/components/fold-out";
import { Notice, Pill } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function SignInPage() {
  const id = useActorId();
  const nav = useNavigate();
  const known = !!personOf(id);
  const current = personChosen() && known ? id : null;
  React.useEffect(() => { document.title = "Sign in · Expat Ready"; }, []);
  // BK-5 PR 2 (concept §9, challenge m4): a person with the author duty starts a walk on Demo › Starting points; everyone
  // else lands where they work (the Studio's programs, or the case list), never on doors they cannot open (BR-3). Break
  // m1 (PR 2): outside the demo workspace every door is off for the author too, so the author lands on the programs.
  const session = useApi<{ workspace?: { demo?: boolean } }>(["session", id], "/session");
  const demo = session.data?.workspace?.demo !== false; // as Starting points reads it (start.tsx BR-3)
  const choose = (p: Person) => { setActor(p.id); nav(demo && p.duties.includes("author") ? "/start" : homeOf(p.id)); };
  const four = FIRST_FOUR.map((x) => personOf(x)!);
  const more = PEOPLE.filter((p) => !FIRST_FOUR.includes(p.id as (typeof FIRST_FOUR)[number]));
  const groups: Group[] = ["staff", "firm", "client"];
  return (
    <Frame area="outside" title="Sign in" subtitle="Pathway Configurator" badge={<Pill tone="warn" className="ml-1 hidden lg:inline-flex" title="Working prototype on a local demo database: simulated people, no passwords, not production">Prototype · demo workspace</Pill>}>
      <div className="mx-auto max-w-5xl space-y-5" data-sign-in>
        <div>
          <h1 className="text-2xl font-semibold">Who are you today?</h1>
          <p className="mt-1 text-sm text-text-muted">Simulated people: no passwords. Pick a role; buttons carry you on when work changes hands.</p>
        </div>
        {personChosen() && !known ? /* break m3: only while the stored person is still unknown */ <div data-sign-in-unknown><Notice title="Choose who you are">The person this browser remembered is not in this workspace.</Notice></div> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {four.map((p) => <PersonCard key={p.id} p={p} current={current === p.id} onChoose={choose} />)}
        </div>
        <FoldOut summary={`More people (${more.length})`} summaryClassName="text-sm font-medium text-text-link" data-sign-in-more>
          <div className="mt-3 space-y-4">
            {groups.map((g) => {
              const ps = more.filter((p) => p.group === g);
              return ps.length ? (
                <section key={g} aria-label={GROUP_WORDS[g]}>
                  <h2 className="mb-2 text-xs font-medium text-text-muted">{GROUP_WORDS[g]}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ps.map((p) => <PersonCard key={p.id} p={p} current={current === p.id} onChoose={choose} />)}</div>
                </section>
              ) : null;
            })}
            <p className="text-xs text-text-muted">Clients usually arrive from their case: the case officer's "Hand to Client A (simulated)".</p>
          </div>
        </FoldOut>
      </div>
    </Frame>
  );
}

/** One person: the whole card is one button (no filled button on this page: nothing here is the one next step). */
function PersonCard({ p, current, onChoose }: { p: Person; current: boolean; onChoose: (p: Person) => void }) {
  return (
    <button type="button" onClick={() => onChoose(p)} data-sign-in-as={p.id}
      className={cn("flex min-h-24 flex-col items-start gap-1 rounded-xl border bg-surface-raised p-4 text-left outline-none hover:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/50", current ? "border-primary" : "border-border")}>
      {/* The name a screen reader says starts with the words on the card (WCAG 2.5.3, label in name). */}
      <span className="flex w-full items-center gap-2 font-medium"><span className="sr-only">Sign in as </span>{p.name}{current ? <><span className="sr-only"> (signed in now)</span><Check className="ml-auto size-4 text-text-link" aria-hidden /></> : null}</span>
      <span className="text-sm text-text-muted">{p.job}</span>
      <span className="mt-auto pt-1 text-[11px] text-text-muted">{GROUP_WORDS[p.group]} · Simulated</span>
    </button>
  );
}
