from fastapi import APIRouter, Query
from typing import Optional
from config import settings
from services.data_service import DataService

router = APIRouter(prefix="/screener", tags=["screener"])


def get_service() -> DataService:
    from main import data_service
    return data_service


@router.get("")
async def screen_stocks(
    market: str = Query("us", description="Market: us, nse, bse, crypto"),
    signal: Optional[str] = Query(None, description="Filter by signal: BUY, SELL, NEUTRAL"),
    min_change_pct: Optional[float] = Query(None),
    max_change_pct: Optional[float] = Query(None),
    min_volume: Optional[int] = Query(None),
    sort_by: str = Query("change_pct", description="Sort: change_pct, volume, price"),
    order: str = Query("desc"),
):
    service = get_service()
    market_map = {
        "us": settings.default_tickers,
        "nse": settings.nse_tickers,
        "bse": settings.bse_tickers,
        "crypto": settings.crypto_tickers,
    }
    tickers = market_map.get(market.lower(), settings.default_tickers)
    overview = await service.get_market_overview(tickers)
    rows = []
    for ticker, d in overview.get("data", {}).items():
        rows.append({
            "ticker": ticker,
            "name": d.get("name", ticker),
            "price": d.get("price", 0),
            "change_pct": d.get("change_pct", 0),
            "volume": d.get("volume", 0),
            "signal": d.get("signal", "N/A"),
            "market_cap": d.get("market_cap", 0),
            "currency": d.get("currency", "USD"),
        })

    if signal:
        rows = [r for r in rows if r["signal"].upper() == signal.upper()]
    if min_change_pct is not None:
        rows = [r for r in rows if r["change_pct"] >= min_change_pct]
    if max_change_pct is not None:
        rows = [r for r in rows if r["change_pct"] <= max_change_pct]
    if min_volume is not None:
        rows = [r for r in rows if r["volume"] >= min_volume]

    reverse = order.lower() != "asc"
    rows.sort(key=lambda r: r.get(sort_by, 0) or 0, reverse=reverse)

    return {"status": "ok", "market": market, "count": len(rows), "results": rows}
