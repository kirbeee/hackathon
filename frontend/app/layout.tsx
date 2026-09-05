import type { Metadata } from "next";
import { Geist_Mono, Noto_Serif_TC } from "next/font/google";
import { AiAgentFab } from "@/components/ai-agent-fab";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Providers from "./providers";
import "./globals.css";

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-serif-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "拾光 RWA｜小額私募債權投資平台",
  description: "透過 RWA Tokenization 拆分私募債權，探索標的、認購單位並追蹤收益與風險。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-TW"
      className={`${notoSerifTC.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <AiAgentFab />
        </Providers>
      </body>
    </html>
  );
}
