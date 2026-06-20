import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type Screen = "home" | "detail" | "create" | "stats" | "profile" | "complete";
type ThemeKey = "violet" | "green" | "orange" | "blue" | "rose";
type Category = "学习" | "运动" | "阅读" | "生活" | "工作";
type RangeFilter = "today" | "7d" | "30d" | "all";
type MetricFilter = "invested" | "records" | "completed" | "average";
type RankSort = "percent" | "current" | "records" | "createdAt";
type GoalFilter = "all" | string;

type Goal = {
  id: string;
  title: string;
  unit: string;
  target: number;
  description: string;
  dueDate: string;
  themeKey: ThemeKey;
  icon: string;
  category: Category;
  createdAt: string;
};

type Entry = {
  id: string;
  goalId: string;
  amount: number;
  note: string;
  createdAt: string;
};

type GoalDraft = {
  title: string;
  unit: string;
  target: string;
  description: string;
  dueDate: string;
  themeKey: ThemeKey;
  icon: string;
  category: Category;
};

type GoalSummary = Goal & {
  current: number;
  percent: number;
  percentLabel: string;
  recentLabel: string;
  completionDate: string | null;
  countdownLabel: string | null;
  recordCount: number;
};

type PersistedState = {
  goals: Goal[];
  entries: Entry[];
  selectedGoalId: string | null;
  appInitialized: boolean;
  hasClearedData: boolean;
};

type ThemePreset = {
  key: ThemeKey;
  label: string;
  accent: string;
  accentSoft: string;
  cardGlow: string;
};

type ChartBucket = {
  label: string;
  value: number;
};

type ProgressCellConfig = {
  cellCount: number;
  exactUnitsPerCell: number;
  filledCells: number;
  wholeCells: number;
  partialFill: number;
};

const STORAGE_KEY = "life-os-goals-v1";
const categories: Category[] = ["学习", "运动", "阅读", "生活", "工作"];
const commonUnits = ["小时", "次", "页", "公里", "天", "篇"];
const presetIcons = ["学", "练", "读", "生", "工", "跑", "写", "健"];
const rangeOptions: { key: RangeFilter; label: string }[] = [
  { key: "today", label: "当日" },
  { key: "7d", label: "近7天" },
  { key: "30d", label: "近30天" },
  { key: "all", label: "全部" },
];
const metricOptions: { key: MetricFilter; label: string }[] = [
  { key: "invested", label: "累计投入" },
  { key: "records", label: "记录次数" },
  { key: "completed", label: "完成目标数" },
  { key: "average", label: "平均每次投入" },
];
const rankOptions: { key: RankSort; label: string }[] = [
  { key: "percent", label: "按完成度" },
  { key: "current", label: "按累计投入" },
  { key: "records", label: "按记录次数" },
  { key: "createdAt", label: "按创建时间" },
];

const themePresets: ThemePreset[] = [
  {
    key: "violet",
    label: "晨雾紫",
    accent: "from-violet-500 via-fuchsia-500 to-purple-400",
    accentSoft: "bg-violet-100 text-violet-700",
    cardGlow: "shadow-[0_18px_38px_rgba(139,92,246,0.20)]",
  },
  {
    key: "green",
    label: "新芽绿",
    accent: "from-emerald-400 via-green-500 to-lime-400",
    accentSoft: "bg-emerald-100 text-emerald-700",
    cardGlow: "shadow-[0_18px_38px_rgba(34,197,94,0.18)]",
  },
  {
    key: "orange",
    label: "蜜桃橙",
    accent: "from-orange-400 via-amber-400 to-yellow-300",
    accentSoft: "bg-orange-100 text-orange-600",
    cardGlow: "shadow-[0_18px_38px_rgba(251,146,60,0.18)]",
  },
  {
    key: "blue",
    label: "晴空蓝",
    accent: "from-sky-400 via-cyan-500 to-blue-500",
    accentSoft: "bg-sky-100 text-sky-700",
    cardGlow: "shadow-[0_18px_38px_rgba(59,130,246,0.18)]",
  },
  {
    key: "rose",
    label: "晚霞粉",
    accent: "from-rose-400 via-pink-500 to-fuchsia-400",
    accentSoft: "bg-rose-100 text-rose-700",
    cardGlow: "shadow-[0_18px_38px_rgba(244,114,182,0.18)]",
  },
];

const initialGoalDraft: GoalDraft = {
  title: "",
  unit: "小时",
  target: "100",
  description: "",
  dueDate: "",
  themeKey: "violet",
  icon: "学",
  category: "学习",
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function inferCategory(title: string, themeKey?: ThemeKey): Category {
  const text = title.toLowerCase();
  if (text.includes("跑") || text.includes("练") || text.includes("运动") || themeKey === "green") return "运动";
  if (text.includes("读") || text.includes("书") || text.includes("阅读") || themeKey === "orange") return "阅读";
  if (text.includes("工作") || text.includes("项目") || text.includes("写") || themeKey === "blue") return "工作";
  if (text.includes("生活") || text.includes("家") || text.includes("整理") || themeKey === "rose") return "生活";
  return "学习";
}

function normalizeGoal(input: Partial<Goal> & { id: string; title: string; createdAt: string }): Goal {
  return {
    id: input.id,
    title: input.title.trim(),
    unit: input.unit?.trim() || "小时",
    target: Number.isFinite(Number(input.target)) && Number(input.target) > 0 ? Number(input.target) : 100,
    description: input.description?.trim() || "",
    dueDate: input.dueDate || "",
    themeKey: input.themeKey ?? "violet",
    icon: (input.icon?.trim() || "学").slice(0, 2),
    category: input.category ?? inferCategory(input.title, input.themeKey),
    createdAt: input.createdAt,
  };
}

function normalizeEntry(input: Partial<Entry> & { id: string; goalId: string; createdAt: string }): Entry {
  return {
    id: input.id,
    goalId: input.goalId,
    amount: Number.isFinite(Number(input.amount)) ? Number(input.amount) : 0,
    note: input.note?.trim() || "",
    createdAt: input.createdAt,
  };
}

function emptyState(): PersistedState {
  return {
    goals: [],
    entries: [],
    selectedGoalId: null,
    appInitialized: true,
    hasClearedData: false,
  };
}

function loadInitialState(): PersistedState {
  if (typeof window === "undefined") return emptyState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const goals = Array.isArray(parsed.goals)
      ? parsed.goals
          .filter((goal): goal is Goal & { id: string; title: string; createdAt: string } => Boolean(goal?.id && goal?.title && goal?.createdAt))
          .map(normalizeGoal)
      : [];
    const goalIdSet = new Set(goals.map((goal) => goal.id));
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries
          .filter((entry): entry is Entry & { id: string; goalId: string; createdAt: string } => Boolean(entry?.id && entry?.goalId && entry?.createdAt))
          .map(normalizeEntry)
          .filter((entry) => goalIdSet.has(entry.goalId))
      : [];
    const selectedGoalId =
      parsed.selectedGoalId && goalIdSet.has(parsed.selectedGoalId) ? parsed.selectedGoalId : goals[0]?.id ?? null;

    return {
      goals,
      entries,
      selectedGoalId,
      appInitialized: true,
      hasClearedData: Boolean(parsed.hasClearedData),
    };
  } catch {
    return emptyState();
  }
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, "");
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelativeLabel(value: string) {
  const date = new Date(value);
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(date).getTime();
  const diff = Math.round((today - target) / 86400000);

  if (diff === 0) return `今天 ${formatTime(value)}`;
  if (diff === 1) return `昨天 ${formatTime(value)}`;
  return `${formatShortDate(value)} ${formatTime(value)}`;
}

