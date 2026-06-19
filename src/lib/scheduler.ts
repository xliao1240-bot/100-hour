import type { Goal } from "../types";
import { daysLeftInclusive, todayStr } from "./date";

export interface GoalView {
  total: number;
  doneCount: number;
  /** 0–1 总进度 */
  progress: number;
  remaining: number;
  daysLeft: number;
  /** 今天的配额（已自动重排，绝不超过每日上限），当天固定不变 */
  quota: number;
  /** 今天还要做的具体任务（未完成的前 N 个） */
  todayTaskIds: string[];
  /** 今天被主动跳过了 */
  skippedToday: boolean;
  /** 今天的配额已清空（该歇了 / 撒花） */
  todayDone: boolean;
  /** 整个目标完成 */
  finished: boolean;
}

function isToday(ts: number | undefined, today: string): boolean {
  return ts != null && todayStr(new Date(ts)) === today;
}

/**
 * 自动重排核心。
 *
 * 关键点：今天的配额按「今天开始时的剩余量 / 剩余天数」算，并对当天固定。
 * - 剩余天数随真实日历每天减少，所以漏掉/跳过的任务会自动摊到后面更少的天里。
 * - 配额基于「今天开始时的剩余量」（= 当前剩余 + 今天已完成），
 *   因此你完成今天的任务时，明天的任务不会偷偷冒出来，你能真正看到「今天完成了」。
 * 用户永远不会看到「你落后了」。
 */
export function viewGoal(goal: Goal, today = todayStr()): GoalView {
  const total = goal.tasks.length;
  const remainingTasks = goal.tasks.filter((t) => !t.done);
  const remaining = remainingTasks.length;
  const doneCount = total - remaining;
  const progress = total === 0 ? 0 : doneCount / total;
  const daysLeft = daysLeftInclusive(goal.deadline, today);
  const finished = total > 0 && remaining === 0;

  const doneToday = goal.tasks.filter((t) => t.done && isToday(t.doneAt, today)).length;
  const remainingAtStart = remaining + doneToday;

  const quota =
    remainingAtStart === 0
      ? 0
      : Math.min(goal.maxPerDay, Math.ceil(remainingAtStart / daysLeft));

  const remainingQuota = Math.max(0, quota - doneToday);
  const todayTaskIds = remainingTasks.slice(0, remainingQuota).map((t) => t.id);
  const skippedToday = goal.skippedDate === today && !finished;
  const todayDone = !finished && remainingAtStart > 0 && doneToday >= quota;

  return {
    total,
    doneCount,
    progress,
    remaining,
    daysLeft,
    quota,
    todayTaskIds,
    skippedToday,
    todayDone,
    finished,
  };
}

/** 进度格子数量：既反映任务量又不至于太碎 */
export function cellCount(total: number): number {
  if (total <= 0) return 0;
  return Math.min(total, 60);
}
