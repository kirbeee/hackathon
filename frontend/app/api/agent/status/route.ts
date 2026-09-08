// Proxies to rwa-agent's wallet-status endpoint. Kept server-side (same
// reasoning as ../chat/route.ts) so the browser learns the agent's deposit
// address without RWA_AGENT_URL ever being a NEXT_PUBLIC_ value.
const RWA_AGENT_URL = process.env.RWA_AGENT_URL ?? "http://127.0.0.1:8100";

export async function GET(): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(`${RWA_AGENT_URL}/agent/status`, { cache: "no-store" });
  } catch {
    return Response.json({ error: "無法連線到 rwa-agent，請確認服務是否已啟動。" }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json({ error: `rwa-agent 回應錯誤（${upstream.status}）` }, { status: 502 });
  }

  return Response.json(await upstream.json());
}
