import { useState } from "react";

import {
  DresConnectionPanel,
} from "../dres/DresConnectionPanel";
import {
  TeamRoomPanel,
} from "../team-workspace/TeamRoomPanel";
import type {
  TeamWorkspaceItem,
} from "../team-workspace/team-workspace.api";
import {
  resolveDresSubmissionMode,
  type DresCurrentTask,
  type DresSubmissionModeSetting,
} from "../dres/dres.api";
import {
  ManualKisSubmissionModal,
} from "../submission/ManualKisSubmissionModal";

import {
  QaSubmissionModal,
} from "../submission/QaSubmissionModal";
import {
  TrakeSubmissionModal,
} from "../submission/TrakeSubmissionModal";
import "./AppHeader.css";

export type TaskId =
  | "task_1"
  | "task_2"
  | "task_3"
  | "task_4";

interface AppHeaderProps {
  selectedTask: TaskId;
  onTaskChange: (task: TaskId) => void;
  currentDresTask: DresCurrentTask | null;
  onDresTaskChange: (
    task: DresCurrentTask | null,
  ) => void;
  dresSubmissionModeSetting: DresSubmissionModeSetting;
  onDresSubmissionModeSettingChange: (
    setting: DresSubmissionModeSetting,
  ) => void;
}

const tasks: Array<{
  id: TaskId;
  label: string;
}> = [
  { id: "task_1", label: "Task 1" },
  { id: "task_2", label: "Task 2" },
  { id: "task_3", label: "Task 3" },
  { id: "task_4", label: "Task 4" },
];

