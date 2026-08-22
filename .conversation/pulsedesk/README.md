# PulseDesk

An event-driven commodity sentiment tracker. Tracks a commodity's price
alongside the market events that moved it (Fed decisions, EIA inventory
reports, OPEC meetings, geopolitical headlines), scores each event's
sentiment, measures the realized price move that followed, and generates
a short plain-English "morning desk brief."

## Why this project
Built to demonstrate the workflow described in Axxela's Trading Analyst
role: analyzing and assimilating data, events, and market information to
determine market sentiment, and using that to inform a trading view.

## Stack
- **Backend:** FastAPI + SQLite
- **Data:** yfinance (falls back to a synthetic random-walk series if
  offline, so the demo always runs)
- **Sentiment:** lexicon-based scorer by default; swap in `score_llm()`
  in `sentiment.py` for LLM-based scoring once you add an
  `ANTHROPIC_API_KEY`
- **Frontend:** single-file HTML/JS dashboard with Chart.js

## Run locally / on Replit
```bash
cd backend
pip install -r requirements.txt
python seed_data.py      # pulls real data via yfinance, or synthetic if offline
uvicorn main:app --host 0.0.0.0 --port 8000
```
Then open the server URL in your browser — the dashboard is served
directly by FastAPI.

## What to extend next
- Swap `score_lexicon()` for `score_llm()` in `sentiment.py` for
  materially better sentiment scoring
- Pull real headlines from a free news API instead of the event
  templates in `seed_data.py`
- Add more commodities or a multi-commodity comparison view
