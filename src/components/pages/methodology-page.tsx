export const MethodologyPage = (): JSX.Element => (
  <main className="fluxa-page method-page">
    <section className="subpage-header">
      <p className="micro">About / Methodology</p>
      <h1>How Fluxa Live computes motion</h1>
      <p>Financial normalization and ranking formulas used for live rendering and purchasing-power analytics.</p>
    </section>

    <section className="method-grid">
      <article className="method-card">
        <h2>Strength Score</h2>
        <p className="mono">percent_change = (current_rate - previous_rate) / previous_rate * 100</p>
        <p className="mono">z = (percent_change - mean_returns) / stddev_returns</p>
        <p className="mono">strength_score = normalize(clamp(z, -3, 3), [-3, 3] -&gt; [-100, 100])</p>
      </article>

      <article className="method-card">
        <h2>Volatility</h2>
        <p className="mono">returns_t = (rate_t - rate_t-1) / rate_t-1 * 100</p>
        <p className="mono">volatility = stddev(returns over rolling window N)</p>
        <p>Default N retains 120 snapshots (about 10 minutes at 5 second polling).</p>
      </article>

      <article className="method-card">
        <h2>Purchasing Power</h2>
        <p className="mono">converted_value = 1 USD * fx_rate</p>
        <p className="mono">real_value_index = converted_value / PPP_proxy_index</p>
        <p className="mono">normalized_score = min-max(real_value_index) -&gt; [0, 100]</p>
      </article>

      <article className="method-card">
        <h2>Stress Index</h2>
        <p className="mono">stress = mean(normalized_volatility across tracked currencies) * 100</p>
        <p>Mapped levels:</p>
        <ul>
          <li>Low: &lt; 35</li>
          <li>Moderate: 35 to 70</li>
          <li>High: &gt; 70</li>
        </ul>
      </article>
    </section>
  </main>
);