export function AppHeader({
  selectedTask,
  onTaskChange,
  currentDresTask,
  onDresTaskChange,
  dresSubmissionModeSetting,
  onDresSubmissionModeSettingChange,
}: AppHeaderProps) {
  const [isDresOpen, setIsDresOpen] =
    useState(false);
  const [isTeamOpen, setIsTeamOpen] =
    useState(false);
  const [
    isManualSubmitOpen,
    setIsManualSubmitOpen,
  ] = useState(false);

  const [
    isQaSubmitOpen,
    setIsQaSubmitOpen,
  ] = useState(false);
  const [
    isTrakeSubmitOpen,
    setIsTrakeSubmitOpen,
  ] = useState(false);
  const [
    submissionPrefill,
    setSubmissionPrefill,
  ] = useState<{
    videoId: string;
    timestampMs: number;
  } | null>(null);
  const submissionMode =
    resolveDresSubmissionMode(
      currentDresTask,
      dresSubmissionModeSetting,
    );
  function handleTeamCandidateSubmit(
    item: TeamWorkspaceItem,
  ) {
    const prefill = {
      videoId:
        item.video_id,

      timestampMs:
        Math.round(
          item.timestamp_seconds *
            1000,
        ),
    };

    setIsTeamOpen(false);
    setIsDresOpen(false);

    setIsManualSubmitOpen(false);
    setIsQaSubmitOpen(false);
    setIsTrakeSubmitOpen(false);

    if (
      submissionMode === "KIS"
    ) {
      setSubmissionPrefill(
        prefill,
      );

      setIsManualSubmitOpen(
        true,
      );

      return;
    }

    if (
      submissionMode === "QA"
    ) {
      setSubmissionPrefill(
        prefill,
      );

      setIsQaSubmitOpen(
        true,
      );

      return;
    }

    setSubmissionPrefill(null);

    if (
      submissionMode === "TRAKE"
    ) {
      window.alert(
        "TRAKE requires an ordered semantic-keyframe chain. A single Team Room candidate cannot be submitted as TRAKE.",
      );

      return;
    }

    window.alert(
      "Choose KIS, QA or TRAKE submission mode first.",
    );
  }
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__eyebrow">
          AIC 2026
        </span>

        <strong className="app-header__team-name">
          CHILLGUY US
        </strong>
      </div>

      <nav
        className="app-header__tasks"
        aria-label="Task selection"
      >
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className={
              selectedTask === task.id
                ? "app-header__task app-header__task--active"
                : "app-header__task"
            }
            aria-pressed={
              selectedTask === task.id
            }
            onClick={() =>
              onTaskChange(task.id)
            }
          >
            {task.label}
          </button>
        ))}
      </nav>

      <div className="app-header__actions">
        <div
          className="app-header__submission-mode"
          role="group"
          aria-label="DRES submission mode"
        >
          {(
            [
              "AUTO",
              "KIS",
              "QA",
              "TRAKE",
            ] as const
          ).map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                dresSubmissionModeSetting ===
                mode
                  ? "app-header__mode-button app-header__mode-button--active"
                  : "app-header__mode-button"
              }
              aria-pressed={
                dresSubmissionModeSetting ===
                mode
              }
              title={
                mode === "AUTO"
                  ? `Auto detect from DRES${
                      submissionMode !==
                      "UNKNOWN"
                        ? ` · detected ${submissionMode}`
                        : ""
                    }`
                  : `Use ${mode} submission mode`
              }
              onClick={() =>
                onDresSubmissionModeSettingChange(
                  mode,
                )
              }
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="app-header__manual-button"
          disabled={
            submissionMode === "UNKNOWN"
          }
          title={
            submissionMode === "UNKNOWN"
              ? "Choose KIS, QA or TRAKE, or connect to a supported active DRES task."
              : `Current submission mode: ${submissionMode}`
          }
          onClick={() => {
            setIsDresOpen(false);
            setIsTeamOpen(false);

            setSubmissionPrefill(
              null,
            );

            setIsManualSubmitOpen(
              submissionMode === "KIS",
            );

            setIsQaSubmitOpen(
              submissionMode === "QA",
            );

            setIsTrakeSubmitOpen(
              submissionMode === "TRAKE",
            );
          }}
        >
          Submit
        </button>
        <div className="app-header__dres">
          <button
            type="button"
            className="app-header__dres-button"
            onClick={() => {
              setIsDresOpen(
                (current) => !current,
              );

              setIsTeamOpen(false);
              setIsManualSubmitOpen(false);
              setIsQaSubmitOpen(false);
              setIsTrakeSubmitOpen(false);
            }}
          >
            DRES
          </button>

          {isDresOpen && (
            <DresConnectionPanel
              onClose={() =>
                setIsDresOpen(false)
              }
              onCurrentTaskChange={
                onDresTaskChange
              }
              submissionModeSetting={
                dresSubmissionModeSetting
              }
              onSubmissionModeSettingChange={
                onDresSubmissionModeSettingChange
              }
            />
          )}
        </div>
        <div className="app-header__team">
          <button
            type="button"
            className="app-header__team-button"
            onClick={() => {
              setIsTeamOpen(
                (current) => !current,
              );

              setIsDresOpen(false);
              setIsManualSubmitOpen(false);
              setIsQaSubmitOpen(false);
              setIsTrakeSubmitOpen(false);
            }}
          >
            TEAM
          </button>

          {isTeamOpen && (
            <TeamRoomPanel
              currentTaskName={
                currentDresTask?.name ?? ""
              }
              onSubmitCandidate={
                handleTeamCandidateSubmit
              }
              onClose={() =>
                setIsTeamOpen(false)
              }
            />
          )}
        </div>
        {isManualSubmitOpen && (
          <ManualKisSubmissionModal
            initialVideoId={
              submissionPrefill
                ?.videoId
            }
            initialTimestampMs={
              submissionPrefill
                ?.timestampMs
            }
            onClose={() => {
              setIsManualSubmitOpen(
                false,
              );

              setSubmissionPrefill(
                null,
              );
            }}
          />
        )}

        {isQaSubmitOpen && (
          <QaSubmissionModal
            initialVideoId={
              submissionPrefill
                ?.videoId
            }
            initialTimestampMs={
              submissionPrefill
                ?.timestampMs
            }
            onClose={() => {
              setIsQaSubmitOpen(
                false,
              );

              setSubmissionPrefill(
                null,
              );
            }}
          />
        )}
                {isTrakeSubmitOpen && (
          <TrakeSubmissionModal
            onClose={() =>
              setIsTrakeSubmitOpen(false)
            }
          />
        )}
      </div>
    </header>
  );
}