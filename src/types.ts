export interface Task {
  id: string;
  text: string;
  done: boolean;
  doneAt?: number;
}

export interface Goal {
  id: string;
  name: string;
  deadline: string; // 'YYYY-MM-DD'
  maxPerDay: number;
  createdAt: number;
  tasks: Task[]; // 完整计划，按顺序排列
  skippedDate?: string; // 'YYYY-MM-DD' 用户主动跳过的那天
}

/** AI 拆解返回的结构 */
export interface PlanDay {
  day: number;
  items: string[];
}

export type AIStatus = "idle" | "loading" | "done" | "error";
