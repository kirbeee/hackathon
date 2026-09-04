import { CampaignForm } from "@/components/campaign-form";

export const metadata = {
  title: "發起募資專案 — 拾光募資",
};

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">發起你的募資專案</h1>
      <p className="mt-2 text-sm text-foreground/60">
        填寫以下資訊，讓贊助者了解你的計畫。送出後專案會立即上架到探索頁面。
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <CampaignForm />
      </div>
    </div>
  );
}
