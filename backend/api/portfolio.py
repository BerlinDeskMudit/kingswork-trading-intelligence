from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.portfolio import Portfolio, Position, Trade, OrderSide, TradeStatus, OrderType
from models.stock import TradingSignal
from models.user import User
from auth.deps import get_current_user
from datetime import datetime
from pydantic import BaseModel
from config import settings

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class TradeRequest(BaseModel):
    ticker: str
    side: OrderSide
    quantity: int
    price: float
    order_type: OrderType = OrderType.MARKET


class PortfolioCreate(BaseModel):
    name: str
    initial_cash: float = 100000.0


def get_or_create_demo_wallet(db: Session) -> Portfolio:
    wallet = db.query(Portfolio).filter(Portfolio.name == settings.demo_wallet_name).first()
    if wallet:
        return wallet

    wallet = Portfolio(
        name=settings.demo_wallet_name,
        cash=settings.demo_wallet_initial_cash,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def serialize_portfolio(portfolio: Portfolio, db: Session):
    positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    trades = (
        db.query(Trade)
        .filter(Trade.portfolio_id == portfolio.id)
        .order_by(Trade.executed_at.desc())
        .limit(50)
        .all()
    )

    position_rows = []
    positions_value = 0.0
    for position in positions:
        current_price = position.current_price or position.avg_entry_price
        value = position.quantity * current_price
        positions_value += value
        position_rows.append({
            "ticker": position.ticker,
            "quantity": position.quantity,
            "avg_entry_price": position.avg_entry_price,
            "current_price": current_price,
            "unrealized_pnl": (current_price - position.avg_entry_price) * position.quantity,
            "value": value,
        })

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "cash": portfolio.cash,
        "total_value": portfolio.cash + positions_value,
        "is_demo": portfolio.name == settings.demo_wallet_name,
        "positions": position_rows,
        "trades": [
            {
                "id": trade.id,
                "ticker": trade.ticker,
                "side": trade.side.value,
                "quantity": trade.quantity,
                "price": trade.price,
                "pnl": trade.pnl,
                "executed_at": trade.executed_at.isoformat() if trade.executed_at else None,
            }
            for trade in trades
        ],
    }


@router.get("/portfolios")
async def list_portfolios(db: Session = Depends(get_db)):
    get_or_create_demo_wallet(db)
    portfolios = db.query(Portfolio).all()
    return {"status": "ok", "portfolios": [serialize_portfolio(portfolio, db) for portfolio in portfolios]}


@router.post("/portfolios")
async def create_portfolio(req: PortfolioCreate, db: Session = Depends(get_db)):
    portfolio = Portfolio(name=req.name, cash=req.initial_cash)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return {"status": "ok", "portfolio": serialize_portfolio(portfolio, db)}


@router.get("/wallet")
async def get_demo_wallet(db: Session = Depends(get_db)):
    wallet = get_or_create_demo_wallet(db)
    return {
        "status": "ok",
        "wallet": serialize_portfolio(wallet, db),
        "dummy_money": settings.demo_wallet_initial_cash,
    }


@router.get("/portfolios/{portfolio_id}")
async def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"status": "ok", "portfolio": serialize_portfolio(portfolio, db)}


