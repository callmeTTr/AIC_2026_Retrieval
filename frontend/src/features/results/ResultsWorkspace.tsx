import { useEffect, useState } from "react";

import { FrameLightbox } from "../frame-viewer/FrameLightbox";
import { NeighborFrameViewer } from "../neighbors/NeighborFrameViewer";
import { VideoPlayerModal } from "../video-player/VideoPlayerModal";
import { SubmissionModal } from "../submission/SubmissionModal";
import { CandidateTray } from "../candidates/CandidateTray";
import { useCandidateSelection } from "../candidates/useCandidateSelection";

import type {
  SearchResponse,
  SearchResult,
  TaskId,
} from "../search/search.types";

import { ResultCard } from "./ResultCard";

import "./ResultsWorkspace.css";
interface SubmissionTarget {
  task: TaskId;
  searchId: string;
  result: SearchResult;
}

interface ResultsWorkspaceProps {
  response?: SearchResponse;
  isLoading: boolean;
  errorMessage?: string;
}

export function ResultsWorkspace({
  response,
  isLoading,
  errorMessage,
}: ResultsWorkspaceProps) {
  const [selectedResultIndex, setSelectedResultIndex] =
    useState<number | null>(null);

  const [neighborResult, setNeighborResult] =
    useState<SearchResult | null>(null);

  const [videoResult, setVideoResult] =
    useState<SearchResult | null>(null);

  const [
    submissionTarget,
    setSubmissionTarget,
  ] = useState<SubmissionTarget | null>(
    null,
  );

  const hasResults =
    Boolean(response) &&
    response!.results.length > 0;
  const {
    candidates,
    isCandidateSelected,
    toggleCandidate,
    removeCandidate,
    clearCandidates,
  } = useCandidateSelection();
  useEffect(() => {
    setSelectedResultIndex(null);
    setNeighborResult(null);
    setVideoResult(null);
    setSubmissionTarget(null);
  }, [response?.search_id]);

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
            </p>
          ) : (
            <p>
              Run a query to display matching keyframes.
            </p>
          )}
        </div>

        <div className="results-workspace__status">
          <span className="results-workspace__status-dot" />
          System ready
        </div>
      </div>

      {isLoading && (
        <section className="results-workspace__message">
          <div className="results-workspace__spinner" />

          <h2>Searching video dataset...</h2>

          <p>
            Visual, OCR and ASR candidates are being
            retrieved.
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
              Configure one or more query scenes and press
              Search Video Dataset.
            </p>
          </section>
        )}

      {!isLoading &&
        !errorMessage &&
        hasResults && (
          <section className="results-workspace__grid">
            {response!.results.map((result, index) => (
              <ResultCard
                key={`${result.video_id}-${result.frame_index}`}
                result={result}
                onOpen={() =>
                  setSelectedResultIndex(index)
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
                    searchId: response!.search_id,
                    result,
                  })
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
            ))}
          </section>
        )}

      {response &&
        selectedResultIndex !== null && (
          <FrameLightbox
            results={response.results}
            currentIndex={selectedResultIndex}
            onIndexChange={setSelectedResultIndex}
            onClose={() =>
              setSelectedResultIndex(null)
            }
          />
        )}

      {neighborResult && (
        <NeighborFrameViewer
          result={neighborResult}
          onClose={() => setNeighborResult(null)}
        />
      )}
      {videoResult && (
        <VideoPlayerModal
          result={videoResult}
          onClose={() => setVideoResult(null)}
        />
      )}
      <CandidateTray
        candidates={candidates}
        onRemoveCandidate={removeCandidate}
        onClearCandidates={clearCandidates}
        onSubmitCandidate={(candidate) =>
          setSubmissionTarget({
            task: candidate.task,
            searchId: candidate.searchId,
            result: candidate.result,
          })
        }
      />
      {submissionTarget && (
        <SubmissionModal
          task={submissionTarget.task}
          searchId={submissionTarget.searchId}
          result={submissionTarget.result}
          onClose={() =>
            setSubmissionTarget(null)
          }
        />
      )}
    </main>
  );
}