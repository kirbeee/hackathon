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
        可能是募資資料的 API 服務還沒啟動，或暫時斷線了。稍等一下再試一次應該就會恢復。
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
