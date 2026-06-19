from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class UserModelPreference(Base):
    __tablename__ = "user_model_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_user_model_preference_mode"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mode = Column(String(32), nullable=False)
    model_id = Column(String(80), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")


class UserAccountPreference(Base):
    __tablename__ = "user_account_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    leaderboard_opt_in = Column(Boolean, default=False)
    public_profile = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=False)
    resolution_alerts = Column(Boolean, default=True)
    price_alerts = Column(Boolean, default=True)
    streak_reminders = Column(Boolean, default=True)
    keyboard_shortcuts_enabled = Column(Boolean, default=True, nullable=False)
    daily_funding_limit = Column(Float, nullable=True)
    exposure_limit = Column(Float, nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    onboarding_dismissed = Column(Boolean, default=False, nullable=False)
    onboarding_step = Column(Integer, default=0, nullable=False)
    first_action_completed = Column(Boolean, default=False, nullable=False)
    first_action_source = Column(String(32), nullable=True)
    first_action_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