function getTheme(themeKey: ThemeKey) {
  return themePresets.find((item) => item.key === themeKey) ?? themePresets[0];
}

function getGoalEntries(entries: Entry[], goalId: string) {
  return entries
    .filter((entry) => entry.goalId === goalId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getGoalCompletionDate(goal: Goal, entries: Entry[]) {
  const ordered = entries
    .filter((entry) => entry.goalId === goal.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let sum = 0;
  for (const entry of ordered) {
    sum += entry.amount;
    if (sum >= goal.target) return entry.createdAt;
  }

  return null;
}

function getCountdownLabel(dueDate: string) {
  if (!dueDate) return null;
  const now = new Date();
  const end = new Date(`${dueDate}T23:59:59`);
  const diff = end.getTime() - now.getTime();
  const dayMs = 86400000;

  if (diff < 0) return "已到期";
  if (diff < dayMs) return "今天截止";
  return `还剩 ${Math.ceil(diff / dayMs)} 天`;
}

function buildGoalDraft(goal?: Goal | null): GoalDraft {
  if (!goal) return initialGoalDraft;
  return {
    title: goal.title,
    unit: goal.unit,
    target: formatNumber(goal.target),
    description: goal.description,
    dueDate: goal.dueDate,
    themeKey: goal.themeKey,
    icon: goal.icon,
    category: goal.category,
  };
}

function getMetricLabel(metric: MetricFilter) {
  switch (metric) {
    case "records":
      return "记录次数";
    case "completed":
      return "完成目标数";
    case "average":
      return "平均每次投入";
    default:
      return "累计投入";
  }
}

function bucketValue(
  metric: MetricFilter,
  bucketStart: Date,
  bucketEnd: Date,
  entries: Entry[],
  goals: GoalSummary[],
) {
  const bucketEntries = entries.filter((entry) => {
    const time = new Date(entry.createdAt).getTime();
    return time >= bucketStart.getTime() && time < bucketEnd.getTime();
  });

  if (metric === "records") return bucketEntries.length;
  if (metric === "invested") return bucketEntries.reduce((sum, entry) => sum + entry.amount, 0);
  if (metric === "average") {
    if (!bucketEntries.length) return 0;
    return bucketEntries.reduce((sum, entry) => sum + entry.amount, 0) / bucketEntries.length;
  }

  return goals.filter((goal) => {
    if (!goal.completionDate) return false;
    const time = new Date(goal.completionDate).getTime();
    return time >= bucketStart.getTime() && time < bucketEnd.getTime();
  }).length;
}

function buildChartBuckets(
  range: RangeFilter,
  metric: MetricFilter,
  entries: Entry[],
  goals: GoalSummary[],
): ChartBucket[] {
  const today = startOfDay(new Date());

  if (range === "today") {
    return [
      {
        label: "今天",
        value: bucketValue(metric, today, addDays(today, 1), entries, goals),
      },
    ];
  }

  if (range === "7d") {
    return Array.from({ length: 7 }).map((_, index) => {
      const start = addDays(today, -(6 - index));
      return {
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        value: bucketValue(metric, start, addDays(start, 1), entries, goals),
      };
    });
  }

  if (range === "30d") {
    return Array.from({ length: 6 }).map((_, index) => {
      const start = addDays(today, -29 + index * 5);
      return {
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        value: bucketValue(metric, start, addDays(start, 5), entries, goals),
      };
    });
  }

  const times = [
    ...entries.map((entry) => new Date(entry.createdAt).getTime()),
    ...goals.map((goal) => new Date(goal.createdAt).getTime()),
  ].filter((value) => Number.isFinite(value));

  if (!times.length) return [{ label: "全部", value: 0 }];

  const first = startOfDay(new Date(Math.min(...times)));
  const totalMonths =
    (today.getFullYear() - first.getFullYear()) * 12 + today.getMonth() - first.getMonth() + 1;
  const groupSize = Math.max(1, Math.ceil(totalMonths / 6));
  const buckets: ChartBucket[] = [];

  for (let index = 0; index < 6; index += 1) {
    const start = new Date(first.getFullYear(), first.getMonth() + index * groupSize, 1);
    if (start > today && buckets.length > 0) break;
    const end = new Date(first.getFullYear(), first.getMonth() + (index + 1) * groupSize, 1);
    buckets.push({
      label: groupSize === 1 ? `${start.getMonth() + 1}月` : `${start.getMonth() + 1}月起`,
      value: bucketValue(metric, start, end, entries, goals),
    });
  }

  return buckets;
}

function getPrimaryStatValue(metric: MetricFilter, goals: GoalSummary[], entries: Entry[]) {
  if (metric === "records") return entries.length;
  if (metric === "completed") return goals.filter((goal) => goal.completionDate).length;
  if (metric === "average") {
    if (!entries.length) return 0;
    return entries.reduce((sum, entry) => sum + entry.amount, 0) / entries.length;
  }
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getProgressCellConfig(current: number, target: number): ProgressCellConfig {
  const safeTarget = Math.max(target, 1);
  const cellCount = safeTarget <= 100 ? Math.max(1, Math.round(safeTarget)) : 100;
  const exactUnitsPerCell = safeTarget <= 100 ? 1 : safeTarget / 100;
  const filledCells = Math.min((Math.max(current, 0) / safeTarget) * cellCount, cellCount);

  return {
    cellCount,
    exactUnitsPerCell,
    filledCells,
    wholeCells: Math.floor(filledCells),
    partialFill: filledCells - Math.floor(filledCells),
  };
}

function chipClass(active: boolean) {
  return [
    "rounded-full border px-3 py-2 text-[13px] font-semibold transition",
    active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600",
  ].join(" ");
}

export default function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [screen, setScreen] = useState<Screen>("home");
  const [goals, setGoals] = useState<Goal[]>(initialState.goals);
  const [entries, setEntries] = useState<Entry[]>(initialState.entries);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(initialState.selectedGoalId);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(initialGoalDraft);
  const [recordAmount, setRecordAmount] = useState("1");
  const [recordNote, setRecordNote] = useState("");
  const [completionGoalId, setCompletionGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [homeMenuGoalId, setHomeMenuGoalId] = useState<string | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [statsRange, setStatsRange] = useState<RangeFilter>("7d");
  const [statsMetric, setStatsMetric] = useState<MetricFilter>("invested");
  const [statsGoalFilter, setStatsGoalFilter] = useState<GoalFilter>("all");
  const [rankSort, setRankSort] = useState<RankSort>("percent");
  const [rankCategory, setRankCategory] = useState<Category | "全部">("全部");
  const [hasClearedData, setHasClearedData] = useState(initialState.hasClearedData);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        goals,
        entries,
        selectedGoalId,
        appInitialized: true,
        hasClearedData,
      } satisfies PersistedState),
    );
  }, [entries, goals, hasClearedData, selectedGoalId]);

  useEffect(() => {
    if (!goals.length) {
      setSelectedGoalId(null);
      if (screen === "detail") setScreen("home");
      return;
    }

    if (!selectedGoalId || !goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, screen, selectedGoalId]);

  useEffect(() => {
    setHomeMenuGoalId(null);
    setDetailMenuOpen(false);
  }, [screen, selectedGoalId]);

  const goalSummaries = useMemo<GoalSummary[]>(() => {
    return goals
      .map((goal) => {
        const goalEntries = getGoalEntries(entries, goal.id);
        const total = goalEntries.reduce((sum, entry) => sum + entry.amount, 0);
        const percent = goal.target > 0 ? Math.min((total / goal.target) * 100, 100) : 0;

        return {
          ...goal,
          current: total,
          percent,
          percentLabel: `${formatNumber(percent)}%`,
          recentLabel: goalEntries[0] ? formatRelativeLabel(goalEntries[0].createdAt) : "还没有记录",
          completionDate: getGoalCompletionDate(goal, entries),
          countdownLabel: getCountdownLabel(goal.dueDate),
          recordCount: goalEntries.length,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, goals]);

  const activeGoal = goalSummaries.find((goal) => goal.id === selectedGoalId) ?? goalSummaries[0] ?? null;
  const activeGoalEntries = activeGoal ? getGoalEntries(entries, activeGoal.id) : [];

  const filteredStatsEntries = useMemo(
    () => (statsGoalFilter === "all" ? entries : entries.filter((entry) => entry.goalId === statsGoalFilter)),
    [entries, statsGoalFilter],
  );
  const filteredStatsGoals = useMemo(
    () => (statsGoalFilter === "all" ? goalSummaries : goalSummaries.filter((goal) => goal.id === statsGoalFilter)),
    [goalSummaries, statsGoalFilter],
  );

  const rangeStart = useMemo(() => {
    const today = startOfDay(new Date());
    if (statsRange === "today") return today;
    if (statsRange === "7d") return addDays(today, -6);
    if (statsRange === "30d") return addDays(today, -29);
    return null;
  }, [statsRange]);

  const periodEntries = useMemo(() => {
    if (!rangeStart) return filteredStatsEntries;
    return filteredStatsEntries.filter((entry) => new Date(entry.createdAt).getTime() >= rangeStart.getTime());
  }, [filteredStatsEntries, rangeStart]);

  const periodGoals = useMemo(() => {
    if (statsMetric !== "completed") return filteredStatsGoals;
    if (!rangeStart) return filteredStatsGoals;
    return filteredStatsGoals.filter((goal) => {
      if (!goal.completionDate) return false;
      return new Date(goal.completionDate).getTime() >= rangeStart.getTime();
    });
  }, [filteredStatsGoals, rangeStart, statsMetric]);

  const chartBuckets = useMemo(
    () => buildChartBuckets(statsRange, statsMetric, periodEntries, filteredStatsGoals),
    [filteredStatsGoals, periodEntries, statsMetric, statsRange],
  );
  const chartMax = Math.max(...chartBuckets.map((bucket) => bucket.value), 1);
  const trendPoints = useMemo(() => {
    const width = 280;
    const height = 120;
    return chartBuckets
      .map((bucket, index) => {
        const x = (index / Math.max(chartBuckets.length - 1, 1)) * width;
        const y = height - (bucket.value / chartMax) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [chartBuckets, chartMax]);

  const primaryStat = useMemo(
    () => getPrimaryStatValue(statsMetric, periodGoals, periodEntries),
    [periodEntries, periodGoals, statsMetric],
  );
  const strongestBucket = chartBuckets.reduce(
    (best, bucket) => (bucket.value > best.value ? bucket : best),
    chartBuckets[0] ?? { label: "暂无", value: 0 },
  );

  const celebrationGoal =
    goalSummaries.find((goal) => goal.id === completionGoalId) ?? (activeGoal?.completionDate ? activeGoal : null);

  const openGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setScreen("detail");
  };

  const beginCreateGoal = () => {
    setEditingGoalId(null);
    setGoalDraft(initialGoalDraft);
    setScreen("create");
  };

  const beginEditGoal = (goal: Goal | GoalSummary) => {
    setEditingGoalId(goal.id);
    setGoalDraft(buildGoalDraft(goal));
    setScreen("create");
  };

  const saveGoal = () => {
    const title = goalDraft.title.trim();
    const unit = goalDraft.unit.trim();
    const icon = goalDraft.icon.trim();
    const target = Number(goalDraft.target);

    if (!title) return void window.alert("请先填写目标名称。");
    if (!unit) return void window.alert("请填写单位，可以自定义。");
    if (!icon) return void window.alert("请填写图标字牌。");
    if (!Number.isFinite(target) || target <= 0) return void window.alert("总目标需要是大于 0 的数字。");

    const payload = {
      title,
      unit,
      target,
      description: goalDraft.description.trim(),
      dueDate: goalDraft.dueDate,
      themeKey: goalDraft.themeKey,
      icon: icon.slice(0, 2),
      category: goalDraft.category,
    };

    if (editingGoalId) {
      setGoals((current) => current.map((goal) => (goal.id === editingGoalId ? { ...goal, ...payload } : goal)));
      setSelectedGoalId(editingGoalId);
      setScreen("detail");
    } else {
      const newGoal: Goal = {
        id: createId("goal"),
        createdAt: new Date().toISOString(),
        ...payload,
      };
      setGoals((current) => [newGoal, ...current]);
      setSelectedGoalId(newGoal.id);
      setScreen("detail");
    }

    setEditingGoalId(null);
    setGoalDraft(initialGoalDraft);
    setHasClearedData(false);
  };

  const deleteGoal = (goalId: string) => {
    const targetGoal = goals.find((goal) => goal.id === goalId);
    if (!targetGoal) return;
    if (!window.confirm("确定删除这个目标吗？相关历史记录也会一起删除。")) return;

    const nextGoals = goals.filter((goal) => goal.id !== goalId);
    setGoals(nextGoals);
    setEntries((current) => current.filter((entry) => entry.goalId !== goalId));
    setHomeMenuGoalId(null);
    setDetailMenuOpen(false);
    setEditingGoalId((current) => (current === goalId ? null : current));
    setHasClearedData(false);

    if (selectedGoalId === goalId) {
      setSelectedGoalId(nextGoals[0]?.id ?? null);
      setScreen("home");
    }
  };

  const addRecord = () => {
    if (!activeGoal) return;
    const amount = Number(recordAmount);
    if (!Number.isFinite(amount) || amount <= 0) return void window.alert("请输入大于 0 的进度数值。");

    const previousTotal = activeGoal.current;
    const nextEntry: Entry = {
      id: createId("entry"),
      goalId: activeGoal.id,
      amount,
      note: recordNote.trim(),
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [nextEntry, ...current]);
    setRecordAmount("1");
    setRecordNote("");
    setHasClearedData(false);

    if (previousTotal < activeGoal.target && previousTotal + amount >= activeGoal.target) {
      setCompletionGoalId(activeGoal.id);
      setScreen("complete");
    }
  };

  const deleteEntry = (entryId: string) => {
    if (!window.confirm("确认删除这条记录吗？")) return;
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    setHasClearedData(false);
  };

  const clearAllData = () => {
    if (!window.confirm("确定要清空所有目标和记录吗？这个操作无法撤回。建议你先导出备份。")) return;
    setGoals([]);
    setEntries([]);
    setSelectedGoalId(null);
    setGoalDraft(initialGoalDraft);
    setRecordAmount("1");
    setRecordNote("");
    setCompletionGoalId(null);
    setEditingGoalId(null);
    setHomeMenuGoalId(null);
    setDetailMenuOpen(false);
    setHasClearedData(true);
    setScreen("home");
  };

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            goals,
            entries,
            selectedGoalId,
            appInitialized: true,
            hasClearedData,
          },
          null,
          2,
        ),
      ],
      { type: "application/json;charset=utf-8" },
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `100-hour-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<PersistedState>;
      const nextGoals = Array.isArray(parsed.goals)
        ? parsed.goals
            .filter((goal): goal is Goal & { id: string; title: string; createdAt: string } => Boolean(goal?.id && goal?.title && goal?.createdAt))
            .map(normalizeGoal)
        : [];
      const validGoalIds = new Set(nextGoals.map((goal) => goal.id));
      const nextEntries = Array.isArray(parsed.entries)
        ? parsed.entries
            .filter((entry): entry is Entry & { id: string; goalId: string; createdAt: string } => Boolean(entry?.id && entry?.goalId && entry?.createdAt))
            .map(normalizeEntry)
            .filter((entry) => validGoalIds.has(entry.goalId))
        : [];
      const nextSelectedGoalId =
        typeof parsed.selectedGoalId === "string" && validGoalIds.has(parsed.selectedGoalId)
          ? parsed.selectedGoalId
          : nextGoals[0]?.id ?? null;

      setGoals(nextGoals);
      setEntries(nextEntries);
      setSelectedGoalId(nextSelectedGoalId);
      setGoalDraft(initialGoalDraft);
      setEditingGoalId(null);
      setRecordAmount("1");
      setRecordNote("");
      setCompletionGoalId(null);
      setHasClearedData(nextGoals.length === 0 && nextEntries.length === 0);
      setScreen("home");
      window.alert("导入成功，数据已替换为备份内容。");
    } catch {
      window.alert("导入失败，请确认备份文件格式正确。");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(245,241,255,0.95)_36%,_rgba(249,249,252,0.98)_100%)] px-0 py-0 text-slate-900 sm:px-6 sm:py-8">
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportChange} />

      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-white/72 shadow-[0_30px_100px_rgba(160,160,176,0.16)] backdrop-blur-xl sm:min-h-[calc(100dvh-4rem)] sm:rounded-[36px] sm:border sm:border-white/80">
        {screen === "home" && (
          <HomeScreen
            goals={goalSummaries}
            menuGoalId={homeMenuGoalId}
            onOpenGoal={openGoal}
            onCreate={beginCreateGoal}
            onStats={() => setScreen("stats")}
            onProfile={() => setScreen("profile")}
            onToggleMenu={(goalId) => setHomeMenuGoalId((current) => (current === goalId ? null : goalId))}
            onEditGoal={(goalId) => {
              const goal = goals.find((item) => item.id === goalId);
              if (goal) beginEditGoal(goal);
            }}
            onDeleteGoal={deleteGoal}
          />
        )}

        {screen === "detail" && (
          <DetailScreen
            goal={activeGoal}
            entries={activeGoalEntries}
            recordAmount={recordAmount}
            recordNote={recordNote}
            menuOpen={detailMenuOpen}
            onBack={() => setScreen("home")}
            onRecordAmountChange={setRecordAmount}
            onRecordNoteChange={setRecordNote}
            onSaveRecord={addRecord}
            onDeleteEntry={deleteEntry}
            onToggleMenu={() => setDetailMenuOpen((current) => !current)}
            onEditGoal={() => activeGoal && beginEditGoal(activeGoal)}
            onDeleteGoal={() => activeGoal && deleteGoal(activeGoal.id)}
          />
        )}

        {screen === "create" && (
          <CreateScreen
            draft={goalDraft}
            isEditing={Boolean(editingGoalId)}
            onCancel={() => {
              setEditingGoalId(null);
              setGoalDraft(initialGoalDraft);
              setScreen(activeGoal ? "detail" : "home");
            }}
            onChange={setGoalDraft}
            onSave={saveGoal}
          />
        )}

        {screen === "stats" && (
          <StatsScreen
            goals={goalSummaries}
            filteredGoals={filteredStatsGoals}
            range={statsRange}
            metric={statsMetric}
            goalFilter={statsGoalFilter}
            rankSort={rankSort}
            rankCategory={rankCategory}
            chartBuckets={chartBuckets}
            chartMax={chartMax}
            trendPoints={trendPoints}
            primaryStat={primaryStat}
            strongestBucket={strongestBucket}
            onHome={() => setScreen("home")}
            onProfile={() => setScreen("profile")}
            onOpenGoal={openGoal}
            onRangeChange={setStatsRange}
            onMetricChange={setStatsMetric}
            onGoalFilterChange={setStatsGoalFilter}
            onRankSortChange={setRankSort}
            onRankCategoryChange={setRankCategory}
          />
        )}

        {screen === "profile" && (
          <ProfileScreen
            goals={goalSummaries}
            entries={entries}
            hasClearedData={hasClearedData}
            onHome={() => setScreen("home")}
            onStats={() => setScreen("stats")}
            onExport={exportData}
            onImport={() => importInputRef.current?.click()}
            onClearAll={clearAllData}
          />
        )}

        {screen === "complete" && (
          <CompleteScreen
            goal={celebrationGoal}
            onAppend={() => {
              if (celebrationGoal) setSelectedGoalId(celebrationGoal.id);
              setScreen("detail");
            }}
            onCreate={beginCreateGoal}
          />
        )}
      </div>
    </div>
  );
}

function HomeScreen({
  goals,
  menuGoalId,
  onOpenGoal,
  onCreate,
  onStats,
  onProfile,
  onToggleMenu,
  onEditGoal,
  onDeleteGoal,
}: {
  goals: GoalSummary[];
  menuGoalId: string | null;
  onOpenGoal: (goalId: string) => void;
  onCreate: () => void;
  onStats: () => void;
  onProfile: () => void;
  onToggleMenu: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  return (
    <div className="pb-[calc(92px+env(safe-area-inset-bottom))] pt-4">
      <div className="space-y-4 px-4">
        <section className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,_rgba(251,248,255,0.98),_rgba(248,249,252,0.96)_48%,_rgba(255,249,245,0.98))] px-5 pb-5 pt-6 shadow-[0_24px_60px_rgba(206,201,220,0.22)]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_24%_100%,_rgba(201,193,255,0.32),_transparent_52%),radial-gradient(circle_at_80%_96%,_rgba(255,216,198,0.34),_transparent_42%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="max-w-[220px] text-[24px] font-black tracking-[-0.04em] text-slate-900">100小时追踪器</h1>
              <p className="mt-3 max-w-[240px] break-words text-[14px] leading-7 text-slate-600">
                不是每天都要完美坚持，而是把每一次有效投入都安静地留下来。
              </p>
            </div>
            <div className="rounded-full bg-white/82 px-3 py-1.5 text-[12px] font-semibold text-slate-500 shadow-[0_10px_22px_rgba(148,163,184,0.12)]">
              手机优先
            </div>
          </div>
        </section>

        <button
          onClick={onCreate}
          className="flex h-14 w-full items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,_#7471b8,_#9f9ae3,_#d5d1ff)] text-[16px] font-semibold text-slate-900 shadow-[0_18px_36px_rgba(159,154,227,0.28)] transition active:scale-[0.99]"
        >
          + 新建目标
        </button>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <section className="rounded-[26px] border border-white/80 bg-white/88 p-6 text-center shadow-[0_12px_32px_rgba(148,163,184,0.12)]">
              <p className="text-[16px] font-semibold text-slate-900">还没有目标</p>
              <p className="mt-2 text-[14px] leading-7 text-slate-500">
                现在会严格以你的本地数据为准。清空后不会再自动恢复示例数据。
              </p>
            </section>
          ) : (
            goals.map((goal) => {
              const theme = getTheme(goal.themeKey);
              const menuOpen = menuGoalId === goal.id;

              return (
                <article
                  key={goal.id}
                  className="relative rounded-[26px] border border-white/80 bg-white/88 p-4 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold ${theme.accentSoft}`}>
                      {goal.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="truncate text-[17px] font-semibold text-slate-900">{goal.title}</h2>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{goal.category}</span>
                          </div>
                          <p className="mt-1 text-[13px] text-slate-400">
                            目标 {formatNumber(goal.target)} {goal.unit}
                          </p>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            onClick={() => onToggleMenu(goal.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-[18px] text-slate-500"
                            aria-label="目标操作"
                          >
                            ⋯
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 top-11 z-10 w-32 rounded-[18px] border border-white/80 bg-white/95 p-1.5 shadow-[0_16px_32px_rgba(148,163,184,0.18)]">
                              <button
                                onClick={() => onEditGoal(goal.id)}
                                className="flex w-full rounded-[14px] px-3 py-2.5 text-left text-[14px] text-slate-700 hover:bg-slate-50"
                              >
                                编辑目标
                              </button>
                              <button
                                onClick={() => onDeleteGoal(goal.id)}
                                className="flex w-full rounded-[14px] px-3 py-2.5 text-left text-[14px] text-rose-500 hover:bg-rose-50"
                              >
                                删除目标
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-[15px] text-slate-900">
                          <span className="text-[22px] font-black tracking-[-0.04em]">{formatNumber(goal.current)}</span>
                          <span className="text-slate-500"> / {formatNumber(goal.target)} {goal.unit}</span>
                        </p>
                        <span className="text-[18px] font-black tracking-[-0.04em] text-slate-700">{goal.percentLabel}</span>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${theme.accent}`} style={{ width: `${goal.percent}%` }} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
                        <span>最近记录：{goal.recentLabel}</span>
                        {goal.dueDate && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">截止 {formatShortDate(goal.dueDate)}</span>}
                        {goal.countdownLabel && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">{goal.countdownLabel}</span>}
                        {goal.completionDate && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">已完成</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => onOpenGoal(goal.id)}
                      className={`flex-1 rounded-[18px] bg-gradient-to-r py-3 text-[14px] font-semibold text-white ${theme.accent} ${theme.cardGlow}`}
                    >
                      记录进度
                    </button>
                    <button
                      onClick={() => onOpenGoal(goal.id)}
                      className="flex-1 rounded-[18px] border border-slate-200 bg-white py-3 text-[14px] font-semibold text-slate-600"
                    >
                      查看详情
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <BottomNav active="home" onHome={() => undefined} onStats={onStats} onProfile={onProfile} />
    </div>
  );
}

function DetailScreen({
  goal,
  entries,
  recordAmount,
  recordNote,
  menuOpen,
  onBack,
  onRecordAmountChange,
  onRecordNoteChange,
  onSaveRecord,
  onDeleteEntry,
  onToggleMenu,
  onEditGoal,
  onDeleteGoal,
}: {
  goal: GoalSummary | null;
  entries: Entry[];
  recordAmount: string;
  recordNote: string;
  menuOpen: boolean;
  onBack: () => void;
  onRecordAmountChange: (value: string) => void;
  onRecordNoteChange: (value: string) => void;
  onSaveRecord: () => void;
  onDeleteEntry: (entryId: string) => void;
  onToggleMenu: () => void;
  onEditGoal: () => void;
  onDeleteGoal: () => void;
}) {
  if (!goal) {
    return (
      <div className="pb-10 pt-4">
        <div className="space-y-4 px-4">
          <TopBar title="目标详情" left="‹" right="⋯" onLeft={onBack} />
          <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 text-center shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
            <p className="text-[16px] font-semibold text-slate-900">还没有可查看的目标</p>
            <p className="mt-2 text-[14px] leading-7 text-slate-500">回到首页新建一个目标后，这里就会显示详情和历史记录。</p>
          </section>
        </div>
      </div>
    );
  }

  const theme = getTheme(goal.themeKey);
  const progressCells = getProgressCellConfig(goal.current, goal.target);

  return (
    <div className="pb-10 pt-4">
      <div className="space-y-4 px-4">
        <TopBar title={goal.title} left="‹" right="⋯" onLeft={onBack} onRight={onToggleMenu} />
        {menuOpen && (
          <div className="relative z-10 -mt-2 flex justify-end">
            <div className="w-36 rounded-[18px] border border-white/80 bg-white/95 p-1.5 shadow-[0_16px_32px_rgba(148,163,184,0.18)]">
              <button onClick={onEditGoal} className="flex w-full rounded-[14px] px-3 py-2.5 text-left text-[14px] text-slate-700 hover:bg-slate-50">
                编辑目标
              </button>
              <button onClick={onDeleteGoal} className="flex w-full rounded-[14px] px-3 py-2.5 text-left text-[14px] text-rose-500 hover:bg-rose-50">
                删除目标
              </button>
            </div>
          </div>
        )}

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-slate-500">完成进度</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{goal.category}</span>
              </div>
              <p className="mt-2 text-[16px] text-slate-500">
                <span className="text-[52px] font-black tracking-[-0.06em] text-slate-900">{formatNumber(goal.current)}</span>
                <span className="ml-1">/ {formatNumber(goal.target)} {goal.unit}</span>
              </p>
            </div>
            <span className="text-[18px] font-black text-slate-700">{goal.percentLabel}</span>
          </div>

          {(goal.dueDate || goal.countdownLabel) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
              {goal.dueDate && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">截止 {formatFullDate(goal.dueDate)}</span>}
              {goal.countdownLabel && <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-600">{goal.countdownLabel}</span>}
            </div>
          )}

          <p className="mt-3 text-[13px] leading-6 text-slate-500">{goal.description || "每一次记录，都是在给未来的自己留下真实证据。"}</p>

          <div className="mt-5 grid grid-cols-10 gap-1.5 overflow-hidden">
            {Array.from({ length: progressCells.cellCount }).map((_, index) => {
              const filled = index < progressCells.wholeCells;
              const partialCell = index === progressCells.wholeCells && progressCells.partialFill > 0;
              return (
                <div key={index} className="relative aspect-square overflow-hidden rounded-[6px] bg-[#efedf4]">
                  {(filled || partialCell) && (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-[6px] bg-gradient-to-b ${theme.accent}`}
                      style={{ width: filled ? "100%" : `${progressCells.partialFill * 100}%`, opacity: filled ? 1 : 0.82 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <span className="rounded-full bg-slate-50 px-3 py-1.5">
              {goal.target <= 100
                ? `每格代表 1 ${goal.unit}`
                : `每格约代表 ${formatNumber(progressCells.exactUnitsPerCell)} ${goal.unit}`}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5">共 {progressCells.cellCount} 格</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-2 break-words">
              <span className={`h-3 w-3 rounded bg-gradient-to-r ${theme.accent}`} />
              已完成 {formatNumber(goal.current)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-2 break-words">
              <span className="h-3 w-3 rounded bg-slate-200" />
              剩余 {formatNumber(Math.max(goal.target - goal.current, 0))}
            </span>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <h2 className="text-[16px] font-semibold text-slate-900">本次记录</h2>
          <div className="mt-3 flex gap-3">
            <input
              inputMode="decimal"
              value={recordAmount}
              onChange={(event) => onRecordAmountChange(event.target.value)}
              className="min-w-0 flex-1 rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-[24px] font-black text-slate-900 outline-none placeholder:text-slate-300"
              placeholder="1"
            />
            <div className="flex w-24 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-[15px] text-slate-600">{goal.unit}</div>
          </div>
          <textarea
            value={recordNote}
            onChange={(event) => onRecordNoteChange(event.target.value)}
            maxLength={100}
            className="mt-3 min-h-[96px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-[14px] text-slate-700 outline-none placeholder:text-slate-300"
            placeholder="例如：今天练了跟读、复述和自由对话"
          />
          <button
            onClick={onSaveRecord}
            className="mt-4 h-12 w-full rounded-[18px] bg-[linear-gradient(135deg,_#7471b8,_#9f9ae3,_#d5d1ff)] text-[15px] font-semibold text-slate-900 shadow-[0_16px_30px_rgba(159,154,227,0.25)]"
          >
            保存记录
          </button>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">历史记录</h2>
            <span className="text-[13px] text-slate-400">{entries.length} 条</span>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-[20px] bg-slate-50 px-4 py-5 text-[14px] leading-7 text-slate-500">还没有历史记录。保存第一条后，这里会自动按时间倒序展示。</div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900">
                        {formatNumber(entry.amount)} {goal.unit}
                      </p>
                      <p className="mt-1 text-[13px] text-slate-400">
                        {formatShortDate(entry.createdAt)} {formatTime(entry.createdAt)}
                      </p>
                      <p className="mt-2 break-words text-[14px] leading-7 text-slate-600">{entry.note || "这次没有填写备注。"}</p>
                    </div>
                    <button onClick={() => onDeleteEntry(entry.id)} className="shrink-0 rounded-full bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-500">
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CreateScreen({
  draft,
  isEditing,
  onCancel,
  onChange,
  onSave,
}: {
  draft: GoalDraft;
  isEditing: boolean;
  onCancel: () => void;
  onChange: (draft: GoalDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="pb-8 pt-4">
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between px-1 py-1 text-[16px] font-semibold">
          <button onClick={onCancel} className="text-slate-600">
            取消
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">{isEditing ? "编辑目标" : "新建目标"}</h1>
          <button onClick={onSave} className="text-slate-900">
            保存
          </button>
        </div>

        <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,_#f7f4ff,_#d9d2ff)] text-[30px] font-bold text-slate-700 shadow-inner">
              {draft.icon || "学"}
            </div>
            <p className="mt-3 text-[15px] font-medium text-slate-600">单位和图标字牌都支持自定义</p>
          </div>

          <div className="mt-6 space-y-4">
            <Field label="目标名称">
              <input
                value={draft.title}
                onChange={(event) => onChange({ ...draft, title: event.target.value })}
                className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="例如：英语口语输出训练"
              />
            </Field>

            <Field label="分类">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category} onClick={() => onChange({ ...draft, category })} className={chipClass(draft.category === category)}>
                    {category}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="单位">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {commonUnits.map((unit) => (
                    <button key={unit} onClick={() => onChange({ ...draft, unit })} className={chipClass(draft.unit === unit)}>
                      {unit}
                    </button>
                  ))}
                </div>
                <input
                  value={draft.unit}
                  onChange={(event) => onChange({ ...draft, unit: event.target.value })}
                  className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="也可以输入自定义单位，例如：组、首、句"
                />
              </div>
            </Field>

            <Field label="总目标">
              <input
                inputMode="decimal"
                value={draft.target}
                onChange={(event) => onChange({ ...draft, target: event.target.value })}
                className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="100"
              />
            </Field>

            <Field label="目标说明（可选）" helper={`${draft.description.length}/100`}>
              <textarea
                value={draft.description}
                onChange={(event) => onChange({ ...draft, description: event.target.value.slice(0, 100) })}
                className="min-h-[104px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="描述一下这个目标吧..."
              />
            </Field>

            <Field label="截止日期（可选）">
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) => onChange({ ...draft, dueDate: event.target.value })}
                className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none"
              />
            </Field>

            <Field label="图标字牌">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {presetIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => onChange({ ...draft, icon })}
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-full border text-[16px] font-semibold transition",
                        draft.icon === icon ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600",
                      ].join(" ")}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <input
                  value={draft.icon}
                  onChange={(event) => onChange({ ...draft, icon: event.target.value.slice(0, 2) })}
                  className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="也可以输入自定义字牌，例如：琴、画、背"
                />
              </div>
            </Field>

            <Field label="主题色">
              <div className="flex flex-wrap gap-3">
                {themePresets.map((theme) => (
                  <button
                    key={theme.key}
                    onClick={() => onChange({ ...draft, themeKey: theme.key })}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-600"
                  >
                    <span className={["h-6 w-6 rounded-full bg-gradient-to-br", theme.accent, draft.themeKey === theme.key ? "ring-4 ring-slate-100" : ""].join(" ")} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatsScreen({
  goals,
  filteredGoals,
  range,
  metric,
  goalFilter,
  rankSort,
  rankCategory,
  chartBuckets,
  chartMax,
  trendPoints,
  primaryStat,
  strongestBucket,
  onHome,
  onProfile,
  onOpenGoal,
  onRangeChange,
  onMetricChange,
  onGoalFilterChange,
  onRankSortChange,
  onRankCategoryChange,
}: {
  goals: GoalSummary[];
  filteredGoals: GoalSummary[];
  range: RangeFilter;
  metric: MetricFilter;
  goalFilter: GoalFilter;
  rankSort: RankSort;
  rankCategory: Category | "全部";
  chartBuckets: ChartBucket[];
  chartMax: number;
  trendPoints: string;
  primaryStat: number;
  strongestBucket: ChartBucket;
  onHome: () => void;
  onProfile: () => void;
  onOpenGoal: (goalId: string) => void;
  onRangeChange: (value: RangeFilter) => void;
  onMetricChange: (value: MetricFilter) => void;
  onGoalFilterChange: (value: GoalFilter) => void;
  onRankSortChange: (value: RankSort) => void;
  onRankCategoryChange: (value: Category | "全部") => void;
}) {
  const completedGoals = filteredGoals.filter((goal) => goal.completionDate).length;
  const totalRecordCount = filteredGoals.reduce((sum, goal) => sum + goal.recordCount, 0);
  const completionRate = filteredGoals.length > 0 ? Math.round((completedGoals / filteredGoals.length) * 100) : 0;
  const nearestDeadline = filteredGoals
    .filter((goal) => goal.countdownLabel && goal.countdownLabel !== "已到期")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const rankingGoals = [...filteredGoals]
    .filter((goal) => (rankCategory === "全部" ? true : goal.category === rankCategory))
    .sort((a, b) => {
      if (rankSort === "current") return b.current - a.current;
      if (rankSort === "records") return b.recordCount - a.recordCount;
      if (rankSort === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.percent - a.percent;
    });

  return (
    <div className="pb-[calc(92px+env(safe-area-inset-bottom))] pt-4">
      <div className="space-y-4 px-4">
        <div className="px-1 py-2 text-center">
          <h1 className="text-[20px] font-black tracking-[-0.03em] text-slate-900">数据统计</h1>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(155deg,_rgba(248,246,255,0.98),_rgba(255,255,255,0.94)_40%,_rgba(248,249,252,0.98)_100%)] shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
          <div className="border-b border-white/80 px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">Dashboard</p>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-slate-900">
                  {formatNumber(primaryStat)}
                  <span className="ml-1 text-[15px] font-semibold text-slate-500">{getMetricLabel(metric)}</span>
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">当前看板会跟随时间范围、指标和目标筛选一起变化，更适合快速看趋势。</p>
              </div>
              <div className="rounded-[22px] bg-white/92 px-4 py-3 text-right shadow-[0_12px_24px_rgba(148,163,184,0.10)]">
                <p className="text-[12px] text-slate-400">完成率</p>
                <p className="mt-1 text-[28px] font-black tracking-[-0.05em] text-slate-900">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-white/70">
            {[
              { label: "目标总数", value: `${filteredGoals.length}`, tone: "text-slate-900" },
              { label: "已完成", value: `${completedGoals}`, tone: "text-emerald-600" },
              { label: "记录总数", value: `${totalRecordCount}`, tone: "text-violet-600" },
            ].map((item) => (
              <div key={item.label} className="bg-white/85 px-4 py-4 text-center">
                <p className={`text-[28px] font-black tracking-[-0.05em] ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="space-y-3">
            <FilterRow label="时间范围" options={rangeOptions} activeKey={range} onChange={onRangeChange} />
            <FilterRow label="统计指标" options={metricOptions} activeKey={metric} onChange={onMetricChange} />
            <div>
              <p className="mb-2 text-[13px] font-semibold text-slate-500">目标筛选</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onGoalFilterChange("all")} className={chipClass(goalFilter === "all")}>
                  全部目标
                </button>
                {goals.map((goal) => (
                  <button key={goal.id} onClick={() => onGoalFilterChange(goal.id)} className={chipClass(goalFilter === goal.id)}>
                    {goal.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">趋势图</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-500">{getMetricLabel(metric)}</span>
          </div>

          <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,_rgba(250,249,253,0.98),_rgba(255,255,255,0.98))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] text-slate-400">峰值区间</p>
                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                  {strongestBucket.label}
                  {strongestBucket.value > 0 ? ` · ${formatNumber(strongestBucket.value)}` : ""}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 shadow-[0_8px_16px_rgba(148,163,184,0.08)]">
                当前指标：{getMetricLabel(metric)}
              </div>
            </div>

            <svg viewBox="0 0 280 140" className="h-[180px] w-full">
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#c4bfff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#c4bfff" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line key={line} x1="0" x2="280" y1={20 + line * 30} y2={20 + line * 30} stroke="#ece8f4" strokeWidth="1" />
              ))}
              <polyline fill="url(#trendFill)" stroke="none" points={`${trendPoints} 280,140 0,140`} />
              <polyline fill="none" stroke="#7f78da" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={trendPoints} />
              {chartBuckets.map((bucket, index) => {
                const x = (index / Math.max(chartBuckets.length - 1, 1)) * 280;
                const y = 120 - (bucket.value / chartMax) * 120;
                return <circle key={`${bucket.label}-${index}`} cx={x} cy={y} r="4.5" fill="#fff" stroke="#7f78da" strokeWidth="2.5" />;
              })}
            </svg>

            <div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-400">
              {chartBuckets.map((bucket, index) => (
                <span key={`${bucket.label}-${index}`} className="min-w-0 flex-1 truncate text-center">
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-slate-50 px-4 py-4">
              <p className="text-[12px] text-slate-400">领先目标</p>
              <p className="mt-2 truncate text-[15px] font-semibold text-slate-900">{filteredGoals[0]?.title ?? "暂无目标"}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {filteredGoals[0]
                  ? `${filteredGoals[0].percentLabel} · ${formatNumber(filteredGoals[0].current)} / ${formatNumber(filteredGoals[0].target)} ${filteredGoals[0].unit}`
                  : "创建目标后这里会出现重点观察对象"}
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50 px-4 py-4">
              <p className="text-[12px] text-slate-400">最近截止</p>
              <p className="mt-2 truncate text-[15px] font-semibold text-slate-900">{nearestDeadline?.title ?? "暂无截止日期"}</p>
              <p className="mt-1 text-[13px] text-slate-500">{nearestDeadline?.countdownLabel ?? "给目标设置截止日期后，这里会显示倒计时"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">目标排行榜</h2>
            <span className="text-[12px] text-slate-400">按条件筛选排序</span>
          </div>

          <div className="space-y-3">
            <FilterRow label="排序方式" options={rankOptions} activeKey={rankSort} onChange={onRankSortChange} />
            <div>
              <p className="mb-2 text-[13px] font-semibold text-slate-500">分类筛选</p>
              <div className="flex flex-wrap gap-2">
                {["全部", ...categories].map((category) => (
                  <button key={category} onClick={() => onRankCategoryChange(category as Category | "全部")} className={chipClass(rankCategory === category)}>
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {rankingGoals.length === 0 ? (
              <div className="rounded-[20px] bg-slate-50 px-4 py-5 text-[14px] leading-7 text-slate-500">当前筛选下还没有目标数据。</div>
            ) : (
              rankingGoals.map((goal, index) => {
                const theme = getTheme(goal.themeKey);
                return (
                  <button
                    key={goal.id}
                    onClick={() => onOpenGoal(goal.id)}
                    className="w-full rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,_rgba(252,252,253,1),_rgba(247,248,250,0.92))] p-3.5 text-left shadow-[0_10px_24px_rgba(148,163,184,0.06)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black text-slate-400">#{index + 1}</span>
                          <span className={`flex h-8 w-8 items-center justify-center rounded-2xl text-[12px] font-bold ${theme.accentSoft}`}>{goal.icon}</span>
                          <p className="truncate text-[15px] font-semibold text-slate-900">{goal.title}</p>
                        </div>
                        <p className="mt-2 text-[13px] text-slate-500">
                          {formatNumber(goal.current)} / {formatNumber(goal.target)} {goal.unit} · {goal.recordCount} 次记录
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[16px] font-black tracking-[-0.03em] text-slate-800">{goal.percentLabel}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{goal.category}</p>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white">
                      <div className={`h-full rounded-full bg-gradient-to-r ${theme.accent}`} style={{ width: `${goal.percent}%` }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      <BottomNav active="stats" onHome={onHome} onStats={() => undefined} onProfile={onProfile} />
    </div>
  );
}

function ProfileScreen({
  goals,
  entries,
  hasClearedData,
  onHome,
  onStats,
  onExport,
  onImport,
  onClearAll,
}: {
  goals: GoalSummary[];
  entries: Entry[];
  hasClearedData: boolean;
  onHome: () => void;
  onStats: () => void;
  onExport: () => void;
  onImport: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="pb-[calc(92px+env(safe-area-inset-bottom))] pt-4">
      <div className="space-y-4 px-4">
        <div className="px-1 py-2 text-center">
          <h1 className="text-[20px] font-black tracking-[-0.03em] text-slate-900">我的</h1>
        </div>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[20px] bg-slate-50 px-3 py-4">
              <p className="text-[24px] font-black tracking-[-0.05em] text-slate-900">{goals.length}</p>
              <p className="mt-1 text-[12px] text-slate-500">目标数量</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 px-3 py-4">
              <p className="text-[24px] font-black tracking-[-0.05em] text-slate-900">{entries.length}</p>
              <p className="mt-1 text-[12px] text-slate-500">记录数量</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 px-3 py-4">
              <p className="text-[24px] font-black tracking-[-0.05em] text-slate-900">{goals.filter((goal) => goal.completionDate).length}</p>
              <p className="mt-1 text-[12px] text-slate-500">已完成</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <h2 className="text-[16px] font-semibold text-slate-900">数据管理</h2>
          <div className="mt-4 space-y-3">
            <ActionButton title="导出数据" desc="下载当前目标和记录备份 JSON 文件" onClick={onExport} />
            <ActionButton title="导入数据" desc="从备份文件恢复你的目标和记录" onClick={onImport} />
            <ActionButton title="清空全部数据" desc="删除所有目标、记录和本地缓存，不可撤回" onClick={onClearAll} danger />
          </div>
          {hasClearedData && (
            <p className="mt-4 rounded-[18px] bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-700">你当前处于空数据状态，刷新页面也不会恢复任何示例数据。</p>
          )}
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <h2 className="text-[16px] font-semibold text-slate-900">使用说明</h2>
          <div className="mt-4 space-y-3 text-[14px] leading-7 text-slate-500">
            <p>1. 新建目标后会立即写入本地存储。</p>
            <p>2. 记录进度、删除记录、编辑目标、删除目标都会立即保存。</p>
            <p>3. 建议定期导出备份，再进行大规模整理或清空。</p>
            <p>4. 当前版本使用 localStorage，本地浏览器数据不会自动上传到 GitHub。</p>
          </div>
        </section>
      </div>

      <BottomNav active="profile" onHome={onHome} onStats={onStats} onProfile={() => undefined} />
    </div>
  );
}

function CompleteScreen({
  goal,
  onAppend,
  onCreate,
}: {
  goal: GoalSummary | null;
  onAppend: () => void;
  onCreate: () => void;
}) {
  if (!goal) {
    return (
      <div className="pb-10 pt-4">
        <div className="space-y-5 px-4">
          <div className="rounded-[34px] bg-[linear-gradient(180deg,_rgba(251,249,255,0.98),_rgba(247,247,249,0.96))] px-5 pb-8 pt-8 text-center shadow-[0_18px_50px_rgba(206,201,220,0.18)]">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,_rgba(212,208,255,0.72),_rgba(255,255,255,0.18)_55%,_transparent_70%)] text-[72px]">
              ✦
            </div>
            <h1 className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-900">快完成啦</h1>
            <p className="mt-3 text-[16px] leading-8 text-slate-600">当某个目标到达终点时，这里会自动展示完成页和纪念信息。</p>
          </div>

          <button
            onClick={onCreate}
            className="h-14 w-full rounded-[22px] bg-[linear-gradient(135deg,_#7471b8,_#9f9ae3,_#d5d1ff)] text-[16px] font-semibold text-slate-900 shadow-[0_18px_36px_rgba(159,154,227,0.28)]"
          >
            先创建一个新目标
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-4">
      <div className="space-y-5 px-4">
        <div className="rounded-[34px] bg-[linear-gradient(180deg,_rgba(251,249,255,0.98),_rgba(247,247,249,0.96))] px-5 pb-8 pt-8 text-center shadow-[0_18px_50px_rgba(206,201,220,0.18)]">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,_rgba(255,232,171,0.82),_rgba(255,255,255,0.20)_55%,_transparent_70%)] text-[88px]">
            🏆
          </div>
          <h1 className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-900">太棒了！</h1>
          <p className="mt-3 text-[17px] font-semibold leading-8 text-slate-800">
            你已经完成「{goal.title}」
            <br />
            {formatNumber(goal.target)} {goal.unit} 的目标
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
          <div className="text-center">
            <p className="text-[13px] text-slate-400">累计投入</p>
            <p className="mt-2 text-[32px] font-black tracking-[-0.05em] text-slate-900">{formatNumber(goal.current)}</p>
            <p className="text-[14px] text-slate-500">{goal.unit}</p>
          </div>
          <div className="text-center">
            <p className="text-[13px] text-slate-400">完成日期</p>
            <p className="mt-2 text-[20px] font-black tracking-[-0.05em] text-slate-900">{goal.completionDate ? formatFullDate(goal.completionDate) : "尚未完成"}</p>
          </div>
        </section>

        <p className="px-6 text-center text-[14px] leading-7 text-slate-500">这不是口号，而是一段真实积累已经发生的证据。你可以继续追加记录，或者开启下一个长期目标。</p>

        <div className="space-y-3">
          <button
            onClick={onAppend}
            className="h-14 w-full rounded-[22px] bg-[linear-gradient(135deg,_#7471b8,_#9f9ae3,_#d5d1ff)] text-[16px] font-semibold text-slate-900 shadow-[0_18px_36px_rgba(159,154,227,0.28)]"
          >
            继续追加记录
          </button>
          <button onClick={onCreate} className="h-14 w-full rounded-[22px] border border-slate-200 bg-white text-[16px] font-semibold text-slate-700">
            创建新目标
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold text-slate-700">{label}</p>
      {children}
      {helper && <p className="mt-2 text-right text-[12px] text-slate-400">{helper}</p>}
    </div>
  );
}

function TopBar({
  title,
  left,
  right,
  onLeft,
  onRight,
}: {
  title: string;
  left: string;
  right: string;
  onLeft?: () => void;
  onRight?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <button onClick={onLeft} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[24px] text-slate-600">
        {left}
      </button>
      <h1 className="max-w-[220px] truncate text-[17px] font-semibold text-slate-900">{title}</h1>
      <button onClick={onRight} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[22px] text-slate-600">
        {right}
      </button>
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onStats,
  onProfile,
}: {
  active: "home" | "stats" | "profile";
  onHome: () => void;
  onStats: () => void;
  onProfile: () => void;
}) {
  const itemClass = (isActive: boolean) =>
    ["flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[12px] font-medium transition", isActive ? "text-slate-900" : "text-slate-400"].join(" ");

  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto rounded-[26px] border border-white/75 bg-white/92 px-3 py-2 shadow-[0_-8px_30px_rgba(148,163,184,0.14)] backdrop-blur">
        <div className="flex items-center gap-2">
          <button onClick={onHome} className={itemClass(active === "home")}>
            <span className="text-lg">⌂</span>
            <span>首页</span>
          </button>
          <button onClick={onStats} className={itemClass(active === "stats")}>
            <span className="text-lg">◔</span>
            <span>统计</span>
          </button>
          <button onClick={onProfile} className={itemClass(active === "profile")}>
            <span className="text-lg">◡</span>
            <span>我的</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  desc,
  onClick,
  danger,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-[22px] border px-4 py-4 text-left shadow-[0_10px_24px_rgba(148,163,184,0.06)]",
        danger ? "border-rose-100 bg-rose-50/80" : "border-slate-100 bg-[linear-gradient(180deg,_rgba(252,252,253,1),_rgba(247,248,250,0.92))]",
      ].join(" ")}
    >
      <p className={`text-[15px] font-semibold ${danger ? "text-rose-600" : "text-slate-900"}`}>{title}</p>
      <p className="mt-1 text-[13px] leading-6 text-slate-500">{desc}</p>
    </button>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  activeKey,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  activeKey: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.key} onClick={() => onChange(option.key)} className={chipClass(activeKey === option.key)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
