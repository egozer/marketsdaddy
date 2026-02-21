export const LoadingGlobe = (): JSX.Element => (
  <div className="loading-globe" aria-live="polite" aria-label="Loading live data">
    <div className="wireframe-orb" />
    <div className="wireframe-arc" />
    <p>Initializing live data...</p>
  </div>
);
