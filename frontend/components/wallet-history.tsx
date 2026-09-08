"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import { lookupWalletHistoryAction, type WalletHistoryState } from "@/lib/actions";
import { formatDate, formatTWDT } from "@/lib/format";
import { Skeleton } from "./skeleton";

function truncateSignature(signature: string) {
  return `${signature.slice(0, 6)}…${signature.slice(-6)}`;
}

export function WalletHistory() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);

  // Same reasoning as WalletConnectButton: the wallet-standard adapter can
  // resolve a stored connection before hydration finishes, so wait for mount
  // before trusting it -- otherwise the server and first client render of
  // this input's default value would disagree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const connectedAddress = mounted && connected ? String(connected.account.address) : null;

  const [addressInput, setAddressInput] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<WalletHistoryState>({ status: "idle" });
  const [queriedAddress, setQueriedAddress] = useState<string | null>(null);

  async function lookup(address: string) {
    const trimmed = address.trim();
    if (!trimmed) return;
    setAddressInput(trimmed);
    setPending(true);
    setQueriedAddress(trimmed);
    setState(await lookupWalletHistoryAction(trimmed));
    setPending(false);
  }

  // Auto-fill from the connected wallet and look it up once, the first time
  // a wallet becomes available -- doesn't override a manual search already
  // in progress or already-shown results for a different address. Deferred
  // via rAF, same as the mount-detection above, so the lookup's setState
  // calls aren't synchronous within the effect body.
  useEffect(() => {
    if (!connectedAddress || addressInput) return;
    const frame = requestAnimationFrame(() => {
      void lookup(connectedAddress);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress]);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(addressInput);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="貼上 Phantom 錢包地址查詢，或連接錢包自動帶入"
          spellCheck={false}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending || !addressInput.trim()}
          className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "查詢中…" : "查詢紀錄"}
        </button>
      </form>
      {connectedAddress && connectedAddress !== addressInput && (
        <button
          type="button"
          onClick={() => {
            setAddressInput(connectedAddress);
            void lookup(connectedAddress);
          }}
          className="self-start text-xs text-brand-strong hover:underline"
        >
          改查目前連接的錢包（{truncateSignature(connectedAddress)}）
        </button>
      )}

      {pending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!pending && state.status === "error" && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {state.message}
        </p>
      )}

      {!pending && state.status === "success" && state.data && (
        <div className="flex flex-col gap-8">
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <p className="text-xs text-foreground/50">AI Agent 可投資餘額（儲值後尚未花用的金額）</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {(state.data.availableLamports / 1_000_000_000).toFixed(6)} SOL
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">
              兌換紀錄（{state.data.donations.length}）
            </h2>
            {state.data.donations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
                這個地址還沒有兌換紀錄。
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.donations.map((d, i) => (
                  <li
                    key={`${d.txSignature ?? "no-sig"}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/campaigns/${d.campaignSlug}`}
                        className="font-medium text-foreground hover:text-brand-strong hover:underline"
                      >
                        {d.campaignTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {formatTWDT(d.amount)} ・ {formatDate(d.createdAt)}
                      </p>
                    </div>
                    {d.txSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${d.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap font-mono text-xs text-brand-strong hover:underline"
                      >
                        {truncateSignature(d.txSignature)} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">
              投資購股紀錄（{state.data.investments.length}）
            </h2>
            {state.data.investments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
                這個地址還沒有投資購股紀錄。目前的購股流程是後台模擬示範，不會產生真實鏈上交易，
                所以只有透過 AI Agent 或真實付款完成的購買才會出現在這裡。
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.investments.map((t, i) => (
                  <li
                    key={`${t.txSignature}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/campaigns/${t.campaignSlug}`}
                        className="font-medium text-foreground hover:text-brand-strong hover:underline"
                      >
                        {t.campaignTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        認購 {t.shares} 份 ・ {(t.amountLamports / 1_000_000_000).toFixed(6)} SOL ・{" "}
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <a
                      href={`https://explorer.solana.com/tx/${t.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap font-mono text-xs text-brand-strong hover:underline"
                    >
                      {truncateSignature(t.txSignature)} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">
              賣出／贖回紀錄（{state.data.redemptions.length}）
            </h2>
            {state.data.redemptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
                這個地址還沒有賣出／贖回紀錄。
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.redemptions.map((r, i) => (
                  <li
                    key={`${r.txSignature}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/campaigns/${r.campaignSlug}`}
                        className="font-medium text-foreground hover:text-brand-strong hover:underline"
                      >
                        {r.campaignTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {r.tierId ? `取消方案 ${r.tierId}` : `賣出 ${r.shares} 份`} ・{" "}
                        {(r.amountLamports / 1_000_000_000).toFixed(6)} SOL 退款 ・{" "}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    {r.txSignature ? (
                      <a
                        href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap font-mono text-xs text-brand-strong hover:underline"
                      >
                        {truncateSignature(r.txSignature)} ↗
                      </a>
                    ) : (
                      <span className="whitespace-nowrap text-xs text-foreground/40">已退回可投資餘額</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">
              儲值紀錄（{state.data.deposits.length}）
            </h2>
            {state.data.deposits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
                這個地址還沒有儲值紀錄。
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.data.deposits.map((d, i) => (
                  <li
                    key={`${d.txSignature}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-xs text-foreground/50">
                      儲值 {(d.amountLamports / 1_000_000_000).toFixed(6)} SOL ・ {formatDate(d.createdAt)}
                    </p>
                    <a
                      href={`https://explorer.solana.com/tx/${d.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap font-mono text-xs text-brand-strong hover:underline"
                    >
                      {truncateSignature(d.txSignature)} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!pending && state.status === "idle" && !queriedAddress && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
          連接你的 Phantom 錢包，或直接貼上任何錢包地址查詢它的兌換與投資紀錄。
        </p>
      )}
    </div>
  );
}
