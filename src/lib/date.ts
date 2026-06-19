/** 返回本地时区的 'YYYY-MM-DD' */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 从今天（含）到截止日（含）剩余的天数。
 * 今天就是截止日 -> 1；已过期 -> 1（保底，不羞辱，仍只显示今天该做的）。
 */
export function daysLeftInclusive(deadline: string, today = todayStr()): number {
  const a = parse(today);
  const b = parse(deadline);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

/** 计划总跨度：创建日到截止日的天数，供 AI 拆解用 */
export function spanDays(createdAt: number, deadline: string): number {
  const a = todayStr(new Date(createdAt));
  return daysLeftInclusive(deadline, a);
}

const GREETINGS: [number, string][] = [
  [5, "早上好"],
  [11, "中午好"],
  [14, "下午好"],
  [18, "傍晚好"],
  [23, "晚上好"],
];

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  for (const [until, text] of GREETINGS) if (h < until) return text;
  return "晚上好";
}
