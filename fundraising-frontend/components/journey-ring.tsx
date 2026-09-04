interface JourneyStep {
  tag: string;
  title: string;
  description: string;
}

const STEPS: JourneyStep[] = [
  {
    tag: "動機",
    title: "缺乏管道的好提案",
    description:
      "小農地轉型、新創研發、獨立品牌新品——傳統資金市場只挑得起大型機構認可的計畫。",
  },
  {
    tag: "提案",
    title: "拆成 RWA Token 方案",
    description: "發起人把商品、產出或權益拆成可驗證的 RWA Token 方案，公開上架。",
  },
  {
    tag: "支持",
    title: "支持者選擇方案",
    description: "支持者用資金換取對應的 Token，取得商品、服務或產出分潤權益。",
  },
  {
    tag: "履約",
    title: "達標後交付與追蹤",
    description: "發起人依 Token 條件出貨或履約，所有進度與資金流向公開可查。",
  },
  {
    tag: "結果",
    title: "雙方都拿到看得到的成果",
    description: "發起人拿到資金啟動計畫；支持者拿到驗證得到的商品與回饋。",
  },
];

const CENTER = 50;
const NODE_RADIUS = 38;

function pointOnCircle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: CENTER + radius * Math.cos(rad),
    top: CENTER + radius * Math.sin(rad),
  };
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function JourneyRing() {
  const stepAngles = STEPS.map((_, i) => -90 + i * (360 / STEPS.length));

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="relative mx-auto aspect-square w-full max-w-md">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={NODE_RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={0.6}
            strokeDasharray="2 3"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={NODE_RADIUS}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={0.6}
            strokeOpacity={0.5}
            strokeDasharray="1 9"
            style={{ animation: "ring-flow 6s linear infinite" }}
          />
        </svg>

        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border bg-surface text-center shadow-sm">
          <span className="text-xs font-bold text-brand">RWA</span>
          <span className="text-[10px] text-foreground/50">募資循環</span>
        </div>

        {stepAngles.map((angle, i) => {
          const nextAngle = stepAngles[(i + 1) % stepAngles.length] + (i === stepAngles.length - 1 ? 360 : 0);
          const midAngle = (angle + nextAngle) / 2;
          const rad = (midAngle * Math.PI) / 180;
          const tangentDeg = (Math.atan2(Math.cos(rad), -Math.sin(rad)) * 180) / Math.PI;
          const { left, top } = pointOnCircle(midAngle, NODE_RADIUS);

          return (
            <span
              key={`arrow-${i}`}
              className="absolute flex h-5 w-5 items-center justify-center text-brand"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(-50%, -50%) rotate(${tangentDeg}deg)`,
              }}
            >
              <ArrowIcon />
            </span>
          );
        })}

        {STEPS.map((step, i) => {
          const { left, top } = pointOnCircle(stepAngles[i], NODE_RADIUS);
          return (
            <div
              key={step.tag}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <span className="whitespace-nowrap rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-foreground">
                {step.tag}
              </span>
            </div>
          );
        })}
      </div>

      <ol className="grid w-full gap-4 sm:grid-cols-5">
        {STEPS.map((step, i) => (
          <li key={step.tag} className="flex flex-col gap-1 rounded-xl border border-border p-4">
            <span className="text-xs font-semibold text-brand">
              {i + 1}. {step.tag}
            </span>
            <span className="text-sm font-semibold text-foreground">{step.title}</span>
            <span className="text-xs leading-relaxed text-foreground/60">{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
