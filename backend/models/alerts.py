from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean, JSON
from sqlalchemy.sql import func
import enum
from database import Base


class AlertCondition(str, enum.Enum):
    PRICE_ABOVE = "PRICE_ABOVE"
    PRICE_BELOW = "PRICE_BELOW"
    VOLUME_SPIKE = "VOLUME_SPIKE"
    SIGNAL_BUY = "SIGNAL_BUY"
    SIGNAL_SELL = "SIGNAL_SELL"
    RSI_OVERSOLD = "RSI_OVERSOLD"
    RSI_OVERBOUGHT = "RSI_OVERBOUGHT"
    CROSS_MA = "CROSS_MA"
    CUSTOM = "CUSTOM"


class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ticker = Column(String(10), index=True, nullable=False)
    condition = Column(Enum(AlertCondition), nullable=False)
    threshold = Column(Float, nullable=True)
    enabled = Column(Boolean, default=True)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    config = Column(JSON, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, nullable=True)
    ticker = Column(String(10), index=True, nullable=False)
    message = Column(String(500), nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False)
    extra_data = Column(JSON, nullable=True)
