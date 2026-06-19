from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth.deps import get_current_user
from models.user import User
from models.portfolio import Portfolio, Trade, OrderSide

router = APIRouter(prefix="/index-compare", tags=["index-compare"])

INDEX_SYMBOLS = {
    "NIFTY50": "^NSEI",
    "SP500": "^GSPC",
    "SENSEX": "^BSESN",
}


@router.get("/{portfolio_id}")
async def compare_with_index(
    portfolio_id: int,
    index: str = Query("NIFTY50"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from main import data_service

    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    index_symbol = INDEX_SYMBOLS.get(index.upper())
    if not index_symbol:
        raise HTTPException(status_code=400, detail=f"Unknown index. Choose from: {list(INDEX_SYMBOLS)}")

    trades = (
        db.query(Trade)
        .filter(Trade.portfolio_id == portfolio_id)
        .order_by(Trade.executed_at)
        .all()
    )

    if not trades:
        raise HTTPException(status_code=400, detail="No trades found in portfolio")

    first_trade_date = trades[0].executed_at
    # Determine period string approximation
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    days_diff = (now - first_trade_date.replace(tzinfo=timezone.utc)).days if first_trade_date.tzinfo is None else (now - first_trade_date).days
    if days_diff <= 30:
        period = "1mo"
    elif days_diff <= 90:
        period = "3mo"
    elif days_diff <= 180:
        period = "6mo"
    else:
        period = "1y"

    # Fetch index historical data
    index_df = await data_service.collector.fetch_historical(index_symbol, period=period, interval="1d")
    index_df = data_service._normalize_market_frame(index_df)

    if index_df.empty or "close" not in index_df.columns:
        raise HTTPException(status_code=502, detail="Could not fetch index data")

    index_start = float(index_df["close"].iloc[0])
    index_end = float(index_df["close"].iloc[-1])
    index_return_pct = round((index_end - index_start) / index_start * 100, 2)

    # Calculate portfolio return from trades
    total_invested = 0.0
    total_proceeds = 0.0
    for trade in trades:
        if trade.side == OrderSide.BUY:
            total_invested += trade.quantity * trade.price
        else:
            total_proceeds += trade.quantity * trade.price

    # Add current value of open positions
    from models.portfolio import Position
    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    open_value = sum((p.current_price or p.avg_entry_price) * p.quantity for p in positions)
    total_value = total_proceeds + open_value

    portfolio_return_pct = round((total_value - total_invested) / total_invested * 100, 2) if total_invested else 0.0
    alpha = round(portfolio_return_pct - index_return_pct, 2)

    # Build chart_data aligned to index dates
    index_dates = index_df["date"].astype(str).tolist() if "date" in index_df.columns else [str(i) for i in index_df.index]
    index_closes = index_df["close"].tolist()

    chart_data = [
        {
            "date": index_dates[i],
            "portfolio": round(portfolio_return_pct * (i / max(len(index_dates) - 1, 1)), 2),
            "index": round((index_closes[i] - index_start) / index_start * 100, 2),
        }
        for i in range(len(index_dates))
    ]

    return {
        "status": "ok",
        "portfolio_id": portfolio_id,
        "index": index.upper(),
        "index_symbol": index_symbol,
        "period": period,
        "portfolio_return_pct": portfolio_return_pct,
        "index_return_pct": index_return_pct,
        "alpha": alpha,
        "chart_data": chart_data,
    }
