"""
Sentiment scoring for market headlines.

Two modes:
  1. score_lexicon()  -> fast, offline, keyword-based scorer. Works with
     zero setup, used as the default so the project runs out of the box.
  2. score_llm()      -> higher-quality scorer using the Anthropic API.
     Swap this in once you have an API key set as the ANTHROPIC_API_KEY
     environment variable (Replit lets you set this as a Secret).
"""
import os
import re

POSITIVE_WORDS = {
    "surge", "rally", "boost", "strong", "beat", "cut", "supportive",
    "tighten", "shortage", "draw", "bullish", "growth", "expansion",
    "recovery", "upgrade", "stimulus",
}
NEGATIVE_WORDS = {
    "slump", "plunge", "weak", "miss", "hike", "oversupply", "build",
    "bearish", "contraction", "recession", "downgrade", "glut",
    "slowdown", "tension", "disruption",
}


def score_lexicon(headline: str) -> float:
    """Returns a score from -1 (very negative) to +1 (very positive)."""
    words = set(re.findall(r"[a-zA-Z]+", headline.lower()))
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    if pos == 0 and neg == 0:
        return 0.0
    return round((pos - neg) / max(pos + neg, 1), 2)


def score_llm(headline: str, commodity: str) -> float:
    """
    Higher-quality sentiment scoring via Claude.
    Requires: pip install anthropic, and ANTHROPIC_API_KEY set.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    prompt = (
        f"Rate the sentiment of this headline for {commodity} futures prices "
        f"on a scale from -1 (very bearish) to 1 (very bullish). "
        f"Reply with ONLY the number.\n\nHeadline: {headline}"
    )
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        return float(resp.content[0].text.strip())
    except (ValueError, IndexError):
        return 0.0


def generate_brief(commodity: str, events: list, latest_price: float, price_change_pct: float) -> str:
    """
    Generates a short plain-English 'morning desk brief'.
    Rule-based by default (works offline); swap the body for an LLM call
    the same way score_llm() does, once you have an API key wired up.
    """
    avg_sentiment = sum(e["sentiment_score"] for e in events) / len(events) if events else 0
    tone = "constructive" if avg_sentiment > 0.2 else "cautious" if avg_sentiment < -0.2 else "mixed"
    direction = "up" if price_change_pct > 0 else "down"

    top_event = max(events, key=lambda e: abs(e["sentiment_score"]), default=None)

    lines = [
        f"{commodity} is trading {direction} {abs(price_change_pct):.1f}% over the review window, "
        f"at {latest_price:.2f}.",
        f"Recent event flow reads {tone} overall (avg sentiment {avg_sentiment:+.2f}).",
    ]
    if top_event:
        lines.append(
            f"Most impactful headline: \"{top_event['headline']}\" "
            f"({top_event['category']}, sentiment {top_event['sentiment_score']:+.2f}), "
            f"followed by a {top_event['price_move_5d']:+.1f}% move over the next 5 sessions."
        )
    return " ".join(lines)
