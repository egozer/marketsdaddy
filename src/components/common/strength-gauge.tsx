import { clamp } from "@/lib/metrics/math";

interface StrengthGaugeProps {
  value: number;
  label?: string;
}

export const StrengthGauge = ({ value, label = "Strength" }: StrengthGaugeProps): JSX.Element => {
  const clamped = clamp(value, -100, 100);
  const normalized = (clamped + 100) / 200;
  const degree = -90 + normalized * 180;

  return (
    <div className="strength-gauge" aria-label={`${label} ${clamped.toFixed(1)}`}>
      <svg width="180" height="110" viewBox="0 0 180 110" role="img">
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="rgba(156,163,175,0.35)" strokeWidth="10" />
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="url(#gaugeGradient)" strokeWidth="10" strokeDasharray={`${normalized * 220} 220`} />
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF4D4D" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#22FF88" />
          </linearGradient>
        </defs>
        <g transform={`translate(90 90) rotate(${degree})`}>
          <line x1="0" y1="0" x2="0" y2="-58" stroke="#F4F7FF" strokeWidth="2.2" />
          <circle cx="0" cy="0" r="4" fill="#F4F7FF" />
        </g>
      </svg>
      <span className="gauge-value">{clamped.toFixed(1)}</span>
    </div>
  );
};
