from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User
from pydantic import BaseModel
from typing import Optional
import enum

# ── Models ──────────────────────────────────────────────────────────────────

class SLTPStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TRIGGERED = "TRIGGERED"
    CANCELLED = "CANCELLED"


class SLTPOrder(Base):
    __tablename__ = "sltp_orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String(10), nullable=False)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    quantity = Column(Integer, default=1)
    status = Column(SAEnum(SLTPStatus), default=SLTPStatus.ACTIVE)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TradePlan(Base):
    __tablename__ = "trade_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String(10), nullable=False)
    entry = Column(Float, nullable=False)
    target = Column(Float, nullable=False)
    stop = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    rationale = Column(String(1000), nullable=True)
    timeframe = Column(String(20), default="1D")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Pydantic ─────────────────────────────────────────────────────────────────

class SLTPCreate(BaseModel):
    ticker: str
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    quantity: int = 1
    notes: Optional[str] = None


class TradePlanCreate(BaseModel):
    ticker: str
    entry: float
    target: float
    stop: float
    quantity: int = 1
    rationale: Optional[str] = None
    timeframe: str = "1D"


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/trading-tools", tags=["trading-tools"])


@router.post("/sltp")
def create_sltp(req: SLTPCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = SLTPOrder(user_id=user.id, **req.dict())
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"status": "ok", "order": _serialize_sltp(order)}


@router.get("/sltp")
def list_sltp(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orders = db.query(SLTPOrder).filter(SLTPOrder.user_id == user.id).order_by(SLTPOrder.created_at.desc()).all()
    return {"status": "ok", "orders": [_serialize_sltp(o) for o in orders]}


@router.delete("/sltp/{order_id}")
def cancel_sltp(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(SLTPOrder).filter(SLTPOrder.id == order_id, SLTPOrder.user_id == user.id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = SLTPStatus.CANCELLED
    db.commit()
    return {"status": "ok"}


@router.get("/multitimeframe/{ticker}")
async def get_multitimeframe_signals(ticker: str):
    """Return signals across 1D, 1W, 1M timeframes."""
    from main import data_service
    results = {}
    for period, label in [("5d", "1D"), ("1mo", "1W"), ("3mo", "1M")]:
        try:
            data = await data_service.get_signals(ticker.upper(), period=period)
            fused = data.get("fused_signal", {})
            results[label] = {
                "signal": fused.get("signal", "HOLD"),
                "confidence": fused.get("confidence", 0),
                "indicators": data.get("indicators", {}),
            }
        except Exception:
            results[label] = {"signal": "HOLD", "confidence": 0, "indicators": {}}
    # Confluence: how many timeframes agree
    signals = [v["signal"] for v in results.values()]
    bull = sum(1 for s in signals if "BUY" in s)
    bear = sum(1 for s in signals if "SELL" in s)
    confluence = "BULLISH" if bull >= 2 else "BEARISH" if bear >= 2 else "MIXED"
    return {"status": "ok", "ticker": ticker.upper(), "timeframes": results, "confluence": confluence}


@router.post("/trade-plan")
def create_trade_plan(req: TradePlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = TradePlan(user_id=user.id, **req.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"status": "ok", "plan": _serialize_plan(plan)}


@router.get("/trade-plan")
def list_trade_plans(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plans = db.query(TradePlan).filter(TradePlan.user_id == user.id).order_by(TradePlan.created_at.desc()).all()
    return {"status": "ok", "plans": [_serialize_plan(p) for p in plans]}


@router.delete("/trade-plan/{plan_id}")
def delete_trade_plan(plan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plan = db.query(TradePlan).filter(TradePlan.id == plan_id, TradePlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    db.delete(plan)
    db.commit()
    return {"status": "ok"}


def _serialize_sltp(o: SLTPOrder):
    rr = None
    if o.stop_loss and o.take_profit and o.entry_price:
        risk = abs(o.entry_price - o.stop_loss)
        reward = abs(o.take_profit - o.entry_price)
        rr = round(reward / risk, 2) if risk > 0 else None
    return {
        "id": o.id, "ticker": o.ticker, "entry_price": o.entry_price,
        "stop_loss": o.stop_loss, "take_profit": o.take_profit,
        "quantity": o.quantity, "status": o.status, "notes": o.notes,
        "risk_reward": rr,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _serialize_plan(p: TradePlan):
    risk = abs(p.entry - p.stop)
    reward = abs(p.target - p.entry)
    rr = round(reward / risk, 2) if risk > 0 else 0
    return {
        "id": p.id, "ticker": p.ticker, "entry": p.entry, "target": p.target,
        "stop": p.stop, "quantity": p.quantity, "rationale": p.rationale,
        "timeframe": p.timeframe, "risk_reward": rr,
        "potential_profit": round(reward * p.quantity, 2),
        "potential_loss": round(risk * p.quantity, 2),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
