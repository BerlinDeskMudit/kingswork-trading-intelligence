from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user, get_password_hash, verify_password
from config import settings
from database import get_db
from models.payments import UserSubscription
from models.user import User
from models.user_preferences import UserAccountPreference
from services.onboarding import (
    FIRST_ACTION_SOURCES,
    get_or_create_user_preferences,
    mark_first_action,
    serialize_onboarding_state,
)

router = APIRouter(prefix="/account", tags=["account"])


class AccountPreferencesRequest(BaseModel):
    leaderboardOptIn: Optional[bool] = None
    publicProfile: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    resolutionAlerts: Optional[bool] = None
    priceAlerts: Optional[bool] = None
    streakReminders: Optional[bool] = None
    keyboardShortcutsEnabled: Optional[bool] = None
    dailyFundingLimit: Optional[float] = None
    exposureLimit: Optional[float] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class OnboardingUpdateRequest(BaseModel):
    completed: Optional[bool] = None
    dismissed: Optional[bool] = None
    step: Optional[int] = None


class FirstActionRequest(BaseModel):
    source: str


def _get_or_create_preferences(db: Session, user_id: int) -> UserAccountPreference:
    return get_or_create_user_preferences(db, user_id)


def _serialize_preferences(preferences: UserAccountPreference):
    return {
        "leaderboardOptIn": preferences.leaderboard_opt_in,
        "publicProfile": preferences.public_profile,
        "pushNotifications": preferences.push_notifications,
        "resolutionAlerts": preferences.resolution_alerts,
        "priceAlerts": preferences.price_alerts,
        "streakReminders": preferences.streak_reminders,
        "keyboardShortcutsEnabled": preferences.keyboard_shortcuts_enabled,
        "dailyFundingLimit": preferences.daily_funding_limit,
        "exposureLimit": preferences.exposure_limit,
    }


@router.get("/settings")
def get_account_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = _get_or_create_preferences(db, current_user.id)
    subscription = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).first()

    return {
        "status": "ok",
        "profile": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
        },
        "preferences": _serialize_preferences(preferences),
        "onboarding": serialize_onboarding_state(preferences),
        "subscription": {
            "tier": subscription.tier.value if subscription else "FREE",
            "active": bool(subscription.active) if subscription else False,
            "cancel_at_period_end": bool(subscription.cancel_at_period_end) if subscription else False,
        },
        "payment_methods": [],
        "sessions": [
            {
                "id": "current",
                "label": "Current browser session",
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "revocable": False,
            }
        ],
        "capabilities": {
            "stripe_configured": settings.stripe_enabled,
            "session_revocation": False,
            "two_factor": False,
        },
    }


@router.get("/onboarding")
def get_onboarding_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = _get_or_create_preferences(db, current_user.id)
    return {"status": "ok", **serialize_onboarding_state(preferences)}


@router.put("/onboarding")
def update_onboarding_state(
    req: OnboardingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = _get_or_create_preferences(db, current_user.id)
    if req.step is not None:
        if req.step < 0 or req.step > 3:
            raise HTTPException(status_code=400, detail="Onboarding step must be between 0 and 3")
        preferences.onboarding_step = req.step
    if req.completed is not None:
        preferences.onboarding_completed = req.completed
    if req.dismissed is not None:
        preferences.onboarding_dismissed = req.dismissed
    db.commit()
    db.refresh(preferences)
    return {"status": "ok", **serialize_onboarding_state(preferences)}


@router.put("/first-action")
def complete_first_action(
    req: FirstActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.source not in FIRST_ACTION_SOURCES:
        raise HTTPException(status_code=400, detail="Unsupported first action source")
    preferences = mark_first_action(db, current_user.id, req.source)
    return {"status": "ok", **serialize_onboarding_state(preferences)}


@router.put("/preferences")
def update_account_preferences(
    req: AccountPreferencesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = _get_or_create_preferences(db, current_user.id)
    updates = req.model_dump(exclude_unset=True)

    field_map = {
        "leaderboardOptIn": "leaderboard_opt_in",
        "publicProfile": "public_profile",
        "pushNotifications": "push_notifications",
        "resolutionAlerts": "resolution_alerts",
        "priceAlerts": "price_alerts",
        "streakReminders": "streak_reminders",
        "keyboardShortcutsEnabled": "keyboard_shortcuts_enabled",
        "dailyFundingLimit": "daily_funding_limit",
        "exposureLimit": "exposure_limit",
    }

    for incoming, model_field in field_map.items():
        if incoming in updates:
            value = updates[incoming]
            if incoming in ("dailyFundingLimit", "exposureLimit") and value is not None and value < 0:
                raise HTTPException(status_code=400, detail=f"{incoming} must be positive")
            setattr(preferences, model_field, value)

    db.commit()
    db.refresh(preferences)
    return {"status": "ok", "preferences": _serialize_preferences(preferences)}


@router.post("/security/password")
def change_password(
    req: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")

    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated"}
