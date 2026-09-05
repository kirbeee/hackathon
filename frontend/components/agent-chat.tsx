"use client";

import { useEffect, useRef, useState } from "react";
import { AgentHintGenie } from "./agent-hint-genie";

interface Message {
  id: number;
  role: "user" | "assistant" | "tool" | "error";
  text: string;
}

interface ChatEvent {
  type: "session" | "delta" | "tool_call" | "tool_result" | "done" | "error";
  session_id?: string;
  content?: string;
  name?: string;
  arguments?: unknown;
  result?: string;
  message?: string;
}

const SUGGESTIONS = [
  "我想投資農業類，中度風險，預算 0.01 SOL",
  "有哪些低風險的專案？",
  "幫我買一份風險最低的投資型專案",
];

// Human-readable labels for rwa-agent's tool calls (see rwa-agent/app/tools.py).
// The raw name/JSON-arguments/JSON-result from those events are backend
// implementation detail — never shown to the user directly.
const TOOL_LABELS: Record<string, string> = {
  get_rwa_assets: "查詢平台上的專案",
  get_risk_score: "計算專案風險分數",
  get_wallet_balance: "查詢 AI Agent 錢包餘額",
  buy_rwa: "送出購買交易",
};

function toolLabel(name?: string): string {
  return (name && TOOL_LABELS[name]) || "處理中";
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-lg bg-brand-soft px-4 py-2 text-sm text-brand-strong">
          {message.text}
        </p>
      </div>
    );
  }
  if (message.role === "assistant") {
    return (
      <div className="flex">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground/80">
          {message.text}
        </p>
      </div>
    );
  }
  if (message.role === "tool") {
    return (
      <div className="flex">
        <p className="max-w-[85%] rounded-md border border-dashed border-border bg-surface/60 px-3 py-1.5 text-xs text-foreground/50">
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex">
      <p className="max-w-[80%] rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger">
        {message.text}
      </p>
    </div>
  );
}

export function AgentChat({ onClose }: { onClose?: () => void } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const nextId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function addMessage(role: Message["role"], text: string): number {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, role, text }]);
    return id;
  }

  function appendToMessage(id: number, delta: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)));
  }

  async function send(question?: string) {
    const text = (question ?? input).trim();
    if (!text || pending) return;

    setPending(true);
    setInput("");
    addMessage("user", text);

    let assistantId: number | null = null;

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionIdRef.current }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `AI Agent 服務錯誤（${res.status}）`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim()) as ChatEvent;

          if (event.type === "session" && event.session_id) {
            sessionIdRef.current = event.session_id;
          } else if (event.type === "tool_call") {
            addMessage("tool", `🔍 ${toolLabel(event.name)}…`);
          } else if (event.type === "tool_result") {
            addMessage("tool", `✓ ${toolLabel(event.name)}`);
          } else if (event.type === "delta" && event.content) {
            if (assistantId === null) assistantId = addMessage("assistant", "");
            appendToMessage(assistantId, event.content);
          } else if (event.type === "error") {
            addMessage("error", event.message ?? "AI Agent 發生未知錯誤。");
          }
        }
      }
    } catch (error) {
      addMessage("error", error instanceof Error ? error.message : "連線失敗，請稍後再試。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-semibold text-foreground">AI Agent 理財助理</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="shrink-0 text-foreground/40 transition hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            <AgentHintGenie compact />
            <div className="flex flex-col gap-2">
              <p className="text-xs text-foreground/40">試著問問看：</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-brand/50 hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {pending && <p className="text-sm text-foreground/40">AI Agent 思考中…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 gap-2 border-t border-border p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="輸入你的預算與風險偏好"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          送出
        </button>
      </form>
    </div>
  );
}
