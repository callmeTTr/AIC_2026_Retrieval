import type { SearchResponse } from "../search/search.types";

import { ResultCard } from "./ResultCard";

import "./ResultsWorkspace.css";

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
  const hasResults =
    Boolean(response) &&
    response!.results.length > 0;

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
            {response!.results.map((result) => (
              <ResultCard
                key={`${result.video_id}-${result.frame_index}`}
                result={result}
              />
            ))}
          </section>
        )}
    </main>
  );
}