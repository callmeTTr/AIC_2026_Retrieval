import { Trash2 } from "lucide-react";

import type {
  QueryField,
  QueryScene,
} from "./query.types";

import "./SceneCard.css";

interface SceneCardProps {
  scene: QueryScene;
  sceneNumber: number;
  canDelete: boolean;
  isInvalid: boolean;
  onChange: (
    sceneId: string,
    field: QueryField,
    value: string,
  ) => void;
  onClear: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
}

export function SceneCard({
  scene,
  sceneNumber,
  canDelete,
  isInvalid,
  onChange,
  onClear,
  onDelete,
}: SceneCardProps) {
  const visualQueryId =
    `scene-${scene.id}-visual-query`;

  const ocrQueryId =
    `scene-${scene.id}-ocr-query`;

  const asrQueryId =
    `scene-${scene.id}-asr-query`;

  const errorId =
    `scene-${scene.id}-error`;

  return (
    <section
      className={
        isInvalid
          ? "scene-card scene-card--invalid"
          : "scene-card"
      }
    >
      <div className="scene-card__header">
        <div>
          <strong>Scene {sceneNumber}</strong>
          <span>At least one query is required</span>
        </div>

        <div className="scene-card__actions">
          <button
            type="button"
            className="scene-card__clear"
            aria-label={`Clear Scene ${sceneNumber}`}
            title={`Clear all queries in Scene ${sceneNumber}`}
            onClick={() => onClear(scene.id)}
          >
            Clear
          </button>

          <button
            type="button"
            className="scene-card__delete"
            disabled={!canDelete}
            aria-label={`Delete Scene ${sceneNumber}`}
            title={
              canDelete
                ? `Delete Scene ${sceneNumber}`
                : "At least one scene is required"
            }
            onClick={() => onDelete(scene.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isInvalid && (
        <p
          id={errorId}
          className="scene-card__error"
          role="alert"
        >
          Enter at least one Visual, OCR or ASR query.
        </p>
      )}

      <label htmlFor={visualQueryId}>
        <span>Visual Query</span>

        <textarea
          id={visualQueryId}
          name={`scenes.${sceneNumber}.visualQuery`}
          autoComplete="off"
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : undefined
          }
          value={scene.visualQuery}
          placeholder="Describe people, objects, actions or context..."
          onChange={(event) =>
            onChange(
              scene.id,
              "visualQuery",
              event.target.value,
            )
          }
        />
      </label>

      <label htmlFor={ocrQueryId}>
        <span>OCR Query</span>

        <textarea
          id={ocrQueryId}
          name={`scenes.${sceneNumber}.ocrQuery`}
          autoComplete="off"
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : undefined
          }
          value={scene.ocrQuery}
          placeholder="Text visible inside a video frame..."
          onChange={(event) =>
            onChange(
              scene.id,
              "ocrQuery",
              event.target.value,
            )
          }
        />
      </label>

      <label htmlFor={asrQueryId}>
        <span>ASR Query</span>

        <textarea
          id={asrQueryId}
          name={`scenes.${sceneNumber}.asrQuery`}
          autoComplete="off"
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : undefined
          }
          value={scene.asrQuery}
          placeholder="Words or dialogue spoken in the video..."
          onChange={(event) =>
            onChange(
              scene.id,
              "asrQuery",
              event.target.value,
            )
          }
        />
      </label>
    </section>
  );
}