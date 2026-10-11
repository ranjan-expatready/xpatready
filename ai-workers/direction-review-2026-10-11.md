# Direction review: are we on the right track?

*Written by the Lead for the founder, 11 Oct 2026. Plain words. Evidence is in the files named in brackets.*

## 1. The short answer

**The direction is right. The way we have been writing it down is not.**

What is right: we build the AI on top of the team's product, not beside it; a named licensed person approves everything that matters; the product's own rules keep the AI in its lane; client data stays in Canada; counsel reads it before real files are touched. Independent research says this is exactly how AI succeeds in regulated work, and that free-roaming "AI agents" fail (`research/ai-in-regulated-work-2026-10.md`).

What is wrong: we wrote far too much, in a language only reviewers enjoy. About 920,000 words for an AI layer that sits on a product described in 630,000. Every page is checked and cited, but a firm owner, a developer or an investor cannot pick it up and understand it in ten minutes. And nobody outside this room has seen any of it: no consultant, no counsel, no tested AI provider.

## 2. Where we are

| Step | What it means | Status |
|---|---|---|
| 0. Groundwork | Read everything the team wrote, the code and the competitors | Done |
| 1. The AI team | Who the AI colleagues are and what each does | Done |
| 2. How each behaves | Step by step, with worked examples | Done |
| 3. Build specification | What the team builds from: requirements, change notes, tests, prototype | Done, all checked |
| **R. Step back (now)** | **Simplify into one clear blueprint the whole company can read; prove it with real users** | **In progress** |
| 4. Build and pilot | The team builds; one firm uses it for a month | Not started |
| 5. Price and sell | Ten conversations with consultants; set the price | Drafts only |
| 6. Raise | Investor story | Not started |

**Achieved:** a complete, checked specification; your recorded decisions (AIW-D1 to D87); a counsel pack; a provider test script; a map showing that 184 of our 203 requirements build on the team's own and only 18 are truly new (`design/ai-carve-out-register-2026-10-11.md`); a competitor view showing we cover 10 of VisaFlo's 15 AI features on paper (`research/ai-coverage-vs-competitors-2026-10.md`).

**Not yet achieved:** a document a normal person can read; any customer feedback; a tested Canada AI provider; counsel's answers; anything running.

## 3. Right perspective, tools, frameworks, planning?

| Question | Verdict | Why |
|---|---|---|
| **Perspective** (AI on the team's platform, human approves, platform as guardrail) | **Right** | Matches what works in law and finance; matches the team's own product vision |
| **Architecture** (workflow with a few AI steps, not autonomous agents) | **Right** | Only 26 of 203 requirements actually call an AI model; the rest are rules and controls. That is the safe pattern |
| **Frameworks** (NIST risk framework, per-skill testing, shadow mode) | **Right, now complete** | Your driving-test rule (AIW-D83) closes the biggest gap the research found: people wave AI errors through unless checking is easy and measured |
| **Tools** (our files, review agents, local git) | **Right for drafting, wrong for sharing** | Good for rigour; bad for a team that lives in Drive and a founder who wants one clear picture. A coded prototype (AIW-D86) fixes the "show me" part |
| **Planning** | **Partly wrong** | We went deep on paper before testing with a single consultant or a single AI provider. Validation should run alongside, not after |
| **Writing style** | **Wrong** | Requirement IDs on every line, legal precision everywhere. It reads like an audit, not like a description of colleagues |

## 4. What "human terms" should look like

If we cannot describe an AI colleague the way you would describe a new hire, the product will not feel that way either. Every AI team member should have a one-page profile like this:

> **Meet the Case Officer's AI.**
> Works for: the case officer on each file, and only on that person's files.
> Good at: reading the client's documents and writing down the facts, with a pointer to where each fact came from; checking the file before review and flagging anything that does not match; drafting a polite reminder when a document is missing.
> Never does: sends anything to a client by itself; files anything with the government; changes a client record; gives an opinion on eligibility.
> How you supervise it: everything it prepares lands in your "Needs you" list. You open it, see the sources side by side, and approve, edit or reject. For several values at once, it makes you look at the uncertain ones first.
> When it is unsure: it says so and stops; it never guesses a date or a name.
> How you know it is doing well: a green light per skill; if its accuracy drops, that skill steps back to "practice mode" by itself.
> A day in its life: Monday 9:10, a passport arrives; 9:11, seven facts proposed with their sources; 9:40, you approve six and fix one; Thursday, the file check flags that the passport expires before the visa would; you decide what to do.

The same format, plain and concrete, then carries each skill, each journey, and what can go wrong. The technical detail stays, but in an appendix the developers use, linked to the team's requirement numbers.

## 5. Options

| | Option | How | Pros | Cons |
|---|---|---|---|---|
| **A** | Tidy what we have | Trim the existing documents, fix the 19 duplications, keep the structure | Least effort; nothing lost | Still huge and hard to read; does not answer your concern |
| **B** | One human-language blueprint | Write one "AI Team Handbook": profiles like section 4, journeys, what can go wrong, then a technical appendix and a traceability table generated from the register; archive the old design files as evidence | Readable by anyone; one source of truth; keeps the build detail in the appendix | Two to three sessions of writing; needs a careful check that nothing important drops out |
| **C** | Prototype first, then write | Build the coded prototype now, show it to three to five consultants, then write the blueprint around what they confirm | Real feedback early; something tangible to show | Builds screens before the structure and names are settled; risks rework |
| **D** | Hand it to the team now | Give the team AW-01, AW-02, the change notes and the tests as they are; Workstream 2 moves to test sets and the pilot | Fastest to code | The team gets hard-to-read documents with known duplications; confusion and wrong builds are likely |
| **E** | **Blueprint plus prototype plus real users, together** | Write the Handbook (B) and build the prototype (AIW-D86) in parallel from the same profiles; use the prototype in your first three consultant conversations; keep AW-01 and AW-02 as the trimmed technical appendix, not rewritten | Readable, validated and buildable at once; one source; the prototype and the words cannot drift because both come from the same profiles | More work in parallel; needs you for the conversations and the provider test this month |

## 6. Recommendation

**Option E.** It answers all three of your concerns at once: simple human language (the Handbook), proof that it works (the prototype in front of consultants), and no second source of truth (the Handbook is the front door; the existing specification becomes its appendix, trimmed, with every item traced to the team's requirements or marked NEW).

**What I need from you for E:** your answer on the names (question 6, from the research now running); one licensed reviewer to grade the AI's test sets; three consultant conversations once the prototype is ready; the tech lead running the Canada provider test this month.

**What we stop doing:** writing more requirement detail before a consultant has seen the prototype; review loops on wording; anything the team owns that is not AI.
