import { listCampaigns } from "@/lib/campaigns";

export async function GET() {
  try {
    const campaigns = await listCampaigns();
    return Response.json(campaigns);
  } catch {
    return Response.json({ error: "無法讀取專案資料" }, { status: 502 });
  }
}
