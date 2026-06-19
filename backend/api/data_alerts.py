from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timezone

# ── Models ────────────────────────────────────────────────────────────────────

class EarningsEvent(Base):
    __tablename__ = "earnings_events"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), nullable=False)
    company = Column(String(100), nullable=False)
    report_date = Column(String(20), nullable=False)
    eps_estimate = Column(Float, nullable=True)
    eps_actual = Column(Float, nullable=True)
    surprise_pct = Column(Float, nullable=True)
    pre_move_pct = Column(Float, nullable=True)
    post_move_pct = Column(Float, nullable=True)


class InsiderTrade(Base):
    __tablename__ = "insider_trades"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), nullable=False)
    insider_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=True)
    transaction_type = Column(String(20), nullable=False)  # BUY / SELL
    shares = Column(Integer, nullable=True)
    price = Column(Float, nullable=True)
    value = Column(Float, nullable=True)
    filed_date = Column(String(20), nullable=False)


class FIIDIIFlow(Base):
    __tablename__ = "fii_dii_flows"
    id = Column(Integer, primary_key=True, index=True)
    trade_date = Column(String(20), nullable=False)
    fii_buy = Column(Float, default=0)
    fii_sell = Column(Float, default=0)
    fii_net = Column(Float, default=0)
    dii_buy = Column(Float, default=0)
    dii_sell = Column(Float, default=0)
    dii_net = Column(Float, default=0)


class SMSAlertConfig(Base):
    __tablename__ = "sms_alert_configs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    phone = Column(String(20), nullable=False)
    whatsapp = Column(String(20), nullable=True)
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Pydantic ──────────────────────────────────────────────────────────────────

