from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.portfolio import Portfolio, Position, Trade, OrderSide
from auth.deps import get_current_user
from models.user import User
from typing import Optional
import math

router = APIRouter(prefix="/analytics", tags=["analytics"])

SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "META": "Technology",
    "NVDA": "Technology", "TSLA": "Consumer Cyclical", "AMZN": "Consumer Cyclical",
    "JPM": "Financial", "V": "Financial", "BAC": "Financial",
    "JNJ": "Healthcare", "PFE": "Healthcare",
    "XOM": "Energy", "CVX": "Energy",
    "RELIANCE.NS": "Energy", "TCS.NS": "Technology", "HDFCBANK.NS": "Financial",
    "INFY.NS": "Technology", "ICICIBANK.NS": "Financial", "SBIN.NS": "Financial",
    "BHARTIARTL.NS": "Telecom", "ITC.NS": "Consumer Staples", "LT.NS": "Industrials",
    "AXISBANK.NS": "Financial",
}


@router.get("/pnl/{portfolio_id}")
def get_pnl_history(portfolio_id: int, db: Session = Depends(get_db)):
    trades = (
        db.query(Trade)
        .filter(Trade.portfolio_id == portfolio_id)
        .order_by(Trade.executed_at)
        .all()
    )
    curve = []
    running_pnl = 0.0
    running_cash = 100_000.0
    for t in trades:
        if t.side == OrderSide.BUY:
            running_cash -= t.quantity * t.price
        else:
            running_cash += t.quantity * t.price
            running_pnl += t.pnl or 0
        curve.append({
            "date": t.executed_at.isoformat() if t.executed_at else None,
            "pnl": round(running_pnl, 2),
            "cash": round(running_cash, 2),
            "ticker": t.ticker,
            "side": t.side.value,
        })
    return {"status": "ok", "pnl_history": curve}


@router.get("/sector-exposure/{portfolio_id}")
def get_sector_exposure(portfolio_id: int, db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    sector_totals: dict = {}
    total_value = 0.0
    for pos in positions:
        price = pos.current_price or pos.avg_entry_price
        value = pos.quantity * price
        sector = SECTOR_MAP.get(pos.ticker, "Other")
        sector_totals[sector] = sector_totals.get(sector, 0) + value
        total_value += value
    result = [
        {"sector": s, "value": round(v, 2), "pct": round(v / total_value * 100, 1) if total_value else 0}
        for s, v in sector_totals.items()
    ]
    result.sort(key=lambda x: x["value"], reverse=True)
    return {"status": "ok", "sectors": result, "total_value": round(total_value, 2)}


@router.get("/correlation")
async def get_correlation(tickers: str = Query(..., description="Comma-separated tickers"), period: str = "1mo"):
    from main import data_service
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:8]
    prices: dict = {}
    for ticker in ticker_list:
        try:
            data = await data_service.get_historical(ticker, period=period)
            if data and "history" in data:
                prices[ticker] = [h["close"] for h in data["history"] if "close" in h]
        except Exception:
            pass

    valid = {k: v for k, v in prices.items() if len(v) > 5}
    keys = list(valid.keys())
    matrix = []
    for t1 in keys:
        row = []
        for t2 in keys:
            s1, s2 = valid[t1], valid[t2]
            n = min(len(s1), len(s2))
            if n < 2:
                row.append(0.0)
                continue
            a, b = s1[-n:], s2[-n:]
            mean_a = sum(a) / n
            mean_b = sum(b) / n
            cov = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n)) / n
            std_a = math.sqrt(sum((x - mean_a) ** 2 for x in a) / n) or 1
            std_b = math.sqrt(sum((x - mean_b) ** 2 for x in b) / n) or 1
            row.append(round(cov / (std_a * std_b), 3))
        matrix.append(row)
    return {"status": "ok", "tickers": keys, "matrix": matrix}


@router.get("/options-chain/{ticker}")
async def get_options_chain(ticker: str, expiry: Optional[str] = None):
    """Simulated options chain based on current price."""
    from main import data_service
    try:
        data = await data_service.get_realtime(ticker.upper())
        price = data.get("price", 100)
    except Exception:
        price = 100.0

    strikes = [round(price * m, 2) for m in [0.85, 0.9, 0.95, 0.975, 1.0, 1.025, 1.05, 1.1, 1.15]]
    chain = []
    for strike in strikes:
        diff = abs(strike - price) / price
        iv = 0.20 + diff * 0.5
        call_premium = max(price - strike, 0) + price * iv * 0.1
        put_premium = max(strike - price, 0) + price * iv * 0.1
        chain.append({
            "strike": strike,
            "call_bid": round(call_premium * 0.95, 2),
            "call_ask": round(call_premium * 1.05, 2),
            "call_iv": round(iv * 100, 1),
            "call_delta": round(max(0.01, min(0.99, 0.5 - (strike - price) / (price * 0.3))), 3),
            "put_bid": round(put_premium * 0.95, 2),
            "put_ask": round(put_premium * 1.05, 2),
            "put_iv": round(iv * 100, 1),
            "put_delta": round(max(-0.99, min(-0.01, -0.5 + (strike - price) / (price * 0.3))), 3),
        })
    return {"status": "ok", "ticker": ticker.upper(), "spot": price, "chain": chain}
