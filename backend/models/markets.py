from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from database import Base


class MarketStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    RESOLVED_YES = "RESOLVED_YES"
    RESOLVED_NO = "RESOLVED_NO"


class Market(Base):
    __tablename__ = "predict_markets"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(255), nullable=False)
    ticker = Column(String(20), nullable=True)          # underlying stock if any
    condition = Column(String(100), nullable=True)      # e.g. "close > 220"
    threshold = Column(Float, nullable=True)
    category = Column(String(50), default="stocks")    # stocks / crypto / macro
    status = Column(Enum(MarketStatus), default=MarketStatus.OPEN)
    resolves_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # CPMM liquidity pools — YES and NO token reserves
    yes_reserve = Column(Float, default=100.0)
    no_reserve = Column(Float, default=100.0)

    positions = relationship("MarketPosition", back_populates="market", cascade="all, delete-orphan")

    @property
    def yes_price(self) -> float:
        """Implied probability of YES (0–1)."""
        total = self.yes_reserve + self.no_reserve
        return round(self.no_reserve / total, 4) if total else 0.5

    @property
    def no_price(self) -> float:
        return round(1.0 - self.yes_price, 4)

    @property
    def total_volume(self) -> float:
        return round(abs(200.0 - self.yes_reserve - self.no_reserve) * 10, 2)


class MarketPosition(Base):
    __tablename__ = "predict_positions"

    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(Integer, ForeignKey("predict_markets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    side = Column(String(3), nullable=False)            # YES / NO
    shares = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)           # cost per share at purchase
    redeemed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    market = relationship("Market", back_populates="positions")


SEED_MARKETS = [
    {
        "question": "Will AAPL close above $220 this week?",
        "ticker": "AAPL", "condition": "close > 220", "threshold": 220.0,
        "category": "stocks", "yes_reserve": 90.0, "no_reserve": 110.0,
    },
    {
        "question": "Will NVDA gain more than 3% today?",
        "ticker": "NVDA", "condition": "change_pct > 3", "threshold": 3.0,
        "category": "stocks", "yes_reserve": 70.0, "no_reserve": 130.0,
    },
    {
        "question": "Will BTC-USD trade above $70,000 this week?",
        "ticker": "BTC-USD", "condition": "price > 70000", "threshold": 70000.0,
        "category": "crypto", "yes_reserve": 80.0, "no_reserve": 120.0,
    },
    {
        "question": "Will TSLA close below $240 by end of month?",
        "ticker": "TSLA", "condition": "close < 240", "threshold": 240.0,
        "category": "stocks", "yes_reserve": 115.0, "no_reserve": 85.0,
    },
    {
        "question": "Will ETH-USD stay above $3,500 this week?",
        "ticker": "ETH-USD", "condition": "price > 3500", "threshold": 3500.0,
        "category": "crypto", "yes_reserve": 95.0, "no_reserve": 105.0,
    },
    {
        "question": "Will RELIANCE.NS hit a new 52-week high?",
        "ticker": "RELIANCE.NS", "condition": "new_high", "threshold": None,
        "category": "india", "yes_reserve": 60.0, "no_reserve": 140.0,
    },
    {
        "question": "Will the US market (S&P 500) close green today?",
        "ticker": "^GSPC", "condition": "change_pct > 0", "threshold": 0.0,
        "category": "macro", "yes_reserve": 105.0, "no_reserve": 95.0,
    },
]
