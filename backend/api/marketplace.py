from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User
from models.portfolio import Portfolio
from config import settings

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


class Strategy(Base):
    __tablename__ = "strategies"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    signal_logic = Column(Text, nullable=True)
    price_usd = Column(Float, default=0.0)
    is_free = Column(Boolean, default=False)
    total_sales = Column(Integer, default=0)
    revenue_share_pct = Column(Float, default=0.7)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StrategyPurchase(Base):
    __tablename__ = "strategy_purchases"
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    paid_usd = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    signal_logic: Optional[str] = None
    price_usd: float = 0.0
    is_free: bool = False


def _get_demo_wallet(db: Session) -> Portfolio:
    wallet = db.query(Portfolio).filter(Portfolio.name == settings.demo_wallet_name).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Demo wallet not found")
    return wallet


@router.get("")
def list_strategies(db: Session = Depends(get_db)):
    rows = db.query(Strategy, User.name.label("author_name")).join(User, User.id == Strategy.author_id).filter(Strategy.is_active == True).all()
    return [{"id": s.id, "name": s.name, "description": s.description, "price_usd": s.price_usd,
             "is_free": s.is_free, "total_sales": s.total_sales, "author": a, "created_at": s.created_at} for s, a in rows]


@router.post("", status_code=201)
def publish_strategy(body: StrategyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = Strategy(author_id=current_user.id, **body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name}


@router.get("/my/published")
def my_published(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Strategy).filter(Strategy.author_id == current_user.id).all()


@router.get("/my/purchased")
def my_purchased(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(StrategyPurchase, Strategy).join(Strategy, Strategy.id == StrategyPurchase.strategy_id).filter(StrategyPurchase.buyer_id == current_user.id).all()
    return [{"purchase_id": p.id, "strategy_id": s.id, "name": s.name, "paid_usd": p.paid_usd, "purchased_at": p.created_at} for p, s in rows]


@router.get("/{strategy_id}")
def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    author = db.query(User).filter(User.id == s.author_id).first()
    return {**s.__dict__, "author": author.name if author else None}


@router.post("/{strategy_id}/buy")
def buy_strategy(strategy_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.is_active == True).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")

    already = db.query(StrategyPurchase).filter(StrategyPurchase.buyer_id == current_user.id, StrategyPurchase.strategy_id == strategy_id).first()
    if already:
        raise HTTPException(status_code=409, detail="Already purchased")

    paper_cost = s.price_usd * 1000 if not s.is_free else 0.0
    author_credit = round(paper_cost * s.revenue_share_pct, 2)

    if paper_cost > 0:
        wallet = _get_demo_wallet(db)
        if wallet.cash < paper_cost:
            raise HTTPException(status_code=400, detail="Insufficient paper cash")
        wallet.cash -= paper_cost

        # Credit author's portfolio (first portfolio or demo wallet)
        author_portfolio = db.query(Portfolio).filter(Portfolio.user_id == s.author_id).first() or wallet
        if author_portfolio.id != wallet.id:
            author_portfolio.cash += author_credit
        else:
            wallet.cash += author_credit  # same wallet, net deduct only buyer share

    purchase = StrategyPurchase(buyer_id=current_user.id, strategy_id=strategy_id, paid_usd=s.price_usd)
    s.total_sales += 1
    db.add(purchase)
    db.commit()

    return {"status": "ok", "strategy_name": s.name, "paper_cash_spent": paper_cost, "author_credit": author_credit}
