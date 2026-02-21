"use client";

import { onValue } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { STOCK_UNIVERSE } from "@/lib/constants";
import { createForumComment, forumCommentsRef } from "@/lib/db";
import type { ForumComment, StockItem, StockQuote } from "@/lib/types";

const POLL_MS = 60000;

function formatPrice(value: number | null, currency: string) {
  if (value === null) {
    return "N/A";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function formatChange(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function DashboardApp() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [selectedStockId, setSelectedStockId] = useState(STOCK_UNIVERSE[0]?.id ?? "");
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, router, user]);

  useEffect(() => {
    let active = true;

    async function refreshQuotes() {
      const rows = await Promise.all(
        STOCK_UNIVERSE.map(async (stock) => {
          const response = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(stock.symbol)}`, {
            cache: "no-store"
          });

          if (!response.ok) {
            return [stock.id, {
              symbol: stock.symbol,
              price: null,
              change24h: null,
              currency: "USD",
              fetchedAt: new Date().toISOString()
            }] as const;
          }

          const payload = (await response.json()) as StockQuote;
          return [stock.id, payload] as const;
        })
      );

      if (!active) {
        return;
      }

      const map: Record<string, StockQuote> = {};
      for (const [id, quote] of rows) {
        map[id] = quote;
      }
      setQuotes(map);
    }

    void refreshQuotes();
    const interval = setInterval(() => {
      void refreshQuotes();
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const selectedStock = useMemo<StockItem | null>(() => {
    return STOCK_UNIVERSE.find((item) => item.id === selectedStockId) ?? null;
  }, [selectedStockId]);

  useEffect(() => {
    if (!selectedStock) {
      return;
    }

    const unsubscribe = onValue(forumCommentsRef(selectedStock.id), (snapshot) => {
      const value = snapshot.val() as Record<string, ForumComment> | null;
      const rows = value ? Object.values(value) : [];
      rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setComments(rows);
    });

    return () => unsubscribe();
  }, [selectedStock]);

  async function submitComment() {
    if (!user || !selectedStock || posting) {
      return;
    }

    const text = composer.trim();
    if (!text) {
      return;
    }

    setPosting(true);
    setComposer("");

    const authorName = user.displayName || user.email || "Anonymous";

    try {
      await createForumComment(selectedStock.id, {
        authorName,
        authorUid: user.uid,
        message: text,
        createdAt: new Date().toISOString(),
        isDaddy: false
      });

      if (/^\/daddy\b/i.test(text)) {
        const question = text.replace(/^\/daddy\s*/i, "").trim();
        const quote = quotes[selectedStock.id];

        const response = await fetch("/api/ai/daddy-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selectedStock.symbol,
            company: selectedStock.company,
            question,
            price: quote?.price ?? null,
            change24h: quote?.change24h ?? null
          })
        });

        if (!response.ok) {
          await createForumComment(selectedStock.id, {
            authorName: "Daddy AI",
            authorUid: null,
            message: "Daddy is temporarily offline. Try /daddy again in a minute.",
            createdAt: new Date().toISOString(),
            isDaddy: true
          });
          return;
        }

        const payload = (await response.json()) as { reply?: string };
        await createForumComment(selectedStock.id, {
          authorName: "Daddy AI",
          authorUid: null,
          message: payload.reply ?? "No response",
          createdAt: new Date().toISOString(),
          isDaddy: true
        });
      }
    } finally {
      setPosting(false);
    }
  }

  if (loading || !user) {
    return <main className="loading-screen">Loading dashboard...</main>;
  }

  return (
    <main className="dashboard-root forum-root">
      <header className="dashboard-header">
        <div>
          <p className="hero-kicker">MARKETS + COMMUNITY</p>
          <h1>Stock Forum</h1>
          <p className="forum-subtitle">Pick a stock, discuss publicly, and ask Daddy with <code>/daddy</code>.</p>
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

      <section className="forum-layout">
        <aside className="panel stock-list-panel">
          <h2>Market List</h2>
          <div className="stock-list">
            {STOCK_UNIVERSE.map((stock) => {
              const quote = quotes[stock.id];
              const selected = stock.id === selectedStockId;
              return (
                <button
                  key={stock.id}
                  className={`stock-row ${selected ? "selected" : ""}`}
                  onClick={() => setSelectedStockId(stock.id)}
                >
                  <div>
                    <strong>{stock.symbol}</strong>
                    <p>{stock.company}</p>
                  </div>
                  <div className="stock-row-right">
                    <span>{formatPrice(quote?.price ?? null, quote?.currency ?? "USD")}</span>
                    <em className={(quote?.change24h ?? 0) >= 0 ? "up" : "down"}>
                      {formatChange(quote?.change24h ?? null)}
                    </em>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel forum-panel">
          {selectedStock && (
            <>
              <div className="forum-stock-head">
                <div>
                  <h2>{selectedStock.company}</h2>
                  <p>
                    {selectedStock.exchange} - {selectedStock.sector} - {selectedStock.symbol}
                  </p>
                </div>
                <div>
                  <strong>
                    {formatPrice(
                      quotes[selectedStock.id]?.price ?? null,
                      quotes[selectedStock.id]?.currency ?? "USD"
                    )}
                  </strong>
                  <p className={(quotes[selectedStock.id]?.change24h ?? 0) >= 0 ? "up" : "down"}>
                    {formatChange(quotes[selectedStock.id]?.change24h ?? null)}
                  </p>
                </div>
              </div>

              <div className="forum-thread">
                {comments.length === 0 && (
                  <p className="empty">No comments yet. Write first, or use /daddy for AI take.</p>
                )}
                {comments.map((comment) => (
                  <article key={comment.id} className={`comment-item ${comment.isDaddy ? "daddy" : ""}`}>
                    <div className="comment-meta">
                      <strong>{comment.authorName}</strong>
                      <time>{new Date(comment.createdAt).toLocaleString()}</time>
                    </div>
                    <p>{comment.message}</p>
                  </article>
                ))}
              </div>

              <div className="forum-composer">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Public comment... Use /daddy Is this a great business?"
                />
                <div className="composer-actions">
                  <span>/daddy ile yazarsan Daddy AI public cevap verir.</span>
                  <button className="btn btn-primary" onClick={submitComment} disabled={posting}>
                    {posting ? "Sending..." : "Post"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
