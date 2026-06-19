from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User
from models.portfolio import Portfolio, Trade

router = APIRouter(tags=["price-targets"])


class PriceTarget(Base):
    __tablename__ = "price_targets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String(20), nullable=False)
    target_price = Column(Float, nullable=False)
    direction = Column(String(10), nullable=False)  # ABOVE / BELOW
    note = Column(String(500), nullable=True)
    hit = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TradeCopyFollow(Base):
    __tablename__ = "trade_copy_follows"
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leader_portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PriceTargetCreate(BaseModel):
    ticker: str
    target_price: float
    direction: str  # ABOVE or BELOW
    note: Optional[str] = None


class FollowRequest(BaseModel):
    portfolio_id: int


# --- Price Targets ---

@router.post("/price-targets", status_code=201)
def create_target(body: PriceTargetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.direction not in ("ABOVE", "BELOW"):
        raise HTTPException(status_code=400, detail="direction must be ABOVE or BELOW")
    t = PriceTarget(user_id=current_user.id, **body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/price-targets")
def list_targets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from main import data_service
    targets = db.query(PriceTarget).filter(PriceTarget.user_id == current_user.id).all()
    result = []
    for t in targets:
        price_data = data_service.get_latest(t.ticker.upper()) or {}
        current_price = price_data.get("price")
        distance_pct = round((current_price - t.target_price) / t.target_price * 100, 2) if current_price else None
        result.append({
            "id": t.id, "ticker": t.ticker, "target_price": t.target_price,
            "direction": t.direction, "note": t.note, "hit": t.hit,
            "created_at": t.created_at, "current_price": current_price, "distance_pct": distance_pct,
        })
    return result


@router.delete("/price-targets/{target_id}")
def delete_target(target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(PriceTarget).filter(PriceTarget.id == target_id, PriceTarget.user_id == current_user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(t)
    db.commit()
    return {"status": "deleted"}


# --- Trade Copy ---

@router.post("/trade-copy/follow", status_code=201)
def follow_portfolio(body: FollowRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == body.portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    existing = db.query(TradeCopyFollow).filter(
        TradeCopyFollow.follower_id == current_user.id,
        TradeCopyFollow.leader_portfolio_id == body.portfolio_id,
        TradeCopyFollow.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already following")
    f = TradeCopyFollow(follower_id=current_user.id, leader_portfolio_id=body.portfolio_id)
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"id": f.id, "portfolio_id": body.portfolio_id}


@router.get("/trade-copy/following")
def list_following(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(TradeCopyFollow, Portfolio).join(Portfolio, Portfolio.id == TradeCopyFollow.leader_portfolio_id).filter(
        TradeCopyFollow.follower_id == current_user.id, TradeCopyFollow.is_active == True
    ).all()
    return [{"follow_id": f.id, "portfolio_id": p.id, "portfolio_name": p.name, "followed_at": f.created_at} for f, p in rows]


@router.delete("/trade-copy/{follow_id}")
def unfollow(follow_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(TradeCopyFollow).filter(TradeCopyFollow.id == follow_id, TradeCopyFollow.follower_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow not found")
    f.is_active = False
    db.commit()
    return {"status": "unfollowed"}


@router.get("/trade-copy/feed")
def trade_feed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    follows = db.query(TradeCopyFollow).filter(
        TradeCopyFollow.follower_id == current_user.id, TradeCopyFollow.is_active == True
    ).all()
    if not follows:
        return []
    portfolio_ids = [f.leader_portfolio_id for f in follows]
    trades = db.query(Trade).filter(Trade.portfolio_id.in_(portfolio_ids)).order_by(Trade.executed_at.desc()).limit(20).all()
    return [{"id": t.id, "portfolio_id": t.portfolio_id, "ticker": t.ticker, "side": t.side,
             "quantity": t.quantity, "price": t.price, "executed_at": t.executed_at} for t in trades]
