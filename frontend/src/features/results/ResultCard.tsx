import type { SearchResult } from "../search/search.types";

import "./ResultCard.css";

interface ResultCardProps {
  result: SearchResult;
}

export function ResultCard({
  result,
}: ResultCardProps) {
  return (
    <article className="result-card">
      <div className="result-card__image-wrapper">
        <img
          src={result.thumbnail_url}
          alt={`Result ${result.rank} from ${result.video_id}`}
          loading="lazy"
        />

        <span className="result-card__rank">
          #{result.rank}
        </span>
      </div>

      <div className="result-card__body">
        <div className="result-card__title">
          <strong>{result.video_id}</strong>

          <span>
            Score {result.score.toFixed(3)}
          </span>
        </div>

        <dl className="result-card__metadata">
          <div>
            <dt>Frame</dt>
            <dd>{result.frame_index}</dd>
          </div>

          <div>
            <dt>Timestamp</dt>
            <dd>{result.timestamp_display}</dd>
          </div>

          <div>
            <dt>Scene</dt>
            <dd>{result.matched_scene}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}