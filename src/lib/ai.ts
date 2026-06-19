import type { PlanDay } from "../types";

const SYSTEM_PROMPT = `你是目标拆解专家。
请把用户目标拆解成具体、明确、可执行的微任务。
规则：
1. 每个任务必须能在30分钟内完成
2. 必须具体（如「背单词50个」「阅读1篇」「听力20分钟」）
3. 不允许抽象任务（禁止「提高水平」「学习」「复习」这类模糊表达）
4. 不允许输出解释
5. 只输出 JSON，不要带任何前后缀或代码块标记
格式：
{ "tasks": [ { "day": 1, "items": ["背单词50个", "阅读1篇"] } ] }`;

interface AIConfig {
  provider: "anthropic" | "openai" | "none";
  key: string;
  model: string;
}

function readConfig(): AIConfig {
  const env = import.meta.env;
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const openaiKey = env.VITE_OPENAI_API_KEY as string | undefined;
  let provider = (env.VITE_AI_PROVIDER as string | undefined)?.toLowerCase();

  if (!provider) {
    if (anthropicKey) provider = "anthropic";
    else if (openaiKey) provider = "openai";
  }

  if (provider === "anthropic" && anthropicKey) {
    return {
      provider: "anthropic",
      key: anthropicKey,
      model: (env.VITE_AI_MODEL as string) || "claude-3-5-haiku-latest",
    };
  }
  if (provider === "openai" && openaiKey) {
    return {
      provider: "openai",
      key: openaiKey,
      model: (env.VITE_AI_MODEL as string) || "gpt-4o-mini",
    };
  }
  return { provider: "none", key: "", model: "" };
}

export function aiAvailable(): boolean {
  return readConfig().provider !== "none";
}

function userPrompt(name: string, days: number, maxPerDay: number): string {
  const cap = days * maxPerDay;
  return `目标：${name}
剩余：${days}天
每日最多：${maxPerDay}个任务
请把整个目标拆成不超过 ${cap} 个微任务，按天编号（day 从 1 开始），每天不超过 ${maxPerDay} 个。`;
}

/** 从可能带杂质的文本里抠出 JSON */
function extractJSON(text: string): any {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI 返回的内容无法解析为 JSON");
  }
}

function normalize(parsed: any): PlanDay[] {
  const days = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  return days
    .map((d: any, i: number) => ({
      day: typeof d?.day === "number" ? d.day : i + 1,
      items: Array.isArray(d?.items)
        ? d.items.filter((x: any) => typeof x === "string" && x.trim()).map((x: string) => x.trim())
        : [],
    }))
    .filter((d: PlanDay) => d.items.length > 0);
}

async function callAnthropic(cfg: AIConfig, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.key,
      "anthropic-version": "2023-06-01",
      // 允许浏览器直连（自用/本地可接受；公开部署请走代理）
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((b: any) => (b.type === "text" ? b.text : "")).join("");
}

async function callOpenAI(cfg: AIConfig, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** 没有配置 AI 时的本地兜底：把目标切成可当天完成的「专注块」，明确告知用户接 AI 可拆得更细 */
export function fallbackPlan(name: string, days: number, maxPerDay: number): PlanDay[] {
  const totalBlocks = Math.max(days, Math.min(days * maxPerDay, days * maxPerDay));
  const out: PlanDay[] = [];
  let counter = 1;
  for (let day = 1; day <= days; day++) {
    const items: string[] = [];
    const todayN = Math.min(maxPerDay, Math.ceil((totalBlocks - (counter - 1)) / (days - day + 1)));
    for (let k = 0; k < Math.max(1, todayN); k++) {
      items.push(`推进「${name}」· 25分钟专注块 #${counter}`);
      counter++;
    }
    out.push({ day, items });
  }
  return out;
}

export interface DecomposeResult {
  plan: PlanDay[];
  usedAI: boolean;
}

export async function decompose(
  name: string,
  days: number,
  maxPerDay: number,
): Promise<DecomposeResult> {
  const cfg = readConfig();
  if (cfg.provider === "none") {
    return { plan: fallbackPlan(name, days, maxPerDay), usedAI: false };
  }
  const prompt = userPrompt(name, days, maxPerDay);
  const raw =
    cfg.provider === "anthropic"
      ? await callAnthropic(cfg, prompt)
      : await callOpenAI(cfg, prompt);
  const plan = normalize(extractJSON(raw));
  if (plan.length === 0) throw new Error("AI 没有产出有效任务");
  return { plan, usedAI: true };
}