@router.post("/portfolios/{portfolio_id}/trade")
async def execute_trade(
    portfolio_id: int,
    req: TradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    cost = req.quantity * req.price

    if req.side == OrderSide.BUY:
        if cost > portfolio.cash:
            raise HTTPException(status_code=400, detail="Insufficient cash")
        portfolio.cash -= cost

        existing = db.query(Position).filter(
            Position.portfolio_id == portfolio_id,
            Position.ticker == req.ticker.upper(),
        ).first()

        if existing:
            total_qty = existing.quantity + req.quantity
            total_cost = existing.quantity * existing.avg_entry_price + cost
            existing.avg_entry_price = total_cost / total_qty
            existing.quantity = total_qty
            existing.current_price = req.price
        else:
            position = Position(
                portfolio_id=portfolio_id,
                ticker=req.ticker.upper(),
                quantity=req.quantity,
                avg_entry_price=req.price,
                current_price=req.price,
            )
            db.add(position)

        trade = Trade(
            portfolio_id=portfolio_id,
            ticker=req.ticker.upper(),
            side=OrderSide.BUY,
            quantity=req.quantity,
            price=req.price,
            order_type=req.order_type,
            status=TradeStatus.EXECUTED,
        )
        db.add(trade)

    elif req.side == OrderSide.SELL:
        position = db.query(Position).filter(
            Position.portfolio_id == portfolio_id,
            Position.ticker == req.ticker.upper(),
        ).first()
        if not position or position.quantity < req.quantity:
            raise HTTPException(status_code=400, detail="Insufficient shares")

        proceeds = cost * 0.999
        position.quantity -= req.quantity
        pnl = (req.price - position.avg_entry_price) * req.quantity
        portfolio.cash += proceeds

        trade = Trade(
            portfolio_id=portfolio_id,
            ticker=req.ticker.upper(),
            side=OrderSide.SELL,
            quantity=req.quantity,
            price=req.price,
            pnl=pnl,
            order_type=req.order_type,
            status=TradeStatus.EXECUTED,
        )
        db.add(trade)

        if position.quantity == 0:
            db.delete(position)

    db.commit()

    from models.engagement import (
        check_achievements,
        get_or_create_daily_challenges,
        update_daily_challenge_progress,
    )

    get_or_create_daily_challenges(db, current_user.id)
    update_daily_challenge_progress(db, current_user.id, "trade")

    if req.side == OrderSide.SELL:
        if pnl > 0:
            update_daily_challenge_progress(db, current_user.id, "profit", int(round(pnl)))

        consecutive_wins = 0
        recent_sells = (
            db.query(Trade)
            .filter(Trade.portfolio_id == portfolio_id, Trade.side == OrderSide.SELL)
            .order_by(Trade.executed_at.desc())
            .all()
        )
        for recent_trade in recent_sells:
            if (recent_trade.pnl or 0) <= 0:
                break
            consecutive_wins += 1
        update_daily_challenge_progress(
            db,
            current_user.id,
            "win_streak",
            consecutive_wins,
            absolute=True,
        )

    check_achievements(db, current_user.id, "trade", 1, portfolio_id)
    return {"status": "ok", "message": f"{req.side.value} {req.quantity} {req.ticker} @ ${req.price:.2f}"}


@router.get("/backtest/{ticker}")
async def backtest_ticker(ticker: str, period: str = "6mo", model_id: Optional[str] = None):
    from main import data_service
    result = await data_service.run_backtest(ticker.upper(), period=period, model_id=model_id)
    return {"status": "ok", **result}



class PaperPortfolioCreate(BaseModel):
    name: str = "Paper Portfolio"


@router.post("/paper")
async def create_paper_portfolio(
    req: PaperPortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = Portfolio(name=req.name, cash=100000.0, is_paper=True, user_id=current_user.id)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return {"status": "ok", "portfolio": serialize_portfolio(portfolio, db)}


@router.get("/paper")
async def list_paper_portfolios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == current_user.id, Portfolio.is_paper == True)
        .all()
    )
    return {"status": "ok", "portfolios": [serialize_portfolio(p, db) for p in portfolios]}


@router.get("/paper/summary")
async def paper_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio_ids = [
        p.id
        for p in db.query(Portfolio.id)
        .filter(Portfolio.user_id == current_user.id, Portfolio.is_paper == True)
        .all()
    ]
    if not portfolio_ids:
        return {"status": "ok", "total_pnl": 0.0, "win_rate": 0.0, "trade_count": 0}

    sell_trades = (
        db.query(Trade)
        .filter(Trade.portfolio_id.in_(portfolio_ids), Trade.side == OrderSide.SELL)
        .all()
    )
    total_pnl = sum(t.pnl or 0.0 for t in sell_trades)
    wins = sum(1 for t in sell_trades if (t.pnl or 0.0) > 0)
    trade_count = len(sell_trades)
    win_rate = (wins / trade_count) if trade_count else 0.0
    return {"status": "ok", "total_pnl": total_pnl, "win_rate": win_rate, "trade_count": trade_count}


@router.get("/pnl-live")
async def pnl_live(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    result = []
    for p in portfolios:
        positions = db.query(Position).filter(Position.portfolio_id == p.id).all()
        unrealized_pnl = sum(
            ((pos.current_price or pos.avg_entry_price) - pos.avg_entry_price) * pos.quantity
            for pos in positions
        )
        positions_value = sum(
            (pos.current_price or pos.avg_entry_price) * pos.quantity for pos in positions
        )
        realized_pnl = sum(
            t.pnl or 0.0
            for t in db.query(Trade).filter(
                Trade.portfolio_id == p.id, Trade.side == OrderSide.SELL
            ).all()
        )
        total_pnl = unrealized_pnl + realized_pnl
        initial = 100000.0
        pnl_pct = (total_pnl / initial) * 100 if initial else 0.0
        result.append({
            "portfolio_id": p.id,
            "name": p.name,
            "cash": p.cash,
            "positions_value": positions_value,
            "total_value": p.cash + positions_value,
            "unrealized_pnl": unrealized_pnl,
            "realized_pnl": realized_pnl,
            "total_pnl": total_pnl,
            "pnl_pct": pnl_pct,
        })
    return {"status": "ok", "portfolios": result}
