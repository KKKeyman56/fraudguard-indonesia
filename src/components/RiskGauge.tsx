type Props = { score: number };

export function RiskGauge({ score }: Props) {
  const normalized = Math.min(100, Math.max(0, score));
  const color = normalized >= 70 ? "var(--danger)" : normalized >= 40 ? "var(--warning)" : "var(--primary)";
  return (
    <div className="gauge" aria-label={`Skor risiko ${normalized} dari 100`}>
      <svg viewBox="0 0 220 128" role="img" aria-hidden="true">
        <path className="gauge-track" pathLength="100" d="M 22 108 A 88 88 0 0 1 198 108" />
        <path className="gauge-value" pathLength="100" stroke={color} strokeDasharray={`${normalized} 100`} d="M 22 108 A 88 88 0 0 1 198 108" />
      </svg>
      <div className="gauge-copy"><strong style={{ color }}>{normalized}</strong><span>RISIKO / 100</span></div>
    </div>
  );
}
