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
  title: "拾光募資｜讓每個好想法都有被支持的機會",
  description: "群眾募資平台原型：探索專案、贊助支持，或發起你自己的募資計畫。",
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
