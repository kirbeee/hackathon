interface JourneyStep {
  tag: string;
  title: string;
  description: string;
}

const STEPS: JourneyStep[] = [
  {
    tag: "需求",
    title: "企業提出資金需求",
    description:
      "企業揭露資金用途、償付來源與期限，提出具體的債權融資需求。",
  },
  {
    tag: "驗證",
    title: "驗證底層資產",
    description: "平台檢視營運資料、訂單或實體資產，確認債權所依據的現實世界價值。",
  },
  {
    tag: "發行",
    title: "拆分小額債權單位",
    description: "大型資金需求透過 Tokenization 拆分，投資人可依自身額度認購 RWA Token。",
  },
  {
    tag: "管理",
    title: "追蹤收益與風險",
    description: "平台持續揭露資金用途、營運狀態、收益分配與剩餘本金。",
  },
  {
    tag: "償付",
    title: "依條件還本付息",
    description: "發行方依約定條件分配收益並償還本金，鏈上保留可追蹤紀錄。",
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
        </svg>

        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border bg-surface text-center">
          <span className="text-xs font-bold text-brand">RWA</span>
          <span className="text-[10px] text-foreground/50">投資流程</span>
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
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
          <li key={step.tag} className="flex flex-col gap-1 rounded-lg border border-border p-4">
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
