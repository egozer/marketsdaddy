import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function LandingPage() {
  return (
    <main className="landing-root">
      <header className="top-nav">
        <div className="brand">{APP_NAME}</div>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/auth">Sign in</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="hero-kicker">AI POWERED MARKET ANALYSES</p>
          <h1>
            Discover and invest confidently
            <br />
            <span>with AI-powered market insights.</span>
          </h1>
          <p className="hero-subtitle">
            Is this a great business? Spot durable companies in seconds.
            Our due diligence translates jargon into plain English so you
            instantly understand what is happening and what it means.
          </p>
          <div className="hero-cta">
            <Link href="/auth" className="btn btn-primary">
              Start now
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              Try it out
            </Link>
          </div>
          <p className="hero-meta">No credit card needed. Cancel anytime.</p>
        </div>

        <div className="hero-panel">
          <div className="panel-head">
            <span>QUALITY ASSESSMENT</span>
            <strong>What Daddy Thinks</strong>
          </div>
          <ul className="daddy-list">
            <li>
              <div>
                <h4>Is this a great business?</h4>
                <p>Translate financial complexity into clarity.</p>
              </div>
              <em className="pill danger">Needs work</em>
            </li>
            <li>
              <div>
                <h4>Can we predict its future?</h4>
                <p>AI summarizes momentum, volatility, and risk.</p>
              </div>
              <em className="pill warning">Watch closely</em>
            </li>
            <li>
              <div>
                <h4>Can we buy at a great price?</h4>
                <p>Fair-value style suggestions with plain steps.</p>
              </div>
              <em className="pill success">Promising</em>
            </li>
          </ul>
        </div>
      </section>

      <section id="features" className="features">
        <h2>Stock research, simplified.</h2>
        <div className="feature-grid">
          <article>
            <h3>No Finance Degree Needed</h3>
            <p>
              Intuitive visuals and plain-English analysis make every market easy to understand.
            </p>
          </article>
          <article>
            <h3>AI-Powered Insights</h3>
            <p>
              Get expert-level research and ratings instantly, powered by trusted live data.
            </p>
          </article>
          <article>
            <h3>Public Stock Forum</h3>
            <p>
              Every stock has its own public thread. Share takes, challenge ideas, and discuss setups.
            </p>
          </article>
          <article>
            <h3>Daddy AI Commands</h3>
            <p>
              Use <code>/daddy your question</code> in comments and get an instant AI analysis reply in public.
            </p>
          </article>
        </div>
      </section>

      <section id="pricing" className="pricing">
        <h2>Pricing</h2>
        <div className="pricing-card">
          <p className="pricing-main">Everything is free!</p>
          <p>No credit card needed. No hidden trial walls.</p>
          <Link href="/auth" className="btn btn-primary">
            Create free account
          </Link>
        </div>
      </section>
    </main>
  );
}
