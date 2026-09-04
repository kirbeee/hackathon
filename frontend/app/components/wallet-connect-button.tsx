"use client";

import { useState } from "react";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useWallets,
  useWalletStatus
} from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import type { AppClient } from "../providers";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const client = useClient<AppClient>();
  const status = useWalletStatus(client);
  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const [open, setOpen] = useState(false);

  const address = connected ? String(connected.account.address) : null;
  const error = connect.error ?? disconnect.error;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition"
      >
        {address ? (
          <span className="font-mono">{truncate(address)}</span>
        ) : (
          <span>Connect wallet</span>
        )}
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute z-10 mt-2 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          {connected ? (
            <div className="space-y-3">
              <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Connected
                </p>
                <p
                  className="font-mono text-sm text-slate-900"
                  title={address ?? ""}
                >
                  {address ? truncate(address) : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void disconnect.dispatch();
                  setOpen(false);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Wallet Standard
              </p>
              <div className="space-y-1.5">
                {wallets.length === 0 ? (
                  <p className="text-sm text-slate-500">No wallets detected.</p>
                ) : (
                  wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      type="button"
                      disabled={connect.isRunning || status === "pending"}
                      onClick={() => {
                        void connect.dispatch(wallet);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <span>{wallet.name}</span>
                      <span className="text-xs text-slate-500">Connect</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {error ? (
            <p className="mt-2 text-sm font-semibold text-red-600">
              {error instanceof Error ? error.message : String(error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}