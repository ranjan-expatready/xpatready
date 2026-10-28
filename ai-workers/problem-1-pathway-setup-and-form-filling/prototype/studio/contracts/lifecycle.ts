// The one lifecycle word set (PRODUCT §4; P-116 amended 28 Oct, screens/W1-lifecycle-pattern/) and its standard
// messages, shared by the one guard (api/src/lifecycle.ts) and the page components (web/src/components/lifecycle/).
// Every word a person reads about deleting, retiring, restoring or withdrawing comes from here, so the pattern can
// change its wording in one place. No rule codes on screen.
export type LifecycleWord = "DELETE" | "RETIRE" | "RESTORE" | "WITHDRAW";

/** The row action's written word. */
export const ACTION_LABEL: Record<LifecycleWord, string> = { DELETE: "Delete", RETIRE: "Retire", RESTORE: "Restore", WITHDRAW: "Withdraw" };
/** The state a waiting change puts on its row. */
export const WAITING_LABEL: Record<Exclude<LifecycleWord, "WITHDRAW">, string> = { DELETE: "Deletion waiting", RETIRE: "Retire waiting", RESTORE: "Restore waiting" };

const q = (s: string) => `"${s}"`;
const list = (names: string[]) => (names.length <= 2 ? names.map(q).join(" and ") : `${names.slice(0, 2).map(q).join(", ")} and ${names.length - 2} more`);

/** Why an action cannot be taken: one full sentence each, shown as visible text under the greyed action. */
export const WHY = {
  waiting: "A change to it is waiting for a second person.",
  waitingCombination: "A change to its combination is waiting for a second person.",
  released: "Can't delete: released items are kept. Retire it instead.",
  retiredNoDelete: "Can't delete: it is retired.",
  ownSetup: "Can't delete: its setup draft uses it.",
  setupUnder: (name: string) => `Can't delete: ${q(name)} under it has a setup draft.`,
  waitingUnder: (name: string) => `Can't delete: a change to ${q(name)} under it is waiting for a second person.`,
  retiredUnder: (name: string) => `Can't delete: ${q(name)} under it is retired.`,
  hasCases: "Can't delete: cases were opened on it. Retire it instead.",
  alreadyRetired: "It is already retired.",
  neverReleased: "It was never released: delete it instead.",
  /** What blocks a Retire, with the way out for each (QA-55): released names still in use are retired first; names
   *  never released are deleted first (only the top of each unused branch is named: its Delete takes the rest); a
   *  setup draft is released or discarded first. */
  stillUsed: (inUse: string[], unused: string[] = [], drafts: string[] = []) => `Can't retire yet: ${[
    inUse.length ? `${list(inUse)} under it ${inUse.length === 1 ? "is" : "are"} still in use: retire ${inUse.length === 1 ? "it" : "those"} first` : "",
    drafts.length ? `${list(drafts)} under it ${drafts.length === 1 ? "has a setup draft" : "have setup drafts"}: release or discard ${drafts.length === 1 ? "it" : "them"} first` : "",
    unused.length ? `${list(unused)} under it ${unused.length === 1 ? "was" : "were"} never released: delete ${unused.length === 1 ? "it" : "those"} first` : "",
  ].filter(Boolean).join("; ")}. Open cases and earlier releases keep everything either way.`,
  notRetired: "It is not retired.",
  parentRetired: (name: string) => `Can't restore yet: ${q(name)} above it is retired. Restore it first.`,
  author: "Only a configuration author deletes, retires or restores names. You can read everything.",
} as const;

/** What an action does, for its tooltip (the visible words are ACTION_LABEL and the reason). */
export const TIP = {
  DELETE: (under: number, immediate: boolean) => `${under ? `Deletes it and the ${under} ${under === 1 ? "name" : "names"} under it; nothing uses them.` : "Nothing uses it."} ${immediate ? "Your own draft: it is deleted now, with Undo." : "A second person approves the deletion on To review."}`,
  RETIRE: (withCombination: boolean) => `Released, so it is kept: Retire hides it from pickers and new setups; open cases and earlier releases keep it.${withCombination ? " Its combination is retired with it." : ""}`,
  RESTORE: "Brings it back to pickers and new setups with the next release; a second person approves.",
  WITHDRAW: (name: string) => `Takes back your waiting change; ${q(name)} stays as it is.`,
  edit: (leaf: boolean, canEdit: boolean) => !canEdit ? "See the name, where it is used and its history. Only a configuration author changes it." : leaf ? "Rename it, set where cases may be opened, reorder it, see where it is used and its history." : "Rename, reorder, see where it is used and its history.",
} as const;

/** The approval re-check, said before the click (ReviewCard) and when it refuses. */
export const RECHECK = {
  clear: "Checked again just now: nothing new uses it.",
  added: (name: string) => `Changed since it was proposed: ${q(name)} was added under it.`,
  used: (why: string) => `Changed since it was proposed: ${why.replace(/^Can't [a-z]+( yet)?: /, "").replace(/^./, (c) => c.toLowerCase())}`,
  gone: "It was deleted meanwhile: return this change.",
} as const;

/** What a confirm (ImpactPanel), a page note and the Undo toast say. */
export const SAY = {
  confirmTitle: (kind: LifecycleWord, name: string, under: number) => kind === "DELETE" ? `Delete ${q(name)}${under ? " and everything under it" : ""}?` : kind === "WITHDRAW" ? `Withdraw the waiting change to ${q(name)}?` : `${ACTION_LABEL[kind]} ${q(name)}?`,
  deleteNothingUses: "It was never released and nothing uses it.",
  deleteGoesWith: "These go with it; none is used:",
  ownDraft: "It is your own draft: nothing approved, released or used. It is deleted now; Undo brings it back.",
  retireBody: "It disappears from pickers and AI suggestions for new setups. Open cases and earlier releases keep it. You can restore it.",
  restoreBody: "It comes back to pickers and AI suggestions with the next release. Nothing that uses it today changes.",
  withdrawBody: "Nothing changes: the request leaves To review.",
  withCombination: (kind: "RETIRE" | "RESTORE") => `Its combination is ${kind === "RETIRE" ? "retired" : "restored"} with it, in the same approval.`,
  approves: "A second person, on To review",
  takesEffect: (kind: LifecycleWord) => (kind === "DELETE" ? "When it is approved" : "With the next release"),
  sent: (kind: Exclude<LifecycleWord, "WITHDRAW">, name: string) => `Sent for approval: ${ACTION_LABEL[kind]} ${q(name)}.`,
  deletedNow: (name: string, under: number) => `Deleted ${q(name)}${under ? ` and the ${under} ${under === 1 ? "name" : "names"} under it` : ""}.`,
  withdrawn: (name: string) => `Withdrawn: ${q(name)} stays as it was.`,
  undone: "Undone at once.",
  undoneDelete: (name: string) => `Undone: ${q(name)} is back.`,
  approvedDeleted: (name: string) => `${q(name)} approved and deleted. The History line stays.`,
  approvedWaits: (kind: LifecycleWord, name: string) => `${ACTION_LABEL[kind]} ${q(name)} approved: it takes effect with the next release.`,
  approvedNow: (name: string) => `${q(name)} approved: it is released with the next release.`,
  returned: (name: string, to: string | null) => `${q(name)} returned to ${to ?? "its author"}.`,
} as const;
