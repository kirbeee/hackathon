// Server Components/Actions read FUNDRAISING_API_URL (Node-only env var).
// Client Components need the NEXT_PUBLIC_ variant, inlined at build time —
// process.env.FUNDRAISING_API_URL is simply undefined in the browser bundle.
const API_BASE =
  typeof window === "undefined"
    ? (process.env.FUNDRAISING_API_URL ?? "http://127.0.0.1:8000")
    : (process.env.NEXT_PUBLIC_FUNDRAISING_API_URL ?? "http://127.0.0.1:8000");

export class ApiError extends Error {}

async function extractMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.detail === "string" ? data.detail : `API 錯誤（${res.status}）`;
  } catch {
    return `API 錯誤（${res.status}）`;
  }
}

/** Returns null on 404 (caller decides what "not found" means). */
export async function apiGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(await extractMessage(res));
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(await extractMessage(res));
  return res.json();
}
