"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-2xl">
        🔌
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">連線稍微打結了，請重試</h2>
      <p className="text-sm text-foreground/60">
        可能是投資標的 API 尚未啟動或暫時斷線，請確認服務狀態後再試一次。
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95"
      >
        重新整理
      </button>
    </div>
  );
}
