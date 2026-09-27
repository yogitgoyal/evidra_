import type { CaseOverviewStartingPoint, CaseOverviewSuggestedNextStep } from "@/lib/api";
import { Card, SectionLabel } from "@/components/ui/primitives";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function StartingPointCard({
  startingPoint,
  suggestedNextStep,
}: {
  startingPoint?: CaseOverviewStartingPoint | null;
  suggestedNextStep?: CaseOverviewSuggestedNextStep | null;
}) {
  if (!startingPoint) return null;

  let details;
  if (startingPoint.mode === "entity") {
    details = (
      <>
        <p className="mt-2 text-sm text-text">
          {startingPoint.seed ? (
            <>
              {startingPoint.seed.type.replaceAll("_", " ")}: {" "}
              <span className="font-mono text-cyan">{startingPoint.seed.value}</span>
            </>
          ) : "No starting entity is saved."}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
          <span>{startingPoint.matching_record_count} matching records</span>
          <span>{startingPoint.first_hop_contact_count} first-hop contacts</span>
        </div>
      </>
    );
  } else if (startingPoint.mode === "evidence") {
    details = (
      <>
        {startingPoint.clue ? (
          <p className="mt-2 text-sm text-text">
            {startingPoint.clue.type.replaceAll("_", " ")}: {" "}
            <span className="font-mono text-cyan">{startingPoint.clue.value}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-dim">No clue was given for this legacy case.</p>
        )}
        <p className="mt-3 text-xs text-text-dim">
          {startingPoint.candidate_count} candidate{startingPoint.candidate_count === 1 ? "" : "s"} found
          {startingPoint.confirmed_candidate
            ? ` · Confirmed: ${startingPoint.confirmed_candidate.type.replaceAll("_", " ")} ${startingPoint.confirmed_candidate.value}`
            : startingPoint.state === "candidates_unconfirmed" ? " · None confirmed" : ""}
        </p>
      </>
    );
  } else {
    const location = startingPoint.location;
    const locationText = location?.label || (
      location?.latitude != null && location.longitude != null
        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
        : null
    );
    details = (
      <>
        <p className="mt-2 text-sm text-text">
          {startingPoint.window
            ? `${formatTimestamp(startingPoint.window.start)} – ${formatTimestamp(startingPoint.window.end)}`
            : "No time window is saved."}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
          <span>{locationText ? `Location: ${locationText}` : "No location specified"}</span>
          <span>
            {startingPoint.window
              ? `${startingPoint.record_count} record${startingPoint.record_count === 1 ? "" : "s"} inside the window`
              : "Record count unavailable without a time window"}
          </span>
        </div>
      </>
    );
  }

  return (
    <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5">
      <SectionLabel>Starting point</SectionLabel>
      {details}
      {suggestedNextStep?.text && (
        <p className="mt-4 border-t border-border-soft pt-3 text-xs text-text-dim">
          <span className="font-semibold text-text">Suggested next step:</span>{" "}
          {suggestedNextStep.text}
        </p>
      )}
    </Card>
  );
}