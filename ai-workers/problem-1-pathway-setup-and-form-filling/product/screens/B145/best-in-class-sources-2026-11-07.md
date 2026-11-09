# B145 · C9.5 best-in-class sources (read 7 Nov 2026)

Primary sources only, each read on 7 Nov 2026 from the project's own published documentation on GitHub (raw files; vendor help centres and docs.camunda.org do not resolve from this cloud session, so Clio, Docketwise, INSZoom, Jira and TurboTax help pages were not opened and are not cited). Quotes are exact.

## 1. Camunda 8, process instance migration (open source docs, `camunda/camunda-docs`)
Job: move a running case (process instance) from the version it started on to a newer version of its definition, without losing its work.
* `docs/components/concepts/process-instance-migration.md`:
  * "Process instance migration fits a running process instance to a different process definition."
  * "we aim to interfere as little as possible with the process instance state during the migration. For example, a migrated active user task remains assigned to the same user"
  * "If any of the steps fail, the migration is rejected and a rejection message that explains the reason is returned."
  * "As a result, the process instance will not be migrated and remains in its current state."
  * "The migration runs in a **transactional** manner, meaning that it is migrating all active elements or nothing."
  * "Any existing variables, user tasks, and jobs continue to exist with the same values as previously assigned."
* `docs/components/operate/userguide/process-instance-migration.md`:
  * "select a specific process and version … This will be the source process version where instances are migrated from."
  * "Now, you can see a preview of how elements are mapped and how many process instances are expected to be migrated."
  * "In the footer, click **Confirm** to review your migration."

**Best at:** instances stay on their version until a person moves them; a preview before the move; all or nothing, refused with the reason named, the instance left as it was; work in progress keeps its owner and values.
**Weaker for us:** the preview is a technical element mapping for an engineer, not "what changes for this client" in money, documents and forms; no notion of signed or submitted work that must never change.

## 2. Renovate, Dependency Dashboard and changelogs (open source docs, `renovatebot/renovate`)
Job: tell a team that newer versions of what they depend on exist, show what changed, and let them adopt each one now or later.
* `docs/usage/key-concepts/dashboard.md`:
  * "Renovate has a Dependency Dashboard that shows an overview of the state of your repositories' dependencies."
  * "Having the Dependency Dashboard also enables the concept of an "approval" workflow for new upgrades"
  * "Sometimes you want Renovate to wait for your approval before creating an update PR."
* `docs/usage/key-concepts/changelogs.md`: "This page explains how Renovate fetches changelogs, when it can display them"; it detects them by "Checking for both "Releases" metadata in the repository and any commonly known "changelog" file names".

**Best at:** one place that says an update is waiting, with its change notes next to it; nothing is adopted without approval; "later" is a normal answer and the reminder stays.
**Weaker for us:** the change notes are the publisher's words for everyone, not the effect on this one project.

## 3. GOV.UK Design System, Check answers pattern (`alphagov/govuk-design-system`, `src/patterns/check-answers/index.md`)
Job: let a person see everything a commit will do before they commit it.
* "make sure the 'submit' button clearly shows the action it performs – for example, 'Change your tax details' or 'Send your claim form'"
* "Use the [Summary card component] … when users need to check multiple things of the same type."
* "If a user changes their response in a way that means you need to ask them more questions, do this before returning them to the check answers page."

**Best at:** the action button names what happens; grouped cards per item; new questions are asked as a consequence, not hidden.

## 4. The team's own design (requirements snapshot 2 Nov, read-only copy in `domain/requirements-2026-11-02/`)
* SA-1B-254 rule 2: "Computed by re-resolving the filing against the target, without writing. It shows: questions added or removed; documents added, removed or changed; forms added, removed or on a new edition; steps and deadlines; money values, old against new, with their dates."
* SA-1B-254 rule 7: "A move that cannot carry an answer is refused, with the reason named … The filing keeps working on its own version; nothing on it changes."
* SA-1B-253 rule 3: "One CRITICAL warning per changed item group, naming old value, new value and the date. For a money table it names the difference ("$1,840 more")."
* AG-7-56 rule 4: "**Use newer rules** needs `agent/pack:adopt`. It asks one reason, pre-filled "Adopting the current rules". It is audited."

## What C9.5 copies and where it beats them
* **Copied:** stay on the version until a person moves (Camunda, AG-7-56); preview before commit (Camunda, GOV.UK); all or nothing with the refusal named and nothing changed (Camunda, SA-1B-254 rule 7); an update waits with its notes and "later" is normal (Renovate); the button names the action (GOV.UK: "Move 3 filings to release 4").
* **Beaten:** the preview is per client, in money, documents, forms and questions with old and new values and who each touches, not a technical mapping or a publisher's changelog; finished work is sorted before the move into "will re-fill", "approval withdrawn" and "stays as signed / as filed", so the officer sees the cost in re-work before clicking; new questions the release adds land in Needs you as questions (GOV.UK's "ask them more questions" rule), never as a refusal.
