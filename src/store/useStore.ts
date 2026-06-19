import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal, PlanDay, Task } from "../types";
import { todayStr } from "../lib/date";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function flatten(plan: PlanDay[]): Task[] {
  const tasks: Task[] = [];
  for (const d of plan) {
    for (const text of d.items) {
      tasks.push({ id: uid(), text, done: false });
    }
  }
  return tasks;
}

interface NewGoal {
  name: string;
  deadline: string;
  maxPerDay: number;
}

interface StoreState {
  goals: Goal[];
  focusGoalId: string | null;

  addGoal: (g: NewGoal, plan: PlanDay[]) => string;
  setFocus: (id: string) => void;
  toggleTask: (goalId: string, taskId: string) => void;
  skipToday: (goalId: string) => void;
  unskipToday: (goalId: string) => void;
  replan: (goalId: string, plan: PlanDay[], patch?: Partial<NewGoal>) => void;
  deleteGoal: (goalId: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      goals: [],
      focusGoalId: null,

      addGoal: (g, plan) => {
        const goal: Goal = {
          id: uid(),
          name: g.name.trim(),
          deadline: g.deadline,
          maxPerDay: Math.max(1, Math.round(g.maxPerDay)),
          createdAt: Date.now(),
          tasks: flatten(plan),
        };
        set((s) => ({
          goals: [...s.goals, goal],
          focusGoalId: s.focusGoalId ?? goal.id,
        }));
        return goal.id;
      },

      setFocus: (id) => set({ focusGoalId: id }),

      toggleTask: (goalId, taskId) =>
        set((s) => ({
          goals: s.goals.map((goal) =>
            goal.id !== goalId
              ? goal
              : {
                  ...goal,
                  // 完成任务即清除当天的「跳过」状态
                  skippedDate:
                    goal.skippedDate === todayStr() ? undefined : goal.skippedDate,
                  tasks: goal.tasks.map((t) =>
                    t.id !== taskId
                      ? t
                      : t.done
                        ? { ...t, done: false, doneAt: undefined }
                        : { ...t, done: true, doneAt: Date.now() },
                  ),
                },
          ),
        })),

      skipToday: (goalId) =>
        set((s) => ({
          goals: s.goals.map((goal) =>
            goal.id === goalId ? { ...goal, skippedDate: todayStr() } : goal,
          ),
        })),

      unskipToday: (goalId) =>
        set((s) => ({
          goals: s.goals.map((goal) =>
            goal.id === goalId ? { ...goal, skippedDate: undefined } : goal,
          ),
        })),

      replan: (goalId, plan, patch) =>
        set((s) => ({
          goals: s.goals.map((goal) => {
            if (goal.id !== goalId) return goal;
            // 保留已完成任务，未完成部分用新计划替换
            const doneTasks = goal.tasks.filter((t) => t.done);
            return {
              ...goal,
              name: patch?.name?.trim() || goal.name,
              deadline: patch?.deadline || goal.deadline,
              maxPerDay: patch?.maxPerDay
                ? Math.max(1, Math.round(patch.maxPerDay))
                : goal.maxPerDay,
              skippedDate: undefined,
              tasks: [...doneTasks, ...flatten(plan)],
            };
          }),
        })),

      deleteGoal: (goalId) =>
        set((s) => {
          const goals = s.goals.filter((g) => g.id !== goalId);
          const focusGoalId =
            s.focusGoalId === goalId ? (goals[0]?.id ?? null) : s.focusGoalId;
          return { goals, focusGoalId };
        }),
    }),
    {
      name: "i-can-store",
      version: 1,
    },
  ),
);
