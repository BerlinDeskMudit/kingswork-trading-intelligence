from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="uq_watchlist_user_ticker"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String(20), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


class WatchlistUpdate(BaseModel):
    ticker: str


def normalize_ticker(ticker: str) -> str:
    normalized = ticker.strip().upper()
    if not normalized or len(normalized) > 20:
        raise HTTPException(status_code=422, detail="Ticker must be between 1 and 20 characters")
    if not all(char.isalnum() or char in ".-" for char in normalized):
        raise HTTPException(status_code=422, detail="Ticker may only contain letters, numbers, dots, and hyphens")
    return normalized


@router.get("")
async def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from main import data_service
    items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    result = []
    for item in items:
        price_data = data_service.get_latest(item.ticker) or {}
        result.append({
            "ticker": item.ticker,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "price": price_data.get("price"),
            "change_pct": price_data.get("change_pct"),
            "signal": price_data.get("signal"),
        })
    return {"status": "ok", "watchlist": result}


@router.post("/{ticker}", status_code=201)
async def add_ticker(ticker: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticker = normalize_ticker(ticker)
    existing = db.query(Watchlist).filter(Watchlist.user_id == current_user.id, Watchlist.ticker == ticker).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ticker already in watchlist")
    entry = Watchlist(user_id=current_user.id, ticker=ticker)
    db.add(entry)
    db.commit()
    return {"status": "ok", "ticker": ticker}


@router.put("/{ticker}")
async def update_ticker(
    ticker: str,
    payload: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_ticker = normalize_ticker(ticker)
    next_ticker = normalize_ticker(payload.ticker)
    entry = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == current_ticker,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ticker not in watchlist")
    duplicate = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == next_ticker,
        Watchlist.id != entry.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Ticker already in watchlist")

    entry.ticker = next_ticker
    db.commit()
    return {"status": "ok", "ticker": next_ticker, "previous_ticker": current_ticker}


@router.delete("/{ticker}")
async def remove_ticker(ticker: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticker = normalize_ticker(ticker)
    entry = db.query(Watchlist).filter(Watchlist.user_id == current_user.id, Watchlist.ticker == ticker).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ticker not in watchlist")
    db.delete(entry)
    db.commit()
    return {"status": "ok", "ticker": ticker}
