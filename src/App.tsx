import { useEffect, useMemo, useState, type ReactNode } from "react";

type Screen = "home" | "detail" | "create" | "stats" | "complete";
type ThemeKey = "violet" | "green" | "orange" | "blue" | "rose";

type Goal = {
  id: string;
  title: string;
  unit: string;
  target: number;
  description: string;
  dueDate: string;
  themeKey: ThemeKey;
  icon: string;
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
};

type GoalSummary = Goal & {
  current: number;
  percent: number;
  percentLabel: string;
  recentLabel: string;
  completionDate: string | null;
  countdownLabel: string | null;
};

type ThemePreset = {
  key: ThemeKey;
  label: string;
  accent: string;
  accentSoft: string;
  cardGlow: string;
};

const STORAGE_KEY = "life-os-goals-v1";
const commonUnits = ["小时", "次", "页", "公里", "天", "篇"];
const presetIcons = ["芽", "语", "动", "读", "写", "跑"];

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
  icon: "芽",
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoAt(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const seedGoals: Goal[] = [
  {
    id: "goal-english",
    title: "英语口语输出训练",
    unit: "小时",
    target: 100,
    description: "每天积累一点输出，重点是敢说、持续说。",
    dueDate: "",
    themeKey: "violet",
    icon: "语",
    createdAt: isoAt(-30, 9, 0),
  },
  {
    id: "goal-sport",
    title: "运动恢复体力",
    unit: "小时",
    target: 60,
    description: "保持稳定运动，让精力慢慢恢复起来。",
    dueDate: isoAt(7, 23, 59).slice(0, 10),
    themeKey: "green",
    icon: "动",
    createdAt: isoAt(-25, 10, 20),
  },
  {
    id: "goal-reading",
    title: "阅读输入积累",
    unit: "小时",
    target: 80,
    description: "用高质量输入，带动表达和思考。",
    dueDate: isoAt(16, 23, 59).slice(0, 10),
    themeKey: "orange",
    icon: "读",
    createdAt: isoAt(-20, 20, 0),
  },
];

const seedEntries: Entry[] = [
  { id: createId("entry"), goalId: "goal-english", amount: 1.5, note: "跟读和自由对话", createdAt: isoAt(-6, 18, 30) },
  { id: createId("entry"), goalId: "goal-english", amount: 1, note: "AI 口语对话练习", createdAt: isoAt(-5, 20, 10) },
  { id: createId("entry"), goalId: "goal-english", amount: 2, note: "复述一篇英文播客", createdAt: isoAt(-4, 7, 45) },
  { id: createId("entry"), goalId: "goal-english", amount: 4, note: "情景口语练习", createdAt: isoAt(-3, 19, 50) },
  { id: createId("entry"), goalId: "goal-english", amount: 24, note: "本周集中输出训练", createdAt: isoAt(-1, 21, 15) },
  { id: createId("entry"), goalId: "goal-sport", amount: 12, note: "快走和舒展训练", createdAt: isoAt(-7, 20, 15) },
  { id: createId("entry"), goalId: "goal-sport", amount: 18, note: "健身房力量训练", createdAt: isoAt(-4, 19, 20) },
  { id: createId("entry"), goalId: "goal-sport", amount: 15, note: "慢跑和拉伸", createdAt: isoAt(-2, 8, 10) },
  { id: createId("entry"), goalId: "goal-reading", amount: 5, note: "读完一本访谈集", createdAt: isoAt(-8, 21, 0) },
  { id: createId("entry"), goalId: "goal-reading", amount: 3, note: "读论文并做笔记", createdAt: isoAt(-5, 22, 0) },
  { id: createId("entry"), goalId: "goal-reading", amount: 4, note: "晨读一小时，晚间复盘三小时", createdAt: isoAt(-2, 6, 50) },
];

function loadInitialState() {
  if (typeof window === "undefined") {
    return {
      goals: seedGoals,
      entries: seedEntries,
      selectedGoalId: seedGoals[0]?.id ?? null,
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      goals: seedGoals,
      entries: seedEntries,
      selectedGoalId: seedGoals[0]?.id ?? null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      goals?: Goal[];
      entries?: Entry[];
      selectedGoalId?: string | null;
    };

    return {
      goals: parsed.goals?.length ? parsed.goals : seedGoals,
      entries: parsed.entries ?? seedEntries,
      selectedGoalId: parsed.selectedGoalId ?? parsed.goals?.[0]?.id ?? seedGoals[0]?.id ?? null,
    };
  } catch {
    return {
      goals: seedGoals,
      entries: seedEntries,
      selectedGoalId: seedGoals[0]?.id ?? null,
    };
  }
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, "");
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatFullDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatRelativeLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
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
  const dayMs = 24 * 60 * 60 * 1000;

  if (diff < 0) return "已到期";
  if (diff < dayMs) return "今天截止";

  const days = Math.ceil(diff / dayMs);
  return `还剩 ${days} 天`;
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

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        goals,
        entries,
        selectedGoalId,
      }),
    );
  }, [entries, goals, selectedGoalId]);

  useEffect(() => {
    if (!goals.length) {
      setSelectedGoalId(null);
      return;
    }

    if (!selectedGoalId || !goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const goalSummaries = useMemo<GoalSummary[]>(() => {
    return goals
      .map((goal) => {
        const total = entries
          .filter((entry) => entry.goalId === goal.id)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const percent = goal.target > 0 ? Math.min((total / goal.target) * 100, 100) : 0;
        const goalEntries = getGoalEntries(entries, goal.id);
        const completionDate = getGoalCompletionDate(goal, entries);

        return {
          ...goal,
          current: total,
          percent,
          percentLabel: `${formatNumber(percent)}%`,
          recentLabel: goalEntries[0] ? formatRelativeLabel(goalEntries[0].createdAt) : "还没有记录",
          completionDate,
          countdownLabel: getCountdownLabel(goal.dueDate),
        };
      })
      .sort((a, b) => {
        const completionDiff = Number(Boolean(a.completionDate)) - Number(Boolean(b.completionDate));
        if (completionDiff !== 0) return completionDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [entries, goals]);

  const activeGoal = goalSummaries.find((goal) => goal.id === selectedGoalId) ?? goalSummaries[0] ?? null;
  const activeGoalEntries = activeGoal ? getGoalEntries(entries, activeGoal.id) : [];

  const latestCompletedGoal = useMemo(() => {
    const completed = goalSummaries
      .filter((goal) => goal.completionDate)
      .sort((a, b) => new Date(b.completionDate ?? 0).getTime() - new Date(a.completionDate ?? 0).getTime());
    return completed[0] ?? null;
  }, [goalSummaries]);

  const celebrationGoal =
    goalSummaries.find((goal) => goal.id === completionGoalId) ??
    latestCompletedGoal ??
    (activeGoal?.completionDate ? activeGoal : null);

  const stats = useMemo(() => {
    const totalGoals = goalSummaries.length;
    const completedGoals = goalSummaries.filter((goal) => goal.current >= goal.target).length;
    const totalInvested = entries.reduce((sum, entry) => sum + entry.amount, 0);

    const trendDays = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const value = entries
        .filter((entry) => {
          const time = new Date(entry.createdAt).getTime();
          return time >= date.getTime() && time < nextDate.getTime();
        })
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        value,
      };
    });

    return {
      totalGoals,
      completedGoals,
      totalInvested,
      trendDays,
    };
  }, [entries, goalSummaries]);

  const trendPoints = useMemo(() => {
    const width = 280;
    const height = 120;
    const max = Math.max(...stats.trendDays.map((item) => item.value), 1);

    return stats.trendDays
      .map((item, index) => {
        const x = (index / Math.max(stats.trendDays.length - 1, 1)) * width;
        const y = height - (item.value / max) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [stats.trendDays]);

  const clearGoalDraft = () => setGoalDraft(initialGoalDraft);

  const openGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setScreen("detail");
  };

  const handleSaveGoal = () => {
    const title = goalDraft.title.trim();
    const target = Number(goalDraft.target);
    const unit = goalDraft.unit.trim();
    const icon = goalDraft.icon.trim();

    if (!title) {
      window.alert("请先填写目标名称。");
      return;
    }

    if (!unit) {
      window.alert("请填写单位，可以使用常用单位，也可以自定义。");
      return;
    }

    if (!icon) {
      window.alert("请填写图标字牌，可以自定义 1 到 2 个字。");
      return;
    }

    if (!Number.isFinite(target) || target <= 0) {
      window.alert("总目标需要是大于 0 的数字。");
      return;
    }

    const newGoal: Goal = {
      id: createId("goal"),
      title,
      unit,
      target,
      description: goalDraft.description.trim(),
      dueDate: goalDraft.dueDate,
      themeKey: goalDraft.themeKey,
      icon: icon.slice(0, 2),
      createdAt: new Date().toISOString(),
    };

    setGoals((current) => [newGoal, ...current]);
    setSelectedGoalId(newGoal.id);
    clearGoalDraft();
    setScreen("detail");
  };

  const handleAddRecord = () => {
    if (!activeGoal) return;

    const amount = Number(recordAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("请输入大于 0 的进度数值。");
      return;
    }

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

    if (previousTotal < activeGoal.target && previousTotal + amount >= activeGoal.target) {
      setCompletionGoalId(activeGoal.id);
      setScreen("complete");
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    const targetEntry = entries.find((entry) => entry.id === entryId);
    if (!targetEntry) return;

    const confirmed = window.confirm("确认删除这条记录吗？");
    if (!confirmed) return;

    setEntries((current) => current.filter((entry) => entry.id !== entryId));
  };

  const handleResetDemoData = () => {
    const confirmed = window.confirm("要恢复为示例数据吗？这会覆盖当前本地保存内容。");
    if (!confirmed) return;

    setGoals(seedGoals);
    setEntries(seedEntries);
    setSelectedGoalId(seedGoals[0]?.id ?? null);
    setCompletionGoalId(null);
    clearGoalDraft();
    setRecordAmount("1");
    setRecordNote("");
    setScreen("home");
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(245,241,255,0.95)_36%,_rgba(249,249,252,0.98)_100%)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4">
        <PreviewTabs screen={screen} onChange={setScreen} />

        <div className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/72 shadow-[0_30px_100px_rgba(160,160,176,0.16)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,_rgba(201,193,255,0.24),_transparent_72%)]" />
          <div className="relative min-h-[880px]">
            {screen === "home" && (
              <HomeScreen
                goals={goalSummaries}
                onOpenGoal={openGoal}
                onCreate={() => setScreen("create")}
                onStats={() => setScreen("stats")}
                onResetDemoData={handleResetDemoData}
              />
            )}
            {screen === "detail" && (
              <DetailScreen
                goal={activeGoal}
                entries={activeGoalEntries}
                recordAmount={recordAmount}
                recordNote={recordNote}
                onBack={() => setScreen("home")}
                onRecordAmountChange={setRecordAmount}
                onRecordNoteChange={setRecordNote}
                onSaveRecord={handleAddRecord}
                onDeleteEntry={handleDeleteEntry}
              />
            )}
            {screen === "create" && (
              <CreateScreen
                draft={goalDraft}
                onCancel={() => setScreen("home")}
                onChange={setGoalDraft}
                onSave={handleSaveGoal}
              />
            )}
            {screen === "stats" && (
              <StatsScreen
                goals={goalSummaries}
                totalGoals={stats.totalGoals}
                completedGoals={stats.completedGoals}
                totalInvested={stats.totalInvested}
                trendLabels={stats.trendDays.map((item) => item.label)}
                trendValues={stats.trendDays.map((item) => item.value)}
                trendPoints={trendPoints}
                onHome={() => setScreen("home")}
                onOpenGoal={openGoal}
              />
            )}
            {screen === "complete" && (
              <CompleteScreen
                goal={celebrationGoal}
                onAppend={() => {
                  if (celebrationGoal) setSelectedGoalId(celebrationGoal.id);
                  setScreen("detail");
                }}
                onCreate={() => setScreen("create")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTabs({
  screen,
  onChange,
}: {
  screen: Screen;
  onChange: (screen: Screen) => void;
}) {
  const tabs: { id: Screen; label: string }[] = [
    { id: "home", label: "首页" },
    { id: "detail", label: "目标详情" },
    { id: "create", label: "新建目标" },
    { id: "stats", label: "统计页" },
    { id: "complete", label: "完成页" },
  ];

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/78 p-2 shadow-[0_10px_40px_rgba(148,163,184,0.12)] backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              "min-w-0 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]",
              screen === tab.id
                ? "bg-[linear-gradient(135deg,_#7f78da,_#a29bff,_#d8d4ff)] text-slate-900 shadow-[0_12px_28px_rgba(162,155,255,0.30)]"
                : "bg-white/90 text-slate-500",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({
  goals,
  onOpenGoal,
  onCreate,
  onStats,
  onResetDemoData,
}: {
  goals: GoalSummary[];
  onOpenGoal: (goalId: string) => void;
  onCreate: () => void;
  onStats: () => void;
  onResetDemoData: () => void;
}) {
  return (
    <div className="pb-[calc(92px+env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <StatusBar />
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
            <button
              onClick={onResetDemoData}
              className="mt-1 h-10 w-10 shrink-0 rounded-full bg-white/82 text-[18px] text-slate-500 shadow-[0_10px_22px_rgba(148,163,184,0.12)]"
              title="恢复示例数据"
            >
              ↺
            </button>
          </div>

          <div className="relative mt-6 flex items-end justify-between">
            <div className="space-y-2">
              <div className="h-2 w-10 rounded-full bg-violet-200/70" />
              <div className="h-2 w-16 rounded-full bg-rose-100/80" />
            </div>
            <div className="relative h-24 w-28">
              <div className="absolute bottom-0 right-4 h-16 w-16 rounded-t-[32px] rounded-b-[18px] bg-[linear-gradient(180deg,_#4c4769,_#232235)]" />
              <div className="absolute bottom-12 right-10 h-8 w-8 rounded-full bg-[#efd4cb]" />
              <div className="absolute bottom-8 right-4 h-14 w-14 rounded-full bg-[radial-gradient(circle_at_32%_32%,_#bab4ff,_#746cb7)]" />
              <div className="absolute bottom-0 left-1 h-12 w-20 rounded-[50%] bg-white/40 blur-md" />
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
              <p className="mt-2 text-[14px] leading-7 text-slate-500">先创建一个想长期积累的方向，我们再把它慢慢填满。</p>
            </section>
          ) : (
            goals.map((goal) => {
              const theme = getTheme(goal.themeKey);

              return (
                <article
                  key={goal.id}
                  className="rounded-[26px] border border-white/80 bg-white/88 p-4 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold ${theme.accentSoft}`}>
                      {goal.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-[17px] font-semibold text-slate-900">{goal.title}</h2>
                          <p className="mt-1 text-[13px] text-slate-400">
                            目标 {formatNumber(goal.target)} {goal.unit}
                          </p>
                        </div>
                        <span className="shrink-0 text-[14px] font-semibold text-slate-500">{goal.percentLabel}</span>
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
                        {goal.dueDate && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">截止 {formatShortDate(goal.dueDate)}</span>
                        )}
                        {goal.countdownLabel && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">{goal.countdownLabel}</span>
                        )}
                        {goal.completionDate && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">已完成</span>
                        )}
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

      <BottomNav active="home" onHome={() => undefined} onStats={onStats} />
    </div>
  );
}

function DetailScreen({
  goal,
  entries,
  recordAmount,
  recordNote,
  onBack,
  onRecordAmountChange,
  onRecordNoteChange,
  onSaveRecord,
  onDeleteEntry,
}: {
  goal: GoalSummary | null;
  entries: Entry[];
  recordAmount: string;
  recordNote: string;
  onBack: () => void;
  onRecordAmountChange: (value: string) => void;
  onRecordNoteChange: (value: string) => void;
  onSaveRecord: () => void;
  onDeleteEntry: (entryId: string) => void;
}) {
  if (!goal) {
    return (
      <div className="pb-10 pt-[max(14px,env(safe-area-inset-top))]">
        <StatusBar />
        <div className="space-y-4 px-4">
          <TopBar title="目标详情" left="‹" right="⋯" onLeft={onBack} />
          <section className="rounded-[28px] border border-white/80 bg-white/92 p-6 text-center shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
            <p className="text-[16px] font-semibold text-slate-900">还没有可查看的目标</p>
            <p className="mt-2 text-[14px] leading-7 text-slate-500">去首页先创建一个目标，这里就会显示真实进度和历史记录。</p>
          </section>
        </div>
      </div>
    );
  }

  const theme = getTheme(goal.themeKey);
  const whole = Math.floor(goal.current);
  const partial = goal.current - whole;

  return (
    <div className="pb-10 pt-[max(14px,env(safe-area-inset-top))]">
      <StatusBar />
      <div className="space-y-4 px-4">
        <TopBar title={goal.title} left="‹" right="⋯" onLeft={onBack} />

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-slate-500">完成进度</p>
              <p className="mt-2 text-[16px] text-slate-500">
                <span className="text-[52px] font-black tracking-[-0.06em] text-slate-900">{formatNumber(goal.current)}</span>
                <span className="ml-1">/ {formatNumber(goal.target)} {goal.unit}</span>
              </p>
            </div>
            <span className="text-[18px] font-black text-slate-700">{goal.percentLabel}</span>
          </div>

          {(goal.dueDate || goal.countdownLabel) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
              {goal.dueDate && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">截止 {formatFullDate(goal.dueDate)}</span>
              )}
              {goal.countdownLabel && (
                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-600">{goal.countdownLabel}</span>
              )}
            </div>
          )}

          <p className="mt-3 text-[13px] leading-6 text-slate-500">每一次记录，都是在给未来的自己留下一点真实证据。</p>

          <div className="mt-5 grid grid-cols-10 gap-1.5">
            {Array.from({ length: 100 }).map((_, index) => {
              const filled = index < whole;
              const partialCell = index === whole && partial > 0;

              return (
                <div key={index} className="relative aspect-square overflow-hidden rounded-[6px] bg-[#efedf4]">
                  {(filled || partialCell) && (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-[6px] bg-gradient-to-b ${theme.accent}`}
                      style={{ width: filled ? "100%" : `${partial * 100}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className={`h-3 w-3 rounded bg-gradient-to-r ${theme.accent}`} />
              已完成 {formatNumber(goal.current)}
            </span>
            <span className="inline-flex items-center gap-2">
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
            <div className="flex w-24 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-[15px] text-slate-600">
              {goal.unit}
            </div>
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
            <div className="rounded-[20px] bg-slate-50 px-4 py-5 text-[14px] leading-7 text-slate-500">
              还没有历史记录。保存第一条后，这里会自动按时间倒序展示。
            </div>
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
                      <p className="mt-2 break-words text-[14px] leading-7 text-slate-600">
                        {entry.note || "这次没有填写备注。"}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="shrink-0 rounded-full bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-500"
                    >
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
  onCancel,
  onChange,
  onSave,
}: {
  draft: GoalDraft;
  onCancel: () => void;
  onChange: (draft: GoalDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <StatusBar />
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between px-1 py-1 text-[16px] font-semibold">
          <button onClick={onCancel} className="text-slate-600">
            取消
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">新建目标</h1>
          <button onClick={onSave} className="text-slate-900">
            保存
          </button>
        </div>

        <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,_#f7f4ff,_#d9d2ff)] text-[30px] font-bold text-slate-700 shadow-inner">
              {draft.icon || "芽"}
            </div>
            <p className="mt-3 text-[15px] font-medium text-slate-600">图标字牌支持预设，也支持你直接自定义</p>
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

            <Field label="单位">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {commonUnits.map((unit) => (
                    <button
                      key={unit}
                      onClick={() => onChange({ ...draft, unit })}
                      className={[
                        "rounded-full border px-3 py-2 text-[13px] font-semibold transition",
                        draft.unit === unit
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600",
                      ].join(" ")}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                <input
                  value={draft.unit}
                  onChange={(event) => onChange({ ...draft, unit: event.target.value })}
                  className="h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none placeholder:text-slate-300"
                  placeholder="也可以输入自定义单位，例如：节、组、单词"
                  list="unit-suggestions"
                />
                <datalist id="unit-suggestions">
                  {commonUnits.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
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
                        draft.icon === icon
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600",
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
                  placeholder="也可以输入自定义字牌，例如：画、背、琴"
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
                    <span
                      className={[
                        "h-6 w-6 rounded-full bg-gradient-to-br",
                        theme.accent,
                        draft.themeKey === theme.key ? "ring-4 ring-slate-100" : "",
                      ].join(" ")}
                    />
                    {theme.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(251,250,255,0.96),_rgba(247,247,249,0.96))] p-4 shadow-[0_12px_30px_rgba(148,163,184,0.08)]">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">灯</div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-slate-700">小提示</p>
              <p className="mt-1 break-words text-[14px] leading-6 text-slate-500">
                目标可以很轻，不用设得太满。先让自己愿意回来记录，往往比一开始就设太难更重要。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatsScreen({
  goals,
  totalGoals,
  completedGoals,
  totalInvested,
  trendLabels,
  trendValues,
  trendPoints,
  onHome,
  onOpenGoal,
}: {
  goals: GoalSummary[];
  totalGoals: number;
  completedGoals: number;
  totalInvested: number;
  trendLabels: string[];
  trendValues: number[];
  trendPoints: string;
  onHome: () => void;
  onOpenGoal: (goalId: string) => void;
}) {
  const chartMax = Math.max(...trendValues, 1);
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const weeklyTotal = trendValues.reduce((sum, value) => sum + value, 0);
  const dailyAverage = weeklyTotal > 0 ? weeklyTotal / Math.max(trendValues.length, 1) : 0;
  const strongestDay = trendValues.reduce(
    (best, value, index) => (value > best.value ? { value, label: trendLabels[index] ?? "" } : best),
    { value: 0, label: trendLabels[0] ?? "" },
  );
  const topGoal = goals.reduce<GoalSummary | null>((best, goal) => {
    if (!best) return goal;
    return goal.percent > best.percent ? goal : best;
  }, null);
  const nearestDeadlineGoal = goals
    .filter((goal) => goal.dueDate && goal.countdownLabel && goal.countdownLabel !== "已到期")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="pb-[calc(92px+env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <StatusBar />
      <div className="space-y-4 px-4">
        <div className="px-1 py-2 text-center">
          <h1 className="text-[20px] font-black tracking-[-0.03em] text-slate-900">数据统计</h1>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(155deg,_rgba(248,246,255,0.98),_rgba(255,255,255,0.94)_40%,_rgba(248,249,252,0.98)_100%)] shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
          <div className="border-b border-white/80 px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">Overview</p>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-slate-900">
                  {formatNumber(totalInvested)}
                  <span className="ml-1 text-[15px] font-semibold text-slate-500">累计投入</span>
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  这周累计 {formatNumber(weeklyTotal)}，平均每天 {formatNumber(dailyAverage)}。
                </p>
              </div>
              <div className="rounded-[22px] bg-white/92 px-4 py-3 text-right shadow-[0_12px_24px_rgba(148,163,184,0.10)]">
                <p className="text-[12px] text-slate-400">完成率</p>
                <p className="mt-1 text-[28px] font-black tracking-[-0.05em] text-slate-900">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-white/70">
            {[
              { label: "目标总数", value: `${totalGoals}`, tone: "text-slate-900" },
              { label: "已完成", value: `${completedGoals}`, tone: "text-emerald-600" },
              { label: "最佳单日", value: strongestDay.value > 0 ? formatNumber(strongestDay.value) : "0", tone: "text-violet-600" },
            ].map((item) => (
              <div key={item.label} className="bg-white/85 px-4 py-4 text-center">
                <p className={`text-[28px] font-black tracking-[-0.05em] ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">近 7 天投入趋势</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-500">自动统计</span>
          </div>

          <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,_rgba(250,249,253,0.98),_rgba(255,255,255,0.98))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] text-slate-400">峰值日期</p>
                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                  {strongestDay.label || "本周暂无"}
                  {strongestDay.value > 0 ? ` · ${formatNumber(strongestDay.value)}` : ""}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 shadow-[0_8px_16px_rgba(148,163,184,0.08)]">
                平均 {formatNumber(dailyAverage)} / 天
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
              {trendValues.map((value, index) => {
                const x = (index / Math.max(trendValues.length - 1, 1)) * 280;
                const y = 120 - (value / chartMax) * 120;
                return <circle key={trendLabels[index]} cx={x} cy={y} r="4.5" fill="#fff" stroke="#7f78da" strokeWidth="2.5" />;
              })}
            </svg>

            <div className="mt-2 flex justify-between text-[12px] text-slate-400">
              {trendLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-slate-50 px-4 py-4">
              <p className="text-[12px] text-slate-400">领先目标</p>
              <p className="mt-2 truncate text-[15px] font-semibold text-slate-900">{topGoal?.title ?? "暂无目标"}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {topGoal ? `${topGoal.percentLabel} · ${formatNumber(topGoal.current)} / ${formatNumber(topGoal.target)} ${topGoal.unit}` : "等你开始第一条记录"}
              </p>
            </div>
            <div className="rounded-[20px] bg-slate-50 px-4 py-4">
              <p className="text-[12px] text-slate-400">最近截止</p>
              <p className="mt-2 truncate text-[15px] font-semibold text-slate-900">{nearestDeadlineGoal?.title ?? "暂无截止时间"}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {nearestDeadlineGoal ? `${formatShortDate(nearestDeadlineGoal.dueDate)} · ${nearestDeadlineGoal.countdownLabel}` : "给目标设置截止时间后会显示"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(148,163,184,0.1)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">目标完成进度</h2>
            <span className="text-[12px] text-slate-400">按完成度查看</span>
          </div>

          <div className="space-y-4">
            {goals.map((goal) => {
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
                        <span className={`flex h-8 w-8 items-center justify-center rounded-2xl text-[12px] font-bold ${theme.accentSoft}`}>
                          {goal.icon}
                        </span>
                        <p className="truncate text-[15px] font-semibold text-slate-900">{goal.title}</p>
                      </div>
                      <p className="mt-2 text-[13px] text-slate-500">
                        {formatNumber(goal.current)} / {formatNumber(goal.target)} {goal.unit}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[16px] font-black tracking-[-0.03em] text-slate-800">{goal.percentLabel}</p>
                      {goal.countdownLabel && <p className="mt-1 text-[11px] text-slate-400">{goal.countdownLabel}</p>}
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white">
                    <div className={`h-full rounded-full bg-gradient-to-r ${theme.accent}`} style={{ width: `${goal.percent}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-500">最近：{goal.recentLabel}</span>
                    {goal.dueDate && <span className="rounded-full bg-white px-2.5 py-1 text-slate-500">截止：{formatShortDate(goal.dueDate)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <BottomNav active="stats" onHome={onHome} onStats={() => undefined} />
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
      <div className="pb-10 pt-[max(14px,env(safe-area-inset-top))]">
        <StatusBar />
        <div className="space-y-5 px-4">
          <div className="rounded-[34px] bg-[linear-gradient(180deg,_rgba(251,249,255,0.98),_rgba(247,247,249,0.96))] px-5 pb-8 pt-8 text-center shadow-[0_18px_50px_rgba(206,201,220,0.18)]">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,_rgba(212,208,255,0.72),_rgba(255,255,255,0.18)_55%,_transparent_70%)] text-[72px]">
              ○
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

  const completionDate = goal.completionDate ? formatFullDate(goal.completionDate) : "尚未完成";

  return (
    <div className="pb-10 pt-[max(14px,env(safe-area-inset-top))]">
      <StatusBar />
      <div className="space-y-5 px-4">
        <div className="rounded-[34px] bg-[linear-gradient(180deg,_rgba(251,249,255,0.98),_rgba(247,247,249,0.96))] px-5 pb-8 pt-8 text-center shadow-[0_18px_50px_rgba(206,201,220,0.18)]">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,_rgba(255,232,171,0.82),_rgba(255,255,255,0.20)_55%,_transparent_70%)] text-[88px]">
            奖
          </div>
          <h1 className="mt-2 text-[26px] font-black tracking-[-0.04em] text-slate-900">太棒了</h1>
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
            <p className="mt-2 text-[20px] font-black tracking-[-0.05em] text-slate-900">{completionDate}</p>
          </div>
        </section>

        <p className="px-6 text-center text-[14px] leading-7 text-slate-500">
          这不是句号，而是一段积累已经被你真正完成的证据。你可以继续追加记录，或者开启下一个长期目标。
        </p>

        <div className="space-y-3">
          <button
            onClick={onAppend}
            className="h-14 w-full rounded-[22px] bg-[linear-gradient(135deg,_#7471b8,_#9f9ae3,_#d5d1ff)] text-[16px] font-semibold text-slate-900 shadow-[0_18px_36px_rgba(159,154,227,0.28)]"
          >
            继续追加记录
          </button>
          <button
            onClick={onCreate}
            className="h-14 w-full rounded-[22px] border border-slate-200 bg-white text-[16px] font-semibold text-slate-700"
          >
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
}: {
  title: string;
  left: string;
  right: string;
  onLeft?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <button onClick={onLeft} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[24px] text-slate-600">
        {left}
      </button>
      <h1 className="max-w-[220px] truncate text-[17px] font-semibold text-slate-900">{title}</h1>
      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[22px] text-slate-600">
        {right}
      </button>
    </div>
  );
}

function BottomNav({
  active,
  onHome,
  onStats,
}: {
  active: "home" | "stats";
  onHome: () => void;
  onStats: () => void;
}) {
  const itemClass = (isActive: boolean) =>
    [
      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[12px] font-medium transition",
      isActive ? "text-slate-900" : "text-slate-400",
    ].join(" ");

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
          <button className={itemClass(false)}>
            <span className="text-lg">○</span>
            <span>我的</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pb-3 pt-1 text-[15px] font-semibold text-slate-900">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="block h-2.5 w-4 rounded-sm border border-slate-900" />
        <span className="block h-2.5 w-3 rounded-sm bg-slate-900" />
        <span className="block h-2.5 w-5 rounded-[3px] border border-slate-900" />
      </div>
    </div>
  );
}
