"""
Polymarket-style prediction markets with CPMM (constant-product market maker).

Price mechanism:
  k = yes_reserve * no_reserve  (invariant)
  YES price ~= no_reserve / (yes_reserve + no_reserve)

Buying YES shares:
  User pays `cost` in paper cash.
  New no_reserve  = no_reserve + cost
  New yes_reserve = k / new_no_reserve
  Shares received = old_yes_reserve - new_yes_reserve
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from database import get_db
from models.markets import Market, MarketPosition, MarketStatus
from models.portfolio import Portfolio
from models.user import User

router = APIRouter(prefix="/predict", tags=["predict"])


# Helpers

def _get_wallet(db: Session) -> Portfolio:
    w = db.query(Portfolio).filter(Portfolio.name == "KingStop Demo Wallet").first()
    if not w:
        raise HTTPException(status_code=404, detail="Demo wallet not found")
    return w


def _serialize_market(m: Market, user_id: Optional[int] = None, db: Session = None):
    out = {
        "id": m.id,
        "question": m.question,
        "ticker": m.ticker,
        "condition": m.condition,
        "threshold": m.threshold,
        "category": m.category,
        "status": m.status.value,
        "yes_price": m.yes_price,
        "no_price": m.no_price,
        "yes_pct": round(m.yes_price * 100, 1),
        "no_pct": round(m.no_price * 100, 1),
        "yes_reserve": round(m.yes_reserve, 4),
        "no_reserve": round(m.no_reserve, 4),
        "liquidity": round(m.yes_reserve + m.no_reserve, 4),
        "total_volume": m.total_volume,
        "resolves_at": m.resolves_at.isoformat() if m.resolves_at else None,
        "resolved_at": m.resolved_at.isoformat() if m.resolved_at else None,
        "user_position": None,
        "user_exposure": 0,
        "user_market_value": 0,
        "user_unrealized_pnl": 0,
    }
    if user_id and db:
        pos = db.query(MarketPosition).filter(
            MarketPosition.market_id == m.id,
            MarketPosition.user_id == user_id,
            MarketPosition.redeemed == False,
        ).all()
        if pos:
            positions = []
            exposure = 0.0
            market_value = 0.0
            for p in pos:
                current_price = m.yes_price if p.side == "YES" else m.no_price
                cost_basis = p.shares * p.avg_price
                current_value = p.shares * current_price
                exposure += cost_basis
                market_value += current_value
                positions.append({
                    "id": p.id,
                    "side": p.side,
                    "shares": round(p.shares, 4),
                    "avg_price": round(p.avg_price, 4),
                    "current_price": round(current_price, 4),
                    "cost_basis": round(cost_basis, 2),
                    "market_value": round(current_value, 2),
                    "unrealized_pnl": round(current_value - cost_basis, 2),
                    "payout_if_wins": round(p.shares, 2),
                })

            out["user_position"] = positions
            out["user_exposure"] = round(exposure, 2)
            out["user_market_value"] = round(market_value, 2)
            out["user_unrealized_pnl"] = round(market_value - exposure, 2)
    return out


def _buy_quote(m: Market, side: str, cost: float):
    if side not in ("YES", "NO"):
        raise HTTPException(status_code=400, detail="side must be YES or NO")
    if cost <= 0:
        raise HTTPException(status_code=400, detail="cost must be positive")

    k = m.yes_reserve * m.no_reserve
    old_yes_price = m.yes_price
    old_no_price = m.no_price

    if side == "YES":
        new_no = m.no_reserve + cost
        new_yes = k / new_no
        shares = m.yes_reserve - new_yes
    else:
        new_yes = m.yes_reserve + cost
        new_no = k / new_yes
        shares = m.no_reserve - new_no

    if shares <= 0:
        raise HTTPException(status_code=400, detail="Trade too small, not enough liquidity")

    new_yes_price = round(new_no / (new_yes + new_no), 4)
    new_no_price = round(1.0 - new_yes_price, 4)
    old_side_price = old_yes_price if side == "YES" else old_no_price
    new_side_price = new_yes_price if side == "YES" else new_no_price
    avg_price = cost / shares

    return {
        "side": side,
        "cost": round(cost, 2),
        "estimated_shares": round(shares, 4),
        "avg_price": round(avg_price, 4),
        "old_yes_price": old_yes_price,
        "old_no_price": old_no_price,
        "new_yes_price": new_yes_price,
        "new_no_price": new_no_price,
        "price_before": old_side_price,
        "price_after": new_side_price,
        "price_impact_pct": round((new_side_price - old_side_price) * 100, 2),
        "slippage_pct": round((avg_price - old_side_price) * 100, 2),
    }


# Endpoints

@router.get("")
def list_markets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Market)
    if category:
        q = q.filter(Market.category == category)
    if status:
        q = q.filter(Market.status == MarketStatus(status))
    markets = q.order_by(Market.id.desc()).all()
    return {"status": "ok", "markets": [_serialize_market(m, current_user.id, db) for m in markets]}


@router.get("/{market_id}")
def get_market(
    market_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Market not found")
    return {"status": "ok", "market": _serialize_market(m, current_user.id, db)}


class CreateMarketRequest(BaseModel):
    question: str
    category: str = "stocks"
    ticker: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    initial_probability: float = 0.5
    liquidity: float = 200.0


@router.post("")
def create_market(
    req: CreateMarketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = req.question.strip()
    if len(question) < 12:
        raise HTTPException(status_code=400, detail="question must be at least 12 characters")
    if req.category not in ("stocks", "crypto", "india", "macro"):
        raise HTTPException(status_code=400, detail="category must be stocks, crypto, india, or macro")
    if req.liquidity < 50:
        raise HTTPException(status_code=400, detail="liquidity must be at least 50")
    if req.initial_probability < 0.05 or req.initial_probability > 0.95:
        raise HTTPException(status_code=400, detail="initial_probability must be between 0.05 and 0.95")

    market = Market(
        question=question,
        ticker=req.ticker.upper().strip() if req.ticker else None,
        condition=req.condition.strip() if req.condition else None,
        threshold=req.threshold,
        category=req.category,
        yes_reserve=(1.0 - req.initial_probability) * req.liquidity,
        no_reserve=req.initial_probability * req.liquidity,
    )
    db.add(market)
    db.commit()
    db.refresh(market)
    return {"status": "ok", "market": _serialize_market(market, current_user.id, db)}


@router.get("/{market_id}/quote")
def quote_buy(
    market_id: int,
    side: str,
    cost: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Market not found")
    if m.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open")
    return {"status": "ok", "quote": _buy_quote(m, side, cost)}


class BuyRequest(BaseModel):
    side: str          # "YES" or "NO"
    cost: float        # paper cash to spend (e.g. $10)


@router.post("/{market_id}/buy")
def buy_shares(
    market_id: int,
    req: BuyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.side not in ("YES", "NO"):
        raise HTTPException(status_code=400, detail="side must be YES or NO")
    if req.cost <= 0:
        raise HTTPException(status_code=400, detail="cost must be positive")

    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Market not found")
    if m.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open")

    wallet = _get_wallet(db)
    if wallet.cash < req.cost:
        raise HTTPException(status_code=400, detail="Insufficient cash")

    quote = _buy_quote(m, req.side, req.cost)
    old_yes_price = m.yes_price
    old_no_price = m.no_price

    k = m.yes_reserve * m.no_reserve
    if req.side == "YES":
        m.no_reserve += req.cost
        m.yes_reserve = k / m.no_reserve
    else:
        m.yes_reserve += req.cost
        m.no_reserve = k / m.yes_reserve

    shares = quote["estimated_shares"]
    price_per_share = quote["avg_price"]

    wallet.cash -= req.cost

    pos = MarketPosition(
        market_id=market_id,
        user_id=current_user.id,
        side=req.side,
        shares=shares,
        avg_price=price_per_share,
    )
    db.add(pos)
    db.commit()
    db.refresh(m)

    return {
        "status": "ok",
        "shares": round(shares, 4),
        "cost": req.cost,
        "price_per_share": round(price_per_share, 4),
        "old_yes_price": old_yes_price,
        "old_no_price": old_no_price,
        "new_yes_price": m.yes_price,
        "new_no_price": m.no_price,
        "price_impact_pct": quote["price_impact_pct"],
    }


class SellRequest(BaseModel):
    position_id: int
    shares: float      # how many shares to sell back


@router.post("/{market_id}/sell")
def sell_shares(
    market_id: int,
    req: SellRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.shares <= 0:
        raise HTTPException(status_code=400, detail="shares must be positive")

    pos = db.query(MarketPosition).filter(
        MarketPosition.id == req.position_id,
        MarketPosition.user_id == current_user.id,
        MarketPosition.market_id == market_id,
    ).first()
    if not pos or pos.redeemed:
        raise HTTPException(status_code=404, detail="Position not found")
    if req.shares > pos.shares:
        raise HTTPException(status_code=400, detail="Not enough shares")

    m = db.query(Market).filter(Market.id == market_id).first()
    if m.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open")

    k = m.yes_reserve * m.no_reserve
    old_yes_price = m.yes_price
    old_no_price = m.no_price

    # Selling YES shares: add back to yes_reserve, reduce no_reserve
    if pos.side == "YES":
        old_no = m.no_reserve
        m.yes_reserve += req.shares
        m.no_reserve = k / m.yes_reserve
        gross_proceeds = old_no - m.no_reserve
    else:
        old_yes = m.yes_reserve
        m.no_reserve += req.shares
        m.yes_reserve = k / m.no_reserve
        gross_proceeds = old_yes - m.yes_reserve

    fee = max(gross_proceeds, 0) * 0.02
    proceeds = max(gross_proceeds - fee, 0)
    proceeds = max(proceeds, 0)
    wallet = _get_wallet(db)
    wallet.cash += proceeds

    pos.shares -= req.shares
    if pos.shares <= 0.0001:
        pos.redeemed = True

    db.commit()
    db.refresh(m)
    return {
        "status": "ok",
        "proceeds": round(proceeds, 4),
        "fee": round(fee, 4),
        "old_yes_price": old_yes_price,
        "old_no_price": old_no_price,
        "new_yes_price": m.yes_price,
        "new_no_price": m.no_price,
    }


@router.post("/{market_id}/resolve")
def resolve_market(
    market_id: int,
    outcome: str,           # "YES" or "NO"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin/demo: manually resolve a market."""
    if outcome not in ("YES", "NO"):
        raise HTTPException(status_code=400, detail="outcome must be YES or NO")

    m = db.query(Market).filter(Market.id == market_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Market not found")
    if m.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market already resolved")

    m.status = MarketStatus.RESOLVED_YES if outcome == "YES" else MarketStatus.RESOLVED_NO
    m.resolved_at = datetime.now(timezone.utc)

    # Pay out winning positions: each winning share redeems for $1
    winning_side = outcome
    positions = db.query(MarketPosition).filter(
        MarketPosition.market_id == market_id,
        MarketPosition.redeemed == False,
    ).all()

    wallet = _get_wallet(db)
    payouts = 0
    for pos in positions:
        if pos.side == winning_side:
            payout = pos.shares * 1.0   # $1 per winning share
            wallet.cash += payout
            payouts += payout
        pos.redeemed = True

    db.commit()
    return {
        "status": "ok",
        "outcome": outcome,
        "total_payout": round(payouts, 2),
        "positions_settled": len(positions),
    }
