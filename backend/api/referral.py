import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import Base, get_db
from models.portfolio import Portfolio
from models.user import User
from auth.deps import get_current_user

router = APIRouter(prefix="/referral", tags=["referral"])

REFERRAL_BONUS = 5000.0


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    code = Column(String(8), unique=True, nullable=False, index=True)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)


def _get_or_create_code(user: User, db: Session) -> Referral:
    ref = db.query(Referral).filter(Referral.referrer_id == user.id, Referral.used == False).first()
    if ref:
        return ref
    ref = Referral(referrer_id=user.id, code=secrets.token_hex(4))
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return ref


@router.post("/generate")
def generate_code(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ref = Referral(referrer_id=user.id, code=secrets.token_hex(4))
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return {"code": ref.code}


@router.get("/my-code")
def my_code(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"code": _get_or_create_code(user, db).code}


class UseCodeRequest(BaseModel):
    code: str


@router.post("/use")
def use_code(body: UseCodeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ref = db.query(Referral).filter(Referral.code == body.code).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Code not found")
    if ref.used:
        raise HTTPException(status_code=400, detail="Code already used")
    if ref.referrer_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    ref.used = True
    ref.referee_id = user.id
    ref.used_at = datetime.now(timezone.utc)

    wallet = db.query(Portfolio).filter(Portfolio.name == "KingStop Demo Wallet").first()
    if wallet:
        wallet.cash += REFERRAL_BONUS

    db.commit()
    return {"status": "ok", "bonus": REFERRAL_BONUS}


@router.get("/stats")
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    refs = db.query(Referral).filter(Referral.referrer_id == user.id).all()
    used = [r for r in refs if r.used]
    return {
        "total_referrals": len(used),
        "pending": len(refs) - len(used),
        "earned_cash": len(used) * REFERRAL_BONUS,
    }
