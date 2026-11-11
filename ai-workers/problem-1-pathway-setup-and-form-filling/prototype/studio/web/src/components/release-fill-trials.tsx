// BK-11 (P-448, P-460): where a combination's released versions are listed (Review tab), each version says which of
// its forms have a passed fill trial, as frozen at release (contracts/release-fill-trials.ts). Names no form (P-319).
import { Pill } from "@/components/ui/controls";
import { fmtDate } from "@/components/status";
import { FoldOut } from "@/components/fold-out";
import { FILL_TRIAL_WORDS, fillTrialCount, type ReleaseFillTrial } from "../../../contracts/release-fill-trials";

export function ReleaseFillTrials({ trials }: { trials: ReleaseFillTrial[] | null | undefined }) {
  if (!Array.isArray(trials)) return <span className="text-xs text-text-muted" data-fill-trials="not-recorded">{FILL_TRIAL_WORDS.not_recorded}</span>;
  return (
    <FoldOut data-fill-trials summaryClassName="text-xs" summary={fillTrialCount(trials)}>
      <p className="mt-1 text-xs text-text-muted">{FILL_TRIAL_WORDS.as_at_release}</p>
      <ul className="mt-1 space-y-1 text-xs">
        {trials.map((t) => (
          <li key={t.form} data-fill-trial={t.form} data-fill-trial-status={t.status}>
            <span className="mono font-medium">{t.form}</span>{t.title ? <span className="text-text-muted"> {t.title}</span> : null}{" "}
            {t.status === "passed"
              ? <><Pill tone="ok">{FILL_TRIAL_WORDS.passed}</Pill> <span className="text-text-muted">{t.edition ? `${t.edition} · ` : ""}{t.recorded_on ? fmtDate(t.recorded_on) : ""}{t.evidence ? <> · <span className="underline decoration-dotted" tabIndex={0} title={t.evidence} aria-label={`${FILL_TRIAL_WORDS.evidence}: ${t.evidence}`} data-fill-trial-evidence={t.evidence}>{FILL_TRIAL_WORDS.evidence}</span></> : null}</span></>
              : <><Pill tone={t.reason === "filed_online" ? "neutral" : "warn"}>{t.reason === "filed_online" ? FILL_TRIAL_WORDS.filed_online : FILL_TRIAL_WORDS.not_yet}</Pill> <span className="text-text-muted">{t.why}</span></>}
          </li>
        ))}
      </ul>
    </FoldOut>
  );
}
