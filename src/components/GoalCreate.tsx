import { useState } from "react";
import { useStore } from "../store/useStore";
import { decompose } from "../lib/ai";
import { spanDays, todayStr } from "../lib/date";
import type { Goal } from "../types";

interface Props {
  editing?: Goal;
  onClose: () => void;
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return todayStr(d);
}

export default function GoalCreate({ editing, onClose }: Props) {
  const addGoal = useStore((s) => s.addGoal);
  const replan = useStore((s) => s.replan);
  const setFocus = useStore((s) => s.setFocus);

  const [name, setName] = useState(editing?.name ?? "");
  const [deadline, setDeadline] = useState(editing?.deadline ?? defaultDeadline());
  const [maxPerDay, setMaxPerDay] = useState(editing?.maxPerDay ?? 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editing;
  const canSubmit = name.trim().length > 0 && !!deadline && maxPerDay >= 1 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const createdAt = editing?.createdAt ?? Date.now();
      const days = spanDays(createdAt, deadline);
      const { plan, usedAI } = await decompose(name.trim(), days, maxPerDay);

      if (isEdit) {
        replan(editing!.id, plan, { name, deadline, maxPerDay });
      } else {
        const id = addGoal({ name, deadline, maxPerDay }, plan);
        setFocus(id);
      }
      if (!usedAI) {
        // 兜底计划仍然可用，提示一下即可，不阻断
        // eslint-disable-next-line no-console
        console.info("未检测到 AI 配置，已用本地拆解。配置 API key 可拆得更细。");
      }
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "拆解失败，稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/20 px-4 pb-0 sm:items-center sm:pb-4">
      <div className="w-full max-w-md animate-rise rounded-t-3xl bg-paper p-6 shadow-soft sm:rounded-3xl">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">
            {isEdit ? "调整计划" : "新目标"}
          </h2>
          <button onClick={onClose} className="text-sm text-muted">
            取消
          </button>
        </div>

        <label className="mb-5 block">
          <span className="mb-2 block text-sm text-muted">想完成什么</span>
          <input
            autoFocus={!isEdit}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：一个月后考英语"
            className="w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-[17px] outline-none focus:border-sage"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-sm text-muted">截止日期</span>
          <input
            type="date"
            value={deadline}
            min={todayStr()}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-[17px] outline-none focus:border-sage"
          />
        </label>

        <div className="mb-7">
          <span className="mb-2 block text-sm text-muted">每天最多几件事</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPerDay(n)}
                className={[
                  "h-12 flex-1 rounded-2xl border text-lg tnum transition",
                  maxPerDay === n
                    ? "border-sage bg-sage-soft text-ink"
                    : "border-line bg-card text-muted",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-amber/15 px-4 py-3 text-sm text-ink">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-sage text-[17px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          {busy ? "正在拆解…" : isEdit ? "重新拆解" : "拆成每天的小事"}
        </button>
        <p className="mt-3 pb-[max(0px,env(safe-area-inset-bottom))] text-center text-xs text-muted">
          会自动拆成每天能完成的微任务，你只管勾格子。
        </p>
      </div>
    </div>
  );
}
