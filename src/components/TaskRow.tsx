import type { Task } from "../types";

interface Props {
  task: Task;
  onToggle: () => void;
}

export default function TaskRow({ task, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-card px-4 py-4 text-left transition active:scale-[0.99]"
      aria-pressed={task.done}
    >
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.done ? "border-sage bg-sage" : "border-line group-hover:border-sage",
        ].join(" ")}
      >
        {task.done && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white animate-popIn" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={[
          "text-[17px] leading-snug transition-colors",
          task.done ? "text-muted line-through decoration-sage/60" : "text-ink",
        ].join(" ")}
      >
        {task.text}
      </span>
    </button>
  );
}
