import { useEffect, useRef, useState } from "react";
import { cellCount } from "../lib/scheduler";

interface Props {
  total: number;
  done: number;
}

/**
 * 签名元素：一排会被慢慢填满的小格子。
 * 奖励的是总进度，不是连续天数。新填的格子会轻轻弹一下。
 */
export default function ProgressCells({ total, done }: Props) {
  const count = cellCount(total);
  const filled = total === 0 ? 0 : Math.round((done / total) * count);
  const prevFilled = useRef(filled);
  const [justFilled, setJustFilled] = useState<number[]>([]);

  useEffect(() => {
    if (filled > prevFilled.current) {
      const fresh: number[] = [];
      for (let i = prevFilled.current; i < filled; i++) fresh.push(i);
      setJustFilled(fresh);
      const t = setTimeout(() => setJustFilled([]), 600);
      prevFilled.current = filled;
      return () => clearTimeout(t);
    }
    prevFilled.current = filled;
  }, [filled]);

  if (count === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-[5px]"
      role="img"
      aria-label={`总进度 ${Math.round((done / Math.max(total, 1)) * 100)}%`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const on = i < filled;
        const pop = justFilled.includes(i);
        return (
          <span
            key={i}
            className={[
              "h-[18px] w-[18px] rounded-[5px] transition-colors duration-300",
              on ? "bg-sage" : "bg-line",
              pop ? "animate-popIn" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
