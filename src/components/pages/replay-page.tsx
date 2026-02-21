"use client";

import { useMemo, useState } from "react";

import { MoneyWarpGlobe } from "@/components/globe/money-warp-globe";
import { useFluxaRuntime } from "@/components/providers/fluxa-runtime-provider";
import { useReducedMotion } from "@/lib/ui/use-reduced-motion";
import { useFxStore } from "@/store/useFxStore";

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export const ReplayPage = (): JSX.Element => {
  const metrics = useFxStore((state) => state.metrics);
  const stress = useFxStore((state) => state.stress);
  const status = useFxStore((state) => state.status);
  const replayProgress = useFxStore((state) => state.replayProgress);

  const { startReplay, stopReplay, seekReplay, getReplayDates } = useFluxaRuntime();

  const reducedMotion = useReducedMotion();

  const [startDate, setStartDate] = useState(daysAgoIso(14));
  const [endDate, setEndDate] = useState(todayIso());
  const [speed, setSpeed] = useState(5);
  const [loading, setLoading] = useState(false);

  const replayDates = useMemo(() => getReplayDates(), [getReplayDates]);

  const sliderValue = Math.max(0, replayProgress.currentIndex - 1);

  const handleStart = async (): Promise<void> => {
    setLoading(true);
    try {
      await startReplay({
        startDate,
        endDate,
        speed
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fluxa-page replay-page">
      <section className="subpage-header">
        <p className="micro">Replay Mode</p>
        <h1>Historical currency motion</h1>
        <p>Scrub timeline states and replay historical FX movement on the globe.</p>
      </section>

      <section className="replay-hero-card">
        <div className="replay-controls-panel">
          <label>
            Start
            <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            End
            <input type="date" value={endDate} min={startDate} max={todayIso()} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label>
            Speed
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={1}>1x</option>
              <option value={5}>5x</option>
              <option value={20}>20x</option>
            </select>
          </label>
          <button type="button" onClick={handleStart} disabled={loading || startDate > endDate}>
            {loading ? "Loading..." : "Start Replay"}
          </button>
          <button type="button" className="ghost" onClick={stopReplay}>Stop</button>
        </div>

        <div className="replay-globe-shell">
          <MoneyWarpGlobe metrics={metrics} stressScore={stress.score} reducedMotion={reducedMotion} />
        </div>
      </section>

      <section className="timeline-scrubber" aria-label="Replay timeline scrubber">
        <div className="timeline-head">
          <span>Status {status.toUpperCase()}</span>
          <strong>{replayProgress.date ?? "No replay loaded"}</strong>
          <span>
            {replayProgress.currentIndex}/{replayProgress.total}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, replayDates.length - 1)}
          value={sliderValue}
          onChange={(event) => seekReplay(Number(event.target.value))}
          disabled={replayDates.length < 2}
        />
      </section>
    </main>
  );
};
