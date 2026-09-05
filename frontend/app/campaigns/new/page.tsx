import { CampaignForm } from "@/components/campaign-form";

export const metadata = {
  title: "申請債權發行｜拾光 RWA",
};

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">申請 RWA 債權發行</h1>
      <p className="mt-2 text-sm text-foreground/60">
        填寫資金用途、償付來源與發行條件，送出後將建立 Demo 投資標的。
      </p>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <CampaignForm />
      </div>
    </div>
  );
}
