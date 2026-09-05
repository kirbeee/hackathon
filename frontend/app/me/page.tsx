import { WalletHistory } from "@/components/wallet-history";

export const metadata = {
  title: "我的紀錄｜拾光 RWA",
  description: "用 Phantom 錢包地址查詢你的兌換與投資購股紀錄。",
};

export default function MePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-foreground">我的紀錄</h1>
      <p className="mt-2 text-sm text-foreground/60">
        連接錢包會自動查詢，或貼上任何 Phantom 地址查看它在這個平台上的兌換與投資紀錄。
      </p>
      <div className="mt-8">
        <WalletHistory />
      </div>
    </div>
  );
}
