// Proxies to rwa-agent's streaming chat endpoint. Kept server-side (never a
// NEXT_PUBLIC_ url) so rwa-agent's port never needs to be exposed to the
// browser or the public tunnel — only this Next.js server talks to it.
const RWA_AGENT_URL = process.env.RWA_AGENT_URL ?? "http://127.0.0.1:8100";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${RWA_AGENT_URL}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return Response.json({ error: "無法連線到 rwa-agent，請確認服務是否已啟動。" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `rwa-agent 回應錯誤（${upstream.status}）` }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
