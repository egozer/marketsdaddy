"use client";

import { get, onValue } from "firebase/database";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_MARKETS } from "@/lib/constants";
import {
  alertsRef,
  createNotification,
  markNotificationRead,
  notificationsRef,
  patchAlert,
  saveAlert,
  saveWatchItem,
  watchlistRef
} from "@/lib/db";
import type { AiAnalysis, AppNotification, MarketQuote, PriceAlert, WatchItem } from "@/lib/types";

const POLL_MS = 60000;

function pairKey(base: string, quote: string) {
  return `${base}-${quote}`;
}

function formatPrice(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 6
  });
}

function signalFromChange(change: number | null) {
  if (change === null) {
    return "Neutral";
  }
  if (change > 0.6) {
    return "Bullish";
  }
  if (change < -0.6) {
    return "Bearish";
  }
  return "Neutral";
}

export function DashboardApp() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [watchItems, setWatchItems] = useState<WatchItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  const [marketToAdd, setMarketToAdd] = useState(DEFAULT_MARKETS[0].id);
  const [targetPrice, setTargetPrice] = useState("");
  const [targetDirection, setTargetDirection] = useState<"above" | "below">("above");
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);

  const [analysisContext, setAnalysisContext] = useState("");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const alertInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let mounted = true;

    async function bootstrapDefaultWatchlist() {
      const snapshot = await get(watchlistRef(user.uid));
      if (!snapshot.exists()) {
        await Promise.all(
          DEFAULT_MARKETS.map((item) =>
            saveWatchItem(user.uid, {
              ...item,
              createdAt: new Date().toISOString()
            })
          )
        );
      }
    }

    bootstrapDefaultWatchlist().catch(console.error);

    const unwatchWatchlist = onValue(watchlistRef(user.uid), (snapshot) => {
      if (!mounted) {
        return;
      }

      const value = snapshot.val() as Record<string, WatchItem> | null;
      const rows = value ? Object.values(value) : [];
      setWatchItems(rows);
      setSelectedPairId((current) => current ?? rows[0]?.id ?? null);
    });

    const unwatchAlerts = onValue(alertsRef(user.uid), (snapshot) => {
      if (!mounted) {
        return;
      }

      const value = snapshot.val() as Record<string, PriceAlert> | null;
      const rows = value ? Object.values(value) : [];
      setAlerts(rows);
    });

    const unwatchNotifications = onValue(notificationsRef(user.uid), (snapshot) => {
      if (!mounted) {
        return;
      }

      const value = snapshot.val() as Record<string, AppNotification> | null;
      const rows = value ? Object.values(value) : [];
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setNotifications(rows);
    });

    return () => {
      mounted = false;
      unwatchWatchlist();
      unwatchAlerts();
      unwatchNotifications();
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // User may deny. Silent by design.
      });
    }
  }, []);

  useEffect(() => {
    if (!user || watchItems.length === 0) {
      return;
    }

    let active = true;

    async function refreshQuotes() {
      const fetched = await Promise.all(
        watchItems.map(async (item) => {
          const response = await fetch(
            `/api/market/quote?base=${encodeURIComponent(item.base)}&quote=${encodeURIComponent(item.quote)}`,
            { cache: "no-store" }
          );

          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as MarketQuote;
          return { id: item.id, quote: payload };
        })
      );

      if (!active) {
        return;
      }

      const next: Record<string, MarketQuote> = {};
      for (const row of fetched) {
        if (!row) {
          continue;
        }

        next[row.id] = row.quote;
      }

      setQuotes(next);
    }

    refreshQuotes().catch(console.error);
    const interval = setInterval(() => {
      refreshQuotes().catch(console.error);
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, watchItems]);

  useEffect(() => {
    if (!user || alerts.length === 0) {
      return;
    }

    async function evaluateAlerts() {
      for (const alert of alerts) {
        if (!alert.enabled) {
          continue;
        }

        if (alertInFlightRef.current.has(alert.id)) {
          continue;
        }

        const quote = quotes[pairKey(alert.base, alert.quote)];
        if (!quote) {
          continue;
        }

        const isHit =
          alert.direction === "above"
            ? quote.price >= alert.targetPrice
            : quote.price <= alert.targetPrice;

        if (!isHit) {
          continue;
        }

        const lastTriggeredMs = alert.lastTriggeredAt
          ? new Date(alert.lastTriggeredAt).getTime()
          : 0;
        if (Date.now() - lastTriggeredMs < 60 * 60 * 1000) {
          continue;
        }

        const title = `${alert.label} target reached`;
        const body = `Price is ${quote.price.toFixed(6)} (${alert.direction} ${alert.targetPrice}).`;

        alertInFlightRef.current.add(alert.id);
        try {
          await createNotification(user.uid, {
            title,
            body,
            createdAt: new Date().toISOString(),
            read: false
          });

          await patchAlert(user.uid, alert.id, {
            lastTriggeredAt: new Date().toISOString(),
            lastTriggeredPrice: quote.price
          });

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(title, { body });
          }
        } finally {
          alertInFlightRef.current.delete(alert.id);
        }
      }
    }

    void evaluateAlerts();
  }, [alerts, quotes, user]);

  const selectedPair = useMemo(() => {
    if (!selectedPairId) {
      return watchItems[0] ?? null;
    }
    return watchItems.find((item) => item.id === selectedPairId) ?? null;
  }, [selectedPairId, watchItems]);

  async function addMarketToWatchlist() {
    if (!user) {
      return;
    }

    const market = DEFAULT_MARKETS.find((item) => item.id === marketToAdd);
    if (!market) {
      return;
    }

    await saveWatchItem(user.uid, {
      ...market,
      createdAt: new Date().toISOString()
    });
  }

  async function createTargetAlert(item: WatchItem) {
    if (!user || !targetPrice) {
      return;
    }

    const parsed = Number(targetPrice);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const id = `${item.id}-${targetDirection}-${Math.floor(Date.now() / 1000)}`;

    await saveAlert(user.uid, {
      id,
      base: item.base,
      quote: item.quote,
      label: item.label,
      targetPrice: parsed,
      direction: targetDirection,
      enabled: true,
      createdAt: new Date().toISOString()
    });

    setTargetPrice("");
  }

  async function runAiAnalysis() {
    if (!selectedPair) {
      return;
    }

    const quote = quotes[selectedPair.id];
    if (!quote) {
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedPair.label,
          price: quote.price,
          change24h: quote.change24h,
          context: analysisContext
        })
      });

      const payload = (await response.json()) as AiAnalysis | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("AI analysis failed.");
      }

      setAnalysis(payload as AiAnalysis);
    } catch (error) {
      setAnalysis({
        pair: selectedPair.label,
        summary:
          error instanceof Error
            ? error.message
            : "Could not generate AI summary right now.",
        conviction: "Neutral",
        opportunities: ["Retry with more context."],
        risks: ["Service temporarily unavailable."],
        actionPlan: ["Do not trade purely based on this output."],
        generatedAt: new Date().toISOString()
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function markAsRead(id: string) {
    if (!user) {
      return;
    }

    await markNotificationRead(user.uid, id);
  }

  async function toggleAlertState(alertId: string, enabled: boolean) {
    if (!user) {
      return;
    }
    await patchAlert(user.uid, alertId, { enabled });
  }

  if (loading || !user) {
    return <main className="loading-screen">Loading dashboard...</main>;
  }

  const selectedQuote = selectedPair ? quotes[selectedPair.id] : null;

  return (
    <main className="dashboard-root">
      <header className="dashboard-header">
        <div>
          <p className="hero-kicker">MARKET COMMAND CENTER</p>
          <h1>Daddy&apos;s Dashboard</h1>
        </div>
        <div className="header-actions">
          <p>{user.email}</p>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="panel quotes-panel">
          <div className="panel-title-row">
            <h2>Live Market Watchlist</h2>
            <div className="add-market-row">
              <select value={marketToAdd} onChange={(e) => setMarketToAdd(e.target.value)}>
                {DEFAULT_MARKETS.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-small" onClick={addMarketToWatchlist}>
                Add
              </button>
            </div>
          </div>

          <div className="watchlist-table">
            {watchItems.map((item) => {
              const quote = quotes[item.id];
              const isSelected = selectedPairId === item.id;
              return (
                <button
                  key={item.id}
                  className={`watch-row ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedPairId(item.id)}
                >
                  <span className="pair">{item.label}</span>
                  <span className="price">{formatPrice(quote?.price)}</span>
                  <span className={quote && (quote.change24h ?? 0) >= 0 ? "up" : "down"}>
                    {quote?.change24h === null || quote?.change24h === undefined
                      ? "N/A"
                      : `${quote.change24h.toFixed(2)}%`}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedPair && (
            <div className="alert-box">
              <h3>Set target alert for {selectedPair.label}</h3>
              <div className="alert-controls">
                <select
                  value={targetDirection}
                  onChange={(e) => setTargetDirection(e.target.value as "above" | "below")}
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="Target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
                <button className="btn btn-small" onClick={() => createTargetAlert(selectedPair)}>
                  Save target
                </button>
              </div>
              <div className="existing-alerts">
                {alerts
                  .filter((alert) => alert.id.startsWith(selectedPair.id))
                  .map((alert) => (
                    <div key={alert.id} className="existing-alert-item">
                      <span>
                        {alert.label} {alert.direction} {alert.targetPrice}
                      </span>
                      <button
                        className="text-btn"
                        onClick={() => toggleAlertState(alert.id, !alert.enabled)}
                      >
                        {alert.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </article>

        <article className="panel suggestion-panel">
          <h2>Daddy&apos;s Suggestion</h2>
          <div className="suggestion-cards">
            <div>
              <h3>Is this a great business?</h3>
              <p>
                Current signal: <strong>{signalFromChange(selectedQuote?.change24h ?? null)}</strong>
              </p>
            </div>
            <div>
              <h3>Can we predict its future?</h3>
              <p>
                Trend bias: {selectedQuote?.change24h ? `${selectedQuote.change24h.toFixed(2)}%` : "No data"}
              </p>
            </div>
            <div>
              <h3>Can we buy at a great price?</h3>
              <p>
                Watch levels and use alerts before entering. Daddy says: be patient, avoid FOMO.
              </p>
            </div>
          </div>
        </article>

        <article className="panel ai-panel">
          <h2>AI Due Diligence</h2>
          <p>
            Ask for plain-English analysis. Designed for non-finance users.
          </p>
          <textarea
            value={analysisContext}
            onChange={(e) => setAnalysisContext(e.target.value)}
            placeholder="Example: I prefer low volatility and medium-term positions."
          />
          <button className="btn btn-primary" onClick={runAiAnalysis} disabled={analyzing || !selectedPair}>
            {analyzing ? "Analyzing..." : "Run Daddy AI Analysis"}
          </button>

          {analysis && (
            <div className="analysis-result">
              <h3>{analysis.pair}</h3>
              <p>{analysis.summary}</p>
              <p>
                Conviction: <strong>{analysis.conviction}</strong>
              </p>
              <div className="analysis-columns">
                <div>
                  <h4>Opportunities</h4>
                  <ul>
                    {analysis.opportunities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Risks</h4>
                  <ul>
                    {analysis.risks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Action Plan</h4>
                  <ul>
                    {analysis.actionPlan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="panel notification-panel">
          <h2>Notifications</h2>
          <div className="notification-list">
            {notifications.length === 0 && <p className="empty">No notifications yet.</p>}
            {notifications.map((item) => (
              <button
                key={item.id}
                className={`notification-item ${item.read ? "read" : "unread"}`}
                onClick={() => markAsRead(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
