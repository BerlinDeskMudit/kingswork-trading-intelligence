from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON
from sqlalchemy.sql import func
import enum
from database import Base


class StockData(Base):
    __tablename__ = "stock_data"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
    interval = Column(String(10), default="1m")

    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    indicator_type = Column(String(50))
    value = Column(Float)
    parameters = Column(JSON, nullable=True)


class SignalType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    NEUTRAL = "NEUTRAL"
    STRONG_BUY = "STRONG_BUY"
    STRONG_SELL = "STRONG_SELL"


class TradingSignal(Base):
    __tablename__ = "trading_signals"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    signal = Column(Enum(SignalType), nullable=False)
    confidence = Column(Float)
    source = Column(String(50))
    details = Column(JSON, nullable=True)
