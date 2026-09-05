"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider } from "@solana/react";
import {
  DEFAULT_SOLANA_NETWORK,
  solanaChainFor,
  solanaRpcUrlFor,
  type SolanaNetwork,
} from "@/lib/solana";

const NETWORK_STORAGE_KEY = "rwa-solana-network";

function buildClient(network: SolanaNetwork) {
  return createClient()
    .use(walletSigner({ chain: solanaChainFor(network) }))
    .use(solanaRpc({ rpcUrl: solanaRpcUrlFor(network) }));
}

export type AppClient = Awaited<ReturnType<typeof buildClient>>;

type NetworkContextValue = {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

/**
 * The network chosen for the wallet client (see buildClient above). One
 * client only ever targets one chain, so switching network here tears down
 * the old wallet connection and rebuilds a fresh client -- this is the
 * supported pattern for runtime network switches with this Kit plugin, not
 * a workaround.
 */
export function useSolanaNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useSolanaNetwork must be used within <Providers>.");
  }
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<SolanaNetwork>(DEFAULT_SOLANA_NETWORK);

  // Only trust localStorage after mount so the server-rendered client (and
  // any client-rendered content that depends on it before hydration) always
  // starts from DEFAULT_SOLANA_NETWORK -- reading storage during render would
  // let the server and first client render disagree and trigger a hydration
  // mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
      if (stored === "devnet" || stored === "testnet") {
        setNetworkState(stored);
      }
    } catch {
      // Storage can be unavailable (private browsing, blocked cookies); the
      // default network is a perfectly fine fallback.
    }
  }, []);

  const setNetwork = useCallback((next: SolanaNetwork) => {
    setNetworkState(next);
    try {
      localStorage.setItem(NETWORK_STORAGE_KEY, next);
    } catch {
      // Non-fatal -- see above.
    }
  }, []);

  const client = useMemo(() => buildClient(network), [network]);

  useEffect(() => {
    return () => {
      client[Symbol.dispose]?.();
    };
  }, [client]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      <ClientProvider client={client}>{children}</ClientProvider>
    </NetworkContext.Provider>
  );
}
