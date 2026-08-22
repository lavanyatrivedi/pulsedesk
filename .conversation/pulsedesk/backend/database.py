"""
PulseDesk database layer.
Two tables:
  prices  -> daily close price per commodity
  events  -> market-moving events per commodity, with sentiment score
             and the realized price move in the days following the event
"""
import sqlite3
from contextlib import contextmanager

DB_PATH = "pulsedesk.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity TEXT NOT NULL,
            date TEXT NOT NULL,
            close REAL NOT NULL,
            UNIQUE(commodity, date)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commodity TEXT NOT NULL,
            date TEXT NOT NULL,
            headline TEXT NOT NULL,
            category TEXT NOT NULL,
            sentiment_score REAL NOT NULL,
            price_move_5d REAL
        )
    """)
    conn.commit()
    conn.close()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
