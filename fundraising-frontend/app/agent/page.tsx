import { AgentChat } from "@/components/agent-chat";

export const metadata = {
  title: "AI Agent 理財助理｜拾光募資",
  description: "讓 AI Agent 根據你的預算與風險偏好，自動分析並買入 RWA Token。",
};

export default function AgentPage() {
  return (
    <div className="mx-auto flex h-[80vh] min-h-[32rem] max-w-2xl flex-col px-6 py-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <AgentChat />
      </div>
    </div>
  );
}
