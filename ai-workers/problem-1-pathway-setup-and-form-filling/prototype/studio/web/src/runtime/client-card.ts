// QA-427 (P-498): where a case stands for the case page's Client questionnaire card, as one pure rule (tested by
// tests/check_qa427_client_card.ts). The card names the case's next step, never "Next: <client> answers" once the client
// owes nothing, and asks nothing of the client once every filing is submitted.

export type ClientCardState = "loading" | "failed" | "submitted" | "in-review" | "client-answers" | "confirm" | "approved" | "prepare";

export type ClientCardInput = {
  /** Any of the card's reads (the client's questionnaire, the prepare view, the review rounds) still loading / failed. */
  loading: boolean; failed: boolean;
  /** Required answers the client still owes in their own questionnaire (the officer's `mode=sqr` view). */
  owes: number;
  /** Answers given and not yet confirmed (the household line's "to confirm"). */
  toConfirm: number;
  /** The case's filings (prepare view) and every review round's rows, each naming its filing. */
  filings: { id: string; status: string }[];
  rounds: { number: number; filings: { filing: string; status: string }[] }[];
};

const isSubmitted = (f: { status: string }) => f.status.toLowerCase() === "submitted";

/** A filing's newest review row (the highest round that holds it), or null when it was never sent for review. */
export function latestReviewOf(filing: string, rounds: ClientCardInput["rounds"]): string | null {
  const holding = rounds.filter((r) => r.filings.some((f) => f.filing === filing)).sort((a, b) => b.number - a.number)[0];
  return holding?.filings.find((f) => f.filing === filing)?.status ?? null;
}

/** In order: the reads; submitted (every filing); a review row waiting; the client owes answers; answers to confirm
 *  (before "approved": a change after approval goes back to Confirm, review M1 b); every filing not yet submitted has its
 *  own newest review row approved (review M1 a: a filing never sent for review is not approved); else prepare and send. */
export function clientCardState(i: ClientCardInput): ClientCardState {
  if (i.loading) return "loading";
  if (i.failed) return "failed";
  if (i.filings.length > 0 && i.filings.every(isSubmitted)) return "submitted";
  if (i.rounds.some((r) => r.filings.some((f) => f.status === "sent" || f.status === "under_review"))) return "in-review";
  if (i.owes > 0) return "client-answers";
  if (i.toConfirm > 0) return "confirm";
  const open = i.filings.filter((f) => !isSubmitted(f));
  if (open.length > 0 && open.every((f) => latestReviewOf(f.id, i.rounds) === "approved")) return "approved";
  return "prepare";
}
