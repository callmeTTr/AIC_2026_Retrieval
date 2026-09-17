import { useEffect, useState } from "react";

import { CandidateTray } from "../candidates/CandidateTray";
import { useCandidateSelection } from "../candidates/useCandidateSelection";
import { FrameLightbox } from "../frame-viewer/FrameLightbox";
import { NeighborFrameViewer } from "../neighbors/NeighborFrameViewer";
import { RefinementModal } from "../refinement/RefinementModal";
import type { RefinementResponse } from "../refinement/refinement.types";
import { SubmissionModal } from "../submission/SubmissionModal";
import { VideoPlayerModal } from "../video-player/VideoPlayerModal";
import {
  shareTeamCandidate,
} from "../team-workspace/team-workspace.api";

import {
  getTeamRoomCode,
} from "../team-workspace/team-workspace.session";

import type {
  CandidateItem,
} from "../candidates/candidate.types";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  TaskId,
} from "../search/search.types";

import { ResultCard } from "./ResultCard";

import "./ResultsWorkspace.css";
function getCandidateTimestampSeconds(
  result: SearchResult,
): number {
  if (
    typeof result.frame_timestamp_seconds ===
      "number" &&
    Number.isFinite(
      result.frame_timestamp_seconds,
    )
  ) {
    return result.frame_timestamp_seconds;
  }

  if (
    typeof result.fps === "number" &&
    result.fps > 0
  ) {
    return (
      result.frame_index /
      result.fps
    );
  }

  return result.timestamp_seconds;
}
type TeamShareState =
  | "idle"
  | "sending"
  | "shared";
interface SubmissionTarget {
  task: TaskId;
  searchId: string;
  result: SearchResult;
}

interface ResultsWorkspaceProps {
  response?: SearchResponse;
  currentDresTaskName: string;
  originalRequest?: SearchRequest;
  refinementIteration: number;
  isLoading: boolean;
  errorMessage?: string;
  onRefinementComplete: (
    response: RefinementResponse,
  ) => void;
}

