import Link from "next/link";
import Image from "next/image";
import { WalletConnectButton } from "./wallet-connect-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-brand/10 sm:h-10 sm:w-10">
            <Image src="/cathay-tree.svg" alt="國泰世華" width={34} height={25} />
          </span>
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-foreground sm:text-lg">
            拾光募資
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/70 sm:flex">
          <Link href="/campaigns" className="transition hover:text-foreground">
            探索專案
          </Link>
          <Link
            href="/campaigns/new"
            className="transition hover:text-foreground"
          >
            發起募資
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <WalletConnectButton />
          <Link
            href="/campaigns/new"
            className="whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-strong active:scale-95 sm:px-5 sm:py-2 sm:text-sm"
          >
            發起專案
          </Link>
        </div>
      </div>
    </header>
  );
}
