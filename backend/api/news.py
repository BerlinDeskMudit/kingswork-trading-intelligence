from fastapi import APIRouter, Query
import httpx
import xml.etree.ElementTree as ET
from urllib.parse import quote
import asyncio

router = APIRouter(prefix="/news", tags=["news"])

POS_WEIGHTS = {"surge": 2, "rally": 2, "beat": 2, "upgrade": 2, "record": 2,
               "profit": 1, "strong": 1, "growth": 1, "gain": 1, "rise": 1, "bull": 1, "jump": 1}
NEG_WEIGHTS = {"crash": 3, "loss": 2, "miss": 2, "downgrade": 2, "warn": 2, "bankrupt": 3,
               "weak": 1, "cut": 1, "risk": 1, "fall": 1, "drop": 1, "bear": 1, "decline": 1}
NEGATORS = {"not", "no", "never", "despite", "fails", "without"}


def _score_sentiment(title: str, summary: str = "") -> tuple:
    words = (title + " " + summary).lower().split()
    score = 0
    for i, w in enumerate(words):
        negated = any(words[max(0, i-2):i][j] in NEGATORS for j in range(min(2, i)))
        modifier = -1 if negated else 1
        score += modifier * POS_WEIGHTS.get(w, 0)
        score -= modifier * NEG_WEIGHTS.get(w, 0)
    label = "positive" if score > 0 else "negative" if score < 0 else "neutral"
    confidence = round(min(abs(score) / 5.0, 1.0), 2)
    return label, confidence, score


async def _fetch_rss(url: str, provider: str, limit: int) -> list:
    results = []
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200 and resp.text.strip():
                root = ET.fromstring(resp.text)
                for item in root.findall(".//item")[:limit]:
                    title = item.findtext("title") or ""
                    link = item.findtext("link") or ""
                    pub_date = item.findtext("pubDate") or ""
                    description = (item.findtext("description") or "")[:200]
                    source_el = item.find("source")
                    src = source_el.text if source_el is not None else provider
                    label, confidence, raw_score = _score_sentiment(title, description)
                    results.append({
                        "title": title, "summary": description, "published_at": pub_date,
                        "url": link, "provider": src,
                        "sentiment": label, "confidence": confidence, "score": raw_score,
                    })
    except Exception:
        pass
    return results


@router.get("/{ticker}")
async def get_news(ticker: str, limit: int = Query(15, le=30)):
    ticker = ticker.upper()

    yahoo_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={quote(ticker)}&region=US&lang=en-US"
    google_url = f"https://news.google.com/rss/search?q={quote(ticker)}+stock&hl=en-US&gl=US&ceid=US:en"
    finviz_url = f"https://finviz.com/rss.ashx?t={ticker}"

    all_results = await asyncio.gather(
        _fetch_rss(yahoo_url, "Yahoo Finance", limit),
        _fetch_rss(finviz_url, "Finviz", limit),
        _fetch_rss(google_url, "Google News", limit),
    )

    # Merge, deduplicate by title
    seen, results = set(), []
    for batch in all_results:
        for item in batch:
            key = item["title"][:60]
            if key not in seen:
                seen.add(key)
                results.append(item)
        if results:
            break  # Use first source that returned data; fallback to next

    if not results:
        for batch in all_results:
            for item in batch:
                key = item["title"][:60]
                if key not in seen:
                    seen.add(key)
                    results.append(item)

    # Sentiment summary
    pos = [r for r in results if r["sentiment"] == "positive"]
    neg = [r for r in results if r["sentiment"] == "negative"]
    total = len(results) or 1
    overall_score = round(sum(r["score"] for r in results) / total, 2)

    # Trend: compare avg score first half vs second half
    mid = max(len(results) // 2, 1)
    recent_avg = sum(r["score"] for r in results[:mid]) / mid
    older_avg = sum(r["score"] for r in results[mid:]) / max(len(results) - mid, 1)
    trend = "improving" if recent_avg > older_avg + 0.1 else "worsening" if recent_avg < older_avg - 0.1 else "stable"

    return {
        "status": "ok",
        "ticker": ticker,
        "news": results[:limit],
        "sentiment_summary": {
            "positive": len(pos),
            "negative": len(neg),
            "neutral": total - len(pos) - len(neg),
            "score": overall_score,
            "overall": "positive" if overall_score > 0 else "negative" if overall_score < 0 else "neutral",
            "trend": trend,
            "trend_delta": round(recent_avg - older_avg, 2),
        },
    }
