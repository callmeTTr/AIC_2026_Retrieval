import {
  Check,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";

import type { CandidateItem } from "./candidate.types";

import "./CandidateTray.css";

interface CandidateTrayProps {
  candidates: CandidateItem[];
  onRemoveCandidate: (
    candidateKey: string,
  ) => void;
  onClearCandidates: () => void;
  onSubmitCandidate: (
    candidate: CandidateItem,
  ) => void;
  onSendToTeam: (
    candidate: CandidateItem,
  ) => void;
  getTeamShareState: (
    candidate: CandidateItem,
  ) => "idle" | "sending" | "shared";
}
export function CandidateTray({
  candidates,
  onRemoveCandidate,
  onClearCandidates,
  onSubmitCandidate,
  onSendToTeam,
  getTeamShareState,
}: CandidateTrayProps) {
  if (candidates.length === 0) {
    return null;
  }

  const orderedCandidates = [
    ...candidates,
  ].reverse();

  return (
    <aside
      className="candidate-tray"
      aria-label="Selected candidates"
    >
      <header className="candidate-tray__header">
        <div>
          <span className="candidate-tray__eyebrow">
            Candidate selection
          </span>

          <h2>
            {candidates.length} selected
          </h2>
        </div>

        <button
          type="button"
          className="candidate-tray__clear"
          onClick={onClearCandidates}
        >
          <Trash2 size={16} />
          Clear all
        </button>
      </header>

      <div className="candidate-tray__list">
        {orderedCandidates.map(
          (candidate) => (
            <article
              key={candidate.key}
              className="candidate-tray__item"
            >
              <div className="candidate-tray__thumbnail">
                <img
                  src={
                    candidate.result
                      .thumbnail_url
                  }
                  alt={
                    `Candidate frame from ` +
                    candidate.result.video_id
                  }
                />

                <span>
                  #{candidate.result.rank}
                </span>
              </div>

              <div className="candidate-tray__content">
                <strong>
                  {candidate.result.video_id}
                </strong>

                <small>
                  Frame{" "}
                  {
                    candidate.result
                      .frame_index
                  }
                  {" · "}
                  {
                    candidate.result
                      .timestamp_display
                  }
                </small>

                <div className="candidate-tray__actions">
                  <button
                    type="button"
                    className="candidate-tray__submit"
                    onClick={() =>
                      onSubmitCandidate(
                        candidate,
                      )
                    }
                  >
                    <Send size={15} />
                    Submit
                  </button>
                  <button
                    type="button"
                    className={
                      getTeamShareState(
                        candidate,
                      ) === "shared"
                        ? "candidate-tray__team candidate-tray__team--shared"
                        : "candidate-tray__team"
                    }
                    disabled={
                      getTeamShareState(
                        candidate,
                      ) !== "idle"
                    }
                    title={
                      getTeamShareState(
                        candidate,
                      ) === "shared"
                        ? "Already shared to Team Room"
                        : "Share candidate to Team Room"
                    }
                    onClick={() =>
                      onSendToTeam(
                        candidate,
                      )
                    }
                  >
                    {getTeamShareState(
                      candidate,
                    ) === "shared" ? (
                      <>
                        <Check size={15} />
                        Shared
                      </>
                    ) : getTeamShareState(
                        candidate,
                      ) === "sending" ? (
                      <>
                        <Users size={15} />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Users size={15} />
                        Team
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="candidate-tray__remove"
                    aria-label={
                      `Remove ${candidate.result.video_id} ` +
                      "from candidates"
                    }
                    title="Remove candidate"
                    onClick={() =>
                      onRemoveCandidate(
                        candidate.key,
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </article>
          ),
        )}
      </div>
    </aside>
  );
}