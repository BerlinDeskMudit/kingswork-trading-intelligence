from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.sql import func
import enum
from database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class SubscriptionTier(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"
    PREMIUM = "PREMIUM"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=True)
    stripe_checkout_session_id = Column(String(255), unique=True, nullable=True)
    amount = Column(Float, nullable=False)               # USD cents
    currency = Column(String(3), default="usd")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    product_type = Column(String(50), nullable=False)    # "virtual_cash", "subscription", "cashout"
    virtual_cash_amount = Column(Float, nullable=True)   # paper money awarded
    payment_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    active = Column(Boolean, default=False)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


TIER_FEATURES = {
    "FREE": ["Basic backtesting", "5 trades/day", "Public leaderboard"],
    "PRO": ["Unlimited backtests", "Unlimited trades", "Live alerts", "Trade journal", "Priority signals"],
    "PREMIUM": ["All PRO", "Private portfolios", "API access", "Advanced models", "Cashout enabled"],
}

TIER_PRICES = {
    "PRO": {"monthly": 999, "yearly": 9999},          # cents
    "PREMIUM": {"monthly": 2999, "yearly": 29999},
}