export function ResultsWorkspace({
  response,
  currentDresTaskName,
  originalRequest,
  refinementIteration,
  isLoading,
  errorMessage,
  onRefinementComplete,
}: ResultsWorkspaceProps) {
  const [
    selectedResultIndex,
    setSelectedResultIndex,
  ] = useState<number | null>(null);

  const [
    neighborResult,
    setNeighborResult,
  ] = useState<SearchResult | null>(null);

  const [
    videoResult,
    setVideoResult,
  ] = useState<SearchResult | null>(null);

  const [
    refinementResult,
    setRefinementResult,
  ] = useState<SearchResult | null>(null);

  const [
    submissionTarget,
    setSubmissionTarget,
  ] = useState<SubmissionTarget | null>(
    null,
  );
  const [
    teamShareStateByKey,
    setTeamShareStateByKey,
  ] = useState<
    Record<string, TeamShareState>
  >({});
  const hasResults =
    Boolean(response) &&
    response!.results.length > 0;

  const warnings =
    response?.warnings ?? [];

  const hasWarnings =
    warnings.length > 0;

  const canRefineSearch =
    response?.query_mode !== "ocr";

  const {
    candidates,
    isCandidateSelected,
    toggleCandidate,
    removeCandidate,
    clearCandidates,
  } = useCandidateSelection();
  function getTeamShareStateKey(
    roomCode: string,
    candidate: CandidateItem,
  ): string {
    return [
      roomCode.trim().toUpperCase(),
      currentDresTaskName,
      candidate.key,
    ].join(":");
  }

  function getTeamShareState(
    candidate: CandidateItem,
  ): TeamShareState {
    const roomCode =
      getTeamRoomCode().trim();

    if (
      !roomCode ||
      !currentDresTaskName
    ) {
      return "idle";
    }

    const stateKey =
      getTeamShareStateKey(
        roomCode,
        candidate,
      );

    return (
      teamShareStateByKey[stateKey] ??
      "idle"
    );
  }
  async function handleSendCandidateToTeam(
    candidate: CandidateItem,
  ) {
    const roomCode =
      getTeamRoomCode().trim();

    if (!roomCode) {
      window.alert(
        "Create or join a Team Room first.",
      );
      return;
    }

    if (!currentDresTaskName) {
      window.alert(
        "Connect to an active DRES task first.",
      );
      return;
    }

    const stateKey =
      getTeamShareStateKey(
        roomCode,
        candidate,
      );

    if (
      teamShareStateByKey[stateKey] ===
        "sending" ||
      teamShareStateByKey[stateKey] ===
        "shared"
    ) {
      return;
    }

    setTeamShareStateByKey(
      (current) => ({
        ...current,
        [stateKey]: "sending",
      }),
    );

    try {
      await shareTeamCandidate(
        roomCode,
        {
          task_name:
            currentDresTaskName,

          candidate_key:
            candidate.key,

          video_id:
            candidate.result.video_id,

          frame_index:
            candidate.result.frame_index,

          timestamp_seconds:
            getCandidateTimestampSeconds(
              candidate.result,
            ),

          thumbnail_url:
            candidate.result.thumbnail_url,

          frame_url:
            candidate.result.frame_url,

          video_url:
            candidate.result.video_url,

          note: "",
        },
      );

      setTeamShareStateByKey(
        (current) => ({
          ...current,
          [stateKey]: "shared",
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send candidate to Team Room.";

      if (
        message
          .toLowerCase()
          .includes("already shared")
      ) {
        setTeamShareStateByKey(
          (current) => ({
            ...current,
            [stateKey]: "shared",
          }),
        );

        return;
      }

      setTeamShareStateByKey(
        (current) => ({
          ...current,
          [stateKey]: "idle",
        }),
      );

      window.alert(message);
    }
  }
  useEffect(() => {
    setSelectedResultIndex(null);
    setNeighborResult(null);
    setVideoResult(null);
    setRefinementResult(null);
    setSubmissionTarget(null);
  }, [
    response?.search_id,
    refinementIteration,
  ]);

  return (
    <main className="results-workspace">
      <div className="results-workspace__header">
        <div>
          <span className="results-workspace__eyebrow">
            Retrieval results
          </span>

          <h1>Search Workspace</h1>

          {response ? (
            <p>
              {response.total_results} results in{" "}
              {response.processing_time_ms} ms
              {refinementIteration > 0 &&
                ` · Refinement ${refinementIteration}`}
            </p>
          ) : (
            <p>
              Run a query to display matching
              keyframes.
            </p>
          )}
        </div>

        <div
          className={[
            "results-workspace__status",
            hasWarnings
              ? "results-workspace__status--warning"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="results-workspace__status-dot" />

          {hasWarnings
            ? "Partial results"
            : "System ready"}
        </div>
      </div>

      {!isLoading &&
        !errorMessage &&
        hasWarnings && (
          <section
            className="results-workspace__warnings"
            role="status"
            aria-live="polite"
          >
            <header className="results-workspace__warnings-header">
              <span
                className="results-workspace__warnings-icon"
                aria-hidden="true"
              >
                !
              </span>

              <div>
                <strong>
                  Search completed with warnings
                </strong>

                <p>
                  Results from healthy retrieval
                  modules are still available.
                </p>
              </div>
            </header>

            <ul className="results-workspace__warnings-list">
              {warnings.map(
                (warning, index) => (
                  <li
                    key={[
                      warning.module,
                      warning.code,
                      index,
                    ].join("-")}
                  >
                    <div className="results-workspace__warning-meta">
                      <strong>
                        {warning.module}
                      </strong>

                      <code>
                        {warning.code}
                      </code>
                    </div>

                    <p>
                      {warning.message}
                    </p>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

      {isLoading && (
        <section className="results-workspace__message">
          <div className="results-workspace__spinner" />

          <h2>
            Searching video dataset...
          </h2>

          <p>
            Visual, OCR and ASR candidates are
            being retrieved.
          </p>
        </section>
      )}

      {!isLoading && errorMessage && (
        <section className="results-workspace__message results-workspace__message--error">
          <h2>Search failed</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      {!isLoading &&
        !errorMessage &&
        !hasResults && (
          <section className="results-workspace__empty">
            <div className="results-workspace__empty-icon">
              ⌕
            </div>

            <h2>No results yet</h2>

            <p>
              Configure one or more query
              scenes and press Search Video
              Dataset.
            </p>
          </section>
        )}

      {!isLoading &&
        !errorMessage &&
        hasResults && (
          <section className="results-workspace__grid">
            {response!.results.map(
              (result, index) => (
                <ResultCard
                  key={`${result.video_id}-${result.frame_index}`}
                  result={result}
                  onOpen={() =>
                    setSelectedResultIndex(
                      index,
                    )
                  }
                  onBrowseNeighbors={() =>
                    setNeighborResult(result)
                  }
                  onPlay={() =>
                    setVideoResult(result)
                  }
                  onSubmit={() =>
                    setSubmissionTarget({
                      task: response!.task,
                      searchId:
                        response!.search_id,
                      result,
                    })
                  }
                  onRefine={() => {
                    if (canRefineSearch) {
                      setRefinementResult(result);
                    }
                  }}
                  canRefineSearch={
                    canRefineSearch
                  }
                  isCandidateSelected={isCandidateSelected(
                    result,
                  )}
                  onToggleCandidate={() =>
                    toggleCandidate(
                      response!.task,
                      response!.search_id,
                      result,
                    )
                  }
                />
              ),
            )}
          </section>
        )}

      {response &&
        selectedResultIndex !== null && (
          <FrameLightbox
            results={response.results}
            currentIndex={
              selectedResultIndex
            }
            onIndexChange={
              setSelectedResultIndex
            }
            onClose={() =>
              setSelectedResultIndex(null)
            }
          />
        )}

      {neighborResult && (
        <NeighborFrameViewer
          result={neighborResult}
          onClose={() =>
            setNeighborResult(null)
          }
        />
      )}

      {videoResult && (
        <VideoPlayerModal
          result={videoResult}
          onClose={() =>
            setVideoResult(null)
          }
        />
      )}

      <CandidateTray
        candidates={candidates}
        onRemoveCandidate={
          removeCandidate
        }
        onClearCandidates={
          clearCandidates
        }
        onSendToTeam={
          handleSendCandidateToTeam
        }
        getTeamShareState={
          getTeamShareState
        }
        onSubmitCandidate={(
          candidate,
        ) =>
          setSubmissionTarget({
            task: candidate.task,
            searchId:
              candidate.searchId,
            result: candidate.result,
          })
        }
      />

      {submissionTarget && (
        <SubmissionModal
          task={submissionTarget.task}
          searchId={
            submissionTarget.searchId
          }
          result={
            submissionTarget.result
          }
          onClose={() =>
            setSubmissionTarget(null)
          }
        />
      )}

      {canRefineSearch &&
        refinementResult &&
        response &&
        originalRequest && (
          <RefinementModal
            originalRequest={
              originalRequest
            }
            parentSearchId={
              response.search_id
            }
            refinementIteration={
              refinementIteration + 1
            }
            result={refinementResult}
            onRefinementComplete={
              onRefinementComplete
            }
            onClose={() =>
              setRefinementResult(null)
            }
          />
        )}
    </main>
  );
}