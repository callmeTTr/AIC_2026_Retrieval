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
  onDelete: (sceneId: string) => void;
}

export function SceneCard({
  scene,
  sceneNumber,
  canDelete,
  isInvalid,
  onChange,
  onDelete,
}: SceneCardProps) {
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

      {isInvalid && (
        <p className="scene-card__error">
          Enter at least one Visual, OCR or ASR query.
        </p>
      )}

      <label>
        <span>Visual Query</span>
        <textarea
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

      <label>
        <span>OCR Query</span>
        <textarea
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

      <label>
        <span>ASR Query</span>
        <textarea
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