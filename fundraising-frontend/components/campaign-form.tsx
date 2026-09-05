"use client";

import { useActionState, useId, useState } from "react";
import { createCampaignAction, type CampaignFormState } from "@/lib/actions";
import { CATEGORY_LABELS } from "@/lib/campaigns";
import type { CampaignCategory } from "@/lib/types";

const initialState: CampaignFormState = { status: "idle" };

const CATEGORY_ORDER: CampaignCategory[] = [
  "agriculture",
  "startup",
  "lifestyle",
  "tech",
  "food",
  "design",
];

interface TierDraft {
  key: string;
  title: string;
  price: string;
  totalSupply: string;
  description: string;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground/70">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand";

function emptyTier(key: string): TierDraft {
  return { key, title: "", price: "", totalSupply: "", description: "" };
}

export function CampaignForm() {
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState);
  const idPrefix = useId();
  const [tiers, setTiers] = useState<TierDraft[]>([
    emptyTier(`${idPrefix}-0`),
  ]);

  function updateTier(key: string, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, emptyTier(`${idPrefix}-${prev.length}`)]);
  }

  function removeTier(key: string) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.key !== key) : prev));
  }

  const rewardTiersJson = JSON.stringify(
    tiers.map((t) => ({
      title: t.title,
      price: Number(t.price) || 0,
      totalSupply: Number(t.totalSupply) || 0,
      description: t.description,
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="發行專案名稱" htmlFor="title">
        <input
          id="title"
          name="title"
          required
          minLength={4}
          placeholder="例如：老欉柑橘園轉型友善耕作 RWA 資金募集"
          className={inputClass}
        />
      </Field>

      <Field label="債權摘要" htmlFor="summary">
        <input
          id="summary"
          name="summary"
          required
          minLength={10}
          placeholder="簡述資金用途、債權期間與主要償付來源"
          className={inputClass}
        />
      </Field>

      <Field label="發行說明與風險" htmlFor="story">
        <textarea
          id="story"
          name="story"
          required
          minLength={30}
          rows={6}
          placeholder="說明資金用途、償付來源、發行條件、底層資產與主要投資風險"
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="標的產業" htmlFor="category">
          <select id="category" name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              請選擇分類
            </option>
            {CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="執行地點" htmlFor="location">
          <input id="location" name="location" required placeholder="例如：雲林縣" className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="發行人 / 營運團隊" htmlFor="creatorName">
          <input id="creatorName" name="creatorName" required className={inputClass} />
        </Field>

        <Field label="認購期間（天）" htmlFor="durationDays">
          <input
            id="durationDays"
            name="durationDays"
            type="number"
            required
            min={7}
            max={90}
            defaultValue={30}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground/70">RWA 債權認購級距</span>
          <button
            type="button"
            onClick={addTier}
            className="text-sm font-medium text-brand-strong hover:underline"
          >
            + 新增級距
          </button>
        </div>
        <p className="mb-3 text-xs text-foreground/50">
          每個級距對應一種 RWA Token 認購單位，投資人可依資金配置選擇參與金額。
        </p>

        <div className="flex flex-col gap-4">
          {tiers.map((t, index) => (
            <div key={t.key} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">認購級距 {index + 1}</span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(t.key)}
                    className="text-xs text-danger hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-foreground/60">級距名稱</label>
                  <input
                    required
                    value={t.title}
                    onChange={(e) => updateTier(t.key, { title: e.target.value })}
                    placeholder="例如：友善農業債權｜小額認購"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground/60">每單位認購金額（元）</label>
                  <input
                    required
                    type="number"
                    min={1}
                    step={1}
                    value={t.price}
                    onChange={(e) => updateTier(t.key, { price: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground/60">Token 發行量</label>
                  <input
                    required
                    type="number"
                    min={1}
                    step={1}
                    value={t.totalSupply}
                    onChange={(e) => updateTier(t.key, { totalSupply: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-foreground/60">債權條件說明</label>
                  <textarea
                    required
                    rows={2}
                    value={t.description}
                    onChange={(e) => updateTier(t.key, { description: e.target.value })}
                    placeholder="說明資金用途、收益計算、償付來源與主要風險"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <input type="hidden" name="rewardTiersJson" value={rewardTiersJson} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {pending ? "送出中…" : "送出發行申請"}
      </button>

      {state.status === "error" && (
        <p
          key={state.message}
          role="status"
          className="text-sm text-danger opacity-0 [animation:fade-in_0.3s_ease-out_forwards]"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
