import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { CandidateTray } from "../candidates/CandidateTray";
import { useCandidateSelection } from "../candidates/useCandidateSelection";
import { FrameLightbox } from "../frame-viewer/FrameLightbox";
import { NeighborFrameViewer } from "../neighbors/NeighborFrameViewer";
import { RefinementModal } from "../refinement/RefinementModal";
import type { RefinementResponse } from "../refinement/refinement.types";
import { SubmissionModal } from "../submission/SubmissionModal";
import { VideoPlayerModal } from "../video-player/VideoPlayerModal";
import {
  resolveBackendUrl,
} from "../../services/apiClient";
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
type ResultsViewMode =
  | "normal"
  | "grouped";

interface GroupedVideoItem {
  result: SearchResult;
  originalIndex: number;
}


interface GroupedVideoResult {
  videoId: string;
  bestRank: number;
  representative: GroupedVideoItem;
  items: GroupedVideoItem[];
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
    viewMode,
    setViewMode,
  ] = useState<ResultsViewMode>(
    "normal",
  );
  const [
    openedVideoGroup,
    setOpenedVideoGroup,
  ] = useState<GroupedVideoResult | null>(
    null,
  );
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
  const groupedResults =
    useMemo<GroupedVideoResult[]>(
      () => {
        if (!response) {
          return [];
        }

        const groups =
          new Map<
            string,
            GroupedVideoResult
          >();

        response.results.forEach(
          (result, index) => {
            const item: GroupedVideoItem = {
              result,
              originalIndex: index,
            };

            const existing =
              groups.get(
                result.video_id,
              );

            if (existing) {
              existing.items.push(
                item,
              );

              if (
                result.rank <
                existing.bestRank
              ) {
                existing.bestRank =
                  result.rank;

                existing.representative =
                  item;
              }

              return;
            }

            groups.set(
              result.video_id,
              {
                videoId:
                  result.video_id,

                bestRank:
                  result.rank,

                representative:
                  item,

                items: [
                  item,
                ],
              },
            );
          },
        );

        return Array.from(
          groups.values(),
        )
          .map((group) => ({
            ...group,

            items: [
              ...group.items,
            ].sort((a, b) => {
              const rankDiff =
                a.result.rank -
                b.result.rank;

              if (rankDiff !== 0) {
                return rankDiff;
              }

              return (
                a.originalIndex -
                b.originalIndex
              );
            }),
          }))
          .sort(
            (a, b) =>
              a.bestRank -
              b.bestRank,
          );
      },
      [response],
    );
  const {
    candidates,
    isCandidateSelected,
    toggleCandidate,
    removeCandidate,
    clearCandidates,
  } = useCandidateSelection();
  function getTeamTaskName(
    candidate: CandidateItem,
  ): string {
    const dresTaskName =
      currentDresTaskName.trim();

    if (dresTaskName) {
      return dresTaskName;
    }

    return String(
      candidate.task,
    );
  }


  function getTeamShareStateKey(
    roomCode: string,
    candidate: CandidateItem,
  ): string {
    return [
      roomCode.trim().toUpperCase(),
      getTeamTaskName(
        candidate,
      ),
      candidate.key,
    ].join(":");
  }

  function getTeamShareState(
    candidate: CandidateItem,
  ): TeamShareState {
    const roomCode =
      getTeamRoomCode().trim();

    if (!roomCode) {
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
    const teamTaskName =
      getTeamTaskName(
        candidate,
      );
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
            teamTaskName,

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
    setOpenedVideoGroup(null);
  }, [
    response?.search_id,
    refinementIteration,
  ]);
  useEffect(() => {
    if (!openedVideoGroup) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setOpenedVideoGroup(
          null,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [openedVideoGroup]);
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
          <div className="results-workspace__view-toolbar">
            <span>
              View mode
            </span>

            <div
              className="results-workspace__view-toggle"
              role="group"
              aria-label="Results view mode"
            >
              <button
                type="button"
                className={
                  viewMode === "normal"
                    ? "results-workspace__view-button results-workspace__view-button--active"
                    : "results-workspace__view-button"
                }
                onClick={() =>
                  setViewMode(
                    "normal",
                  )
                }
              >
                Normal
              </button>

              <button
                type="button"
                className={
                  viewMode === "grouped"
                    ? "results-workspace__view-button results-workspace__view-button--active"
                    : "results-workspace__view-button"
                }
                onClick={() =>
                  setViewMode(
                    "grouped",
                  )
                }
              >
                Grouped
              </button>
            </div>
          </div>
        )}
      {!isLoading &&
        !errorMessage &&
        hasResults &&
        viewMode === "normal" && (
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
                    setNeighborResult(
                      result,
                    )
                  }
                  onPlay={() =>
                    setVideoResult(
                      result,
                    )
                  }
                  onSubmit={() =>
                    setSubmissionTarget({
                      task:
                        response!.task,
                      searchId:
                        response!
                          .search_id,
                      result,
                    })
                  }
                  onRefine={() => {
                    if (
                      canRefineSearch
                    ) {
                      setRefinementResult(
                        result,
                      );
                    }
                  }}
                  canRefineSearch={
                    canRefineSearch
                  }
                  isCandidateSelected={
                    isCandidateSelected(
                      result,
                    )
                  }
                  onToggleCandidate={() =>
                    toggleCandidate(
                      response!.task,
                      response!
                        .search_id,
                      result,
                    )
                  }
                />
              ),
            )}
          </section>
        )}

      {!isLoading &&
        !errorMessage &&
        hasResults &&
        viewMode === "grouped" && (
          <section className="results-workspace__group-overview">
            {groupedResults.map(
              (group) => {
                const representative =
                  group.representative
                    .result;

                const thumbnailUrl =
                  resolveBackendUrl(
                    representative
                      .thumbnail_url,
                  );

                const frameUrl =
                  resolveBackendUrl(
                    representative
                      .frame_url,
                  );

                return (
                  <button
                    key={
                      group.videoId
                    }
                    type="button"
                    className="results-workspace__group-card"
                    onClick={() =>
                      setOpenedVideoGroup(
                        group,
                      )
                    }
                  >
                    <div className="results-workspace__group-card-image">
                      {thumbnailUrl ||
                      frameUrl ? (
                        <img
                          src={
                            thumbnailUrl ??
                            frameUrl ??
                            ""
                          }
                          alt={
                            `Best matched frame from ${group.videoId}`
                          }
                          loading="lazy"
                          decoding="async"
                          onError={(
                            event,
                          ) => {
                            const image =
                              event
                                .currentTarget;

                            if (
                              frameUrl &&
                              image.src !==
                                frameUrl
                            ) {
                              image.src =
                                frameUrl;
                            }
                          }}
                        />
                      ) : (
                        <div className="results-workspace__group-card-placeholder">
                          No preview
                        </div>
                      )}

                      <span className="results-workspace__group-card-rank">
                        Best #
                        {
                          group.bestRank
                        }
                      </span>

                      <span className="results-workspace__group-card-count">
                        {
                          group.items
                            .length
                        }{" "}
                        {group.items
                          .length === 1
                          ? "match"
                          : "matches"}
                      </span>
                    </div>

                    <div className="results-workspace__group-card-body">
                      <div className="results-workspace__group-card-title">
                        <strong>
                          {
                            group.videoId
                          }
                        </strong>

                        <span>
                          Score{" "}
                          {representative.score.toFixed(
                            3,
                          )}
                        </span>
                      </div>

                      <dl className="results-workspace__group-card-metadata">
                        <div>
                          <dt>
                            Best frame
                          </dt>

                          <dd>
                            {
                              representative
                                .frame_index
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Matches
                          </dt>

                          <dd>
                            {
                              group.items
                                .length
                            }
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Time
                          </dt>

                          <dd>
                            {getCandidateTimestampSeconds(
                              representative,
                            ).toFixed(
                              2,
                            )}
                            s
                          </dd>
                        </div>
                      </dl>

                      <div className="results-workspace__group-card-open">
                        Open matched frames
                      </div>
                    </div>
                  </button>
                );
              },
            )}
          </section>
        )}

      {openedVideoGroup && (
        <div
          className="results-workspace__group-modal"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpenedVideoGroup(
                null,
              );
            }
          }}
        >
          <section
            className="results-workspace__group-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={
              `Matched frames from ${openedVideoGroup.videoId}`
            }
          >
            <header className="results-workspace__group-dialog-header">
              <div>
                <span>
                  Grouped video
                </span>

                <h2>
                  {
                    openedVideoGroup
                      .videoId
                  }
                </h2>

                <p>
                  {
                    openedVideoGroup
                      .items.length
                  }{" "}
                  matched{" "}
                  {openedVideoGroup
                    .items.length === 1
                    ? "frame"
                    : "frames"}
                  {" · "}
                  Best rank #
                  {
                    openedVideoGroup
                      .bestRank
                  }
                </p>
              </div>

              <button
                type="button"
                aria-label="Close grouped video"
                onClick={() =>
                  setOpenedVideoGroup(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <div className="results-workspace__group-dialog-grid">
              {openedVideoGroup.items.map(
                ({
                  result,
                  originalIndex,
                }) => (
                  <ResultCard
                    key={`${result.video_id}-${result.frame_index}`}
                    result={result}
                    onOpen={() =>
                      setSelectedResultIndex(
                        originalIndex,
                      )
                    }
                    onBrowseNeighbors={() =>
                      setNeighborResult(
                        result,
                      )
                    }
                    onPlay={() =>
                      setVideoResult(
                        result,
                      )
                    }
                    onSubmit={() =>
                      setSubmissionTarget({
                        task:
                          response!.task,

                        searchId:
                          response!
                            .search_id,

                        result,
                      })
                    }
                    onRefine={() => {
                      if (
                        canRefineSearch
                      ) {
                        setRefinementResult(
                          result,
                        );
                      }
                    }}
                    canRefineSearch={
                      canRefineSearch
                    }
                    isCandidateSelected={
                      isCandidateSelected(
                        result,
                      )
                    }
                    onToggleCandidate={() =>
                      toggleCandidate(
                        response!.task,
                        response!
                          .search_id,
                        result,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>
        </div>
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