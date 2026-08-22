"""
PulseDesk API
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db, get_conn
from sentiment import generate_brief

app = FastAPI(title="PulseDesk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/commodities")
def list_commodities():
    with get_conn() as conn:
        rows = conn.execute("SELECT DISTINCT commodity FROM prices").fetchall()
    return [r["commodity"] for r in rows]


@app.get("/api/prices")
def get_prices(commodity: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, close FROM prices WHERE commodity = ? ORDER BY date",
            (commodity,),
        ).fetchall()
    if not rows:
        raise HTTPException(404, "No price data for that commodity")
    return [{"date": r["date"], "close": r["close"]} for r in rows]


@app.get("/api/events")
def get_events(commodity: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, headline, category, sentiment_score, price_move_5d "
            "FROM events WHERE commodity = ? ORDER BY date",
            (commodity,),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/brief")
def get_brief(commodity: str):
    prices = get_prices(commodity)
    events = get_events(commodity)
    if len(prices) < 2:
        raise HTTPException(404, "Not enough price data")

    latest_price = prices[-1]["close"]
    first_price = prices[0]["close"]
    change_pct = (latest_price - first_price) / first_price * 100

    brief = generate_brief(commodity, events, latest_price, change_pct)
    return {"commodity": commodity, "brief": brief, "latest_price": latest_price,
            "change_pct": round(change_pct, 2)}


# Serve the frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
