import Link from "next/link";
import { WalletConnectButton } from "./wallet-connect-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
            拾
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">拾光募資</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/70 sm:flex">
          <Link href="/campaigns" className="transition hover:text-foreground">
            探索專案
          </Link>
          <Link href="/campaigns/new" className="transition hover:text-foreground">
            發起募資
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <WalletConnectButton />
          <Link
            href="/campaigns/new"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            發起專案
          </Link>
        </div>
      </div>
    </header>
  );
}
