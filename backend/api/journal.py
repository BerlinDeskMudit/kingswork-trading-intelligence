from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
from models.journal import TradeJournalEntry
from auth.deps import get_current_user
from models.user import User

router = APIRouter(prefix="/journal", tags=["journal"])


class JournalCreate(BaseModel):
    ticker: str
    note: str
    sentiment: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    tags: Optional[str] = None


@router.get("")
def list_entries(
    ticker: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TradeJournalEntry).filter(TradeJournalEntry.user_id == current_user.id)
    if ticker:
        q = q.filter(TradeJournalEntry.ticker == ticker.upper())
    entries = q.order_by(TradeJournalEntry.created_at.desc()).all()
    return {"status": "ok", "entries": [_serialize(e) for e in entries]}


@router.post("")
def create_entry(
    req: JournalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = TradeJournalEntry(
        user_id=current_user.id,
        ticker=req.ticker.upper(),
        note=req.note,
        sentiment=req.sentiment,
        entry_price=req.entry_price,
        exit_price=req.exit_price,
        pnl=req.pnl,
        tags=req.tags,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "ok", "entry": _serialize(entry)}


@router.delete("/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TradeJournalEntry).filter(
        TradeJournalEntry.id == entry_id,
        TradeJournalEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"status": "ok"}


def _serialize(e: TradeJournalEntry):
    return {
        "id": e.id,
        "ticker": e.ticker,
        "note": e.note,
        "sentiment": e.sentiment,
        "entry_price": e.entry_price,
        "exit_price": e.exit_price,
        "pnl": e.pnl,
        "tags": e.tags,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
