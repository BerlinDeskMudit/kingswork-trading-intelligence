from datetime import datetime, timedelta
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from database import get_db
from models.portfolio import OrderSide, Portfolio, Position, Trade
from models.user import User
from models.user_preferences import UserAccountPreference

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _portfolio_values(db: Session, portfolio: Portfolio):
    positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    positions_value = sum(
        position.quantity * (position.current_price or position.avg_entry_price)
        for position in positions
    )
    trades = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).order_by(Trade.executed_at).all()
    total_value = portfolio.cash + positions_value
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent_pnl = sum(
        trade.pnl or 0
        for trade in trades
        if trade.side == OrderSide.SELL and trade.executed_at and trade.executed_at >= cutoff
    )

    running_pnl = 0.0
    trend = []
    for trade in trades:
        if trade.side == OrderSide.SELL:
            running_pnl += trade.pnl or 0
        if trade.executed_at:
            trend.append({
                "date": trade.executed_at.isoformat(),
                "score": round(100_000 + running_pnl, 2),
            })
    if not trend:
        trend.append({"date": None, "score": round(total_value, 2)})

    return {
        "total_value": total_value,
        "previous_value": total_value - recent_pnl,
        "positions_value": positions_value,
        "trade_count": len(trades),
        "score_trend": trend[-12:],
    }


@router.get("")
def get_leaderboard(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(Portfolio, User)
        .join(User, User.id == Portfolio.user_id)
        .join(UserAccountPreference, UserAccountPreference.user_id == User.id)
        .filter(UserAccountPreference.leaderboard_opt_in == True)
        .all()
    )

    rows = []
    for portfolio, owner in entries:
        values = _portfolio_values(db, portfolio)
        rows.append({
            "portfolio_id": portfolio.id,
            "name": portfolio.name,
            "display_name": owner.name,
            "total_value": round(values["total_value"], 2),
            "previous_value": round(values["previous_value"], 2),
            "cash": round(portfolio.cash, 2),
            "positions_value": round(values["positions_value"], 2),
            "trade_count": values["trade_count"],
            "score_trend": values["score_trend"],
            "is_current_user": owner.id == current_user.id,
        })

    rows.sort(key=lambda row: row["total_value"], reverse=True)
    previous_order = {
        row["portfolio_id"]: index + 1
        for index, row in enumerate(sorted(rows, key=lambda row: row["previous_value"], reverse=True))
    }
    for index, row in enumerate(rows):
        row["rank"] = index + 1
        row["rank_change"] = previous_order[row["portfolio_id"]] - row["rank"]

    total = len(rows)
    start = (page - 1) * page_size
    return {
        "status": "ok",
        "data_source": "opt_in_paper_portfolios",
        "leaderboard": rows[start:start + page_size],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": ceil(total / page_size) if total else 0,
        },
    }


@router.get("/stats/{portfolio_id}")
def get_portfolio_stats(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if portfolio.user_id != current_user.id:
        visibility = db.query(UserAccountPreference).filter(
            UserAccountPreference.user_id == portfolio.user_id,
            UserAccountPreference.leaderboard_opt_in == True,
        ).first()
        if not visibility:
            raise HTTPException(status_code=404, detail="Portfolio not found")

    trades = db.query(Trade).filter(Trade.portfolio_id == portfolio_id).order_by(Trade.executed_at).all()
    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    positions_value = sum(
        position.quantity * (position.current_price or position.avg_entry_price)
        for position in positions
    )
    total_value = portfolio.cash + positions_value

    equity_curve = []
    cumulative_pnl = 0.0
    for trade in trades:
        if trade.side == OrderSide.SELL:
            cumulative_pnl += trade.pnl or 0
        equity_curve.append({
            "date": trade.executed_at.isoformat() if trade.executed_at else None,
            "cumulative_pnl": round(cumulative_pnl, 2),
        })

    sell_trades = [trade for trade in trades if trade.side == OrderSide.SELL and trade.pnl is not None]
    wins = sum(1 for trade in sell_trades if (trade.pnl or 0) > 0)
    total_pnl = sum(trade.pnl or 0 for trade in sell_trades)
    return {
        "status": "ok",
        "portfolio_id": portfolio_id,
        "name": portfolio.name,
        "total_value": round(total_value, 2),
        "cash": round(portfolio.cash, 2),
        "positions_value": round(positions_value, 2),
        "total_pnl": round(total_pnl, 2),
        "win_rate": round(wins / len(sell_trades) * 100, 1) if sell_trades else 0,
        "total_trades": len(trades),
        "winning_trades": wins,
        "equity_curve": equity_curve,
    }
