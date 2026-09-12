import { useState } from "react";

import {
  DresConnectionPanel,
} from "../dres/DresConnectionPanel";

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
}: AppHeaderProps) {
  const [isDresOpen, setIsDresOpen] =
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
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__eyebrow">
          AIC 2026
        </span>

        <strong className="app-header__team-name">
          TEAM NAME
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
        <button
          type="button"
          className="app-header__manual-button"
          onClick={() => {
            setIsManualSubmitOpen(true);
            setIsQaSubmitOpen(false);
            setIsTrakeSubmitOpen(false);
            setIsDresOpen(false);
          }}
        >
          Manual Submit
        </button>

        <button
          type="button"
          className="app-header__manual-button"
          onClick={() => {
            setIsQaSubmitOpen(true);
            setIsManualSubmitOpen(false);
            setIsTrakeSubmitOpen(false);
            setIsDresOpen(false);
          }}
        >
          QA Submit
        </button>
        <button
          type="button"
          className="app-header__manual-button"
          onClick={() => {
            setIsTrakeSubmitOpen(true);
            setIsManualSubmitOpen(false);
            setIsQaSubmitOpen(false);
            setIsDresOpen(false);
          }}
        >
          TRAKE Submit
        </button>
        <div className="app-header__dres">
          <button
            type="button"
            className="app-header__dres-button"
            onClick={() => {
              setIsDresOpen(
                (current) => !current,
              );

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
            />
          )}
        </div>

        {isManualSubmitOpen && (
          <ManualKisSubmissionModal
            onClose={() =>
              setIsManualSubmitOpen(false)
            }
          />
        )}

        {isQaSubmitOpen && (
          <QaSubmissionModal
            onClose={() =>
              setIsQaSubmitOpen(false)
            }
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