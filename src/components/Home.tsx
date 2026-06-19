import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { viewGoal } from "../lib/scheduler";
import { greeting } from "../lib/date";
import type { Goal } from "../types";
import ProgressCells from "./ProgressCells";
import TaskRow from "./TaskRow";
import Confetti from "./Confetti";

interface Props {
  onNewGoal: () => void;
  onAdjust: (goal: Goal) => void;
}

export default function Home({ onNewGoal, onAdjust }: Props) {
  const goals = useStore((s) => s.goals);
  const focusGoalId = useStore((s) => s.focusGoalId);
  const setFocus = useStore((s) => s.setFocus);
  const toggleTask = useStore((s) => s.toggleTask);
  const skipToday = useStore((s) => s.skipToday);
  const unskipToday = useStore((s) => s.unskipToday);

  const focus = goals.find((g) => g.id === focusGoalId) ?? goals[0];
  const view = focus ? viewGoal(focus) : null;

  // 撒花：今天的配额刚刚清空时放一次
  const [burst, setBurst] = useState(false);
  const wasDone = useRef(false);
  useEffect(() => {
    const nowDone = !!view && (view.todayDone || view.finished);
    if (nowDone && !wasDone.current) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 2600);
      wasDone.current = true;
      return () => clearTimeout(t);
    }
    if (!nowDone) wasDone.current = false;
  }, [view?.todayDone, view?.finished]);

  if (!focus || !view) return null;

  const pct = Math.round(view.progress * 100);
  const todayTasks = focus.tasks.filter((t) => view.todayTaskIds.includes(t.id));
  const others = goals.filter((g) => g.id !== focus.id);

  return (
    <div className="mx-auto min-h-full w-full max-w-md px-5 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      {burst && <Confetti />}

      <p className="mb-8 text-[15px] text-muted">{greeting()}，今天只看这一格。</p>

      {/* 目标 + 总进度 */}
      <div className="mb-7">
        <div className="mb-3 flex items-end justify-between">
          <h1 className="font-display text-[26px] font-bold leading-tight">{focus.name}</h1>
          <span className="font-display text-4xl font-extrabold tnum text-sage">{pct}%</span>
        </div>
        <ProgressCells total={view.total} done={view.doneCount} />
        <p className="mt-3 text-[13px] text-muted tnum">
          已完成 {view.doneCount} / {view.total} · 还剩 {view.daysLeft} 天
        </p>
      </div>

      {/* 今天 */}
      <section className="mb-6">
        {view.finished ? (
          <Banner emoji="🎉" title="整个目标完成了" sub="你把它一格一格走完了。" />
        ) : view.todayDone ? (
          <Banner emoji="🎉" title="今天完成了" sub="到此为止，明天系统会自动安排。" />
        ) : view.skippedToday ? (
          <div className="rounded-3xl border border-line bg-card p-6 text-center">
            <p className="text-[17px]">今天先到这儿。</p>
            <p className="mt-1 text-sm text-muted">没关系，剩下的会自动摊到后面的日子。</p>
            <button
              onClick={() => unskipToday(focus.id)}
              className="mt-4 text-sm font-medium text-sage"
            >
              还是做一点 →
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">今天</h2>
            <div className="flex flex-col gap-2.5">
              {todayTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggleTask(focus.id, t.id)} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 次要操作：安静、低存在感 */}
      {!view.finished && !view.todayDone && !view.skippedToday && (
        <div className="mb-10 flex items-center justify-center gap-6 text-sm text-muted">
          <button onClick={() => skipToday(focus.id)} className="transition hover:text-ink">
            今天先到这儿
          </button>
          <span className="text-line">·</span>
          <button onClick={() => onAdjust(focus)} className="transition hover:text-ink">
            调整计划
          </button>
        </div>
      )}

      {/* 其他目标：折叠，点击切换 */}
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">其他目标</h2>
          <div className="flex flex-col gap-2">
            {others.map((g) => {
              const v = viewGoal(g);
              return (
                <button
                  key={g.id}
                  onClick={() => setFocus(g.id)}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left transition active:scale-[0.99]"
                >
                  <span className="flex-1 truncate text-[15px]">{g.name}</span>
                  <span className="font-display text-base font-bold tnum text-muted">
                    {Math.round(v.progress * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 新目标 */}
      <button
        onClick={onNewGoal}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 h-14 w-[min(28rem,calc(100%-2.5rem))] -translate-x-1/2 rounded-2xl bg-ink text-[15px] font-semibold text-white shadow-soft transition active:scale-[0.99]"
      >
        新目标
      </button>
    </div>
  );
}

function Banner({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-sage-soft bg-sage-soft/50 p-7 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}