class SMSConfig(BaseModel):
    phone: str
    whatsapp: Optional[str] = None
    enabled: bool = True


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/earnings")
def get_earnings(ticker: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(EarningsEvent).order_by(EarningsEvent.report_date.desc())
    if ticker:
        q = q.filter(EarningsEvent.ticker == ticker.upper())
    events = q.limit(50).all()
    if not events:
        # Seed sample data
        _seed_earnings(db)
        events = q.limit(50).all()
    return {
        "status": "ok",
        "earnings": [{
            "id": e.id, "ticker": e.ticker, "company": e.company,
            "report_date": e.report_date, "eps_estimate": e.eps_estimate,
            "eps_actual": e.eps_actual, "surprise_pct": e.surprise_pct,
            "pre_move_pct": e.pre_move_pct, "post_move_pct": e.post_move_pct,
        } for e in events]
    }


@router.get("/insider-trades")
def get_insider_trades(ticker: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(InsiderTrade).order_by(InsiderTrade.filed_date.desc())
    if ticker:
        q = q.filter(InsiderTrade.ticker == ticker.upper())
    trades = q.limit(50).all()
    if not trades:
        _seed_insider(db)
        trades = q.limit(50).all()
    return {
        "status": "ok",
        "insider_trades": [{
            "id": t.id, "ticker": t.ticker, "insider_name": t.insider_name,
            "role": t.role, "transaction_type": t.transaction_type,
            "shares": t.shares, "price": t.price, "value": t.value,
            "filed_date": t.filed_date,
        } for t in trades]
    }


@router.get("/fii-dii")
def get_fii_dii(db: Session = Depends(get_db)):
    flows = db.query(FIIDIIFlow).order_by(FIIDIIFlow.trade_date.desc()).limit(30).all()
    if not flows:
        _seed_fii_dii(db)
        flows = db.query(FIIDIIFlow).order_by(FIIDIIFlow.trade_date.desc()).limit(30).all()
    return {
        "status": "ok",
        "flows": [{
            "trade_date": f.trade_date, "fii_buy": f.fii_buy, "fii_sell": f.fii_sell,
            "fii_net": f.fii_net, "dii_buy": f.dii_buy, "dii_sell": f.dii_sell, "dii_net": f.dii_net,
        } for f in flows]
    }


@router.post("/sms-config")
def save_sms_config(req: SMSConfig, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(SMSAlertConfig).filter(SMSAlertConfig.user_id == user.id).first()
    if existing:
        existing.phone = req.phone
        existing.whatsapp = req.whatsapp
        existing.enabled = 1 if req.enabled else 0
    else:
        existing = SMSAlertConfig(user_id=user.id, phone=req.phone, whatsapp=req.whatsapp, enabled=1 if req.enabled else 0)
        db.add(existing)
    db.commit()
    return {"status": "ok", "message": "SMS/WhatsApp alert config saved"}


@router.get("/sms-config")
def get_sms_config(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cfg = db.query(SMSAlertConfig).filter(SMSAlertConfig.user_id == user.id).first()
    if not cfg:
        return {"status": "ok", "config": None}
    return {"status": "ok", "config": {"phone": cfg.phone, "whatsapp": cfg.whatsapp, "enabled": bool(cfg.enabled)}}


# ── Seed helpers ──────────────────────────────────────────────────────────────

def _seed_earnings(db: Session):
    samples = [
        EarningsEvent(ticker="AAPL", company="Apple Inc.", report_date="2026-07-25", eps_estimate=1.55, eps_actual=1.63, surprise_pct=5.2, pre_move_pct=2.1, post_move_pct=4.3),
        EarningsEvent(ticker="MSFT", company="Microsoft Corp.", report_date="2026-07-30", eps_estimate=3.10, eps_actual=3.28, surprise_pct=5.8, pre_move_pct=1.5, post_move_pct=3.8),
        EarningsEvent(ticker="NVDA", company="NVIDIA Corp.", report_date="2026-08-15", eps_estimate=6.25, eps_actual=None, surprise_pct=None, pre_move_pct=None, post_move_pct=None),
        EarningsEvent(ticker="TSLA", company="Tesla Inc.", report_date="2026-07-22", eps_estimate=0.72, eps_actual=0.68, surprise_pct=-5.6, pre_move_pct=3.2, post_move_pct=-6.1),
        EarningsEvent(ticker="RELIANCE.NS", company="Reliance Industries", report_date="2026-07-18", eps_estimate=28.5, eps_actual=30.1, surprise_pct=5.6, pre_move_pct=1.8, post_move_pct=2.9),
        EarningsEvent(ticker="TCS.NS", company="Tata Consultancy Services", report_date="2026-07-10", eps_estimate=31.2, eps_actual=32.5, surprise_pct=4.2, pre_move_pct=0.9, post_move_pct=2.1),
    ]
    for s in samples:
        db.add(s)
    db.commit()


def _seed_insider(db: Session):
    samples = [
        InsiderTrade(ticker="AAPL", insider_name="Tim Cook", role="CEO", transaction_type="SELL", shares=50000, price=225.5, value=11275000, filed_date="2026-06-10"),
        InsiderTrade(ticker="MSFT", insider_name="Satya Nadella", role="CEO", transaction_type="SELL", shares=25000, price=455.2, value=11380000, filed_date="2026-06-08"),
        InsiderTrade(ticker="NVDA", insider_name="Jensen Huang", role="CEO", transaction_type="SELL", shares=100000, price=1200.0, value=120000000, filed_date="2026-06-05"),
        InsiderTrade(ticker="TSLA", insider_name="Elon Musk", role="CEO", transaction_type="BUY", shares=200000, price=180.0, value=36000000, filed_date="2026-06-12"),
        InsiderTrade(ticker="RELIANCE.NS", insider_name="Mukesh Ambani", role="CMD", transaction_type="BUY", shares=500000, price=3050.0, value=1525000000, filed_date="2026-06-01"),
        InsiderTrade(ticker="HDFCBANK.NS", insider_name="Sashidhar Jagdishan", role="MD & CEO", transaction_type="BUY", shares=10000, price=1820.0, value=18200000, filed_date="2026-06-15"),
    ]
    for s in samples:
        db.add(s)
    db.commit()


def _seed_fii_dii(db: Session):
    from datetime import timedelta
    base = date(2026, 6, 1)
    import random
    random.seed(42)
    for i in range(20):
        d = base + timedelta(days=i)
        fii_buy = round(random.uniform(5000, 15000), 2)
        fii_sell = round(random.uniform(4000, 14000), 2)
        dii_buy = round(random.uniform(3000, 10000), 2)
        dii_sell = round(random.uniform(2500, 9000), 2)
        db.add(FIIDIIFlow(
            trade_date=d.isoformat(),
            fii_buy=fii_buy, fii_sell=fii_sell, fii_net=round(fii_buy - fii_sell, 2),
            dii_buy=dii_buy, dii_sell=dii_sell, dii_net=round(dii_buy - dii_sell, 2),
        ))
    db.commit()
