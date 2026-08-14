import { useState } from "react";

import { SceneCard } from "./SceneCard";
import type {
  QueryBuilderValue,
  QueryField,
  QueryScene,
  VisualSearchModel,
} from "./query.types";

import "./QuerySidebar.css";

interface QuerySidebarProps {
  onSearch: (value: QueryBuilderValue) => void;
}

const VISUAL_MODEL_OPTIONS: Array<{
  value: VisualSearchModel;
  label: string;
}> = [
  {
    value: "bge",
    label: "BGE",
  },
  {
    value: "metaclip",
    label: "MetaCLIP",
  },
  {
    value: "beit3",
    label: "BEiT-3",
  },
  {
    value: "perception",
    label: "Perception",
  },
];

function createEmptyScene(): QueryScene {
  return {
    id: crypto.randomUUID(),
    visualQuery: "",
    ocrQuery: "",
    asrQuery: "",
  };
}

function isSceneEmpty(scene: QueryScene): boolean {
  return !(
    scene.visualQuery.trim() ||
    scene.ocrQuery.trim() ||
    scene.asrQuery.trim()
  );
}

export function QuerySidebar({
  onSearch,
}: QuerySidebarProps) {
  const [topKPerModality, setTopKPerModality] =
    useState(20);

  const [displayResultCount, setDisplayResultCount] =
    useState(20);

  const [useQueryRewrite, setUseQueryRewrite] =
    useState(true);

  const [
    selectedVisualModels,
    setSelectedVisualModels,
  ] = useState<VisualSearchModel[]>([
    "bge",
    "metaclip",
    "beit3",
    "perception",
  ]);

  const [scenes, setScenes] = useState<QueryScene[]>([
    createEmptyScene(),
  ]);

  const [invalidSceneIds, setInvalidSceneIds] =
    useState<string[]>([]);

  const [formError, setFormError] = useState("");

  function handleVisualModelToggle(
    model: VisualSearchModel,
  ) {
    setSelectedVisualModels((currentModels) =>
      currentModels.includes(model)
        ? currentModels.filter(
            (currentModel) =>
              currentModel !== model,
          )
        : [
            ...currentModels,
            model,
          ],
    );

    setFormError("");
  }

  function handleAddScene() {
    setScenes((currentScenes) => [
      ...currentScenes,
      createEmptyScene(),
    ]);
  }

  function handleDeleteScene(sceneId: string) {
    setScenes((currentScenes) =>
      currentScenes.filter((scene) => scene.id !== sceneId),
    );

    setInvalidSceneIds((currentIds) =>
      currentIds.filter((id) => id !== sceneId),
    );
  }

  function handleClearScene(sceneId: string) {
    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              visualQuery: "",
              ocrQuery: "",
              asrQuery: "",
            }
          : scene,
      ),
    );

    setInvalidSceneIds((currentIds) =>
      currentIds.filter((id) => id !== sceneId),
    );

    setFormError("");
  }

  function handleSceneChange(
    sceneId: string,
    field: QueryField,
    value: string,
  ) {
    setScenes((currentScenes) =>
      currentScenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              [field]: value,
            }
          : scene,
      ),
    );

    setInvalidSceneIds((currentIds) =>
      currentIds.filter((id) => id !== sceneId),
    );

    setFormError("");
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      topKPerModality < 1 ||
      topKPerModality > 1000
    ) {
      setFormError(
        "Top-K per Modality must be between 1 and 1000.",
      );
      return;
    }

    if (
      displayResultCount < 1 ||
      displayResultCount > 500
    ) {
      setFormError(
        "Frames to Display must be between 1 and 500.",
      );
      return;
    }

    const hasVisualQuery =
      scenes.some((scene) =>
        Boolean(scene.visualQuery.trim()),
      );

    if (
      hasVisualQuery &&
      selectedVisualModels.length === 0
    ) {
      setFormError(
        "Select at least one Visual model before searching.",
      );
      return;
    }

    const emptySceneIds = scenes
      .filter(isSceneEmpty)
      .map((scene) => scene.id);

    if (emptySceneIds.length > 0) {
      setInvalidSceneIds(emptySceneIds);
      setFormError(
        "Every scene must contain at least one query.",
      );
      return;
    }

    setInvalidSceneIds([]);
    setFormError("");

    onSearch({
      scenes,
      topKPerModality,
      displayResultCount,
      useQueryRewrite,
      selectedVisualModels,
    });
  }

  return (
    <form
      className="query-sidebar"
      onSubmit={handleSubmit}
    >
      <div className="query-sidebar__heading">
        <div>
          <span className="query-sidebar__eyebrow">
            Search configuration
          </span>

          <h2>Query Builder</h2>
        </div>
      </div>

      <section className="query-sidebar__settings">
        <label>
          <span>Top-K per Modality</span>

          <input
            id="top-k-per-modality"
            name="topKPerModality"
            type="number"
            min="1"
            max="1000"
            value={topKPerModality}
            onChange={(event) =>
              setTopKPerModality(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>Frames to Display</span>

          <input
            id="display-result-count"
            name="displayResultCount"
            type="number"
            min="1"
            max="500"
            value={displayResultCount}
            onChange={(event) =>
              setDisplayResultCount(
                Number(event.target.value),
              )
            }
          />
        </label>

        <fieldset className="query-sidebar__model-selector">
          <legend>Visual Models</legend>

          <div className="query-sidebar__model-options">
            {VISUAL_MODEL_OPTIONS.map(
              ({ value, label }) => (
                <label
                  key={value}
                  className="query-sidebar__model-option"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedVisualModels.includes(
                        value,
                      )
                    }
                    onChange={() =>
                      handleVisualModelToggle(
                        value,
                      )
                    }
                  />

                  <span>{label}</span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <label className="query-sidebar__rewrite-toggle">
          <span>Auto reconstruct</span>

          <input
            type="checkbox"
            role="switch"
            checked={useQueryRewrite}
            aria-checked={useQueryRewrite}
            aria-label="Toggle automatic visual query reconstruction"
            onChange={(event) =>
              setUseQueryRewrite(
                event.target.checked,
              )
            }
          />
        </label>
      </section>

      <div className="query-sidebar__scenes">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            sceneNumber={index + 1}
            canDelete={scenes.length > 1}
            isInvalid={invalidSceneIds.includes(scene.id)}
            onChange={handleSceneChange}
            onClear={handleClearScene}
            onDelete={handleDeleteScene}
          />
        ))}

        <button
          type="button"
          className="query-sidebar__add-button"
          onClick={handleAddScene}
        >
          + Add Scene
        </button>
      </div>

      <footer className="query-sidebar__footer">
        {formError && (
          <p
            id="query-sidebar-form-error"
            className="query-sidebar__form-error"
            role="alert"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          className="query-sidebar__search-button"
        >
          Search Video Dataset
        </button>
      </footer>
    </form>
  );
}