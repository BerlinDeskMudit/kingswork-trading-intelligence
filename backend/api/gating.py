from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.payments import UserSubscription, SubscriptionTier
from models.user import User
from auth.deps import get_current_user

TIER_ORDER = {"FREE": 0, "PRO": 1, "PREMIUM": 2}


def get_user_tier(user_id: int, db: Session) -> str:
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    if sub and sub.tier:
        return sub.tier.value
    return "FREE"


def require_tier(min_tier: str):
    def dependency(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        tier = get_user_tier(user.id, db)
        if TIER_ORDER.get(tier, 0) < TIER_ORDER.get(min_tier, 0):
            raise HTTPException(status_code=403, detail=f"Requires {min_tier} subscription")
        return user
    return dependency
