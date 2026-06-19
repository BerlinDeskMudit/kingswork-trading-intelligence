from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.user_preferences import UserAccountPreference


FIRST_ACTION_SOURCES = {"dismissed", "prediction", "trade"}


def get_or_create_user_preferences(db: Session, user_id: int) -> UserAccountPreference:
    preferences = db.query(UserAccountPreference).filter(
        UserAccountPreference.user_id == user_id
    ).first()
    if preferences:
        return preferences

    preferences = UserAccountPreference(user_id=user_id)
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


def mark_first_action(db: Session, user_id: int, source: str) -> UserAccountPreference:
    if source not in FIRST_ACTION_SOURCES:
        raise ValueError(f"Unsupported first action source: {source}")

    preferences = get_or_create_user_preferences(db, user_id)
    if not preferences.first_action_completed:
        preferences.first_action_completed = True
        preferences.first_action_source = source
        preferences.first_action_completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(preferences)
    return preferences


def serialize_onboarding_state(preferences: UserAccountPreference) -> dict:
    return {
        "tour": {
            "completed": bool(preferences.onboarding_completed),
            "dismissed": bool(preferences.onboarding_dismissed),
            "step": preferences.onboarding_step or 0,
        },
        "first_action": {
            "completed": bool(preferences.first_action_completed),
            "source": preferences.first_action_source,
            "completed_at": (
                preferences.first_action_completed_at.isoformat()
                if preferences.first_action_completed_at
                else None
            ),
        },
    }
