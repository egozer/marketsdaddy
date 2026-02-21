"use client";

import { FluxaLogo } from "@/components/brand/fluxa-logo";

interface TopNavProps {
  stressLevel: string;
  stressScore: number;
}

export const TopNav = ({ stressLevel, stressScore }: TopNavProps): JSX.Element => (
  <header className="fluxa-topnav" aria-label="Global header">
    <div className="fluxa-shell-row">
      <FluxaLogo animated className="fluxa-logo" />

      <div className="stress-chip" role="status" aria-live="polite">
        <span>Global Stress</span>
        <strong>
          {stressLevel}
          {" "}
          {stressScore.toFixed(1)}
        </strong>
      </div>
    </div>
  </header>
);
