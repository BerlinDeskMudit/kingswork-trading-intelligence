from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.portfolio import Portfolio, Position, Trade, OrderSide
from auth.deps import get_current_user
from models.user import User
from collections import defaultdict
from datetime import datetime, timedelta

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).all()
    rows = []
    for p in portfolios:
        positions = db.query(Position).filter(Position.portfolio_id == p.id).all()
        positions_value = sum(pos.quantity * (pos.current_price or pos.avg_entry_price) for pos in positions)
        total = p.cash + positions_value
        trade_count = db.query(Trade).filter(Trade.portfolio_id == p.id).count()
        rows.append({
            "portfolio_id": p.id,
            "name": p.name,
            "total_value": round(total, 2),
            "cash": round(p.cash, 2),
            "positions_value": round(positions_value, 2),
            "trade_count": trade_count,
        })
    rows.sort(key=lambda r: r["total_value"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return {"status": "ok", "leaderboard": rows}


@router.get("/stats/{portfolio_id}")
def get_portfolio_stats(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        return {"status": "error", "detail": "Portfolio not found"}

    trades = db.query(Trade).filter(Trade.portfolio_id == portfolio_id).order_by(Trade.executed_at).all()
    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    positions_value = sum(p.quantity * (p.current_price or p.avg_entry_price) for p in positions)
    total_value = portfolio.cash + positions_value

    # P&L timeline from trades
    equity_curve = []
    running_cash = 100_000.0
    cumulative_pnl = 0.0
    for t in trades:
        if t.side == OrderSide.BUY:
            running_cash -= t.quantity * t.price
        else:
            running_cash += t.quantity * t.price
            cumulative_pnl += (t.pnl or 0)
        equity_curve.append({
            "date": t.executed_at.isoformat() if t.executed_at else None,
            "cash": round(running_cash, 2),
            "cumulative_pnl": round(cumulative_pnl, 2),
        })

    # Win rate
    sell_trades = [t for t in trades if t.side == OrderSide.SELL and t.pnl is not None]
    wins = sum(1 for t in sell_trades if (t.pnl or 0) > 0)
    win_rate = round(wins / len(sell_trades) * 100, 1) if sell_trades else 0

    total_pnl = sum(t.pnl or 0 for t in sell_trades)

    return {
        "status": "ok",
        "portfolio_id": portfolio_id,
        "name": portfolio.name,
        "total_value": round(total_value, 2),
        "cash": round(portfolio.cash, 2),
        "positions_value": round(positions_value, 2),
        "total_pnl": round(total_pnl, 2),
        "win_rate": win_rate,
        "total_trades": len(trades),
        "winning_trades": wins,
        "equity_curve": equity_curve,
    }
