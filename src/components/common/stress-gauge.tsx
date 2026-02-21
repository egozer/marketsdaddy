import { clamp } from "@/lib/metrics/math";

interface StressGaugeProps {
  score: number;
  level: string;
}

export const StressGauge = ({ score, level }: StressGaugeProps): JSX.Element => {
  const clamped = clamp(score, 0, 100);
  const arc = (clamped / 100) * 282;

  return (
    <article className="stress-gauge-card" aria-label="Global stress gauge">
      <svg width="220" height="220" viewBox="0 0 220 220" role="img">
        <circle cx="110" cy="110" r="45" fill="none" stroke="rgba(156,163,175,0.25)" strokeWidth="16" />
        <circle
          cx="110"
          cy="110"
          r="45"
          fill="none"
          stroke="url(#stressGradient)"
          strokeWidth="16"
          strokeDasharray={`${arc} 282`}
          strokeLinecap="round"
          transform="rotate(-90 110 110)"
        />
        <defs>
          <linearGradient id="stressGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22FF88" />
            <stop offset="55%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#FF4D4D" />
          </linearGradient>
        </defs>
      </svg>
      <strong>{score.toFixed(1)}</strong>
      <span>{level}</span>
    </article>
  );
};
