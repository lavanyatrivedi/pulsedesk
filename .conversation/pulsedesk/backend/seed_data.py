"""
Seeds the database with commodity price history and market events.

Tries to pull REAL price data via yfinance first (this works once you run
it on Replit, which has open internet access). If yfinance isn't
reachable, it falls back to a synthetic random-walk series so the project
still runs and demos correctly offline.

Run: python seed_data.py
"""
import random
from datetime import date, timedelta

from database import init_db, get_conn
from sentiment import score_lexicon

COMMODITIES = {
    "WTI Crude Oil": "CL=F",
    "Gold": "GC=F",
    "Natural Gas": "NG=F",
}

# A realistic-looking set of recurring market events per commodity.
EVENT_TEMPLATES = [
    ("EIA Crude Inventory Report", "Data Release",
     ["EIA reports surprise crude draw, tightening supply outlook",
      "EIA reports large inventory build, raising oversupply concerns"]),
    ("OPEC+ Meeting", "Policy",
     ["OPEC+ agrees to output cuts, supportive for prices",
      "OPEC+ holds production steady, disappointing bulls"]),
    ("Fed Rate Decision", "Macro",
     ["Fed signals rate cuts ahead, boosting risk appetite",
      "Fed hikes rates, pressuring commodity demand outlook"]),
    ("Geopolitical Development", "Geopolitical",
     ["Supply disruption fears rise on regional tension",
      "De-escalation eases supply disruption concerns"]),
    ("US Jobs Report", "Macro",
     ["Strong jobs data signals robust demand, prices rally",
      "Weak jobs data raises recession and demand concerns"]),
]


def fetch_real_prices(ticker: str, days: int = 180):
    try:
        import yfinance as yf
        df = yf.download(ticker, period=f"{days}d", progress=False)
        if df.empty:
            return None
        return [(idx.strftime("%Y-%m-%d"), float(row["Close"])) for idx, row in df.iterrows()]
    except Exception:
        return None


def synthetic_prices(days: int = 180, start_price: float = 75.0):
    prices = []
    price = start_price
    d = date.today() - timedelta(days=days)
    for _ in range(days):
        price *= 1 + random.uniform(-0.02, 0.02)
        prices.append((d.strftime("%Y-%m-%d"), round(price, 2)))
        d += timedelta(days=1)
    return prices


def price_move_after(prices, event_date_str, window=5):
    dates = [p[0] for p in prices]
    if event_date_str not in dates:
        return None
    idx = dates.index(event_date_str)
    if idx + window >= len(prices):
        return None
    before = prices[idx][1]
    after = prices[idx + window][1]
    return round((after - before) / before * 100, 2)


def seed():
    init_db()
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM prices")
        cur.execute("DELETE FROM events")

        for name, ticker in COMMODITIES.items():
            prices = fetch_real_prices(ticker) or synthetic_prices(
                start_price=random.uniform(60, 2000)
            )
            for d, close in prices:
                cur.execute(
                    "INSERT OR IGNORE INTO prices (commodity, date, close) VALUES (?, ?, ?)",
                    (name, d, close),
                )

            # Scatter 6-8 events across the price window
            event_dates = random.sample(range(10, len(prices) - 10), k=min(7, len(prices) - 20))
            for i in event_dates:
                event_date = prices[i][0]
                title, category, headlines = random.choice(EVENT_TEMPLATES)
                headline = random.choice(headlines)
                sentiment = score_lexicon(headline)
                move = price_move_after(prices, event_date)
                cur.execute(
                    """INSERT INTO events
                       (commodity, date, headline, category, sentiment_score, price_move_5d)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (name, event_date, headline, category, sentiment, move),
                )
        conn.commit()
    print("Seeded PulseDesk database.")


if __name__ == "__main__":
    seed()
