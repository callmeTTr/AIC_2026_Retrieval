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
    </header>
  );
}